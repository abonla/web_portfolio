const express = require('express');
const https = require('https');
const router = express.Router();

router.post('/', function(req, res) {
  const text = (req.body.text || '').trim();
  if (!text) return res.json({ result: '' });

  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=en&dt=t&q='
    + encodeURIComponent(text);

  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function(apiRes) {
    let raw = '';
    apiRes.on('data', function(c) { raw += c; });
    apiRes.on('end', function() {
      try {
        const data = JSON.parse(raw);
        // Response format: [[[translated, original, ...], ...], ...]
        const result = data[0].map(function(seg) { return seg[0] || ''; }).join('');
        res.json({ result: result });
      } catch(e) {
        res.status(502).json({ error: '解析翻譯結果失敗' });
      }
    });
  }).on('error', function(e) {
    res.status(502).json({ error: '無法連線翻譯服務：' + e.message });
  });
});

module.exports = { router };
