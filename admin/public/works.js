const app = window.adminApp;

const FILTER_TABS  = ['*', 'painter', 'cis1', 'photo', 'video', 'web', 'three', 'news'];
const FILTER_NAMES = ['全部', 'DRAW', 'DESIGN', 'PHOTO', 'VIDEO', 'WEB', '3D', 'NEWS'];

app.pages['works'] = async function(container) {
  let works = await app.GET('/works');
  let activeFilter = '*';

  container.innerHTML = '\
    <div class="works-toolbar">\
      <button id="add-image-btn" class="btn-primary">＋ 圖片</button>\
      <button id="add-video-btn" class="btn-secondary">＋ YouTube</button>\
      <button id="add-model-btn" class="btn-secondary">＋ 3D</button>\
      <div class="filter-tabs">' +
        FILTER_TABS.map(function(f, i) {
          return '<button class="filter-tab ' + (f === '*' ? 'active' : '') + '" data-filter="' + f + '">' + FILTER_NAMES[i] + '</button>';
        }).join('') +
      '</div>\
    </div>\
    <div id="works-grid" class="works-grid"></div>';

  function renderGrid() {
    const filtered = activeFilter === '*' ? works : works.filter(function(w) { return w.categories && w.categories.includes(activeFilter); });
    const grid = document.getElementById('works-grid');
    grid.innerHTML = filtered.length ? filtered.map(workCard).join('') : '<p class="text-muted">沒有作品</p>';
    bindCardActions();
  }

  function workCard(w) {
    let thumbHTML;
    if (w.type === 'image') {
      thumbHTML = '<img src="/portfolio/' + w.thumb + '" alt="" loading="lazy">';
    } else if (w.type === 'video') {
      thumbHTML = '<img src="https://i.ytimg.com/vi/' + w.videoId + '/mqdefault.jpg" alt="">';
    } else {
      thumbHTML = '<span>🎮</span>';
    }
    const tagsHTML = (w.categories || []).map(function(c) { return '<span class="tag ' + c + '">' + c + '</span>'; }).join('');
    return '<div class="work-card" data-id="' + w.id + '">' +
      '<div class="thumb">' + thumbHTML + '</div>' +
      '<div class="card-actions">' +
        '<button class="card-btn del-btn" title="刪除">🗑</button>' +
      '</div>' +
      '<div class="card-info">' +
        '<div class="card-caption">' + (w.caption || w.label || w.videoId || '（無說明）') + '</div>' +
        '<div class="card-tags">' + tagsHTML + '</div>' +
      '</div>' +
    '</div>';
  }

  function bindCardActions() {
    document.querySelectorAll('.del-btn').forEach(function(btn) {
      btn.addEventListener('click', async function(e) {
        const id = e.target.closest('.work-card').dataset.id;
        if (!confirm('確定刪除？')) return;
        await app.DEL('/works/' + id);
        works = await app.GET('/works');
        app.refreshPendingCount();
        renderGrid();
      });
    });
  }

  container.querySelectorAll('.filter-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      container.querySelectorAll('.filter-tab').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderGrid();
    });
  });

  document.getElementById('add-image-btn').addEventListener('click', function() { location.hash = '#upload-image'; });
  document.getElementById('add-video-btn').addEventListener('click', function() { location.hash = '#upload-video'; });
  document.getElementById('add-model-btn').addEventListener('click', function() { location.hash = '#upload-model'; });

  renderGrid();
};
