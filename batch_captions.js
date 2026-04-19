// batch_captions.js — 批次用 Gemini 生成圖片英文說明
// 執行: node batch_captions.js
// 進度寫入 batch_captions.log

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data.json');
const LOG_PATH = path.join(ROOT, 'batch_captions.log');
const API_KEY = process.env.GEMINI_API_KEY;
const DELAY_MS = 4000; // 4 秒間隔 ≈ 15 RPM

if (!API_KEY) { console.error('請設定 GEMINI_API_KEY'); process.exit(1); }

function log(msg) {
  const line = new Date().toISOString() + ' ' + msg;
  console.log(line);
  fs.appendFileSync(LOG_PATH, line + '\n');
}

function callGemini(base64Data, mimeType) {
  return new Promise(function(resolve, reject) {
    const body = JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Data } },
          { text: '請分析這張圖片，用繁體中文和英文各寫一段簡短說明（20-50字）。以JSON格式回傳：{"captionZh":"...","captionEn":"...","categories":[],"fancyboxGroup":""}。categories可選：painter,sketch,water,ink,oil,mark,digital,photo,news。fancyboxGroup通常是painter或photo或news。' }
        ]
      }]
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + API_KEY,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, function(res) {
      let data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse error: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const MIME_MAP = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp' };

async function run() {
  // Clear log
  fs.writeFileSync(LOG_PATH, '');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const targets = data.works.filter(function(w) {
    return w.type === 'image' && !w.captionEn;
  });

  log('開始批次生成。待處理: ' + targets.length + ' 張');

  let processed = 0, skipped = 0, errors = 0;

  for (let i = 0; i < targets.length; i++) {
    const w = targets[i];
    const absPath = path.resolve(ROOT, w.src);

    if (!fs.existsSync(absPath)) {
      log('[SKIP] ' + (i+1) + '/' + targets.length + ' 檔案不存在: ' + w.src);
      skipped++;
      continue;
    }

    try {
      const ext = path.extname(absPath).toLowerCase();
      const mimeType = MIME_MAP[ext] || 'image/jpeg';
      const base64Data = fs.readFileSync(absPath).toString('base64');
      const geminiRes = await callGemini(base64Data, mimeType);

      if (geminiRes.error) throw new Error(geminiRes.error.message);
      const rawText = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Gemini 回傳空內容');

      const jsonText = rawText.replace(/^```[a-zA-Z]*\r?\n?/m, '').replace(/```\s*$/m, '').trim();
      const result = JSON.parse(jsonText);

      // Re-read data.json each time to avoid overwriting concurrent changes
      const fresh = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      const idx = fresh.works.findIndex(function(x) { return x.id === w.id; });
      if (idx !== -1) {
        if (result.captionEn) fresh.works[idx].captionEn = result.captionEn;
        if (result.captionZh && !fresh.works[idx].caption) fresh.works[idx].caption = result.captionZh;
        fs.writeFileSync(DATA_PATH, JSON.stringify(fresh, null, 2));
      }

      processed++;
      log('[OK] ' + (i+1) + '/' + targets.length + ' ' + w.src + ' → ' + (result.captionEn || '(empty)'));
    } catch(err) {
      // If quota exceeded with a retry hint, wait then retry once
      const retryMatch = err.message.match(/retry in ([\d.]+)s/);
      if (retryMatch) {
        const waitMs = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 2000;
        log('[WAIT] 配額暫時超限，等待 ' + Math.ceil(waitMs/1000) + ' 秒後重試…');
        await new Promise(function(r) { setTimeout(r, waitMs); });
        // Retry once
        try {
          const ext = path.extname(path.resolve(ROOT, w.src)).toLowerCase();
          const mimeType = MIME_MAP[ext] || 'image/jpeg';
          const base64Data = fs.readFileSync(path.resolve(ROOT, w.src)).toString('base64');
          const geminiRes2 = await callGemini(base64Data, mimeType);
          if (geminiRes2.error) throw new Error(geminiRes2.error.message);
          const rawText2 = geminiRes2.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText2) throw new Error('Gemini 回傳空內容');
          const result2 = JSON.parse(rawText2.replace(/^```[a-zA-Z]*\r?\n?/m,'').replace(/```\s*$/m,'').trim());
          const fresh2 = JSON.parse(fs.readFileSync(DATA_PATH,'utf8'));
          const idx2 = fresh2.works.findIndex(function(x){return x.id===w.id;});
          if (idx2!==-1){
            if(result2.captionEn) fresh2.works[idx2].captionEn=result2.captionEn;
            if(result2.captionZh&&!fresh2.works[idx2].caption) fresh2.works[idx2].caption=result2.captionZh;
            fs.writeFileSync(DATA_PATH,JSON.stringify(fresh2,null,2));
          }
          processed++;
          log('[OK-retry] ' + (i+1) + '/' + targets.length + ' ' + w.src + ' → ' + (result2.captionEn||'(empty)'));
        } catch(err2) {
          errors++;
          log('[ERR] ' + (i+1) + '/' + targets.length + ' ' + w.src + ' → ' + err2.message.slice(0,120));
        }
      } else {
        errors++;
        log('[ERR] ' + (i+1) + '/' + targets.length + ' ' + w.src + ' → ' + err.message.slice(0,120));
      }
    }

    if (i < targets.length - 1) {
      await new Promise(function(r) { setTimeout(r, DELAY_MS); });
    }
  }

  log('完成！處理: ' + processed + ' / 跳過: ' + skipped + ' / 錯誤: ' + errors);
}

run().catch(function(err) { log('致命錯誤: ' + err.message); process.exit(1); });
