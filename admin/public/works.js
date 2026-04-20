const app = window.adminApp;

const FILTER_TABS = ['*', 'painter', 'cis1', 'photo', 'video', 'web', 'three', 'news'];
const FILTER_NAMES = ['全部', 'DRAW', 'DESIGN', 'PHOTO', 'VIDEO', 'WEB', '3D', 'NEWS'];

app.pages['works'] = async function (container) {
  let works = await app.GET('/works');
  let activeFilter = '*';
  let aiTarget = null;
  let aiInProgress = false;
  let editTarget = null;

  container.innerHTML =
    '<div class="works-toolbar">' +
      '<button id="add-image-btn" class="btn-primary">＋ 圖片</button>' +
      '<button id="add-video-btn" class="btn-secondary">＋ YouTube</button>' +
      '<button id="add-model-btn" class="btn-secondary">＋ 3D</button>' +
      '<button id="batch-ai-btn" class="btn-secondary">✨ 批次英文說明</button>' +
      '<div class="filter-tabs">' +
        FILTER_TABS.map(function (f, i) {
          return '<button class="filter-tab ' + (f === '*' ? 'active' : '') + '" data-filter="' + f + '">' + FILTER_NAMES[i] + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div id="works-grid" class="works-grid"></div>' +

    // AI confirm modal (editable fields)
    '<div class="ai-modal-overlay" id="ai-modal-overlay">' +
      '<div class="ai-modal">' +
        '<h3>✨ AI 建議內容</h3>' +
        '<div class="ai-result-row"><div class="ai-result-label">說明（中文）</div><input class="ai-result-input" id="ai-zh" type="text" placeholder="中文說明"></div>' +
        '<div class="ai-result-row"><div class="ai-result-label">說明（英文）</div><input class="ai-result-input" id="ai-en" type="text" placeholder="English caption"></div>' +
        '<div class="ai-result-row"><div class="ai-result-label">分類</div><div class="ai-result-value" id="ai-cats"></div></div>' +
        '<div class="ai-result-row"><div class="ai-result-label">Fancybox 群組</div><div class="ai-result-value" id="ai-group"></div></div>' +
        '<div class="ai-modal-actions">' +
          '<button class="btn-secondary" id="ai-cancel-btn">取消</button>' +
          '<button class="btn-primary" id="ai-apply-btn">套用</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Edit caption modal
    '<div class="edit-modal-overlay" id="edit-modal-overlay">' +
      '<div class="edit-modal">' +
        '<h3>✏️ 編輯說明</h3>' +
        '<div class="edit-field">' +
          '<label class="edit-label">說明（中文）</label>' +
          '<input class="edit-input" type="text" id="edit-caption-zh" placeholder="中文說明">' +
        '</div>' +
        '<div class="edit-field">' +
          '<label class="edit-label">說明（英文）</label>' +
          '<input class="edit-input" type="text" id="edit-caption-en" placeholder="English caption">' +
        '</div>' +
        '<div class="edit-modal-actions">' +
          '<button class="btn-secondary" id="edit-cancel-btn">取消</button>' +
          '<button class="btn-primary" id="edit-save-btn">儲存</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Batch AI modal
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

  let pendingAiResult = null;

  // --- AI modal ---
  function openAiModal(result) {
    pendingAiResult = result;
    document.getElementById('ai-zh').value = result.captionZh || '';
    document.getElementById('ai-en').value = result.captionEn || '';
    document.getElementById('ai-cats').textContent = (result.categories || []).join(', ') || '（無）';
    document.getElementById('ai-group').textContent = result.fancyboxGroup || '（無）';
    document.getElementById('ai-modal-overlay').classList.add('open');
  }

  function closeAiModal() {
    document.getElementById('ai-modal-overlay').classList.remove('open');
    pendingAiResult = null;
    aiInProgress = false;
    if (aiTarget && aiTarget.btnEl) {
      aiTarget.btnEl.textContent = '✨';
      aiTarget.btnEl.disabled = false;
    }
    aiTarget = null;
  }

  document.getElementById('ai-cancel-btn').addEventListener('click', closeAiModal);

  document.getElementById('ai-apply-btn').addEventListener('click', async function () {
    if (!pendingAiResult || !aiTarget) return;
    const applyBtn = document.getElementById('ai-apply-btn');
    applyBtn.disabled = true;
    applyBtn.textContent = '套用中…';
    try {
      await app.PUT('/works/' + aiTarget.work.id, {
        caption: document.getElementById('ai-zh').value.trim(),
        captionEn: document.getElementById('ai-en').value.trim(),
        categories: pendingAiResult.categories,
        fancyboxGroup: pendingAiResult.fancyboxGroup,
      });
      works = await app.GET('/works');
      app.refreshPendingCount();
      closeAiModal();
      renderGrid();
    } catch (err) {
      applyBtn.textContent = '套用';
      applyBtn.disabled = false;
      alert('套用失敗：' + err.message);
    }
  });

  // --- Edit caption modal ---
  function openEditModal(work) {
    editTarget = work;
    document.getElementById('edit-caption-zh').value = work.caption || '';
    document.getElementById('edit-caption-en').value = work.captionEn || '';
    document.getElementById('edit-modal-overlay').classList.add('open');
  }

  function closeEditModal() {
    document.getElementById('edit-modal-overlay').classList.remove('open');
    editTarget = null;
  }

  document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);

  document.getElementById('edit-save-btn').addEventListener('click', async function () {
    if (!editTarget) return;
    const saveBtn = document.getElementById('edit-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '儲存中…';
    try {
      await app.PUT('/works/' + editTarget.id, {
        caption: document.getElementById('edit-caption-zh').value.trim(),
        captionEn: document.getElementById('edit-caption-en').value.trim(),
      });
      works = await app.GET('/works');
      app.refreshPendingCount();
      closeEditModal();
      renderGrid();
    } catch (err) {
      alert('儲存失敗：' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '儲存';
    }
  });

  // --- Batch AI modal ---
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

  // --- Grid rendering ---
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
    const aiBtn =
      w.type === 'image'
        ? '<button class="card-btn ai-card-btn" title="AI 生成">✨</button>'
        : '';
    const hasEn = w.captionEn ? ' has-en' : '';
    return (
      '<div class="work-card" data-id="' + w.id + '">' +
        '<div class="thumb">' + thumbHTML + '</div>' +
        '<div class="card-actions">' +
          aiBtn +
          '<button class="card-btn edit-card-btn" title="編輯說明">✏️</button>' +
          '<button class="card-btn del-btn" title="刪除">🗑</button>' +
        '</div>' +
        '<div class="card-info">' +
          '<div class="card-caption' + hasEn + '">' +
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
          openAiModal(result);
        } catch (err) {
          aiInProgress = false;
          btn.textContent = '✨';
          btn.disabled = false;
          alert('AI 生成失敗：' + err.message);
        }
      });
    });

    document.querySelectorAll('.edit-card-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        const card = e.target.closest('.work-card');
        const work = works.find(function (w) { return w.id === card.dataset.id; });
        if (!work) return;
        openEditModal(work);
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
