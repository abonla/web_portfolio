const express = require('express');
const router = express.Router();

router.post('/parse', function(req, res) {
  const url = req.body.url || '';
  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });
  res.json({ videoId: videoId, thumbUrl: 'https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg' });
});

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
