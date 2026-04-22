const express = require('express');
const https = require('https');
const router = express.Router();

router.post('/', function(req, res) {
  const text = (req.body.text || '').trim();
  if (!text) return res.json({ result: '' });

  const url = 'https://api.mymemory.translated.net/get?q='
    + encodeURIComponent(text) + '&langpair=zh-TW%7Cen';

  https.get(url, function(apiRes) {
    let raw = '';
    apiRes.on('data', function(c) { raw += c; });
    apiRes.on('end', function() {
      try {
        const data = JSON.parse(raw);
        if (data.responseStatus !== 200) {
          return res.status(502).json({ error: data.responseDetails || '翻譯失敗' });
        }
        res.json({ result: data.responseData.translatedText || '' });
      } catch(e) {
        res.status(502).json({ error: '解析翻譯結果失敗' });
      }
    });
  }).on('error', function(e) {
    res.status(502).json({ error: '無法連線翻譯服務：' + e.message });
  });
});

module.exports = { router };
