const app = window.adminApp;

const FILTER_TABS = ['*', 'painter', 'cis1', 'photo', 'video', 'web', 'three', 'news'];
const FILTER_NAMES = ['全部', 'DRAW', 'DESIGN', 'PHOTO', 'VIDEO', 'WEB', '3D', 'NEWS'];

app.pages['works'] = async function (container) {
  let works = await app.GET('/works');
  let activeFilter = '*';
  let aiTarget = null; // { work, btnEl } currently being processed
  let aiInProgress = false;

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
    aiInProgress = false;
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
      alert('套用失敗：' + err.message);
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
        if (aiInProgress) return;
        const card = e.target.closest('.work-card');
        const work = works.find(function (w) { return w.id === card.dataset.id; });
        if (!work) return;
        aiInProgress = true;
        aiTarget = { work: work, btnEl: btn };
        btn.textContent = '…';
        btn.disabled = true;
        try {
          const result = await app.POST('/ai/caption', { imagePath: work.src });
          aiInProgress = false;
          openModal(result);
        } catch (err) {
          aiInProgress = false;
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
