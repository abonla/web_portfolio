// Batch-fetch YouTube titles/descriptions for all video works missing titleZh,
// translate to English, then write back to data.json and regenerate index.html.
// Run from repo root: node admin/scripts/fetch-yt-titles.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const https = require('https');
const path = require('path');
const { generateHTML } = require('../lib/generator');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const TEMPLATE_PATH = path.join(__dirname, '..', 'template.html');
const OUTPUT_PATH = path.join(ROOT, 'index.html');

function httpsGet(url, extraHeaders) {
  return new Promise(function (resolve) {
    const opts = { headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'zh-TW,zh;q=0.9' }, extraHeaders || {}) };
    https.get(url, opts, function (r) {
      let body = '';
      r.on('data', function (c) { body += c; });
      r.on('end', function () { resolve(body); });
    }).on('error', function () { resolve(''); });
  });
}

function htmlDecode(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

async function fetchYT(videoId) {
  const oembedUrl = 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + encodeURIComponent(videoId) + '&format=json';
  const oembedBody = await httpsGet(oembedUrl);
  let title = '';
  try { title = JSON.parse(oembedBody).title || ''; } catch (e) {}

  const pageBody = await httpsGet('https://www.youtube.com/watch?v=' + encodeURIComponent(videoId));
  let description = '';
  const m = pageBody.match(/<meta name="description" content="([^"]*?)"/);
  if (m) description = htmlDecode(m[1]);

  return { title, description };
}

async function translate(text) {
  if (!text.trim()) return '';
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=en&dt=t&q=' + encodeURIComponent(text);
  const body = await httpsGet(url);
  try {
    const parsed = JSON.parse(body);
    return parsed[0].map(function (seg) { return seg[0]; }).join('');
  } catch (e) { return ''; }
}

async function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const videos = data.works.filter(function (w) { return w.type === 'video' && !w.titleZh; });
  console.log('Found ' + videos.length + ' video works without titles.');

  for (let i = 0; i < videos.length; i++) {
    const w = videos[i];
    process.stdout.write('[' + (i + 1) + '/' + videos.length + '] ' + w.videoId + ' ... ');
    try {
      const yt = await fetchYT(w.videoId);
      const titleEn = yt.title ? await translate(yt.title) : '';
      const captionEn = yt.description ? await translate(yt.description) : '';

      const idx = data.works.findIndex(function (x) { return x.id === w.id; });
      if (idx !== -1) {
        data.works[idx].titleZh = yt.title;
        data.works[idx].titleEn = titleEn;
        data.works[idx].caption = yt.description;
        data.works[idx].captionEn = captionEn;
      }
      console.log('OK: ' + yt.title.slice(0, 40));
    } catch (err) {
      console.log('ERROR: ' + err.message);
    }
    await sleep(600); // be polite to YouTube
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const html = generateHTML(data, template);
  fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
  console.log('\nDone. data.json and index.html updated.');
})();
