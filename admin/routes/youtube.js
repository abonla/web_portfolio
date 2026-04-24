const express = require('express');
const https = require('https');
const router = express.Router();

router.post('/parse', function(req, res) {
  const url = req.body.url || '';
  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });
  res.json({ videoId: videoId, thumbUrl: 'https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg' });
});

// Fetch YouTube video title and description via oEmbed + page meta
router.post('/fetch', function(req, res) {
  const videoId = req.body.videoId || '';
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  const oembedUrl = 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + encodeURIComponent(videoId) + '&format=json';

  httpsGet(oembedUrl, function(err, oembedBody) {
    let title = '';
    if (!err) {
      try { title = JSON.parse(oembedBody).title || ''; } catch (e) {}
    }

    // Fetch page HTML for description (meta description tag)
    const pageUrl = 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId);
    httpsGet(pageUrl, function(err2, pageBody) {
      let description = '';
      if (!err2 && pageBody) {
        const m = pageBody.match(/<meta name="description" content="([^"]*?)"/);
        if (m) description = htmlDecode(m[1]);
      }
      res.json({ title, description });
    }, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'zh-TW,zh;q=0.9' });
  });
});

function httpsGet(url, cb, extraHeaders) {
  const opts = {
    headers: Object.assign({ 'User-Agent': 'Mozilla/5.0' }, extraHeaders || {}),
  };
  https.get(url, opts, function(r) {
    let body = '';
    r.on('data', function(c) { body += c; });
    r.on('end', function() { cb(null, body); });
  }).on('error', function(e) { cb(e, null); });
}

function htmlDecode(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (e) {
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  }
  return null;
}

module.exports = { router, extractVideoId };
