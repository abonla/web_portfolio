// ── API helpers ──
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (!res.ok) { const e = await res.json().catch(function() { return {}; }); throw new Error(e.error || res.statusText); }
  return res.json();
}
const GET  = function(path) { return api('GET', path); };
const POST = function(path, body) { return api('POST', path, body); };
const PUT  = function(path, body) { return api('PUT', path, body); };
const DEL  = function(path) { return api('DELETE', path); };

// ── Router ──
const pages = {};

function navigate(hash) {
  const page = (hash || '#works').replace('#', '');
  document.querySelectorAll('.nav-item').forEach(function(a) {
    a.classList.toggle('active', a.dataset.page === page);
  });
  const content = document.getElementById('content');
  content.innerHTML = '<p class="loading">載入中…</p>';
  if (pages[page]) pages[page](content);
  else content.innerHTML = '<p class="loading">找不到頁面</p>';
}

window.addEventListener('hashchange', function() { navigate(location.hash); });
document.addEventListener('DOMContentLoaded', function() { navigate(location.hash || '#works'); });

// ── Pending count ──
async function refreshPendingCount() {
  try {
    const data = await GET('/publish/status');
    const dot = document.querySelector('.pending-dot');
    const label = document.getElementById('pending-count');
    dot.classList.toggle('has-changes', data.pendingCount > 0);
    label.textContent = data.pendingCount > 0 ? (data.pendingCount + ' 項待發布') : '已同步';
  } catch(e) { /* ignore */ }
}

// ── Chip helpers ──
const ALL_CATEGORIES = ['painter','digital','sketch','water','ink','oil','mark',
  'cis1','cis2','cis3','cis4','cis5','cis6','cis7','cis8','photo','web','three','news'];

function buildChips(container, selected) {
  if (!selected) selected = [];
  container.innerHTML = ALL_CATEGORIES.map(function(c) {
    return '<span class="chip ' + (selected.includes(c) ? 'selected' : '') + '" data-cat="' + c + '">' + c + '</span>';
  }).join('');
  container.querySelectorAll('.chip').forEach(function(el) {
    el.addEventListener('click', function() { el.classList.toggle('selected'); });
  });
}
function getSelectedChips(container) {
  return Array.from(container.querySelectorAll('.chip.selected')).map(function(el) { return el.dataset.cat; });
}

// ── Star rating helper ──
function buildStars(container, value) {
  container.innerHTML = [1,2,3,4,5].map(function(n) {
    return '<span class="star ' + (n <= value ? 'on' : '') + '" data-n="' + n + '">★</span>';
  }).join('');
  container.querySelectorAll('.star').forEach(function(el) {
    el.addEventListener('click', function() {
      const n = parseInt(el.dataset.n);
      container.querySelectorAll('.star').forEach(function(s) {
        s.classList.toggle('on', parseInt(s.dataset.n) <= n);
      });
    });
  });
}
function getStarValue(container) {
  return container.querySelectorAll('.star.on').length;
}

// ── Publish modal ──
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('publish-modal');
  const log   = document.getElementById('publish-log');

  document.getElementById('publish-btn').addEventListener('click', async function() {
    modal.classList.remove('hidden');
    log.textContent = '正在發布…\n';
    const res = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buf += decoder.decode(chunk.value);
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

  document.getElementById('close-publish-modal').addEventListener('click', function() {
    modal.classList.add('hidden');
  });

  refreshPendingCount();
  setInterval(refreshPendingCount, 30000);
});

// ── Translation helper (MyMemory free API) ──
async function translateZhToEn(text) {
  if (!text || !text.trim()) return '';
  const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.trim()) + '&langpair=zh-TW%7Cen';
  const res = await fetch(url);
  if (!res.ok) throw new Error('翻譯服務無回應');
  const data = await res.json();
  if (data.responseStatus !== 200) throw new Error(data.responseDetails || '翻譯失敗');
  return data.responseData.translatedText || '';
}

// Export for page modules
window.adminApp = { pages: pages, GET: GET, POST: POST, PUT: PUT, DEL: DEL, refreshPendingCount: refreshPendingCount, buildChips: buildChips, getSelectedChips: getSelectedChips, buildStars: buildStars, getStarValue: getStarValue, translateZhToEn: translateZhToEn };
