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
        '<h3>✏️ 編輯作品</h3>' +
        '<div class="edit-field" id="edit-replace-field">' +
          '<label class="edit-label">換圖</label>' +
          '<input type="file" class="edit-input" id="edit-replace-file" accept="image/*">' +
          '<div id="edit-replace-preview" style="margin-top:6px;display:none;">' +
            '<img id="edit-replace-img" style="max-width:100%;max-height:120px;border-radius:4px;">' +
          '</div>' +
        '</div>' +
        '<div class="edit-field">' +
          '<label class="edit-label">標題（中文）</label>' +
          '<input class="edit-input" type="text" id="edit-title-zh" placeholder="中文標題">' +
        '</div>' +
        '<div class="edit-field">' +
          '<label class="edit-label">標題（英文）</label>' +
          '<input class="edit-input" type="text" id="edit-title-en" placeholder="English title">' +
        '</div>' +
        '<div class="edit-field">' +
          '<label class="edit-label">說明（中文）</label>' +
          '<input class="edit-input" type="text" id="edit-caption-zh" placeholder="中文說明">' +
        '</div>' +
        '<div class="edit-field">' +
          '<label class="edit-label">說明（英文）</label>' +
          '<input class="edit-input" type="text" id="edit-caption-en" placeholder="English caption">' +
        '</div>' +
        '<div class="edit-field">' +
          '<label class="edit-label">分類標籤（點選切換）</label>' +
          '<div class="edit-cat-group"><span class="edit-cat-heading">設計</span>' +
            ['cis1','cis2','cis3','cis4','cis5','cis6','cis7','cis8'].map(function(c){
              return '<button type="button" class="cat-toggle" data-cat="'+c+'">'+c+'</button>';
            }).join('') +
          '</div>' +
          '<div class="edit-cat-group"><span class="edit-cat-heading">繪畫</span>' +
            ['painter','sketch','water','ink','oil','mark','digital'].map(function(c){
              return '<button type="button" class="cat-toggle" data-cat="'+c+'">'+c+'</button>';
            }).join('') +
          '</div>' +
          '<div class="edit-cat-group"><span class="edit-cat-heading">其他</span>' +
            ['photo','video','web','three','news'].map(function(c){
              return '<button type="button" class="cat-toggle" data-cat="'+c+'">'+c+'</button>';
            }).join('') +
          '</div>' +
          '<div class="edit-cat-group edit-cat-custom">' +
            '<span class="edit-cat-heading">新增</span>' +
            '<input class="edit-input edit-tag-input" type="text" id="edit-new-tag" placeholder="自訂標籤名稱">' +
            '<button type="button" class="btn-secondary edit-tag-add-btn" id="edit-add-tag-btn">＋</button>' +
          '</div>' +
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
    document.getElementById('edit-title-zh').value = work.titleZh || '';
    document.getElementById('edit-title-en').value = work.titleEn || '';
    document.getElementById('edit-caption-zh').value = work.caption || '';
    document.getElementById('edit-caption-en').value = work.captionEn || '';
    document.getElementById('edit-replace-file').value = '';
    document.getElementById('edit-replace-preview').style.display = 'none';
    document.getElementById('edit-replace-field').style.display = work.type === 'image' ? '' : 'none';
    document.getElementById('edit-new-tag').value = '';
    // 移除上次新增的自訂標籤按鈕
    document.querySelectorAll('.cat-toggle.custom').forEach(function (b) { b.remove(); });
    var activeCats = work.categories || [];
    // 若 work 有不在預設清單的 cat，也要顯示
    var preset = ['cis1','cis2','cis3','cis4','cis5','cis6','cis7','cis8',
      'painter','sketch','water','ink','oil','mark','digital',
      'photo','video','web','three','news'];
    activeCats.filter(function (c) { return c && !preset.includes(c); }).forEach(function (c) {
      addTagButton(c);
    });
    document.querySelectorAll('.cat-toggle').forEach(function (btn) {
      btn.classList.toggle('active', activeCats.includes(btn.dataset.cat));
    });
    document.getElementById('edit-modal-overlay').classList.add('open');
  }

  function addTagButton(cat) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-toggle custom active';
    btn.dataset.cat = cat;
    btn.textContent = cat;
    document.getElementById('edit-add-tag-btn').before(btn);
  }

  function closeEditModal() {
    document.getElementById('edit-modal-overlay').classList.remove('open');
    editTarget = null;
  }

  document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);

  document.getElementById('edit-replace-file').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) { document.getElementById('edit-replace-preview').style.display = 'none'; return; }
    var url = URL.createObjectURL(file);
    document.getElementById('edit-replace-img').src = url;
    document.getElementById('edit-replace-preview').style.display = '';
  });

  document.getElementById('edit-modal-overlay').addEventListener('click', function (e) {
    if (e.target.classList.contains('cat-toggle')) {
      e.target.classList.toggle('active');
    }
  });

  document.getElementById('edit-add-tag-btn').addEventListener('click', function () {
    var val = document.getElementById('edit-new-tag').value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!val) return;
    var existing = document.querySelector('.cat-toggle[data-cat="' + val + '"]');
    if (existing) { existing.classList.add('active'); }
    else { addTagButton(val); }
    document.getElementById('edit-new-tag').value = '';
  });

  document.getElementById('edit-new-tag').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('edit-add-tag-btn').click(); }
  });

  document.getElementById('edit-save-btn').addEventListener('click', async function () {
    if (!editTarget) return;
    const saveBtn = document.getElementById('edit-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '儲存中…';
    const selectedCats = Array.from(document.querySelectorAll('.cat-toggle.active'))
      .map(function (b) { return b.dataset.cat; });
    try {
      // 若有選新圖，先上傳換圖
      var replaceFile = document.getElementById('edit-replace-file').files[0];
      if (replaceFile) {
        var fd = new FormData();
        fd.append('file', replaceFile);
        var replaceRes = await fetch('/api/upload/replace/' + editTarget.id, { method: 'POST', body: fd });
        if (!replaceRes.ok) {
          var txt = await replaceRes.text();
          var msg = '換圖失敗（' + replaceRes.status + '）';
          try { msg = JSON.parse(txt).error || msg; } catch(e) {}
          throw new Error(msg);
        }
      }
      await app.PUT('/works/' + editTarget.id, {
        titleZh: document.getElementById('edit-title-zh').value.trim(),
        titleEn: document.getElementById('edit-title-en').value.trim(),
        caption: document.getElementById('edit-caption-zh').value.trim(),
        captionEn: document.getElementById('edit-caption-en').value.trim(),
        categories: selectedCats,
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
