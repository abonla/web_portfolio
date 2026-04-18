// admin/routes/ai.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { callGemini, callGeminiText } = require('../lib/gemini');

const router = express.Router();
let ROOT, readData, writeData;
function init(deps) {
  ROOT = deps.ROOT;
  readData = deps.readData;
  writeData = deps.writeData;
}

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

router.post('/caption', async function (req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: 'GEMINI_API_KEY 未設定' });

  let base64Data, mimeType;

  if (req.body.imagePath) {
    const absPath = path.resolve(ROOT, req.body.imagePath);
    if (!absPath.startsWith(path.resolve(ROOT) + path.sep))
      return res.status(400).json({ error: '非法路徑' });
    if (!fs.existsSync(absPath))
      return res.status(400).json({ error: '圖片不存在: ' + req.body.imagePath });
    const ext = path.extname(absPath).toLowerCase();
    mimeType = MIME_MAP[ext] || 'image/jpeg';
    base64Data = fs.readFileSync(absPath).toString('base64');
  } else if (req.body.imageBase64 && req.body.mimeType) {
    base64Data = req.body.imageBase64;
    mimeType = req.body.mimeType;
  } else {
    return res.status(400).json({ error: 'imagePath 或 imageBase64+mimeType 必填' });
  }

  try {
    const geminiRes = await callGemini(apiKey, base64Data, mimeType);
    if (geminiRes.error) {
      return res.status(502).json({ error: 'Gemini API 錯誤：' + geminiRes.error.message });
    }
    const rawText = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ error: 'Gemini 回傳空內容' });
    }
    const jsonText = rawText
      .replace(/^```[a-zA-Z]*\r?\n?/m, '')
      .replace(/```\s*$/m, '')
      .trim();
    const result = JSON.parse(jsonText);
    res.json({
      captionZh: result.captionZh || '',
      captionEn: result.captionEn || '',
      categories: Array.isArray(result.categories) ? result.categories : [],
      fancyboxGroup: result.fancyboxGroup || '',
    });
  } catch (err) {
    res.status(500).json({ error: 'AI 生成失敗：' + err.message });
  }
});

// GET /api/ai/batch-caption — SSE stream
// Processes all image works with empty captionEn, rate-limited to ~10/min
router.get('/batch-caption', async function (req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY 未設定' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  function sendEvent(obj) {
    res.write('data: ' + JSON.stringify(obj) + '\n\n');
  }

  const data = readData();
  const targets = data.works.filter(function (w) {
    return w.type === 'image' && !w.captionEn;
  });
  const total = targets.length;
  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < targets.length; i++) {
    const w = targets[i];
    const absPath = path.resolve(ROOT, w.src);
    if (!absPath.startsWith(path.resolve(ROOT) + path.sep) || !fs.existsSync(absPath)) {
      skipped++;
      sendEvent({ type: 'error', id: w.id, message: '圖片不存在: ' + w.src });
      continue;
    }
    try {
      const ext = path.extname(absPath).toLowerCase();
      const mimeType = MIME_MAP[ext] || 'image/jpeg';
      const base64Data = fs.readFileSync(absPath).toString('base64');
      const geminiRes = await callGemini(apiKey, base64Data, mimeType);
      if (geminiRes.error) throw new Error(geminiRes.error.message);
      const rawText = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Gemini 回傳空內容');
      const jsonText = rawText
        .replace(/^```[a-zA-Z]*\r?\n?/m, '')
        .replace(/```\s*$/m, '')
        .trim();
      const result = JSON.parse(jsonText);
      const freshData = readData();
      const idx = freshData.works.findIndex(function (x) { return x.id === w.id; });
      if (idx !== -1 && result.captionEn) {
        freshData.works[idx].captionEn = result.captionEn;
        writeData(freshData);
      }
      processed++;
      sendEvent({ type: 'progress', current: i + 1, total, id: w.id, src: w.src, captionEn: result.captionEn || '' });
    } catch (err) {
      sendEvent({ type: 'error', id: w.id, message: err.message });
    }
    if (i < targets.length - 1) {
      await new Promise(function (r) { setTimeout(r, 6000); });
    }
  }

  sendEvent({ type: 'done', processed, skipped });
  res.end();
});

// POST /api/ai/translate — translate Chinese text to English
router.post('/translate', async function (req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: 'GEMINI_API_KEY 未設定' });
  const { text, context } = req.body;
  if (!text)
    return res.status(400).json({ error: 'text 必填' });
  const prompt =
    '請將以下繁體中文翻譯成英文。只回傳英文翻譯，不要其他文字。\n' +
    'Context: ' + (context || '') + '\n' +
    'Text: ' + text;
  try {
    const geminiRes = await callGeminiText(apiKey, prompt);
    if (geminiRes.error)
      return res.status(502).json({ error: 'Gemini API 錯誤：' + geminiRes.error.message });
    const en = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    res.json({ en });
  } catch (err) {
    res.status(500).json({ error: '翻譯失敗：' + err.message });
  }
});

module.exports = { router, init };
