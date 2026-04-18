# Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ZH/EN language toggle to the public portfolio website, covering nav submenus, Fancybox captions, and the full About page, with backend batch AI generation and AI-translate buttons for all English content.

**Architecture:** Three phases in sequence. Phase 1 adds backend API endpoints and admin UI for filling in English content (batch AI caption for works, manual+AI-translate fields for About). Phase 2 updates the generator to embed bilingual `<span class="lang-zh">` / `<span class="lang-en">` pairs in the generated HTML. Phase 3 adds the toggle button in the public template, `js/lang.js`, and CSS.

**Tech Stack:** Node.js + Express (backend), Gemini 2.0 Flash REST API (translation/caption), SSE for batch progress, native JS + CSS class toggle on `<html>` (frontend), localStorage for preference persistence.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `admin/lib/gemini.js` | Modify | Add `callGeminiText(apiKey, prompt)` for text-only Gemini calls |
| `admin/routes/ai.js` | Modify | Add `GET /batch-caption` (SSE) and `POST /translate` endpoints |
| `admin/server.js` | Modify | Pass `readData`/`writeData` to `aiRoute.init` |
| `admin/routes/about.js` | Modify | Add EN fields to `PUT /info` allowlist |
| `admin/public/works.js` | Modify | Add batch AI button + batch progress modal |
| `admin/public/style.css` | Modify | Add batch modal CSS |
| `admin/public/about.js` | Modify | Add EN input fields + AI translate buttons to all 4 tabs |
| `admin/lib/generator.js` | Modify | Add `bilingual()` helper, rewrite `buildAboutHTML`, update `buildTimelineScript` |
| `admin/template.html` | Modify | Add lang-toggle button, bilingual DRAW submenu spans, load `js/lang.js` |
| `js/lang.js` | Create | Language switching logic (localStorage, CSS class toggle, Fancybox swap, timeline redraw) |
| `css/index.css` | Modify | Add lang toggle CSS rules + button styles |
| `tests/ai.test.js` | Modify | Add tests for batch-caption and translate endpoints |
| `tests/generator.test.js` | Modify | Update tests for bilingual `buildAboutHTML` and `buildTimelineScript` |

---

## Task 1: Backend — `callGeminiText`, batch-caption SSE, translate endpoint

**Files:**
- Modify: `admin/lib/gemini.js`
- Modify: `admin/routes/ai.js`
- Modify: `admin/server.js`
- Modify: `tests/ai.test.js`

- [ ] **Step 1: Write failing tests for the two new endpoints**

Add to `tests/ai.test.js` after the existing `describe('POST /api/ai/caption', ...)` block:

```js
describe('GET /api/ai/batch-caption', () => {
  test('streams SSE done event when no image works have empty captionEn', async () => {
    // sampleData.works is [] — nothing to process
    const res = await request(app)
      .get('/api/ai/batch-caption')
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => callback(null, data));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('"type":"done"');
    expect(res.text).toContain('"processed":0');
  });
});

describe('POST /api/ai/translate', () => {
  test('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/ai/translate').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/text/);
  });

  test('returns translated English text', async () => {
    callGemini.mockResolvedValueOnce({}); // callGeminiText is separate, mock it via jest
    // We need to mock callGeminiText too — add it to the mock at top of file
    const { callGeminiText } = require('../admin/lib/gemini');
    callGeminiText.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'Journalism Writing' }] } }],
    });
    const res = await request(app).post('/api/ai/translate').send({ text: '採訪寫作', context: 'job skill name' });
    expect(res.status).toBe(200);
    expect(res.body.en).toBe('Journalism Writing');
  });
});
```

Also update the mock at the top of `tests/ai.test.js` to include `callGeminiText`:

```js
jest.mock('../admin/lib/gemini', () => ({
  callGemini: jest.fn(),
  callGeminiText: jest.fn(),
}));
const { callGemini, callGeminiText } = require('../admin/lib/gemini');
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && npx jest tests/ai.test.js --no-coverage 2>&1
```

Expected: FAIL — `callGeminiText is not a function` or route not found errors.

- [ ] **Step 3: Add `callGeminiText` to `admin/lib/gemini.js`**

Add after the closing of `callGemini` function, before `module.exports`:

```js
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
```

- [ ] **Step 4: Update `admin/routes/ai.js` — update `init`, add batch-caption and translate**

Replace the entire file content:

```js
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
      // Write to data.json immediately to preserve partial progress
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
    // Rate limit: ~10 items/min (Gemini free tier: 15 RPM)
    if (i < targets.length - 1) {
      await new Promise(function (r) { setTimeout(r, 6000); });
    }
  }

  sendEvent({ type: 'done', processed, skipped });
  res.end();
});

// POST /api/ai/translate — translate a single Chinese string to English
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
```

- [ ] **Step 5: Update `admin/server.js` line 67 to pass `readData` and `writeData`**

Change:
```js
aiRoute.init({ ROOT });
```
To:
```js
aiRoute.init({ ROOT, readData, writeData });
```

- [ ] **Step 6: Run tests to verify they pass**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && npx jest tests/ai.test.js --no-coverage 2>&1
```

Expected: All tests PASS (5 existing + 2 new = 7 total).

- [ ] **Step 7: Run full test suite to check for regressions**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && npx jest --no-coverage 2>&1
```

Expected: All 27+ tests pass.

- [ ] **Step 8: Commit**

```bash
cd c:\Users\abon8\Documents\GitHub\web_portfolio && git add admin/lib/gemini.js admin/routes/ai.js admin/server.js tests/ai.test.js && git commit -m "feat: add batch-caption SSE endpoint and translate endpoint"
```

---

## Task 2: About route — add EN fields to allowlist

**Files:**
- Modify: `admin/routes/about.js`

- [ ] **Step 1: Write failing test**

Add to `tests/api.test.js` inside or after the existing describe block. First, check how it currently rejects unknown fields:

```js
describe('PUT /api/about/info EN fields', () => {
  test('saves nameEn and bioEn fields', async () => {
    const res = await request(app)
      .put('/api/about/info')
      .send({ nameEn: 'Tony Cheng', bioEn: 'Bio in English' });
    expect(res.status).toBe(200);
    expect(res.body.nameEn).toBe('Tony Cheng');
    expect(res.body.bioEn).toBe('Bio in English');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && npx jest tests/api.test.js --no-coverage 2>&1
```

Expected: FAIL — `nameEn` is `undefined` in response because it's not in the allowlist.

- [ ] **Step 3: Update the allowlist in `admin/routes/about.js`**

Change line 11 from:
```js
  const allowed = ['name','currentTitle','education','phone','email','facebook','instagram','bio','photo'];
```
To:
```js
  const allowed = ['name','nameEn','currentTitle','currentTitleEn','education','educationEn','phone','email','facebook','instagram','bio','bioEn','photo'];
```

- [ ] **Step 4: Run tests to verify they pass**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && npx jest tests/api.test.js --no-coverage 2>&1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd c:\Users\abon8\Documents\GitHub\web_portfolio && git add admin/routes/about.js tests/api.test.js && git commit -m "feat: add EN fields to about info allowlist"
```

---

## Task 3: Admin UI — batch AI button in works.js + modal CSS

**Files:**
- Modify: `admin/public/works.js`
- Modify: `admin/public/style.css`

No automated tests for admin UI JS — verify manually by inspecting the rendered HTML.

- [ ] **Step 1: Add batch button to toolbar HTML in `admin/public/works.js`**

In the `container.innerHTML = ...` block, the toolbar currently ends with the 3D button:
```js
'<button id="add-model-btn" class="btn-secondary">＋ 3D</button>' +
```

Add the batch button immediately after:
```js
'<button id="add-model-btn" class="btn-secondary">＋ 3D</button>' +
'<button id="batch-ai-btn" class="btn-secondary">✨ 批次英文說明</button>' +
```

- [ ] **Step 2: Add batch progress modal HTML to `admin/public/works.js`**

In the same `container.innerHTML = ...` block, after the existing `ai-modal-overlay` div (around line 37), add:

```js
// Batch progress modal
'<div class="batch-modal-overlay" id="batch-modal-overlay">' +
  '<div class="batch-modal">' +
    '<h3>✨ 批次 AI 生成英文說明</h3>' +
    '<div class="batch-progress-bar"><div class="batch-progress-fill" id="batch-progress-fill"></div></div>' +
    '<p id="batch-progress-text" class="text-muted" style="margin-top:8px;">準備中…</p>' +
    '<div class="batch-log" id="batch-log"></div>' +
    '<div class="batch-modal-actions" id="batch-modal-actions" style="display:none;margin-top:12px;">' +
      '<button class="btn-primary" id="batch-close-btn">關閉</button>' +
    '</div>' +
  '</div>' +
'</div>';
```

- [ ] **Step 3: Add batch button event listener in `admin/public/works.js`**

After the line `document.getElementById('ai-cancel-btn').addEventListener('click', closeModal);`, add:

```js
document.getElementById('batch-ai-btn').addEventListener('click', function () {
  var overlay = document.getElementById('batch-modal-overlay');
  overlay.classList.add('open');
  document.getElementById('batch-progress-fill').style.width = '0%';
  document.getElementById('batch-progress-text').textContent = '連線中…';
  document.getElementById('batch-log').innerHTML = '';
  document.getElementById('batch-modal-actions').style.display = 'none';

  var es = new EventSource('/api/ai/batch-caption');
  es.onmessage = function (e) {
    var msg = JSON.parse(e.data);
    var log = document.getElementById('batch-log');
    if (msg.type === 'progress') {
      var pct = Math.round(msg.current / msg.total * 100);
      document.getElementById('batch-progress-fill').style.width = pct + '%';
      document.getElementById('batch-progress-text').textContent =
        msg.current + ' / ' + msg.total + ' — ' + msg.src;
      var li = document.createElement('div');
      li.className = 'batch-log-item';
      li.textContent = msg.src + ': ' + (msg.captionEn || '（無）');
      log.appendChild(li);
      // Keep only the latest 5 entries visible
      while (log.children.length > 5) { log.removeChild(log.firstChild); }
    } else if (msg.type === 'done') {
      document.getElementById('batch-progress-fill').style.width = '100%';
      document.getElementById('batch-progress-text').textContent =
        '完成！已處理 ' + msg.processed + ' 件，跳過 ' + msg.skipped + ' 件';
      document.getElementById('batch-modal-actions').style.display = '';
      es.close();
      app.GET('/works').then(function (w) { works = w; renderGrid(); });
    } else if (msg.type === 'error') {
      var li = document.createElement('div');
      li.className = 'batch-log-item batch-log-error';
      li.textContent = '✗ ' + msg.id + ': ' + msg.message;
      log.appendChild(li);
      while (log.children.length > 5) { log.removeChild(log.firstChild); }
    }
  };
  es.onerror = function () {
    document.getElementById('batch-progress-text').textContent = '連線中斷';
    document.getElementById('batch-modal-actions').style.display = '';
    es.close();
  };
});

document.getElementById('batch-close-btn').addEventListener('click', function () {
  document.getElementById('batch-modal-overlay').classList.remove('open');
});
```

- [ ] **Step 4: Add batch modal CSS to `admin/public/style.css`**

Append at the end of the file:

```css
/* Batch AI progress modal */
.batch-modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}
.batch-modal-overlay.open { display: flex; }

.batch-modal {
  background: #1e2330;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 28px 32px;
  width: 480px;
  max-width: 90vw;
}

.batch-modal h3 {
  color: #f1f5f9;
  margin-bottom: 16px;
}

.batch-progress-bar {
  height: 8px;
  background: #334155;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.batch-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c64d5, #4cc3ff);
  transition: width 0.4s ease;
  width: 0%;
}

.batch-log {
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
  min-height: 60px;
  max-height: 100px;
  overflow-y: auto;
}

.batch-log-item { padding: 2px 0; }
.batch-log-error { color: #f87171; }
```

- [ ] **Step 5: Verify in browser**

Start the admin server (`npm start`), open http://localhost:3001, go to Works page — confirm "✨ 批次英文說明" button appears in toolbar. Click it — confirm modal opens with progress bar.

- [ ] **Step 6: Commit**

```bash
cd c:\Users\abon8\Documents\GitHub\web_portfolio && git add admin/public/works.js admin/public/style.css && git commit -m "feat: add batch AI caption button and progress modal to admin works page"
```

---

## Task 4: Admin UI — about.js EN fields and AI translate buttons

**Files:**
- Modify: `admin/public/about.js`

- [ ] **Step 1: Add a shared `aiTranslate` helper at the top of `app.pages['about']`**

At the very start of the `app.pages['about'] = async function(container) {` body, after `let activeTab = 'info';`, add:

```js
async function aiTranslate(zhValue, context) {
  return app.POST('/ai/translate', { text: zhValue, context: context }).then(function(r) { return r.en; });
}
```

- [ ] **Step 2: Rewrite `renderInfo` to add EN fields**

Replace the entire `function renderInfo()` with:

```js
function renderInfo() {
  tabContent.innerHTML =
    '<div class="section-box"><h3>聯絡資訊</h3>' +
    '<div class="form-grid">' +
      '<div class="form-field"><label class="form-label">姓名（中）</label><input class="form-input" id="f-name" value="' + esc(about.name) + '"></div>' +
      '<div class="form-field"><label class="form-label">姓名（英）</label><div class="input-ai-row"><input class="form-input" id="f-name-en" value="' + esc(about.nameEn || '') + '"><button class="btn-ai-sm" data-src="f-name" data-target="f-name-en" data-ctx="person full name">✨</button></div></div>' +
      '<div class="form-field"><label class="form-label">現職職稱（中）</label><input class="form-input" id="f-title" value="' + esc(about.currentTitle) + '"></div>' +
      '<div class="form-field"><label class="form-label">現職職稱（英）</label><div class="input-ai-row"><input class="form-input" id="f-title-en" value="' + esc(about.currentTitleEn || '') + '"><button class="btn-ai-sm" data-src="f-title" data-target="f-title-en" data-ctx="job title">✨</button></div></div>' +
      '<div class="form-field"><label class="form-label">學歷（中）</label><input class="form-input" id="f-edu" value="' + esc(about.education) + '"></div>' +
      '<div class="form-field"><label class="form-label">學歷（英）</label><div class="input-ai-row"><input class="form-input" id="f-edu-en" value="' + esc(about.educationEn || '') + '"><button class="btn-ai-sm" data-src="f-edu" data-target="f-edu-en" data-ctx="education history">✨</button></div></div>' +
      '<div class="form-field"><label class="form-label">電話</label><input class="form-input" id="f-phone" value="' + esc(about.phone) + '"></div>' +
      '<div class="form-field"><label class="form-label">Email</label><input class="form-input" id="f-email" value="' + esc(about.email) + '"></div>' +
      '<div class="form-field"><label class="form-label">Facebook</label><input class="form-input" id="f-fb" value="' + esc(about.facebook) + '"></div>' +
      '<div class="form-field"><label class="form-label">Instagram</label><input class="form-input" id="f-ig" value="' + esc(about.instagram) + '"></div>' +
    '</div>' +
    '<div class="form-field"><label class="form-label">自我介紹（中）</label><textarea class="form-textarea" id="f-bio" style="height:140px">' + esc(about.bio) + '</textarea></div>' +
    '<div class="form-field"><label class="form-label">自我介紹（英）</label><div class="input-ai-row" style="align-items:flex-start"><textarea class="form-textarea" id="f-bio-en" style="height:140px">' + esc(about.bioEn || '') + '</textarea><button class="btn-ai-sm" data-src="f-bio" data-target="f-bio-en" data-ctx="personal biography" style="margin-top:4px">✨</button></div></div>' +
    '<div class="btn-row"><button class="btn-primary" id="save-info">儲存基本資料</button></div>' +
    '<p id="info-status" class="text-muted" style="margin-top:8px;"></p></div>';

  // Bind AI translate buttons
  tabContent.querySelectorAll('.btn-ai-sm[data-src]').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var srcEl = document.getElementById(btn.dataset.src);
      var targetEl = document.getElementById(btn.dataset.target);
      if (!srcEl || !srcEl.value.trim()) return;
      btn.disabled = true; btn.textContent = '…';
      try {
        var en = await aiTranslate(srcEl.value, btn.dataset.ctx);
        targetEl.value = en;
      } catch(e) { /* silent */ }
      btn.textContent = '✨'; btn.disabled = false;
    });
  });

  document.getElementById('save-info').addEventListener('click', async function() {
    var statusEl = document.getElementById('info-status');
    statusEl.textContent = '儲存中…';
    try {
      var saved = await app.PUT('/about/info', {
        name:           document.getElementById('f-name').value,
        nameEn:         document.getElementById('f-name-en').value,
        currentTitle:   document.getElementById('f-title').value,
        currentTitleEn: document.getElementById('f-title-en').value,
        education:      document.getElementById('f-edu').value,
        educationEn:    document.getElementById('f-edu-en').value,
        phone:          document.getElementById('f-phone').value,
        email:          document.getElementById('f-email').value,
        facebook:       document.getElementById('f-fb').value,
        instagram:      document.getElementById('f-ig').value,
        bio:            document.getElementById('f-bio').value,
        bioEn:          document.getElementById('f-bio-en').value,
      });
      Object.assign(about, saved);
      statusEl.textContent = '✓ 已儲存';
      await app.refreshPendingCount();
    } catch(err) { statusEl.textContent = '✗ ' + err.message; }
  });
}
```

- [ ] **Step 3: Rewrite `renderSkills` to add `nameEn` field per row**

Replace the `renderRows` inner function inside `renderSkills`:

```js
function renderRows() {
  document.getElementById('skills-list').innerHTML = skills.map(function(s, i) {
    return '<div class="skill-row" data-i="' + i + '">' +
      '<input class="form-input skill-name-input" value="' + esc(s.name) + '" placeholder="技能名稱（中）" style="flex:1">' +
      '<input class="form-input skill-name-en-input" value="' + esc(s.nameEn || '') + '" placeholder="Skill (English)" style="flex:1">' +
      '<button class="btn-ai-sm skill-ai-btn" data-i="' + i + '" title="AI 翻譯">✨</button>' +
      '<div class="star-editor" id="stars-' + i + '"></div>' +
      '<button class="btn-danger" data-del="' + i + '">✕</button>' +
    '</div>';
  }).join('');
  skills.forEach(function(s, i) { app.buildStars(document.getElementById('stars-' + i), s.stars); });
  document.querySelectorAll('[data-del]').forEach(function(btn) {
    btn.addEventListener('click', function() { skills.splice(parseInt(btn.dataset.del), 1); renderRows(); });
  });
  document.querySelectorAll('.skill-ai-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var i = btn.dataset.i;
      var zhInput = document.querySelector('.skill-row[data-i="' + i + '"] .skill-name-input');
      var enInput = document.querySelector('.skill-row[data-i="' + i + '"] .skill-name-en-input');
      if (!zhInput.value.trim()) return;
      btn.disabled = true; btn.textContent = '…';
      try {
        var en = await aiTranslate(zhInput.value, 'job skill name');
        enInput.value = en;
      } catch(e) { /* silent */ }
      btn.textContent = '✨'; btn.disabled = false;
    });
  });
}
```

Also update the save handler inside `renderSkills` to include `nameEn`:

```js
var saved = skills.map(function(_, i) {
  return {
    name:   document.querySelector('.skill-row[data-i="' + i + '"] .skill-name-input').value,
    nameEn: document.querySelector('.skill-row[data-i="' + i + '"] .skill-name-en-input').value,
    stars:  app.getStarValue(document.getElementById('stars-' + i)),
  };
});
```

Also update the `add-skill` handler to include `nameEn: ''`:
```js
document.getElementById('add-skill').addEventListener('click', function() { skills.push({ name: '', nameEn: '', stars: 3 }); renderRows(); });
```

- [ ] **Step 4: Rewrite `renderWork` table to add `companyEn` and `titleEn` columns**

Replace the thead and tbody rows inside `renderRows` in `renderWork`:

```js
function renderRows() {
  document.getElementById('exp-list').innerHTML =
    '<table class="exp-table" style="width:100%;margin-bottom:8px;">' +
    '<thead><tr>' +
      '<th style="width:110px">期間</th>' +
      '<th>公司（中）</th><th>公司（英）</th>' +
      '<th>職稱（中）</th><th>職稱（英）</th>' +
      '<th style="width:36px">✨</th><th style="width:36px"></th>' +
    '</tr></thead>' +
    '<tbody>' + exp.map(function(e, i) {
      return '<tr data-i="' + i + '">' +
        '<td><input class="exp-input" data-field="period" value="' + esc(e.period) + '"></td>' +
        '<td><input class="exp-input" data-field="company" value="' + esc(e.company) + '"></td>' +
        '<td><input class="exp-input" data-field="companyEn" value="' + esc(e.companyEn || '') + '"></td>' +
        '<td><input class="exp-input" data-field="title" value="' + esc(e.title) + '"></td>' +
        '<td><input class="exp-input" data-field="titleEn" value="' + esc(e.titleEn || '') + '"></td>' +
        '<td><button class="btn-ai-sm exp-ai-btn" data-i="' + i + '">✨</button></td>' +
        '<td><button class="btn-danger" data-del="' + i + '" style="padding:4px 8px;">✕</button></td>' +
      '</tr>';
    }).join('') + '</tbody></table>';
  document.querySelectorAll('[data-del]').forEach(function(btn) {
    btn.addEventListener('click', function() { exp.splice(parseInt(btn.dataset.del), 1); renderRows(); });
  });
  document.querySelectorAll('.exp-ai-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var i = btn.dataset.i;
      var tr = document.querySelector('tr[data-i="' + i + '"]');
      var company = tr.querySelector('[data-field="company"]').value;
      var title = tr.querySelector('[data-field="title"]').value;
      btn.disabled = true; btn.textContent = '…';
      try {
        var r1 = await aiTranslate(company, 'company name');
        tr.querySelector('[data-field="companyEn"]').value = r1;
        var r2 = await aiTranslate(title, 'job title');
        tr.querySelector('[data-field="titleEn"]').value = r2;
      } catch(e) { /* silent */ }
      btn.textContent = '✨'; btn.disabled = false;
    });
  });
}
```

Update the save handler in `renderWork` to include `companyEn` and `titleEn`:

```js
var saved = Array.from(document.querySelectorAll('#exp-list tr[data-i]')).map(function(tr) {
  return {
    period:    tr.querySelector('[data-field="period"]').value,
    company:   tr.querySelector('[data-field="company"]').value,
    companyEn: tr.querySelector('[data-field="companyEn"]').value,
    title:     tr.querySelector('[data-field="title"]').value,
    titleEn:   tr.querySelector('[data-field="titleEn"]').value,
  };
});
```

Update the add-exp handler to include new EN fields:
```js
document.getElementById('add-exp').addEventListener('click', function() { exp.unshift({ period: '', company: '', companyEn: '', title: '', titleEn: '' }); renderRows(); });
```

- [ ] **Step 5: Rewrite `entryCard` to add EN fields in timeline entries**

Replace the entire `function entryCard(t)`:

```js
function entryCard(t) {
  return '<div class="timeline-entry" data-id="' + t.id + '">' +
    '<div class="timeline-header">' +
      '<span class="timeline-date-badge">' + t.date + '</span>' +
      '<span class="timeline-institution">' + esc(t.institution) + '</span>' +
      '<span class="timeline-toggle">▶ 展開</span>' +
    '</div>' +
    '<div class="timeline-body hidden">' +
      '<div class="timeline-body-grid">' +
        '<div><div class="timeline-img-preview">' + (t.image ? '<img src="/portfolio/' + t.image + '" alt="">' : '🖼') + '</div></div>' +
        '<div>' +
          '<div class="form-field"><label class="form-label">日期</label><input class="form-input tl-date" value="' + t.date + '"></div>' +
          '<div class="form-field"><label class="form-label">機構名稱（中）</label><input class="form-input tl-inst" value="' + esc(t.institution) + '"></div>' +
          '<div class="form-field"><label class="form-label">機構名稱（英）</label><div class="input-ai-row"><input class="form-input tl-inst-en" value="' + esc(t.institutionEn || '') + '"><button class="btn-ai-sm tl-ai-btn" data-zh="tl-inst" data-en="tl-inst-en" data-ctx="institution name">✨</button></div></div>' +
          '<div class="form-field"><label class="form-label">標題（中）</label><input class="form-input tl-heading" value="' + esc(t.heading) + '"></div>' +
          '<div class="form-field"><label class="form-label">標題（英）</label><div class="input-ai-row"><input class="form-input tl-heading-en" value="' + esc(t.headingEn || '') + '"><button class="btn-ai-sm tl-ai-btn" data-zh="tl-heading" data-en="tl-heading-en" data-ctx="section heading">✨</button></div></div>' +
          '<div class="form-field"><label class="form-label">內文（中）</label><textarea class="form-textarea tl-body" style="height:80px">' + esc(t.body) + '</textarea></div>' +
          '<div class="form-field"><label class="form-label">內文（英）</label><div class="input-ai-row" style="align-items:flex-start"><textarea class="form-textarea tl-body-en" style="height:80px">' + esc(t.bodyEn || '') + '</textarea><button class="btn-ai-sm tl-ai-btn" data-zh="tl-body" data-en="tl-body-en" data-ctx="biography paragraph" style="margin-top:4px">✨</button></div></div>' +
          '<div class="form-field"><label class="form-label">底部備註</label><input class="form-input tl-footer" value="' + esc(t.footer || '') + '"></div>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn-primary tl-save-btn">儲存</button>' +
        '<button class="btn-danger tl-del-btn">刪除</button>' +
      '</div>' +
      '<p class="tl-status text-muted" style="margin-top:6px;"></p>' +
    '</div>' +
  '</div>';
}
```

- [ ] **Step 6: Update `bindTimelineActions` to wire tl-ai-btn and include EN fields in save payload**

Inside `bindTimelineActions`, after the `document.querySelectorAll('.timeline-header').forEach(...)` block and before the `document.querySelectorAll('.tl-save-btn').forEach(...)` block, add:

```js
document.querySelectorAll('.tl-ai-btn').forEach(function(btn) {
  btn.addEventListener('click', async function() {
    var entry = btn.closest('.timeline-entry');
    var zhEl = entry.querySelector('.' + btn.dataset.zh);
    var enEl = entry.querySelector('.' + btn.dataset.en);
    if (!zhEl || !zhEl.value.trim()) return;
    btn.disabled = true; btn.textContent = '…';
    try {
      var en = await aiTranslate(zhEl.value, btn.dataset.ctx);
      enEl.value = en;
    } catch(e) { /* silent */ }
    btn.textContent = '✨'; btn.disabled = false;
  });
});
```

Inside the `.tl-save-btn` click handler, update the `payload` object to include EN fields:

```js
var payload = {
  date:          entry.querySelector('.tl-date').value,
  institution:   entry.querySelector('.tl-inst').value,
  institutionEn: entry.querySelector('.tl-inst-en').value,
  heading:       entry.querySelector('.tl-heading').value,
  headingEn:     entry.querySelector('.tl-heading-en').value,
  body:          entry.querySelector('.tl-body').value,
  bodyEn:        entry.querySelector('.tl-body-en').value,
  footer:        entry.querySelector('.tl-footer').value,
};
```

- [ ] **Step 7: Add `.input-ai-row` and `.btn-ai-sm` CSS to `admin/public/style.css`**

Append to the end of the file:

```css
/* Inline AI translate button rows */
.input-ai-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.input-ai-row .form-input,
.input-ai-row .form-textarea {
  flex: 1;
}
.btn-ai-sm {
  background: transparent;
  border: 1px solid #7c64d5;
  color: #a78bfa;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-ai-sm:hover { background: rgba(124,100,213,0.15); }
.btn-ai-sm:disabled { opacity: 0.5; cursor: default; }
```

- [ ] **Step 8: Verify in browser**

Open About page in admin (http://localhost:3001/#about), check each tab:
- 基本資料: EN fields appear next to ZH fields, ✨ buttons trigger API call and fill in EN fields
- 技能: each row has a nameEn input and ✨ button
- 工作經歷: table has companyEn and titleEn columns, ✨ button per row
- 學習歷程: expanded entry shows institutionEn, headingEn, bodyEn fields with ✨ buttons

- [ ] **Step 9: Commit**

```bash
cd c:\Users\abon8\Documents\GitHub\web_portfolio && git add admin/public/about.js admin/public/style.css && git commit -m "feat: add EN fields and AI translate buttons to all About admin tabs"
```

---

## Task 5: Generator — bilingual output

**Files:**
- Modify: `admin/lib/generator.js`
- Modify: `tests/generator.test.js`

- [ ] **Step 1: Update `tests/generator.test.js` to expect bilingual output**

Update the `sampleAbout` fixture to include EN fields:

```js
const sampleAbout = {
  photo: 'images/獨照.jpg',
  name: '程正邦（Tony）',
  nameEn: 'Tony Cheng',
  currentTitle: '三立新聞網 編輯組副組長',
  currentTitleEn: 'Deputy Editor, Sanlih E-Television',
  education: '輔仁大學大傳所',
  educationEn: 'Fu Jen Catholic University (MA)',
  phone: '0905579995',
  email: 'abon8820@gmail.com',
  facebook: 'https://www.facebook.com/example',
  instagram: 'https://www.instagram.com/example',
  bio: '自我介紹文字',
  bioEn: 'Self-introduction in English',
  skills: [
    { name: '新聞攝影', nameEn: 'Photojournalism', stars: 5 },
    { name: '平面設計', nameEn: 'Graphic Design', stars: 2 },
  ],
  workExperience: [{ period: '2024/4～現在', company: '三立新聞網', companyEn: 'Sanlih E-Television', title: '編輯組副組長', titleEn: 'Deputy Editor' }],
  timeline: [],
};
```

Update the `buildAboutHTML` tests to check for bilingual spans:

```js
describe('buildAboutHTML', () => {
  test('wraps name in bilingual spans', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toContain('<span class="lang-zh">程正邦（Tony）</span>');
    expect(html).toContain('<span class="lang-en">Tony Cheng</span>');
  });

  test('wraps work experience in bilingual spans', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toContain('<span class="lang-zh">三立新聞網</span>');
    expect(html).toContain('<span class="lang-en">Sanlih E-Television</span>');
    expect(html).toContain('<span class="lang-zh">編輯組副組長</span>');
    expect(html).toContain('<span class="lang-en">Deputy Editor</span>');
  });

  test('renders skill stars with bilingual name', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toContain('<span class="lang-zh">新聞攝影</span>');
    expect(html).toContain('<span class="lang-en">Photojournalism</span>');
    expect(html).toMatch(/Photojournalism[\s\S]{0,300}⭐⭐⭐⭐⭐/);
  });

  test('falls back to zh when en is empty', () => {
    const aboutNoEn = Object.assign({}, sampleAbout, { nameEn: '' });
    const html = buildAboutHTML(aboutNoEn);
    // lang-en span should contain the zh text as fallback
    expect(html).toContain('<span class="lang-en">程正邦（Tony）</span>');
  });
});
```

Update the `buildTimelineScript` test:

```js
describe('buildTimelineScript', () => {
  test('outputs dataZh and dataEn with redrawTimeline function', () => {
    const timeline = [{
      id: 't1', date: '2025-06-04', institution: '復興美工', institutionEn: 'Fuxing Art School',
      heading: '畢業', headingEn: 'Graduation', body: '內文', bodyEn: 'Body text', image: 'images/foo.jpg', footer: '',
    }];
    const script = buildTimelineScript(timeline);
    expect(script).toContain('<script>');
    expect(script).toContain('var dataZh =');
    expect(script).toContain('var dataEn =');
    expect(script).toContain('function redrawTimeline');
    expect(script).toContain('復興美工');
    expect(script).toContain('Fuxing Art School');
    expect(script).toContain('images/foo.jpg');
    expect(script).toContain('</script>');
    // Must be valid JS
    expect(() => {
      var fn = new Function(script.replace(/<\/?script>/g, '').replace(/\$\('#myTimeline'\)/g, '({empty:function(){return{albeTimeline:function(){}}}})'));
      fn();
    }).not.toThrow();
  });

  test('falls back to zh when en fields are absent', () => {
    const timeline = [{
      id: 't2', date: '2024-01-01', institution: '測試機構',
      heading: '標題', body: '內文', footer: '',
    }];
    const script = buildTimelineScript(timeline);
    // dataEn should contain zh text as fallback since no En fields
    const enSection = script.split('var dataEn =')[1];
    expect(enSection).toContain('測試機構');
    expect(enSection).toContain('標題');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && npx jest tests/generator.test.js --no-coverage 2>&1
```

Expected: FAIL — tests expect bilingual spans and `var dataZh`/`var dataEn` but generator still outputs old format.

- [ ] **Step 3: Rewrite `admin/lib/generator.js`**

Replace the entire file:

```js
/**
 * Builds the <div class="grid-item ..."> HTML for all works.
 * Works are sorted by `order` ascending.
 */
function buildWorksHTML(works) {
  const sorted = [...works].sort((a, b) => a.order - b.order);
  return sorted.map(w => {
    if (w.type === 'image') return buildImageItem(w);
    if (w.type === 'video') return buildVideoItem(w);
    if (w.type === 'three') return buildThreeItem(w);
    return '';
  }).join('\n      ');
}

function buildImageItem(w) {
  const classes = ['grid-item', ...w.categories].join(' ');
  const caption = escapeAttr(w.caption);
  const captionEn = escapeAttr(w.captionEn || '');
  return `<div class="${classes}">
        <a href="${w.src}" data-fancybox="${w.fancyboxGroup}" data-caption="${caption}" data-caption-en="${captionEn}"><img loading="lazy" decoding="async" src="${w.thumb}" /></a>
      </div>`;
}

function buildVideoItem(w) {
  const ytThumb = `https://i.ytimg.com/vi/${w.videoId}/mqdefault.jpg`;
  return `<div class="grid-item video">
        <div class="yt-facade" data-vid="${w.videoId}"><img src="${ytThumb}" alt="" loading="lazy" decoding="async"><button class="yt-play" aria-label="播放"></button></div>
      </div>`;
}

function buildThreeItem(w) {
  return `<div class="grid-item three grid-item--width4">
        <iframe src="${w.src}" frameborder="0"></iframe>
      </div>`;
}

/**
 * Returns a bilingual span pair. If en is empty, falls back to zh.
 * Pass block=true to convert newlines to <br> (for paragraph content).
 */
function bilingual(zh, en, block) {
  const zhHtml = block
    ? esc(zh).replace(/\n/g, '<br>')
    : esc(zh);
  const enHtml = block
    ? esc(en || zh).replace(/\n/g, '<br>')
    : esc(en || zh);
  return '<span class="lang-zh">' + zhHtml + '</span>' +
         '<span class="lang-en">' + enHtml + '</span>';
}

/**
 * Builds the about/bio section HTML (the .grid-item.bio divs).
 */
function buildAboutHTML(about) {
  const stars = n => '⭐'.repeat(Math.max(0, Math.min(5, n)));
  const skillRows = about.skills.map(s =>
    `<tr><td>${bilingual(s.name, s.nameEn)}</td><td>${stars(s.stars)}</td></tr>`
  ).join('\n            ');
  const expRows = about.workExperience.map(e =>
    `<tr><td>${esc(e.period)}</td><th>${bilingual(e.company, e.companyEn)}</th><td>${bilingual(e.title, e.titleEn)}</td></tr>`
  ).join('\n            ');

  return `<div class="grid-item me grid-item--width2 bio">
        <div class="info animate__animated animate__tada">
          <img loading="lazy" decoding="async" src="${about.photo}" />
          <h2>${bilingual(about.name, about.nameEn)}</h2>
          <ul>
            <li><i class="fa fa-id-card-o" aria-hidden="true"></i>&nbsp;${bilingual(about.currentTitle, about.currentTitleEn)}</li>
            <li><i class="fa fa-graduation-cap" aria-hidden="true"></i>&nbsp;${bilingual(about.education, about.educationEn)}</li>
            <li>&nbsp;<i class="fa fa-phone" aria-hidden="true"></i>&nbsp;&nbsp;<a href="tel:+886-${about.phone}">${esc(about.phone)}</a></li>
            <li><i class="fa fa-envelope-o" aria-hidden="true"></i>&nbsp;&nbsp;<a href="mailto:${about.email}">${esc(about.email)}</a></li>
          </ul>
          <h2>${bilingual('【技能】', 'Skills')}</h2>
          <table>${skillRows}</table>
        </div>
        <article>
          <p>${bilingual(about.bio, about.bioEn, true)}</p>
          <div id="social">
            <p>
              <a href="${about.facebook}" id="fb" target="_blank"><i class="fa fa-facebook-square fa-2x" aria-hidden="true"></i></a>
              <a href="${about.instagram}" id="ig" target="_blank"><i class="fa fa-instagram fa-2x" aria-hidden="true"></i></a>
            </p>
          </div>
          <hr>
          <h2>${bilingual('【工作經歷】', 'Work Experience')}</h2>
          <table>${expRows}</table>
        </article>
      </div>
      <div class="grid-item grid-item--width2 bio">
        <h2>${bilingual('【學習歷程】', 'Learning Journey')}</h2>
        <div id="myTimeline"></div>
      </div>`;
}

/**
 * Builds the inline <script> with dataZh, dataEn, and redrawTimeline for the timeline plugin.
 */
function buildTimelineScript(timeline) {
  const sorted = [...timeline].sort((a, b) => a.date.localeCompare(b.date));

  function makeEntry(t, lang) {
    const institution = lang === 'en' ? (t.institutionEn || t.institution) : t.institution;
    const heading = lang === 'en' ? (t.headingEn || t.heading) : t.heading;
    const body = lang === 'en' ? (t.bodyEn || t.body) : t.body;
    const bodyParts = [];
    if (t.image) {
      bodyParts.push(`{ tag: 'img', attr: { src: '${t.image}', width: '150px', cssclass: 'img-responsive' } }`);
    }
    bodyParts.push(`{ tag: 'h2', content: ${JSON.stringify(heading)} }`);
    bodyParts.push(`{ tag: 'p', content: ${JSON.stringify(body)} }`);
    return `{
    time: ${JSON.stringify(t.date)},
    header: ${JSON.stringify(institution)},
    body: [${bodyParts.join(', ')}],
    footer: ${JSON.stringify(t.footer || '')}
  }`;
  }

  const zhEntries = sorted.map(t => makeEntry(t, 'zh'));
  const enEntries = sorted.map(t => makeEntry(t, 'en'));

  return `<script>
var dataZh = [
  ${zhEntries.join(',\n  ')}
];
var dataEn = [
  ${enEntries.join(',\n  ')}
];
function redrawTimeline(lang) {
  $('#myTimeline').empty();
  $('#myTimeline').albeTimeline({ data: lang === 'en' ? dataEn : dataZh });
}
redrawTimeline('zh');
</script>`;
}

/**
 * Assembles index.html from template + data.
 * Template must contain: {{GRID_CONTENT}}, {{TIMELINE_DATA}}
 */
function generateHTML(data, template) {
  const worksHTML = buildWorksHTML(data.works.filter(w => w.type !== 'about'));
  const aboutHTML = buildAboutHTML(data.about);
  const timelineScript = buildTimelineScript(data.about.timeline);

  return template
    .replace('{{GRID_CONTENT}}', worksHTML + '\n      ' + aboutHTML)
    .replace('{{TIMELINE_DATA}}', timelineScript);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}

module.exports = { buildWorksHTML, buildAboutHTML, buildTimelineScript, generateHTML };
```

- [ ] **Step 4: Run generator tests**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && npx jest tests/generator.test.js --no-coverage 2>&1
```

Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && npx jest --no-coverage 2>&1
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd c:\Users\abon8\Documents\GitHub\web_portfolio && git add admin/lib/generator.js tests/generator.test.js && git commit -m "feat: bilingual span output in generator for About and timeline"
```

---

## Task 6: Frontend — template updates, `js/lang.js`, and CSS

**Files:**
- Modify: `admin/template.html`
- Create: `js/lang.js`
- Modify: `css/index.css`

No automated tests — verify by opening the public site locally.

- [ ] **Step 1: Update `admin/template.html` — DRAW submenu bilingual spans**

Replace the DRAW submenu items (lines 99–105) from:
```html
            <li id="cis1"><a data-filter=".sketch" href="javascript:;">素描</a></li>
            <li id="cis2"><a data-filter=".water" href="javascript:;">水彩</a></li>
            <li id="cis4"><a data-filter=".ink" href="javascript:;">水墨</a></li>
            <li id="cis3"><a data-filter=".oil" href="javascript:;">油畫</a></li>
            <li id="cis5"><a data-filter=".mark" href="javascript:;">麥克筆</a></li>
            <li id="cis6"><a data-filter=".digital" href="javascript:;">電繪</a></li>
```

To:
```html
            <li id="cis1"><a data-filter=".sketch" href="javascript:;"><span class="lang-zh">素描</span><span class="lang-en">Sketch</span></a></li>
            <li id="cis2"><a data-filter=".water" href="javascript:;"><span class="lang-zh">水彩</span><span class="lang-en">Watercolor</span></a></li>
            <li id="cis4"><a data-filter=".ink" href="javascript:;"><span class="lang-zh">水墨</span><span class="lang-en">Ink Wash</span></a></li>
            <li id="cis3"><a data-filter=".oil" href="javascript:;"><span class="lang-zh">油畫</span><span class="lang-en">Oil Painting</span></a></li>
            <li id="cis5"><a data-filter=".mark" href="javascript:;"><span class="lang-zh">麥克筆</span><span class="lang-en">Marker</span></a></li>
            <li id="cis6"><a data-filter=".digital" href="javascript:;"><span class="lang-zh">電繪</span><span class="lang-en">Digital</span></a></li>
```

- [ ] **Step 2: Add lang-toggle button to `admin/template.html` header**

After the closing `</nav>` tag (line 114) and before the closing `</header>` tag (line 115), add:

```html
    <button id="lang-toggle" title="Switch language">EN</button>
```

- [ ] **Step 3: Add `js/lang.js` script to `admin/template.html`**

Before `</body>` (line 132), add:

```html
  <script src="js/lang.js"></script>
```

- [ ] **Step 4: Create `js/lang.js`**

```js
(function () {
  var STORAGE_KEY = 'portfolio-lang';

  function setLang(lang) {
    var html = document.documentElement;
    html.classList.remove('lang-zh', 'lang-en');
    html.classList.add('lang-' + lang);
    html.setAttribute('lang', lang === 'en' ? 'en' : 'zh-TW');

    // Update toggle button text (show opposite language as the label)
    var btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = lang === 'en' ? '中' : 'EN';

    // Swap data-caption for Fancybox lightbox items
    document.querySelectorAll('[data-caption-en]').forEach(function (el) {
      var zh = el.dataset.captionZhBackup || el.dataset.caption;
      var en = el.dataset.captionEn || zh;
      if (!el.dataset.captionZhBackup) el.dataset.captionZhBackup = zh;
      el.dataset.caption = lang === 'en' ? en : zh;
    });

    // Timeline redraw (if initialized)
    if (typeof redrawTimeline === 'function') redrawTimeline(lang);

    localStorage.setItem(STORAGE_KEY, lang);
  }

  // Initialize from localStorage, default to Chinese
  var saved = localStorage.getItem(STORAGE_KEY) || 'zh';
  setLang(saved);

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('lang-toggle');
    if (btn) {
      // Sync button text (setLang may have run before DOMContentLoaded)
      btn.textContent = saved === 'en' ? '中' : 'EN';
      btn.addEventListener('click', function () {
        var current = document.documentElement.classList.contains('lang-en') ? 'en' : 'zh';
        setLang(current === 'en' ? 'zh' : 'en');
      });
    }
  });
})();
```

- [ ] **Step 5: Add lang toggle CSS to `css/index.css`**

Append at the end of the file:

```css
/* Language toggle — hide all .lang-en spans by default */
.lang-en { display: none; }
/* When html has lang-en class, swap visibility */
html.lang-en .lang-zh { display: none; }
html.lang-en .lang-en { display: inline; }

/* Lang toggle button in header */
#lang-toggle {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.5);
  color: white;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 12px;
  vertical-align: middle;
  flex-shrink: 0;
}
#lang-toggle:hover { background: rgba(255,255,255,0.15); }
```

- [ ] **Step 6: Regenerate `index.html` to embed bilingual spans from updated generator**

```
cd c:\Users\abon8\Documents\GitHub\web_portfolio && node admin/generate.js 2>&1
```

Expected: `index.html` regenerated successfully (no errors).

- [ ] **Step 7: Verify in browser**

Open `index.html` directly in the browser (or via the admin's `/portfolio/index.html`):
- Confirm "EN" button appears in header
- Click "EN" — confirm DRAW submenu items switch to English (Sketch, Watercolor, etc.)
- Confirm About section shows English text
- Click "中" — confirm switching back
- Reload page — confirm language preference persists

- [ ] **Step 8: Commit**

```bash
cd c:\Users\abon8\Documents\GitHub\web_portfolio && git add admin/template.html js/lang.js css/index.css && git commit -m "feat: add ZH/EN language toggle — button, CSS, lang.js, bilingual nav"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in |
|-----------------|-----------|
| ZH/EN toggle button in header | Task 6 Step 2 |
| Nav DRAW submenu bilingual | Task 6 Step 1 |
| DESIGN submenu kept Chinese (brand names) | Not modified — ✓ correct by omission |
| Fancybox caption swap on toggle | Task 6 Step 4 (`lang.js`) |
| About page fully bilingual | Task 5 (`generator.js`) |
| Timeline bilingual with redrawTimeline | Task 5 |
| localStorage persistence | Task 6 Step 4 |
| Batch AI caption generation (SSE) | Task 1, Task 3 |
| `POST /api/ai/translate` endpoint | Task 1 |
| About admin EN fields — all 4 tabs | Task 4 |
| About route allowlist for EN fields | Task 2 |
| `callGeminiText` for text-only Gemini | Task 1 |
| CSS `.lang-en { display:none }` | Task 6 Step 5 |
| EN fallback to ZH when empty | Task 5 (`en || zh` in `bilingual()`) |

**Placeholder scan:** No TBDs or incomplete sections found.

**Type consistency:** `bilingual(zh, en, block?)` defined in Task 5 Step 3 and used consistently. `callGeminiText` added to `gemini.js` exports and imported in `ai.js`. `readData`/`writeData` passed to `aiRoute.init` in Task 1 Step 5.
