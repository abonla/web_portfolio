# Portfolio Admin — Plan 3: Admin UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete browser-based admin UI served at `http://localhost:3001`. All interactions call the API routes from Plan 2. No framework — vanilla JS + Fetch API.

**Architecture:** Single-page application with hash-based routing (`#works`, `#about`, `#settings`). One `index.html` shell, one `style.css`, one `app.js` that owns routing and state. Each section is a module function that renders into `<main id="content">`. Cropper.js loaded via CDN for the image crop UI.

**Tech Stack:** HTML5, CSS3, Vanilla JS (ES2020), Fetch API, Cropper.js (CDN), Server-Sent Events (for publish log)

**Prerequisite:** Plan 2 complete — all API routes respond correctly.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `admin/public/index.html` | Create | Shell: topbar, sidebar nav, `<main id="content">`, CDN scripts |
| `admin/public/style.css` | Create | Dark theme, layout, all component styles |
| `admin/public/app.js` | Create | Router, API helpers, shared utilities |
| `admin/public/works.js` | Create | Works list page + filter tabs |
| `admin/public/upload-image.js` | Create | Image upload + Cropper.js panel |
| `admin/public/upload-video.js` | Create | YouTube URL panel |
| `admin/public/upload-model.js` | Create | 3D model zip upload panel |
| `admin/public/about.js` | Create | About page: 4 tabs (info, skills, experience, timeline) |
| `admin/public/settings.js` | Create | Site settings page |
| `admin/public/publish.js` | Create | Publish button + SSE log display |

---

## Task 1: Shell HTML + CSS + Router

**Files:**
- Create: `admin/public/index.html`
- Create: `admin/public/style.css`
- Create: `admin/public/app.js`

- [ ] **Step 1: Create `admin/public/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Admin</title>
  <link rel="stylesheet" href="style.css">
  <!-- Cropper.js -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>
</head>
<body>
  <div class="admin-topbar">
    <div class="brand">Tony Cheng <span>Admin</span></div>
    <button id="publish-btn" class="publish-btn">
      <span class="pending-dot"></span>
      <span id="pending-count">載入中…</span>
    </button>
  </div>

  <div class="admin-layout">
    <nav class="admin-sidebar">
      <a href="#works"    class="nav-item" data-page="works">🖼 作品管理</a>
      <a href="#about"    class="nav-item" data-page="about">👤 關於我</a>
      <a href="#settings" class="nav-item" data-page="settings">⚙️ 網站設定</a>
    </nav>
    <main id="content" class="admin-content">
      <p class="loading">載入中…</p>
    </main>
  </div>

  <!-- Publish modal -->
  <div id="publish-modal" class="modal hidden">
    <div class="modal-box">
      <h3>發布到 GitHub</h3>
      <div id="publish-log" class="git-log"></div>
      <button id="close-publish-modal" class="btn-secondary">關閉</button>
    </div>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `admin/public/style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f1117;
  color: #e2e8f0;
  min-height: 100vh;
}

/* ── Topbar ── */
.admin-topbar {
  position: sticky; top: 0; z-index: 100;
  background: #1a1f2e;
  border-bottom: 1px solid #2d3748;
  padding: 12px 20px;
  display: flex; align-items: center; justify-content: space-between;
}
.brand { font-weight: 700; font-size: 15px; }
.brand span { color: #60a5fa; }

.publish-btn {
  background: #2563eb; color: white; border: none;
  border-radius: 8px; padding: 8px 18px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 8px;
}
.publish-btn:hover { background: #1d4ed8; }
.pending-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #86efac; display: none;
}
.pending-dot.has-changes { display: block; background: #fbbf24; }

/* ── Layout ── */
.admin-layout { display: flex; height: calc(100vh - 49px); }

.admin-sidebar {
  width: 160px; flex-shrink: 0;
  background: #151921;
  border-right: 1px solid #2d3748;
  padding: 16px 0;
  display: flex; flex-direction: column;
}
.nav-item {
  padding: 10px 20px; font-size: 13px; color: #94a3b8;
  text-decoration: none; display: flex; align-items: center; gap: 8px;
  border-right: 2px solid transparent;
}
.nav-item:hover { color: #e2e8f0; background: #1e2330; }
.nav-item.active { color: #60a5fa; background: #1e2d4a; border-right-color: #3b82f6; }

.admin-content {
  flex: 1; overflow-y: auto; padding: 24px;
  background: #131720;
}

/* ── Common ── */
.loading { color: #475569; font-size: 14px; }
.section-box {
  background: #1e2330; border: 1px solid #2d3748;
  border-radius: 10px; padding: 18px 20px; margin-bottom: 18px;
}
.section-box h3 { color: #f1f5f9; font-size: 14px; margin-bottom: 14px; }

.form-label {
  font-size: 11px; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.5px;
  display: block; margin-bottom: 5px;
}
.form-input, .form-textarea, .form-select {
  width: 100%; background: #0f1117;
  border: 1px solid #2d3748; border-radius: 7px;
  padding: 9px 12px; color: #e2e8f0; font-size: 13px;
  outline: none; font-family: inherit;
}
.form-input:focus, .form-textarea:focus { border-color: #3b82f6; }
.form-textarea { resize: vertical; min-height: 80px; }
.form-field { margin-bottom: 14px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

.btn-primary {
  background: #2563eb; color: white; border: none;
  border-radius: 7px; padding: 9px 22px;
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary {
  background: transparent; color: #94a3b8;
  border: 1px solid #334155; border-radius: 7px;
  padding: 9px 16px; font-size: 13px; cursor: pointer;
}
.btn-secondary:hover { border-color: #60a5fa; color: #60a5fa; }
.btn-danger {
  background: transparent; color: #ef4444;
  border: 1px solid #7f1d1d; border-radius: 7px;
  padding: 6px 12px; font-size: 12px; cursor: pointer;
}
.btn-danger:hover { background: #7f1d1d; }
.btn-sm {
  background: #1e2330; border: 1px solid #334155; color: #94a3b8;
  border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;
}
.btn-sm:hover { border-color: #60a5fa; color: #60a5fa; }
.btn-row { display: flex; gap: 8px; margin-top: 14px; }

.tag {
  background: #1e2d4a; color: #60a5fa;
  border-radius: 4px; padding: 2px 7px; font-size: 11px;
}
.tag.video { background: #3b1f1f; color: #f87171; }
.tag.three { background: #1f3b1f; color: #4ade80; }

/* ── Works grid ── */
.works-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-tab {
  background: #1e2330; border: 1px solid #2d3748;
  border-radius: 6px; padding: 5px 10px;
  font-size: 11px; color: #94a3b8; cursor: pointer;
}
.filter-tab.active { background: #1e3a5f; border-color: #3b82f6; color: #93c5fd; }

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.work-card {
  background: #1e2330; border: 1px solid #2d3748;
  border-radius: 9px; overflow: hidden; position: relative;
}
.work-card .thumb {
  width: 100%; aspect-ratio: 4/3;
  background: #0f1117;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #334155;
  overflow: hidden;
}
.work-card .thumb img { width: 100%; height: 100%; object-fit: cover; }
.work-card .card-info { padding: 8px 10px; }
.work-card .card-caption { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.work-card .card-tags { display: flex; gap: 3px; margin-top: 4px; flex-wrap: wrap; }
.card-actions {
  position: absolute; top: 6px; right: 6px;
  display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s;
}
.work-card:hover .card-actions { opacity: 1; }
.card-btn {
  background: rgba(0,0,0,0.7); border: none;
  border-radius: 5px; color: #e2e8f0;
  width: 28px; height: 28px; font-size: 12px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.card-btn:hover { background: rgba(0,0,0,0.9); }

/* ── Upload panels ── */
.upload-zone {
  border: 2px dashed #334155; border-radius: 10px;
  padding: 32px; text-align: center; color: #475569;
  font-size: 13px; cursor: pointer; margin-bottom: 14px;
  transition: border-color 0.2s;
}
.upload-zone:hover, .upload-zone.dragover { border-color: #3b82f6; color: #60a5fa; }
.upload-zone .upload-icon { font-size: 36px; margin-bottom: 8px; }

.crop-wrapper { margin-bottom: 14px; }
.crop-container {
  background: #0f1117; border: 1px solid #2d3748;
  border-radius: 8px; overflow: hidden; max-height: 360px;
}
.crop-container img { max-width: 100%; display: block; }
.crop-controls { display: flex; gap: 8px; margin-top: 8px; }
.crop-info { font-size: 11px; color: #475569; margin-top: 6px; }

/* ── YouTube panel ── */
.yt-preview {
  background: #0f1117; border: 1px solid #2d3748;
  border-radius: 8px; overflow: hidden; margin-bottom: 14px;
}
.yt-thumb-img {
  width: 100%; aspect-ratio: 16/9;
  object-fit: cover; display: block;
  background: #1e2330;
}
.yt-meta { padding: 8px 12px; font-size: 12px; color: #64748b; }

/* ── Category chips ── */
.chip-group { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  border: 1px solid #334155; border-radius: 6px;
  padding: 4px 10px; font-size: 11px; color: #64748b;
  cursor: pointer; user-select: none;
}
.chip.selected { background: #1e3a5f; border-color: #3b82f6; color: #93c5fd; }

/* ── About tabs ── */
.about-tabs { display: flex; gap: 0; border-bottom: 1px solid #2d3748; margin-bottom: 20px; }
.about-tab {
  padding: 9px 18px; font-size: 13px; color: #64748b;
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.about-tab.active { color: #60a5fa; border-bottom-color: #3b82f6; }

/* ── Skills editor ── */
.skill-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; background: #0f1117;
  border-radius: 7px; border: 1px solid #1e2330; margin-bottom: 6px;
}
.skill-name-input { flex: 1; }
.star-editor { display: flex; gap: 2px; }
.star { font-size: 18px; cursor: pointer; color: #334155; line-height: 1; }
.star.on { color: #fbbf24; }

/* ── Work experience editor ── */
.exp-table { width: 100%; border-collapse: collapse; }
.exp-table th {
  font-size: 11px; color: #475569; text-align: left;
  padding: 4px 8px; text-transform: uppercase;
}
.exp-table td { padding: 4px 4px; }
.exp-input {
  width: 100%; background: #0f1117;
  border: 1px solid #2d3748; border-radius: 6px;
  padding: 7px 10px; color: #e2e8f0; font-size: 12px; outline: none;
}
.exp-input:focus { border-color: #3b82f6; }

/* ── Timeline editor ── */
.timeline-entry {
  background: #0f1117; border: 1px solid #2d3748;
  border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;
}
.timeline-header {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer; user-select: none;
}
.timeline-date-badge {
  background: #1e3a5f; color: #60a5fa;
  border-radius: 6px; padding: 3px 10px;
  font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.timeline-institution { font-size: 14px; color: #f1f5f9; font-weight: 600; flex: 1; }
.timeline-toggle { color: #64748b; font-size: 12px; }
.timeline-body { margin-top: 14px; }
.timeline-body-grid { display: grid; grid-template-columns: 100px 1fr; gap: 10px; }
.timeline-img-preview {
  width: 100px; aspect-ratio: 4/3;
  background: #1e2d4a; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; overflow: hidden;
}
.timeline-img-preview img { width: 100%; height: 100%; object-fit: cover; }
.add-row-btn {
  width: 100%; border: 1px dashed #334155; background: none;
  border-radius: 7px; color: #64748b;
  padding: 9px; font-size: 12px; cursor: pointer; margin-top: 6px;
}
.add-row-btn:hover { border-color: #3b82f6; color: #60a5fa; }

/* ── Publish modal ── */
.modal {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
}
.modal.hidden { display: none; }
.modal-box {
  background: #1a1f2e; border: 1px solid #2d3748;
  border-radius: 14px; padding: 24px; width: 560px; max-width: 95vw;
}
.modal-box h3 { margin-bottom: 16px; }
.git-log {
  background: #0f1117; border: 1px solid #1e2d1e;
  border-radius: 8px; padding: 14px;
  font-family: monospace; font-size: 12px;
  color: #4ade80; min-height: 120px; max-height: 260px;
  overflow-y: auto; white-space: pre-wrap; margin-bottom: 14px;
}

/* ── Utilities ── */
.hidden { display: none !important; }
.text-muted { color: #64748b; font-size: 12px; }
.divider { border: none; border-top: 1px solid #2d3748; margin: 16px 0; }
.badge {
  background: #3b2e1a; color: #fbbf24;
  border-radius: 5px; padding: 2px 8px; font-size: 11px; margin-left: 6px;
}
.badge.ok { background: #1c3a2a; color: #4ade80; }
```

- [ ] **Step 3: Create `admin/public/app.js`**

```js
// ── API helpers ──
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
  return res.json();
}
const GET  = path => api('GET', path);
const POST = (path, body) => api('POST', path, body);
const PUT  = (path, body) => api('PUT', path, body);
const DEL  = path => api('DELETE', path);

// ── Router ──
const pages = {}; // populated by each page module: pages['works'] = renderFn

function navigate(hash) {
  const page = (hash || '#works').replace('#', '');
  document.querySelectorAll('.nav-item').forEach(a =>
    a.classList.toggle('active', a.dataset.page === page)
  );
  const content = document.getElementById('content');
  content.innerHTML = '<p class="loading">載入中…</p>';
  if (pages[page]) pages[page](content);
  else content.innerHTML = '<p class="loading">找不到頁面</p>';
}

window.addEventListener('hashchange', () => navigate(location.hash));
document.addEventListener('DOMContentLoaded', () => navigate(location.hash || '#works'));

// ── Pending count ──
async function refreshPendingCount() {
  try {
    const { pendingCount } = await GET('/publish/status');
    const dot = document.querySelector('.pending-dot');
    const label = document.getElementById('pending-count');
    dot.classList.toggle('has-changes', pendingCount > 0);
    label.textContent = pendingCount > 0 ? `${pendingCount} 項待發布` : '已同步';
  } catch { /* ignore */ }
}

// ── Chip helpers ──
const ALL_CATEGORIES = ['painter','digital','sketch','water','ink','oil','mark',
  'cis1','cis2','cis3','cis4','cis5','cis6','cis7','photo','web','three','news'];

function buildChips(container, selected = []) {
  container.innerHTML = ALL_CATEGORIES.map(c =>
    `<span class="chip ${selected.includes(c) ? 'selected' : ''}" data-cat="${c}">${c}</span>`
  ).join('');
  container.querySelectorAll('.chip').forEach(el =>
    el.addEventListener('click', () => el.classList.toggle('selected'))
  );
}
function getSelectedChips(container) {
  return [...container.querySelectorAll('.chip.selected')].map(el => el.dataset.cat);
}

// ── Star rating helper ──
function buildStars(container, value) {
  container.innerHTML = [1,2,3,4,5].map(n =>
    `<span class="star ${n <= value ? 'on' : ''}" data-n="${n}">★</span>`
  ).join('');
  container.querySelectorAll('.star').forEach(el =>
    el.addEventListener('click', () => {
      const n = +el.dataset.n;
      container.querySelectorAll('.star').forEach(s =>
        s.classList.toggle('on', +s.dataset.n <= n)
      );
    })
  );
}
function getStarValue(container) {
  return [...container.querySelectorAll('.star.on')].length;
}

// ── Publish modal ──
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('publish-modal');
  const log   = document.getElementById('publish-log');

  document.getElementById('publish-btn').addEventListener('click', async () => {
    modal.classList.remove('hidden');
    log.textContent = '正在發布…\n';
    const evtSource = new EventSource('/api/publish', { withCredentials: false });

    // EventSource doesn't support POST — use fetch SSE instead
    evtSource.close();
    const res = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value);
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) {
        const match = part.match(/^data: (.+)$/m);
        if (!match) continue;
        const obj = JSON.parse(match[1]);
        if (obj.line) { log.textContent += obj.line + '\n'; log.scrollTop = log.scrollHeight; }
        if (obj.done) { await refreshPendingCount(); }
      }
    }
  });

  document.getElementById('close-publish-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  refreshPendingCount();
  setInterval(refreshPendingCount, 30000);
});

// Export for page modules
window.adminApp = { pages, GET, POST, PUT, DEL, refreshPendingCount, buildChips, getSelectedChips, buildStars, getStarValue };
```

- [ ] **Step 4: Open browser and check shell renders**

Start server: `npm start`

Open `http://localhost:3001`. You should see:
- Dark topbar with "Tony Cheng Admin" and "發布到 GitHub" button
- Left sidebar with 3 nav items
- Main content area with "載入中…"

No JavaScript errors in console.

- [ ] **Step 5: Commit**

```bash
git add admin/public/index.html admin/public/style.css admin/public/app.js
git commit -m "feat: add admin UI shell with router and styles"
```

---

## Task 2: Works list page

**Files:**
- Create: `admin/public/works.js`
- Modify: `admin/public/index.html`

- [ ] **Step 1: Create `admin/public/works.js`**

```js
const { pages, GET, DEL, refreshPendingCount } = window.adminApp;

const FILTER_LABELS = {
  '*': '全部', painter: 'DRAW', cis1: 'DESIGN', cis2: 'DESIGN', cis3: 'DESIGN',
  cis4: 'DESIGN', cis5: 'DESIGN', cis6: 'DESIGN', cis7: 'DESIGN',
  photo: 'PHOTO', video: 'VIDEO', web: 'WEB', three: '3D', news: 'NEWS',
};
const FILTER_TABS = ['*', 'painter', 'cis1', 'photo', 'video', 'web', 'three', 'news'];
const FILTER_NAMES = ['全部', 'DRAW', 'DESIGN', 'PHOTO', 'VIDEO', 'WEB', '3D', 'NEWS'];

pages['works'] = async function(container) {
  let works = await GET('/works');
  let activeFilter = '*';

  container.innerHTML = `
    <div class="works-toolbar">
      <button id="add-image-btn"  class="btn-primary">＋ 圖片</button>
      <button id="add-video-btn"  class="btn-secondary">＋ YouTube</button>
      <button id="add-model-btn"  class="btn-secondary">＋ 3D</button>
      <div class="filter-tabs">
        ${FILTER_TABS.map((f, i) => `<button class="filter-tab ${f === '*' ? 'active' : ''}" data-filter="${f}">${FILTER_NAMES[i]}</button>`).join('')}
      </div>
    </div>
    <div id="works-grid" class="works-grid"></div>
    <div id="panel-area"></div>
  `;

  function renderGrid() {
    const filtered = activeFilter === '*'
      ? works
      : works.filter(w => w.categories.includes(activeFilter));
    document.getElementById('works-grid').innerHTML = filtered.length
      ? filtered.map(workCard).join('')
      : '<p class="text-muted">沒有作品</p>';
    bindCardActions();
  }

  function workCard(w) {
    const thumbHTML = w.type === 'image'
      ? `<img src="/portfolio/${w.thumb}" alt="">`
      : w.type === 'video'
        ? `<img src="https://i.ytimg.com/vi/${w.videoId}/mqdefault.jpg" alt="">`
        : `<span>🎮</span>`;
    const tagsHTML = w.categories.map(c => `<span class="tag ${c}">${c}</span>`).join('');
    return `<div class="work-card" data-id="${w.id}">
      <div class="thumb">${thumbHTML}</div>
      <div class="card-actions">
        <button class="card-btn edit-btn" title="編輯">✏️</button>
        <button class="card-btn del-btn" title="刪除">🗑</button>
      </div>
      <div class="card-info">
        <div class="card-caption">${w.caption || w.label || w.videoId || '（無說明）'}</div>
        <div class="card-tags">${tagsHTML}</div>
      </div>
    </div>`;
  }

  function bindCardActions() {
    document.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.work-card').dataset.id;
        if (!confirm('確定刪除？')) return;
        await DEL(`/works/${id}`);
        works = await GET('/works');
        refreshPendingCount();
        renderGrid();
      });
    });
  }

  // Filter tabs
  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderGrid();
    });
  });

  // Add buttons — navigate to upload panels
  document.getElementById('add-image-btn').addEventListener('click', () => { location.hash = '#upload-image'; });
  document.getElementById('add-video-btn').addEventListener('click', () => { location.hash = '#upload-video'; });
  document.getElementById('add-model-btn').addEventListener('click', () => { location.hash = '#upload-model'; });

  renderGrid();
};
```

- [ ] **Step 2: Add script tag to index.html before `</body>`**

Add before the closing `</body>` (after app.js):

```html
<script type="module" src="works.js"></script>
<script type="module" src="upload-image.js"></script>
<script type="module" src="upload-video.js"></script>
<script type="module" src="upload-model.js"></script>
<script type="module" src="about.js"></script>
<script type="module" src="settings.js"></script>
```

Also register the upload page aliases in the router section of `app.js` — add these aliases to the `navigate` function so `#upload-image` routes correctly:

```js
// In navigate(), before the if (pages[page]) block:
const pageAlias = { 'upload-image': 'upload-image', 'upload-video': 'upload-video', 'upload-model': 'upload-model' };
```

Actually, the page modules register themselves into `pages` — just make sure `works.js`, `upload-image.js`, etc. are loaded before navigation happens. Since they use `type="module"`, they load in order.

- [ ] **Step 3: Test in browser**

Navigate to `http://localhost:3001/#works`. You should see:
- Filter tabs at top
- Grid of work cards with thumbnails
- Hover over a card: edit and delete buttons appear
- Click delete: confirm dialog → card disappears

- [ ] **Step 4: Commit**

```bash
git add admin/public/works.js admin/public/index.html
git commit -m "feat: add works list page with filter tabs"
```

---

## Task 3: Image upload panel (with Cropper.js)

**Files:**
- Create: `admin/public/upload-image.js`

- [ ] **Step 1: Create `admin/public/upload-image.js`**

```js
const { pages, POST, refreshPendingCount, buildChips, getSelectedChips } = window.adminApp;

pages['upload-image'] = function(container) {
  let cropper = null;

  container.innerHTML = `
    <h2 style="margin-bottom:20px;color:#f1f5f9;">上傳圖片</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="section-box">
        <h3>選擇圖片 &amp; 裁切縮圖範圍</h3>
        <div class="upload-zone" id="drop-zone">
          <div class="upload-icon">📂</div>
          拖拉圖片到這裡，或點擊選擇
          <small class="text-muted" style="display:block;margin-top:6px;">支援 JPG、PNG、WebP</small>
        </div>
        <input type="file" id="file-input" accept="image/*" style="display:none">
        <div class="crop-wrapper hidden" id="crop-wrapper">
          <div class="crop-container">
            <img id="crop-img" src="" alt="">
          </div>
          <div class="crop-controls">
            <button class="btn-sm" id="reset-crop">重設裁切</button>
            <span class="crop-info" id="crop-info"></span>
          </div>
        </div>
      </div>

      <div class="section-box">
        <h3>作品資訊</h3>
        <div class="form-field">
          <label class="form-label">檔名（自動用原始檔名）</label>
          <input class="form-input" id="base-name" placeholder="例：媽祖插畫">
        </div>
        <div class="form-field">
          <label class="form-label">說明文字（caption）</label>
          <textarea class="form-textarea" id="caption" placeholder="作品說明…"></textarea>
        </div>
        <div class="form-field">
          <label class="form-label">FancyBox 群組</label>
          <input class="form-input" id="fancybox-group" placeholder="painter">
        </div>
        <div class="form-field">
          <label class="form-label">分類標籤（可多選）</label>
          <div class="chip-group" id="chip-group"></div>
        </div>
        <div class="btn-row">
          <button class="btn-primary" id="save-btn" disabled>儲存作品</button>
          <button class="btn-secondary" onclick="location.hash='#works'">取消</button>
        </div>
        <p id="upload-status" class="text-muted" style="margin-top:10px;"></p>
      </div>
    </div>
  `;

  buildChips(document.getElementById('chip-group'), ['painter']);

  const dropZone   = document.getElementById('drop-zone');
  const fileInput  = document.getElementById('file-input');
  const cropWrapper = document.getElementById('crop-wrapper');
  const cropImg    = document.getElementById('crop-img');
  const saveBtn    = document.getElementById('save-btn');
  const statusEl   = document.getElementById('upload-status');

  let selectedFile = null;

  function loadFile(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
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
      // Auto-fill base name from file name
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\u4e00-\u9fff-]/g, '_');
      document.getElementById('base-name').value = base;
      saveBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => fileInput.files[0] && loadFile(fileInput.files[0]));

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  });

  document.getElementById('reset-crop').addEventListener('click', () => cropper && cropper.reset());

  saveBtn.addEventListener('click', async () => {
    if (!selectedFile || !cropper) return;
    saveBtn.disabled = true;
    statusEl.textContent = '處理中…';

    try {
      const cropData = cropper.getData(true); // {x, y, width, height} in source pixels
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('baseName', document.getElementById('base-name').value);
      formData.append('caption', document.getElementById('caption').value);
      formData.append('fancyboxGroup', document.getElementById('fancybox-group').value);
      formData.append('categories', JSON.stringify(getSelectedChips(document.getElementById('chip-group'))));
      formData.append('crop', JSON.stringify(cropData));

      // Upload image + get work object back
      const uploadRes = await fetch('/api/upload/image', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error);
      const { work } = await uploadRes.json();

      // Persist to data.json
      await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(work),
      });

      await refreshPendingCount();
      statusEl.textContent = '✓ 儲存成功！';
      setTimeout(() => { location.hash = '#works'; }, 800);
    } catch (err) {
      statusEl.textContent = `✗ 錯誤：${err.message}`;
      saveBtn.disabled = false;
    }
  });
};
```

- [ ] **Step 2: Test in browser**

Navigate to `http://localhost:3001/#upload-image`. Check:
- Drop zone shows, click/drag file → Cropper.js loads
- Adjust crop rectangle
- Fill in caption and select categories
- Click 儲存作品 → spinner → redirects to `#works` with new card in grid

- [ ] **Step 3: Commit**

```bash
git add admin/public/upload-image.js
git commit -m "feat: add image upload panel with Cropper.js"
```

---

## Task 4: YouTube and 3D upload panels

**Files:**
- Create: `admin/public/upload-video.js`
- Create: `admin/public/upload-model.js`

- [ ] **Step 1: Create `admin/public/upload-video.js`**

```js
const { pages, POST, refreshPendingCount } = window.adminApp;

pages['upload-video'] = function(container) {
  container.innerHTML = `
    <h2 style="margin-bottom:20px;color:#f1f5f9;">新增 YouTube 影片</h2>
    <div style="max-width:520px;">
      <div class="section-box">
        <h3>貼上 YouTube 連結</h3>
        <div class="form-field">
          <label class="form-label">YouTube 網址</label>
          <input class="form-input" id="yt-url" placeholder="https://www.youtube.com/watch?v=…">
        </div>
        <div class="yt-preview hidden" id="yt-preview">
          <img class="yt-thumb-img" id="yt-thumb" src="" alt="">
          <div class="yt-meta" id="yt-meta"></div>
        </div>
        <div class="btn-row">
          <button class="btn-secondary" id="parse-btn">預覽</button>
          <button class="btn-primary" id="save-btn" disabled>加入影片</button>
          <button class="btn-secondary" onclick="location.hash='#works'">取消</button>
        </div>
        <p id="status" class="text-muted" style="margin-top:8px;"></p>
      </div>
    </div>
  `;

  let videoId = null;

  document.getElementById('parse-btn').addEventListener('click', async () => {
    const url = document.getElementById('yt-url').value.trim();
    const statusEl = document.getElementById('status');
    statusEl.textContent = '解析中…';
    try {
      const res = await fetch('/api/youtube/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      videoId = data.videoId;
      document.getElementById('yt-thumb').src = data.thumbUrl;
      document.getElementById('yt-meta').textContent = `影片 ID：${videoId}`;
      document.getElementById('yt-preview').classList.remove('hidden');
      document.getElementById('save-btn').disabled = false;
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = `✗ ${err.message}`;
    }
  });

  document.getElementById('save-btn').addEventListener('click', async () => {
    if (!videoId) return;
    const statusEl = document.getElementById('status');
    statusEl.textContent = '儲存中…';
    try {
      await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'video', videoId, caption: '', categories: ['video'] }),
      });
      await refreshPendingCount();
      statusEl.textContent = '✓ 加入成功！';
      setTimeout(() => { location.hash = '#works'; }, 600);
    } catch (err) {
      statusEl.textContent = `✗ ${err.message}`;
    }
  });
};
```

- [ ] **Step 2: Create `admin/public/upload-model.js`**

```js
const { pages, refreshPendingCount } = window.adminApp;

pages['upload-model'] = function(container) {
  container.innerHTML = `
    <h2 style="margin-bottom:20px;color:#f1f5f9;">上傳 3D 模型</h2>
    <div style="max-width:520px;">
      <div class="section-box">
        <h3>上傳 ZIP 壓縮檔</h3>
        <p class="text-muted" style="margin-bottom:14px;">ZIP 內需包含同名的 .obj、.mtl 和材質貼圖（PNG/JPG）</p>
        <div class="upload-zone" id="model-drop-zone">
          <div class="upload-icon">📦</div>
          拖拉 .zip 到這裡，或點擊選擇
        </div>
        <input type="file" id="model-file-input" accept=".zip" style="display:none">
        <p id="file-name" class="text-muted" style="margin-top:8px;"></p>
        <div class="form-field" style="margin-top:14px;">
          <label class="form-label">模型標籤（顯示名稱）</label>
          <input class="form-input" id="model-label" placeholder="例：娃娃">
        </div>
        <div class="btn-row">
          <button class="btn-primary" id="save-model-btn" disabled>上傳並產生 Viewer</button>
          <button class="btn-secondary" onclick="location.hash='#works'">取消</button>
        </div>
        <p id="model-status" class="text-muted" style="margin-top:8px;"></p>
      </div>
    </div>
  `;

  let selectedZip = null;
  const dropZone = document.getElementById('model-drop-zone');
  const fileInput = document.getElementById('model-file-input');
  const saveBtn = document.getElementById('save-model-btn');

  function setFile(file) {
    selectedZip = file;
    document.getElementById('file-name').textContent = `選擇：${file.name}`;
    // Auto-fill label from zip name
    const label = file.name.replace(/\.zip$/i, '').replace(/_/g, ' ');
    document.getElementById('model-label').value = label;
    saveBtn.disabled = false;
  }

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => fileInput.files[0] && setFile(fileInput.files[0]));
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) setFile(file);
    else document.getElementById('model-status').textContent = '請選擇 .zip 檔案';
  });

  saveBtn.addEventListener('click', async () => {
    if (!selectedZip) return;
    saveBtn.disabled = true;
    const statusEl = document.getElementById('model-status');
    statusEl.textContent = '上傳中，請稍候…';
    try {
      const formData = new FormData();
      formData.append('file', selectedZip);
      formData.append('label', document.getElementById('model-label').value);

      const uploadRes = await fetch('/api/upload/model', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error);
      const { work } = await uploadRes.json();

      await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(work),
      });
      await refreshPendingCount();
      statusEl.textContent = '✓ 模型上傳成功！';
      setTimeout(() => { location.hash = '#works'; }, 800);
    } catch (err) {
      statusEl.textContent = `✗ ${err.message}`;
      saveBtn.disabled = false;
    }
  });
};
```

- [ ] **Step 3: Test YouTube panel**

Navigate to `http://localhost:3001/#upload-video`. Paste a YouTube URL, click 預覽 → thumbnail appears. Click 加入影片 → redirects to works list with new video card.

- [ ] **Step 4: Commit**

```bash
git add admin/public/upload-video.js admin/public/upload-model.js
git commit -m "feat: add YouTube and 3D model upload panels"
```

---

## Task 5: About page

**Files:**
- Create: `admin/public/about.js`

- [ ] **Step 1: Create `admin/public/about.js`**

```js
const { pages, GET, PUT, POST, DEL, refreshPendingCount, buildStars, getStarValue } = window.adminApp;

pages['about'] = async function(container) {
  const about = await GET('/about');
  let activeTab = 'info';

  container.innerHTML = `
    <h2 style="margin-bottom:16px;color:#f1f5f9;">關於我</h2>
    <div class="about-tabs">
      <div class="about-tab active" data-tab="info">基本資料</div>
      <div class="about-tab" data-tab="skills">技能</div>
      <div class="about-tab" data-tab="work">工作經歷</div>
      <div class="about-tab" data-tab="timeline">學習歷程</div>
    </div>
    <div id="tab-content"></div>
  `;

  const tabContent = document.getElementById('tab-content');

  container.querySelectorAll('.about-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.about-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderTab();
    });
  });

  // ── Tab: Info ──
  function renderInfo() {
    tabContent.innerHTML = `
      <div class="section-box">
        <h3>聯絡資訊</h3>
        <div class="form-grid">
          <div class="form-field"><label class="form-label">姓名</label><input class="form-input" id="f-name" value="${esc(about.name)}"></div>
          <div class="form-field"><label class="form-label">現職職稱</label><input class="form-input" id="f-title" value="${esc(about.currentTitle)}"></div>
          <div class="form-field"><label class="form-label">學歷</label><input class="form-input" id="f-edu" value="${esc(about.education)}"></div>
          <div class="form-field"><label class="form-label">電話</label><input class="form-input" id="f-phone" value="${esc(about.phone)}"></div>
          <div class="form-field"><label class="form-label">Email</label><input class="form-input" id="f-email" value="${esc(about.email)}"></div>
          <div class="form-field"><label class="form-label">Facebook</label><input class="form-input" id="f-fb" value="${esc(about.facebook)}"></div>
          <div class="form-field"><label class="form-label">Instagram</label><input class="form-input" id="f-ig" value="${esc(about.instagram)}"></div>
        </div>
        <div class="form-field"><label class="form-label">自我介紹</label><textarea class="form-textarea" id="f-bio" style="height:140px">${esc(about.bio)}</textarea></div>
        <div class="btn-row">
          <button class="btn-primary" id="save-info">儲存基本資料</button>
        </div>
        <p id="info-status" class="text-muted" style="margin-top:8px;"></p>
      </div>
    `;
    document.getElementById('save-info').addEventListener('click', async () => {
      const statusEl = document.getElementById('info-status');
      statusEl.textContent = '儲存中…';
      try {
        await PUT('/about/info', {
          name: document.getElementById('f-name').value,
          currentTitle: document.getElementById('f-title').value,
          education: document.getElementById('f-edu').value,
          phone: document.getElementById('f-phone').value,
          email: document.getElementById('f-email').value,
          facebook: document.getElementById('f-fb').value,
          instagram: document.getElementById('f-ig').value,
          bio: document.getElementById('f-bio').value,
        });
        statusEl.textContent = '✓ 已儲存';
        await refreshPendingCount();
      } catch (err) { statusEl.textContent = `✗ ${err.message}`; }
    });
  }

  // ── Tab: Skills ──
  function renderSkills() {
    let skills = [...about.skills];
    function renderRows() {
      document.getElementById('skills-list').innerHTML = skills.map((s, i) => `
        <div class="skill-row" data-i="${i}">
          <input class="form-input skill-name-input" value="${esc(s.name)}" placeholder="技能名稱">
          <div class="star-editor" id="stars-${i}"></div>
          <button class="btn-danger" data-del="${i}">✕</button>
        </div>
      `).join('');
      skills.forEach((s, i) => buildStars(document.getElementById(`stars-${i}`), s.stars));
      document.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => { skills.splice(+btn.dataset.del, 1); renderRows(); });
      });
    }
    tabContent.innerHTML = `
      <div class="section-box">
        <h3>技能評分</h3>
        <div id="skills-list"></div>
        <button class="add-row-btn" id="add-skill">＋ 新增技能</button>
        <div class="btn-row" style="margin-top:14px;">
          <button class="btn-primary" id="save-skills">儲存技能</button>
        </div>
        <p id="skills-status" class="text-muted" style="margin-top:8px;"></p>
      </div>
    `;
    renderRows();
    document.getElementById('add-skill').addEventListener('click', () => {
      skills.push({ name: '', stars: 3 }); renderRows();
    });
    document.getElementById('save-skills').addEventListener('click', async () => {
      const statusEl = document.getElementById('skills-status');
      // Collect current values
      const saved = skills.map((_, i) => ({
        name: document.querySelector(`.skill-row[data-i="${i}"] .skill-name-input`).value,
        stars: getStarValue(document.getElementById(`stars-${i}`)),
      }));
      try {
        await PUT('/about/skills', { skills: saved });
        about.skills = saved;
        statusEl.textContent = '✓ 已儲存';
        await refreshPendingCount();
      } catch (err) { statusEl.textContent = `✗ ${err.message}`; }
    });
  }

  // ── Tab: Work experience ──
  function renderWork() {
    let exp = [...about.workExperience];
    function renderRows() {
      document.getElementById('exp-list').innerHTML = `
        <table class="exp-table" style="width:100%;margin-bottom:8px;">
          <thead><tr><th style="width:140px">期間</th><th>公司/單位</th><th>職稱</th><th style="width:40px"></th></tr></thead>
          <tbody>${exp.map((e, i) => `<tr data-i="${i}">
            <td><input class="exp-input" data-field="period" value="${esc(e.period)}"></td>
            <td><input class="exp-input" data-field="company" value="${esc(e.company)}"></td>
            <td><input class="exp-input" data-field="title" value="${esc(e.title)}"></td>
            <td><button class="btn-danger" data-del="${i}" style="padding:4px 8px;">✕</button></td>
          </tr>`).join('')}</tbody>
        </table>`;
      document.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => { exp.splice(+btn.dataset.del, 1); renderRows(); });
      });
    }
    tabContent.innerHTML = `
      <div class="section-box">
        <h3>工作經歷</h3>
        <div id="exp-list"></div>
        <button class="add-row-btn" id="add-exp">＋ 新增工作經歷</button>
        <div class="btn-row" style="margin-top:14px;">
          <button class="btn-primary" id="save-exp">儲存工作經歷</button>
        </div>
        <p id="exp-status" class="text-muted" style="margin-top:8px;"></p>
      </div>
    `;
    renderRows();
    document.getElementById('add-exp').addEventListener('click', () => {
      exp.unshift({ period: '', company: '', title: '' }); renderRows();
    });
    document.getElementById('save-exp').addEventListener('click', async () => {
      const saved = [...document.querySelectorAll('#exp-list tr[data-i]')].map(tr => ({
        period:  tr.querySelector('[data-field="period"]').value,
        company: tr.querySelector('[data-field="company"]').value,
        title:   tr.querySelector('[data-field="title"]').value,
      }));
      const statusEl = document.getElementById('exp-status');
      try {
        await PUT('/about/work-experience', { workExperience: saved });
        about.workExperience = saved;
        statusEl.textContent = '✓ 已儲存';
        await refreshPendingCount();
      } catch (err) { statusEl.textContent = `✗ ${err.message}`; }
    });
  }

  // ── Tab: Timeline ──
  function renderTimeline() {
    const sorted = [...about.timeline].sort((a, b) => b.date.localeCompare(a.date));
    tabContent.innerHTML = `
      <div class="section-box">
        <h3>學習歷程時間軸</h3>
        <div id="timeline-list">${sorted.map(entryCard).join('')}</div>
        <button class="add-row-btn" id="add-timeline-btn">＋ 新增學習歷程</button>
        <p id="tl-status" class="text-muted" style="margin-top:8px;"></p>
      </div>
    `;
    document.getElementById('add-timeline-btn').addEventListener('click', () => {
      location.hash = '#add-timeline';
    });
    bindTimelineActions();
  }

  function entryCard(t) {
    return `<div class="timeline-entry" data-id="${t.id}">
      <div class="timeline-header">
        <span class="timeline-date-badge">${t.date}</span>
        <span class="timeline-institution">${esc(t.institution)}</span>
        <span class="timeline-toggle">▶ 展開</span>
      </div>
      <div class="timeline-body hidden">
        <div class="timeline-body-grid">
          <div>
            <div class="timeline-img-preview">${t.image ? `<img src="/portfolio/${t.image}" alt="">` : '🖼'}</div>
          </div>
          <div>
            <div class="form-field"><label class="form-label">日期</label><input class="form-input tl-date" value="${t.date}"></div>
            <div class="form-field"><label class="form-label">機構名稱</label><input class="form-input tl-inst" value="${esc(t.institution)}"></div>
            <div class="form-field"><label class="form-label">標題</label><input class="form-input tl-heading" value="${esc(t.heading)}"></div>
            <div class="form-field"><label class="form-label">內文</label><textarea class="form-textarea tl-body" style="height:100px">${esc(t.body)}</textarea></div>
            <div class="form-field"><label class="form-label">底部備註</label><input class="form-input tl-footer" value="${esc(t.footer || '')}"></div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn-primary tl-save-btn">儲存</button>
          <button class="btn-danger tl-del-btn">刪除</button>
        </div>
        <p class="tl-status text-muted" style="margin-top:6px;"></p>
      </div>
    </div>`;
  }

  function bindTimelineActions() {
    document.querySelectorAll('.timeline-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const body = hdr.nextElementSibling;
        const isHidden = body.classList.contains('hidden');
        body.classList.toggle('hidden', !isHidden);
        hdr.querySelector('.timeline-toggle').textContent = isHidden ? '▼ 收合' : '▶ 展開';
      });
    });
    document.querySelectorAll('.tl-save-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const entry = btn.closest('.timeline-entry');
        const id = entry.dataset.id;
        const statusEl = entry.querySelector('.tl-status');
        const payload = {
          date:        entry.querySelector('.tl-date').value,
          institution: entry.querySelector('.tl-inst').value,
          heading:     entry.querySelector('.tl-heading').value,
          body:        entry.querySelector('.tl-body').value,
          footer:      entry.querySelector('.tl-footer').value,
        };
        try {
          await PUT(`/about/timeline/${id}`, payload);
          const t = about.timeline.find(t => t.id === id);
          if (t) Object.assign(t, payload);
          statusEl.textContent = '✓ 已儲存';
          await refreshPendingCount();
        } catch (err) { statusEl.textContent = `✗ ${err.message}`; }
      });
    });
    document.querySelectorAll('.tl-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('確定刪除此學習歷程？')) return;
        const id = btn.closest('.timeline-entry').dataset.id;
        await DEL(`/about/timeline/${id}`);
        about.timeline = about.timeline.filter(t => t.id !== id);
        await refreshPendingCount();
        renderTimeline();
      });
    });
  }

  // New timeline entry page
  pages['add-timeline'] = function(c) {
    c.innerHTML = `
      <h2 style="margin-bottom:20px;color:#f1f5f9;">新增學習歷程</h2>
      <div class="section-box" style="max-width:600px;">
        <div class="form-field"><label class="form-label">日期 (YYYY-MM-DD)</label><input class="form-input" id="nt-date" placeholder="2025-06-04"></div>
        <div class="form-field"><label class="form-label">機構名稱</label><input class="form-input" id="nt-inst" placeholder="復興商工美工科"></div>
        <div class="form-field"><label class="form-label">標題</label><input class="form-input" id="nt-heading"></div>
        <div class="form-field"><label class="form-label">內文（可包含 HTML 連結）</label><textarea class="form-textarea" id="nt-body" style="height:120px"></textarea></div>
        <div class="form-field"><label class="form-label">圖片路徑（相對於 repo 根目錄）</label><input class="form-input" id="nt-image" placeholder="images/foo.jpg"></div>
        <div class="form-field"><label class="form-label">底部備註（選填）</label><input class="form-input" id="nt-footer"></div>
        <div class="btn-row">
          <button class="btn-primary" id="nt-save">新增</button>
          <button class="btn-secondary" onclick="location.hash='#about'">取消</button>
        </div>
        <p id="nt-status" class="text-muted" style="margin-top:8px;"></p>
      </div>
    `;
    document.getElementById('nt-save').addEventListener('click', async () => {
      const statusEl = document.getElementById('nt-status');
      try {
        const entry = await POST('/about/timeline', {
          date:        document.getElementById('nt-date').value,
          institution: document.getElementById('nt-inst').value,
          heading:     document.getElementById('nt-heading').value,
          body:        document.getElementById('nt-body').value,
          image:       document.getElementById('nt-image').value,
          footer:      document.getElementById('nt-footer').value,
        });
        about.timeline.push(entry);
        await refreshPendingCount();
        statusEl.textContent = '✓ 新增成功！';
        setTimeout(() => { location.hash = '#about'; }, 600);
      } catch (err) { statusEl.textContent = `✗ ${err.message}`; }
    });
  };

  function renderTab() {
    if (activeTab === 'info') renderInfo();
    else if (activeTab === 'skills') renderSkills();
    else if (activeTab === 'work') renderWork();
    else if (activeTab === 'timeline') renderTimeline();
  }

  renderTab();
};

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

- [ ] **Step 2: Test in browser**

Navigate to `http://localhost:3001/#about`. Check all 4 tabs:
- **基本資料**: edit name/title → click 儲存 → ✓ 已儲存
- **技能**: stars clickable, add/delete rows, save
- **工作經歷**: edit inline table cells, add/delete rows
- **學習歷程**: expand/collapse cards, edit fields, click 新增學習歷程 → form → save → back to list

- [ ] **Step 3: Commit**

```bash
git add admin/public/about.js
git commit -m "feat: add About management page with all 4 tabs"
```

---

## Task 6: Settings page

**Files:**
- Create: `admin/public/settings.js`

- [ ] **Step 1: Create `admin/public/settings.js`**

```js
const { pages, GET, PUT, refreshPendingCount } = window.adminApp;

pages['settings'] = async function(container) {
  const meta = await GET('/settings');
  container.innerHTML = `
    <h2 style="margin-bottom:20px;color:#f1f5f9;">網站設定</h2>
    <div class="section-box" style="max-width:600px;">
      <h3>SEO / Open Graph</h3>
      <div class="form-field"><label class="form-label">網站標題</label><input class="form-input" id="s-title" value="${esc(meta.siteTitle)}"></div>
      <div class="form-field"><label class="form-label">網站描述</label><textarea class="form-textarea" id="s-desc">${esc(meta.description)}</textarea></div>
      <div class="form-field"><label class="form-label">OG 圖片路徑</label><input class="form-input" id="s-og" value="${esc(meta.ogImage)}" placeholder="images/web02.png"></div>
      <div class="btn-row">
        <button class="btn-primary" id="save-settings">儲存設定</button>
      </div>
      <p id="s-status" class="text-muted" style="margin-top:8px;"></p>
    </div>
  `;
  document.getElementById('save-settings').addEventListener('click', async () => {
    const statusEl = document.getElementById('s-status');
    try {
      await PUT('/settings', {
        siteTitle:   document.getElementById('s-title').value,
        description: document.getElementById('s-desc').value,
        ogImage:     document.getElementById('s-og').value,
      });
      statusEl.textContent = '✓ 已儲存';
      await refreshPendingCount();
    } catch (err) { statusEl.textContent = `✗ ${err.message}`; }
  });
};

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

- [ ] **Step 2: Test in browser**

Navigate to `http://localhost:3001/#settings`. Edit title → save → ✓

- [ ] **Step 3: Commit**

```bash
git add admin/public/settings.js
git commit -m "feat: add settings page"
```

---

## Task 7: Final wiring and end-to-end test

- [ ] **Step 1: Run all tests**

```bash
npm test -- --verbose
```

Expected: all tests PASS

- [ ] **Step 2: Full browser walkthrough**

Start: `npm start`, open `http://localhost:3001`

Test the golden path:
1. `#works` — grid loads, filter tabs work, hover shows card actions
2. `#upload-image` — upload a real JPG, crop it, save → appears in `#works`
3. `#upload-video` — paste a YouTube URL, preview loads, add → appears in `#works`
4. `#about` → 基本資料 tab → change name → save → ✓
5. `#about` → 技能 tab → adjust star → save → ✓
6. `#about` → 工作經歷 tab → add a row → save → ✓
7. `#about` → 學習歷程 tab → expand a card → edit → save → ✓
8. `#settings` → change description → save → ✓
9. Publish button: shows "N 項待發布" badge

- [ ] **Step 3: Verify index.html round-trip**

After saving changes in the admin, open `index.html` directly in a browser (or `npx serve .`). Confirm:
- New images appear in the masonry grid
- New YouTube videos appear in VIDEO section
- About section reflects updated name/skills

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Plan 3 complete — admin UI fully functional"
```

---

## Checklist: Project Complete

- [ ] `npm test` passes with no failures
- [ ] All 3 upload types work end-to-end (image, YouTube, 3D zip)
- [ ] About page: all 4 tabs save correctly and index.html reflects changes
- [ ] Publish button shows pending count and streams git log to modal
- [ ] `index.html` generated from `data.json` looks visually identical to original
