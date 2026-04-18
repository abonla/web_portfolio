// admin/routes/ai.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { callGemini } = require('../lib/gemini');

const router = express.Router();
let ROOT;
function init(deps) {
  ROOT = deps.ROOT;
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
    const absPath = path.join(ROOT, req.body.imagePath);
    if (!fs.existsSync(absPath))
      return res
        .status(400)
        .json({ error: '圖片不存在: ' + req.body.imagePath });
    const ext = path.extname(absPath).toLowerCase();
    mimeType = MIME_MAP[ext] || 'image/jpeg';
    base64Data = fs.readFileSync(absPath).toString('base64');
  } else if (req.body.imageBase64 && req.body.mimeType) {
    base64Data = req.body.imageBase64;
    mimeType = req.body.mimeType;
  } else {
    return res
      .status(400)
      .json({ error: 'imagePath 或 imageBase64+mimeType 必填' });
  }

  try {
    const geminiRes = await callGemini(apiKey, base64Data, mimeType);
    const rawText = geminiRes.candidates[0].content.parts[0].text;
    // Strip markdown code fences Gemini sometimes adds
    const jsonText = rawText
      .replace(/^```[a-z]*\n?/m, '')
      .replace(/```$/m, '')
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

module.exports = { router, init };
