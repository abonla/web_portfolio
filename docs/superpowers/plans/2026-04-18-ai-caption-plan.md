# AI Caption Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ✨ AI 生成 button that calls Gemini Vision to generate Chinese/English captions, category suggestions, and Fancybox group names — both on the image upload page and on existing works cards.

**Architecture:** Backend `admin/lib/gemini.js` wraps the Gemini REST API; `admin/routes/ai.js` exposes `POST /api/ai/caption` accepting either a server-side `imagePath` (for existing works) or a `imageBase64`+`mimeType` pair (for new uploads before they're saved). Frontend sends base64 from the Cropper for new uploads, and the image path for existing works. Results fill the caption/captionEn/categories/fancyboxGroup fields. `captionEn` is stored in `data.json` and written as a `data-caption-en` attribute in the generated HTML for future language switching.

**Tech Stack:** Node.js `https` module (no new deps), Gemini 2.0 Flash REST API, Jest mocking for unit tests, vanilla JS fetch in the browser.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `admin/lib/gemini.js` | **Create** | Wraps Gemini REST API call |
| `admin/routes/ai.js` | **Create** | `POST /api/ai/caption` endpoint |
| `tests/ai.test.js` | **Create** | 4 tests for the AI route |
| `admin/server.js` | **Modify** | Fix ROOT_PATH bug, raise JSON body limit, mount ai route |
| `admin/lib/generator.js` | **Modify** | Add `data-caption-en` attr to `buildImageItem` |
| `tests/generator.test.js` | **Modify** | Add 1 test for `data-caption-en` |
| `admin/routes/upload.js` | **Modify** | Pass `captionEn` through to returned work object |
| `admin/public/upload-image.js` | **Modify** | Add captionEn field + AI button wired to `/api/ai/caption` |
| `admin/public/works.js` | **Modify** | Add ✨ button on image cards + AI confirm modal |
| `admin/public/style.css` | **Modify** | Styles for `.btn-ai` and `.ai-modal-overlay` |

---

## Task 1: Gemini lib + AI route + server wiring

**Files:**
- Create: `admin/lib/gemini.js`
- Create: `admin/routes/ai.js`
- Create: `tests/ai.test.js`
- Modify: `admin/server.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/ai.test.js
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock BEFORE requiring server (jest.mock is hoisted automatically)
jest.mock('../admin/lib/gemini', () => ({
  callGemini: jest.fn(),
}));
const { callGemini } = require('../admin/lib/gemini');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-test-'));
const tmpDataPath = path.join(tmpDir, 'data.json');
const tmpTemplatePath = path.join(tmpDir, 'template.html');
const sampleData = {
  works: [],
  about: { photo: '', name: '', currentTitle: '', education: '', phone: '', email: '', facebook: '', instagram: '', bio: '', skills: [], workExperience: [], timeline: [] },
  meta: { siteTitle: '', description: '', ogImage: '' },
};
fs.writeFileSync(tmpDataPath, JSON.stringify(sampleData, null, 2));
fs.writeFileSync(tmpTemplatePath, '<html>{{GRID_CONTENT}}{{TIMELINE_DATA}}</html>');

// Create a fake image file inside tmpDir so the route can find it
const fakeImagePath = path.join(tmpDir, 'test.jpg');
fs.writeFileSync(fakeImagePath, Buffer.from('fake'));

process.env.DATA_PATH = tmpDataPath;
process.env.TEMPLATE_PATH = tmpTemplatePath;
process.env.OUTPUT_PATH = path.join(tmpDir, 'index.html');
process.env.ROOT_PATH = tmpDir;
process.env.GEMINI_API_KEY = 'test-key';

const { app } = require('../admin/server');

describe('POST /api/ai/caption', () => {
  test('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/ai/caption').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/imagePath|imageBase64/);
  });

  test('returns 400 when imagePath does not exist', async () => {
    const res = await request(app).post('/api/ai/caption').send({ imagePath: 'ghost.jpg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/不存在/);
  });

  test('returns AI result from imagePath', async () => {
    callGemini.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: '{"captionZh":"城市夜景","captionEn":"City night","categories":["PHOTO"],"fancyboxGroup":"city"}' }] } }],
    });
    const res = await request(app).post('/api/ai/caption').send({ imagePath: 'test.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.captionZh).toBe('城市夜景');
    expect(res.body.captionEn).toBe('City night');
    expect(res.body.categories).toEqual(['PHOTO']);
    expect(res.body.fancyboxGroup).toBe('city');
  });

  test('strips markdown code fences from Gemini response', async () => {
    callGemini.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: '```json\n{"captionZh":"插畫","captionEn":"Illustration","categories":["DRAW"],"fancyboxGroup":"art"}\n```' }] } }],
    });
    const res = await request(app).post('/api/ai/caption').send({ imagePath: 'test.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.captionZh).toBe('插畫');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- tests/ai.test.js --verbose
```

Expected: FAIL — `Cannot find module '../admin/lib/gemini'`

- [ ] **Step 3: Create `admin/lib/gemini.js`**

```js
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

module.exports = { callGemini };
```

- [ ] **Step 4: Create `admin/routes/ai.js`**

```js
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
```

- [ ] **Step 5: Modify `admin/server.js` — fix ROOT bug, raise JSON limit, mount AI route**

Current line 6:
```js
const ROOT = path.env && process.env.ROOT_PATH ? process.env.ROOT_PATH : path.join(__dirname, '..');
```
Replace with:
```js
const ROOT = process.env.ROOT_PATH || path.join(__dirname, '..');
```

Current line 13:
```js
app.use(express.json());
```
Replace with:
```js
app.use(express.json({ limit: '20mb' }));
```

After the `publishRoute` block (after line 64), add:
```js
const aiRoute = require('./routes/ai');
aiRoute.init({ ROOT });
app.use('/api/ai', aiRoute.router);
```

- [ ] **Step 6: Run tests**

```
npm test -- tests/ai.test.js --verbose
```

Expected: 4 tests PASS

- [ ] **Step 7: Run all tests to verify no regressions**

```
npm test --verbose
```

Expected: 31 tests PASS (27 existing + 4 new)

- [ ] **Step 8: Commit**

```bash
git add admin/lib/gemini.js admin/routes/ai.js tests/ai.test.js admin/server.js
git commit -m "feat: add Gemini AI caption route and gemini lib"
```

---

## Task 2: captionEn in generator + upload route

**Files:**
- Modify: `admin/lib/generator.js` (line 15–21, `buildImageItem`)
- Modify: `admin/routes/upload.js` (line 28–35)
- Modify: `tests/generator.test.js` (add one test)

- [ ] **Step 1: Write failing test in `tests/generator.test.js`**

Open `tests/generator.test.js`. In the `buildWorksHTML` describe block, add after the last test:

```js
test('includes data-caption-en attribute', () => {
  const works = [
    {
      id: '1',
      type: 'image',
      src: 'images/a.jpg',
      thumb: 'images/am.jpg',
      caption: 'Test',
      captionEn: 'Test EN',
      categories: ['painter'],
      fancyboxGroup: 'g',
      order: 0,
    },
  ];
  const html = buildWorksHTML(works);
  expect(html).toContain('data-caption-en="Test EN"');
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- tests/generator.test.js --verbose
```

Expected: FAIL — `data-caption-en` not found

- [ ] **Step 3: Modify `admin/lib/generator.js` — update `buildImageItem`**

Current `buildImageItem` (lines 15–21):
```js
function buildImageItem(w) {
  const classes = ['grid-item', ...w.categories].join(' ');
  const caption = escapeAttr(w.caption);
  return `<div class="${classes}">
        <a href="${w.src}" data-fancybox="${w.fancyboxGroup}" data-caption="${caption}"><img loading="lazy" decoding="async" src="${w.thumb}" /></a>
      </div>`;
}
```

Replace with:
```js
function buildImageItem(w) {
  const classes = ['grid-item', ...w.categories].join(' ');
  const caption = escapeAttr(w.caption);
  const captionEn = escapeAttr(w.captionEn || '');
  return `<div class="${classes}">
        <a href="${w.src}" data-fancybox="${w.fancyboxGroup}" data-caption="${caption}" data-caption-en="${captionEn}"><img loading="lazy" decoding="async" src="${w.thumb}" /></a>
      </div>`;
}
```

- [ ] **Step 4: Modify `admin/routes/upload.js` — add captionEn to work object**

Current work object (lines 28–35):
```js
const work = {
  type: 'image',
  src: result.originalSrc,
  thumb: result.thumbSrc,
  caption: req.body.caption || '',
  categories: JSON.parse(req.body.categories || '[]'),
  fancyboxGroup: req.body.fancyboxGroup || '',
};
```

Replace with:
```js
const work = {
  type: 'image',
  src: result.originalSrc,
  thumb: result.thumbSrc,
  caption: req.body.caption || '',
  captionEn: req.body.captionEn || '',
  categories: JSON.parse(req.body.categories || '[]'),
  fancyboxGroup: req.body.fancyboxGroup || '',
};
```

- [ ] **Step 5: Run all tests**

```
npm test --verbose
```

Expected: 32 tests PASS

- [ ] **Step 6: Commit**

```bash
git add admin/lib/generator.js admin/routes/upload.js tests/generator.test.js
git commit -m "feat: add captionEn field to generator and upload route"
```

---

## Task 3: Upload-image page — captionEn field + AI button

**Files:**
- Modify: `admin/public/upload-image.js`
- Modify: `admin/public/style.css`

No automated test — verify manually by starting the server and uploading an image.

- [ ] **Step 1: Add CSS for AI button to `admin/public/style.css`**

Append to the end of `admin/public/style.css`:

```css
/* AI generate button */
.btn-ai {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  align-self: flex-end;
  margin-bottom: 2px;
}
.btn-ai:hover { opacity: 0.85; }
.btn-ai:disabled { opacity: 0.4; cursor: not-allowed; }

.caption-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.caption-row textarea {
  flex: 1;
}
```

- [ ] **Step 2: Replace `admin/public/upload-image.js` with the new version**

Replace the entire file with:

```js
const app = window.adminApp;

app.pages['upload-image'] = function (container) {
  let cropper = null;

  container.innerHTML =
    '<h2 style="margin-bottom:20px;color:#f1f5f9;">上傳圖片</h2>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">' +
      '<div class="section-box">' +
        '<h3>選擇圖片 &amp; 裁切縮圖範圍</h3>' +
        '<div class="upload-zone" id="drop-zone"><div class="upload-icon">📂</div>拖拉圖片到這裡，或點擊選擇<small class="text-muted" style="display:block;margin-top:6px;">支援 JPG、PNG、WebP</small></div>' +
        '<input type="file" id="file-input" accept="image/*" style="display:none">' +
        '<div class="crop-wrapper hidden" id="crop-wrapper"><div class="crop-container"><img id="crop-img" src="" alt=""></div><div class="crop-controls"><button class="btn-sm" id="reset-crop">重設裁切</button></div></div>' +
      '</div>' +
      '<div class="section-box">' +
        '<h3>作品資訊</h3>' +
        '<div class="form-field"><label class="form-label">檔名</label><input class="form-input" id="base-name" placeholder="例：媽祖插畫"></div>' +
        '<div class="form-field"><label class="form-label">說明文字（中）</label>' +
          '<div class="caption-row">' +
            '<textarea class="form-textarea" id="caption" placeholder="作品說明…"></textarea>' +
            '<button class="btn-ai" id="btn-ai-gen" type="button" disabled>✨ AI 生成</button>' +
          '</div>' +
        '</div>' +
        '<div class="form-field"><label class="form-label">說明文字（英）</label><textarea class="form-textarea" id="caption-en" placeholder="English caption…"></textarea></div>' +
        '<div class="form-field"><label class="form-label">FancyBox 群組</label><input class="form-input" id="fancybox-group" placeholder="painter"></div>' +
        '<div class="form-field"><label class="form-label">分類標籤</label><div class="chip-group" id="chip-group"></div></div>' +
        '<div class="btn-row"><button class="btn-primary" id="save-btn" disabled>儲存作品</button><button class="btn-secondary" onclick="location.hash=\'#works\'">取消</button></div>' +
        '<p id="upload-status" class="text-muted" style="margin-top:10px;"></p>' +
      '</div>' +
    '</div>';

  app.buildChips(document.getElementById('chip-group'), ['painter']);

  const dropZone    = document.getElementById('drop-zone');
  const fileInput   = document.getElementById('file-input');
  const cropWrapper = document.getElementById('crop-wrapper');
  const cropImg     = document.getElementById('crop-img');
  const saveBtn     = document.getElementById('save-btn');
  const aiBtn       = document.getElementById('btn-ai-gen');
  const statusEl    = document.getElementById('upload-status');
  let selectedFile  = null;

  function loadFile(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = function (e) {
      cropImg.src = e.target.result;
      cropWrapper.classList.remove('hidden');
      dropZone.classList.add('hidden');
      if (cropper) cropper.destroy();
      cropper = new Cropper(cropImg, {
        viewMode: 1,
        autoCropArea: 1,
        movable: true,
        zoomable: false,
      });
      document.getElementById('base-name').value = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^\w\u4e00-\u9fff-]/g, '_');
      saveBtn.disabled = false;
      aiBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
  });
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  });
  document.getElementById('reset-crop').addEventListener('click', function () {
    if (cropper) cropper.reset();
  });

  aiBtn.addEventListener('click', async function () {
    if (!cropImg.src || !selectedFile) return;
    aiBtn.textContent = '生成中…';
    aiBtn.disabled = true;
    statusEl.textContent = '';
    try {
      // Extract base64 from the dataURL already loaded by FileReader
      const dataURL = cropImg.src;
      const commaIdx = dataURL.indexOf(',');
      const base64Data = dataURL.slice(commaIdx + 1);
      const mimeType = selectedFile.type || 'image/jpeg';

      const result = await app.POST('/ai/caption', {
        imageBase64: base64Data,
        mimeType: mimeType,
      });

      document.getElementById('caption').value = result.captionZh || '';
      document.getElementById('caption-en').value = result.captionEn || '';
      document.getElementById('fancybox-group').value = result.fancyboxGroup || '';

      // Update chip selection
      const chipGroup = document.getElementById('chip-group');
      chipGroup.querySelectorAll('.chip').forEach(function (chip) {
        chip.classList.toggle(
          'selected',
          (result.categories || []).includes(chip.dataset.value)
        );
      });
    } catch (err) {
      statusEl.textContent = '✗ AI 生成失敗：' + err.message;
    }
    aiBtn.textContent = '✨ AI 生成';
    aiBtn.disabled = false;
  });

  saveBtn.addEventListener('click', async function () {
    if (!selectedFile || !cropper) return;
    saveBtn.disabled = true;
    statusEl.textContent = '處理中…';
    try {
      const cropData = cropper.getData(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('baseName', document.getElementById('base-name').value);
      formData.append('caption', document.getElementById('caption').value);
      formData.append('captionEn', document.getElementById('caption-en').value);
      formData.append('fancyboxGroup', document.getElementById('fancybox-group').value);
      formData.append(
        'categories',
        JSON.stringify(app.getSelectedChips(document.getElementById('chip-group')))
      );
      formData.append('crop', JSON.stringify(cropData));

      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error);
      const data = await uploadRes.json();

      await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.work),
      });
      await app.refreshPendingCount();
      statusEl.textContent = '✓ 儲存成功！';
      setTimeout(function () { location.hash = '#works'; }, 800);
    } catch (err) {
      statusEl.textContent = '✗ 錯誤：' + err.message;
      saveBtn.disabled = false;
    }
  });
};
```

- [ ] **Step 3: Verify manually**

```
npm start
```

Open http://localhost:3001/#upload-image

1. The ✨ AI 生成 button is visible but greyed out
2. Drag in a JPG → button becomes active
3. Click ✨ AI 生成 → button shows "生成中…"
4. After ~3s: caption（中）、caption（英）、分類、群組 are filled in
5. Fields are editable after fill
6. Save still works normally

Kill server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add admin/public/upload-image.js admin/public/style.css
git commit -m "feat: add AI caption button to upload-image page"
```

---

## Task 4: Works list — AI button on cards + confirm modal

**Files:**
- Modify: `admin/public/works.js`
- Modify: `admin/public/style.css`

- [ ] **Step 1: Add CSS for AI modal to `admin/public/style.css`**

Append to end of `admin/public/style.css`:

```css
/* AI confirm modal (works list) */
.ai-modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 200;
  align-items: center;
  justify-content: center;
}
.ai-modal-overlay.open { display: flex; }
.ai-modal {
  background: #1e2330;
  border: 1px solid #2d3748;
  border-radius: 12px;
  padding: 24px;
  width: 440px;
  max-width: 90vw;
}
.ai-modal h3 { color: #f1f5f9; font-size: 15px; margin-bottom: 16px; }
.ai-result-row { margin-bottom: 12px; }
.ai-result-label { font-size: 11px; color: #64748b; margin-bottom: 3px; }
.ai-result-value { font-size: 13px; color: #e2e8f0; background: #131720; border-radius: 4px; padding: 6px 8px; }
.ai-modal-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
```

- [ ] **Step 2: Replace `admin/public/works.js` with the new version**

Replace the entire file with:

```js
const app = window.adminApp;

const FILTER_TABS = ['*', 'painter', 'cis1', 'photo', 'video', 'web', 'three', 'news'];
const FILTER_NAMES = ['全部', 'DRAW', 'DESIGN', 'PHOTO', 'VIDEO', 'WEB', '3D', 'NEWS'];

app.pages['works'] = async function (container) {
  let works = await app.GET('/works');
  let activeFilter = '*';
  let aiTarget = null; // { work, btnEl } currently being processed

  container.innerHTML =
    '<div class="works-toolbar">' +
      '<button id="add-image-btn" class="btn-primary">＋ 圖片</button>' +
      '<button id="add-video-btn" class="btn-secondary">＋ YouTube</button>' +
      '<button id="add-model-btn" class="btn-secondary">＋ 3D</button>' +
      '<div class="filter-tabs">' +
        FILTER_TABS.map(function (f, i) {
          return '<button class="filter-tab ' + (f === '*' ? 'active' : '') + '" data-filter="' + f + '">' + FILTER_NAMES[i] + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div id="works-grid" class="works-grid"></div>' +
    // AI confirm modal
    '<div class="ai-modal-overlay" id="ai-modal-overlay">' +
      '<div class="ai-modal">' +
        '<h3>✨ AI 建議內容</h3>' +
        '<div class="ai-result-row"><div class="ai-result-label">說明（中文）</div><div class="ai-result-value" id="ai-zh"></div></div>' +
        '<div class="ai-result-row"><div class="ai-result-label">說明（英文）</div><div class="ai-result-value" id="ai-en"></div></div>' +
        '<div class="ai-result-row"><div class="ai-result-label">分類</div><div class="ai-result-value" id="ai-cats"></div></div>' +
        '<div class="ai-result-row"><div class="ai-result-label">Fancybox 群組</div><div class="ai-result-value" id="ai-group"></div></div>' +
        '<div class="ai-modal-actions">' +
          '<button class="btn-secondary" id="ai-cancel-btn">取消</button>' +
          '<button class="btn-primary" id="ai-apply-btn">套用</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  let pendingAiResult = null;

  function openModal(result) {
    pendingAiResult = result;
    document.getElementById('ai-zh').textContent = result.captionZh || '（無）';
    document.getElementById('ai-en').textContent = result.captionEn || '（無）';
    document.getElementById('ai-cats').textContent = (result.categories || []).join(', ') || '（無）';
    document.getElementById('ai-group').textContent = result.fancyboxGroup || '（無）';
    document.getElementById('ai-modal-overlay').classList.add('open');
  }

  function closeModal() {
    document.getElementById('ai-modal-overlay').classList.remove('open');
    pendingAiResult = null;
    if (aiTarget && aiTarget.btnEl) {
      aiTarget.btnEl.textContent = '✨';
      aiTarget.btnEl.disabled = false;
    }
    aiTarget = null;
  }

  document.getElementById('ai-cancel-btn').addEventListener('click', closeModal);

  document.getElementById('ai-apply-btn').addEventListener('click', async function () {
    if (!pendingAiResult || !aiTarget) return;
    const applyBtn = document.getElementById('ai-apply-btn');
    applyBtn.disabled = true;
    applyBtn.textContent = '套用中…';
    try {
      await app.PUT('/works/' + aiTarget.work.id, {
        caption: pendingAiResult.captionZh,
        captionEn: pendingAiResult.captionEn,
        categories: pendingAiResult.categories,
        fancyboxGroup: pendingAiResult.fancyboxGroup,
      });
      works = await app.GET('/works');
      app.refreshPendingCount();
      closeModal();
      renderGrid();
    } catch (err) {
      applyBtn.textContent = '套用';
      applyBtn.disabled = false;
    }
  });

  function renderGrid() {
    const filtered =
      activeFilter === '*'
        ? works
        : works.filter(function (w) {
            return w.categories && w.categories.includes(activeFilter);
          });
    const grid = document.getElementById('works-grid');
    grid.innerHTML = filtered.length
      ? filtered.map(workCard).join('')
      : '<p class="text-muted">沒有作品</p>';
    bindCardActions();
  }

  function workCard(w) {
    let thumbHTML;
    if (w.type === 'image') {
      thumbHTML = '<img src="/portfolio/' + w.thumb + '" alt="" loading="lazy">';
    } else if (w.type === 'video') {
      thumbHTML =
        '<img src="https://i.ytimg.com/vi/' + w.videoId + '/mqdefault.jpg" alt="">';
    } else {
      thumbHTML = '<span>🎮</span>';
    }
    const tagsHTML = (w.categories || [])
      .map(function (c) {
        return '<span class="tag ' + c + '">' + c + '</span>';
      })
      .join('');
    // AI button only for image works
    const aiBtn =
      w.type === 'image'
        ? '<button class="card-btn ai-card-btn" title="AI 生成">✨</button>'
        : '';
    return (
      '<div class="work-card" data-id="' + w.id + '">' +
        '<div class="thumb">' + thumbHTML + '</div>' +
        '<div class="card-actions">' +
          aiBtn +
          '<button class="card-btn del-btn" title="刪除">🗑</button>' +
        '</div>' +
        '<div class="card-info">' +
          '<div class="card-caption">' +
            (w.caption || w.label || w.videoId || '（無說明）') +
          '</div>' +
          '<div class="card-tags">' + tagsHTML + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function bindCardActions() {
    document.querySelectorAll('.del-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        const id = e.target.closest('.work-card').dataset.id;
        if (!confirm('確定刪除？')) return;
        await app.DEL('/works/' + id);
        works = await app.GET('/works');
        app.refreshPendingCount();
        renderGrid();
      });
    });

    document.querySelectorAll('.ai-card-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        const card = e.target.closest('.work-card');
        const work = works.find(function (w) { return w.id === card.dataset.id; });
        if (!work) return;
        aiTarget = { work: work, btnEl: btn };
        btn.textContent = '…';
        btn.disabled = true;
        try {
          const result = await app.POST('/ai/caption', { imagePath: work.src });
          openModal(result);
        } catch (err) {
          btn.textContent = '✨';
          btn.disabled = false;
          alert('AI 生成失敗：' + err.message);
        }
      });
    });
  }

  container.querySelectorAll('.filter-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      container
        .querySelectorAll('.filter-tab')
        .forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderGrid();
    });
  });

  document.getElementById('add-image-btn').addEventListener('click', function () {
    location.hash = '#upload-image';
  });
  document.getElementById('add-video-btn').addEventListener('click', function () {
    location.hash = '#upload-video';
  });
  document.getElementById('add-model-btn').addEventListener('click', function () {
    location.hash = '#upload-model';
  });

  renderGrid();
};
```

- [ ] **Step 3: Verify manually**

```
npm start
```

Open http://localhost:3001/#works

1. Image cards show ✨ button in the top-right action area (video/3D cards do not)
2. Click ✨ on any image card → button shows "…"
3. After a few seconds: modal appears with zh/en caption, categories, group
4. Click 「取消」→ modal closes, button restores
5. Click ✨ again → modal → click 「套用」→ card caption updates, modal closes

Kill server with Ctrl+C.

- [ ] **Step 4: Run all tests to confirm nothing broken**

```
npm test --verbose
```

Expected: 32 tests PASS

- [ ] **Step 5: Commit**

```bash
git add admin/public/works.js admin/public/style.css
git commit -m "feat: add AI caption button to works list with confirm modal"
```

---

## Done

All 4 tasks complete. Verify with:

```
npm test --verbose   # 32 tests PASS
npm start            # manual smoke test both pages
```
