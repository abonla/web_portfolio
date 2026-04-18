// admin/lib/gemini.js
const https = require('https');

const PROMPT =
  '這是一張作品集圖片。請用繁體中文和英文各寫一句簡短說明（20字以內），' +
  '並從以下分類中選出最符合的一個或多個：DRAW、DESIGN、PHOTO、VIDEO、WEB、3D、NEWS。' +
  '同時建議一個 Fancybox 群組名稱（英文小寫，如 nature、portrait、poster）。' +
  '請以 JSON 格式回傳，欄位為 captionZh、captionEn、categories（陣列）、fancyboxGroup。' +
  '只回傳 JSON，不要其他文字。';

function callGemini(apiKey, base64Data, mimeType) {
  return new Promise(function (resolve, reject) {
    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Data } },
            { text: PROMPT },
          ],
        },
      ],
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path:
        '/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, function (res) {
      let data = '';
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function () {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Gemini 回傳格式錯誤'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function callGeminiText(apiKey, prompt) {
  return new Promise(function (resolve, reject) {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, function (res) {
      let data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Gemini 回傳格式錯誤')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
module.exports = { callGemini, callGeminiText };
