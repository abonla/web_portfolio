const app = window.adminApp;

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

app.pages['about'] = async function(container) {
  const about = await app.GET('/about');
  let activeTab = 'info';

  container.innerHTML =
    '<h2 style="margin-bottom:16px;color:#f1f5f9;">關於我</h2>' +
    '<div class="about-tabs">' +
      '<div class="about-tab active" data-tab="info">基本資料</div>' +
      '<div class="about-tab" data-tab="skills">技能</div>' +
      '<div class="about-tab" data-tab="work">工作經歷</div>' +
      '<div class="about-tab" data-tab="timeline">學習歷程</div>' +
    '</div>' +
    '<div id="tab-content"></div>';

  const tabContent = document.getElementById('tab-content');

  container.querySelectorAll('.about-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      container.querySelectorAll('.about-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderTab();
    });
  });

  function renderInfo() {
    tabContent.innerHTML =
      '<div class="section-box"><h3>聯絡資訊</h3>' +
      '<div class="form-grid">' +
        '<div class="form-field"><label class="form-label">姓名（中）</label><input class="form-input" id="f-name" value="' + esc(about.name) + '"></div>' +
        '<div class="form-field"><label class="form-label">姓名（英）</label><div class="input-ai-row"><input class="form-input" id="f-name-en" value="' + esc(about.nameEn || '') + '"><button class="btn-ai-sm" data-src="f-name" data-target="f-name-en" data-ctx="person full name">譯</button></div></div>' +
        '<div class="form-field"><label class="form-label">現職職稱（中）</label><input class="form-input" id="f-title" value="' + esc(about.currentTitle) + '"></div>' +
        '<div class="form-field"><label class="form-label">現職職稱（英）</label><div class="input-ai-row"><input class="form-input" id="f-title-en" value="' + esc(about.currentTitleEn || '') + '"><button class="btn-ai-sm" data-src="f-title" data-target="f-title-en" data-ctx="job title">譯</button></div></div>' +
        '<div class="form-field"><label class="form-label">學歷（中）</label><input class="form-input" id="f-edu" value="' + esc(about.education) + '"></div>' +
        '<div class="form-field"><label class="form-label">學歷（英）</label><div class="input-ai-row"><input class="form-input" id="f-edu-en" value="' + esc(about.educationEn || '') + '"><button class="btn-ai-sm" data-src="f-edu" data-target="f-edu-en" data-ctx="education history">譯</button></div></div>' +
        '<div class="form-field"><label class="form-label">電話</label><input class="form-input" id="f-phone" value="' + esc(about.phone) + '"></div>' +
        '<div class="form-field"><label class="form-label">Email</label><input class="form-input" id="f-email" value="' + esc(about.email) + '"></div>' +
        '<div class="form-field"><label class="form-label">Facebook</label><input class="form-input" id="f-fb" value="' + esc(about.facebook) + '"></div>' +
        '<div class="form-field"><label class="form-label">Instagram</label><input class="form-input" id="f-ig" value="' + esc(about.instagram) + '"></div>' +
      '</div>' +
      '<div class="form-field"><label class="form-label">自我介紹（中）</label><textarea class="form-textarea" id="f-bio" style="height:140px">' + esc(about.bio) + '</textarea></div>' +
      '<div class="form-field"><label class="form-label">自我介紹（英）</label><div class="input-ai-row" style="align-items:flex-start"><textarea class="form-textarea" id="f-bio-en" style="height:140px">' + esc(about.bioEn || '') + '</textarea><button class="btn-ai-sm" data-src="f-bio" data-target="f-bio-en" data-ctx="personal biography" style="margin-top:4px">譯</button></div></div>' +
      '<div class="btn-row"><button class="btn-primary" id="save-info">儲存基本資料</button></div>' +
      '<p id="info-status" class="text-muted" style="margin-top:8px;"></p></div>';

    tabContent.querySelectorAll('.btn-ai-sm[data-src]').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var srcEl = document.getElementById(btn.dataset.src);
        var targetEl = document.getElementById(btn.dataset.target);
        if (!srcEl || !srcEl.value.trim()) return;
        btn.disabled = true; btn.textContent = '…';
        try {
          targetEl.value = await app.translateZhToEn(srcEl.value);
        } catch(e) { /* silent */ }
        btn.textContent = '譯'; btn.disabled = false;
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

  function renderSkills() {
    let skills = about.skills.map(function(s) { return Object.assign({}, s); });
    tabContent.innerHTML =
      '<div class="section-box"><h3>技能評分</h3><div id="skills-list"></div>' +
      '<button class="add-row-btn" id="add-skill">＋ 新增技能</button>' +
      '<div class="btn-row" style="margin-top:14px;"><button class="btn-primary" id="save-skills">儲存技能</button></div>' +
      '<p id="skills-status" class="text-muted" style="margin-top:8px;"></p></div>';

    function renderRows() {
      document.getElementById('skills-list').innerHTML = skills.map(function(s, i) {
        return '<div class="skill-row" data-i="' + i + '">' +
          '<input class="form-input skill-name-input" value="' + esc(s.name) + '" placeholder="技能名稱（中）" style="flex:1">' +
          '<input class="form-input skill-name-en-input" value="' + esc(s.nameEn || '') + '" placeholder="Skill (English)" style="flex:1">' +
          '<button class="btn-ai-sm skill-ai-btn" data-i="' + i + '" title="中翻英">譯</button>' +
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
            enInput.value = await app.translateZhToEn(zhInput.value);
          } catch(e) { /* silent */ }
          btn.textContent = '譯'; btn.disabled = false;
        });
      });
    }

    renderRows();
    document.getElementById('add-skill').addEventListener('click', function() { skills.push({ name: '', nameEn: '', stars: 3 }); renderRows(); });
    document.getElementById('save-skills').addEventListener('click', async function() {
      const statusEl = document.getElementById('skills-status');
      const saved = skills.map(function(_, i) {
        return {
          name:   document.querySelector('.skill-row[data-i="' + i + '"] .skill-name-input').value,
          nameEn: document.querySelector('.skill-row[data-i="' + i + '"] .skill-name-en-input').value,
          stars:  app.getStarValue(document.getElementById('stars-' + i)),
        };
      });
      try {
        await app.PUT('/about/skills', { skills: saved });
        about.skills = saved;
        statusEl.textContent = '✓ 已儲存';
        await app.refreshPendingCount();
      } catch(err) { statusEl.textContent = '✗ ' + err.message; }
    });
  }

  function renderWork() {
    let exp = about.workExperience.map(function(e) { return Object.assign({}, e); });
    tabContent.innerHTML =
      '<div class="section-box"><h3>工作經歷</h3><div id="exp-list"></div>' +
      '<button class="add-row-btn" id="add-exp">＋ 新增工作經歷</button>' +
      '<div class="btn-row" style="margin-top:14px;"><button class="btn-primary" id="save-exp">儲存工作經歷</button></div>' +
      '<p id="exp-status" class="text-muted" style="margin-top:8px;"></p></div>';

    function renderRows() {
      document.getElementById('exp-list').innerHTML =
        '<table class="exp-table" style="width:100%;margin-bottom:8px;">' +
        '<thead><tr>' +
          '<th style="width:110px">期間</th>' +
          '<th>公司（中）</th><th>公司（英）</th>' +
          '<th>職稱（中）</th><th>職稱（英）</th>' +
          '<th style="width:36px">譯</th><th style="width:36px"></th>' +
        '</tr></thead>' +
        '<tbody>' + exp.map(function(e, i) {
          return '<tr data-i="' + i + '">' +
            '<td><input class="exp-input" data-field="period" value="' + esc(e.period) + '"></td>' +
            '<td><input class="exp-input" data-field="company" value="' + esc(e.company) + '"></td>' +
            '<td><input class="exp-input" data-field="companyEn" value="' + esc(e.companyEn || '') + '"></td>' +
            '<td><input class="exp-input" data-field="title" value="' + esc(e.title) + '"></td>' +
            '<td><input class="exp-input" data-field="titleEn" value="' + esc(e.titleEn || '') + '"></td>' +
            '<td><button class="btn-ai-sm exp-ai-btn" data-i="' + i + '">譯</button></td>' +
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
            tr.querySelector('[data-field="companyEn"]').value = await app.translateZhToEn(company);
            tr.querySelector('[data-field="titleEn"]').value = await app.translateZhToEn(title);
          } catch(e) { /* silent */ }
          btn.textContent = '譯'; btn.disabled = false;
        });
      });
    }

    renderRows();
    document.getElementById('add-exp').addEventListener('click', function() { exp.unshift({ period: '', company: '', companyEn: '', title: '', titleEn: '' }); renderRows(); });
    document.getElementById('save-exp').addEventListener('click', async function() {
      const saved = Array.from(document.querySelectorAll('#exp-list tr[data-i]')).map(function(tr) {
        return {
          period:    tr.querySelector('[data-field="period"]').value,
          company:   tr.querySelector('[data-field="company"]').value,
          companyEn: tr.querySelector('[data-field="companyEn"]').value,
          title:     tr.querySelector('[data-field="title"]').value,
          titleEn:   tr.querySelector('[data-field="titleEn"]').value,
        };
      });
      const statusEl = document.getElementById('exp-status');
      try {
        await app.PUT('/about/work-experience', { workExperience: saved });
        about.workExperience = saved;
        statusEl.textContent = '✓ 已儲存';
        await app.refreshPendingCount();
      } catch(err) { statusEl.textContent = '✗ ' + err.message; }
    });
  }

  function renderTimeline() {
    const sorted = about.timeline.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
    tabContent.innerHTML =
      '<div class="section-box"><h3>學習歷程時間軸</h3>' +
      '<div id="timeline-list">' + sorted.map(entryCard).join('') + '</div>' +
      '<button class="add-row-btn" id="add-timeline-btn">＋ 新增學習歷程</button>' +
      '<p id="tl-status" class="text-muted" style="margin-top:8px;"></p></div>';

    document.getElementById('add-timeline-btn').addEventListener('click', function() { location.hash = '#add-timeline'; });
    bindTimelineActions();
  }

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
            '<div class="form-field"><label class="form-label">機構名稱（英）</label><div class="input-ai-row"><input class="form-input tl-inst-en" value="' + esc(t.institutionEn || '') + '"><button class="btn-ai-sm tl-ai-btn" data-zh="tl-inst" data-en="tl-inst-en" data-ctx="institution name">譯</button></div></div>' +
            '<div class="form-field"><label class="form-label">標題（中）</label><input class="form-input tl-heading" value="' + esc(t.heading) + '"></div>' +
            '<div class="form-field"><label class="form-label">標題（英）</label><div class="input-ai-row"><input class="form-input tl-heading-en" value="' + esc(t.headingEn || '') + '"><button class="btn-ai-sm tl-ai-btn" data-zh="tl-heading" data-en="tl-heading-en" data-ctx="section heading">譯</button></div></div>' +
            '<div class="form-field"><label class="form-label">內文（中）</label><textarea class="form-textarea tl-body" style="height:80px">' + esc(t.body) + '</textarea></div>' +
            '<div class="form-field"><label class="form-label">內文（英）</label><div class="input-ai-row" style="align-items:flex-start"><textarea class="form-textarea tl-body-en" style="height:80px">' + esc(t.bodyEn || '') + '</textarea><button class="btn-ai-sm tl-ai-btn" data-zh="tl-body" data-en="tl-body-en" data-ctx="biography paragraph" style="margin-top:4px">譯</button></div></div>' +
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

  function bindTimelineActions() {
    document.querySelectorAll('.timeline-header').forEach(function(hdr) {
      hdr.addEventListener('click', function() {
        const body = hdr.nextElementSibling;
        const isHidden = body.classList.contains('hidden');
        body.classList.toggle('hidden', !isHidden);
        hdr.querySelector('.timeline-toggle').textContent = isHidden ? '▼ 收合' : '▶ 展開';
      });
    });
    document.querySelectorAll('.tl-ai-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var entry = btn.closest('.timeline-entry');
        var zhEl = entry.querySelector('.' + btn.dataset.zh);
        var enEl = entry.querySelector('.' + btn.dataset.en);
        if (!zhEl || !zhEl.value.trim()) return;
        btn.disabled = true; btn.textContent = '…';
        try {
          enEl.value = await app.translateZhToEn(zhEl.value);
        } catch(e) { /* silent */ }
        btn.textContent = '譯'; btn.disabled = false;
      });
    });
    document.querySelectorAll('.tl-save-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        const entry = btn.closest('.timeline-entry');
        const id = entry.dataset.id;
        const statusEl = entry.querySelector('.tl-status');
        const payload = {
          date:          entry.querySelector('.tl-date').value,
          institution:   entry.querySelector('.tl-inst').value,
          institutionEn: entry.querySelector('.tl-inst-en').value,
          heading:       entry.querySelector('.tl-heading').value,
          headingEn:     entry.querySelector('.tl-heading-en').value,
          body:          entry.querySelector('.tl-body').value,
          bodyEn:        entry.querySelector('.tl-body-en').value,
          footer:        entry.querySelector('.tl-footer').value,
        };
        try {
          await app.PUT('/about/timeline/' + id, payload);
          const t = about.timeline.find(function(t) { return t.id === id; });
          if (t) Object.assign(t, payload);
          statusEl.textContent = '✓ 已儲存';
          await app.refreshPendingCount();
        } catch(err) { statusEl.textContent = '✗ ' + err.message; }
      });
    });
    document.querySelectorAll('.tl-del-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('確定刪除此學習歷程？')) return;
        const id = btn.closest('.timeline-entry').dataset.id;
        await app.DEL('/about/timeline/' + id);
        about.timeline = about.timeline.filter(function(t) { return t.id !== id; });
        await app.refreshPendingCount();
        renderTimeline();
      });
    });
  }

  app.pages['add-timeline'] = function(c) {
    c.innerHTML =
      '<h2 style="margin-bottom:20px;color:#f1f5f9;">新增學習歷程</h2>' +
      '<div class="section-box" style="max-width:600px;">' +
        '<div class="form-field"><label class="form-label">日期 (YYYY-MM-DD)</label><input class="form-input" id="nt-date" placeholder="2025-06-04"></div>' +
        '<div class="form-field"><label class="form-label">機構名稱</label><input class="form-input" id="nt-inst" placeholder="復興商工美工科"></div>' +
        '<div class="form-field"><label class="form-label">標題</label><input class="form-input" id="nt-heading"></div>' +
        '<div class="form-field"><label class="form-label">內文（可包含 HTML 連結）</label><textarea class="form-textarea" id="nt-body" style="height:120px"></textarea></div>' +
        '<div class="form-field"><label class="form-label">圖片路徑</label><input class="form-input" id="nt-image" placeholder="images/foo.jpg"></div>' +
        '<div class="form-field"><label class="form-label">底部備註（選填）</label><input class="form-input" id="nt-footer"></div>' +
        '<div class="btn-row">' +
          '<button class="btn-primary" id="nt-save">新增</button>' +
          '<button class="btn-secondary" onclick="location.hash=\'#about\'">取消</button>' +
        '</div>' +
        '<p id="nt-status" class="text-muted" style="margin-top:8px;"></p>' +
      '</div>';

    document.getElementById('nt-save').addEventListener('click', async function() {
      const statusEl = document.getElementById('nt-status');
      try {
        const entry = await app.POST('/about/timeline', {
          date:        document.getElementById('nt-date').value,
          institution: document.getElementById('nt-inst').value,
          heading:     document.getElementById('nt-heading').value,
          body:        document.getElementById('nt-body').value,
          image:       document.getElementById('nt-image').value,
          footer:      document.getElementById('nt-footer').value,
        });
        about.timeline.push(entry);
        await app.refreshPendingCount();
        statusEl.textContent = '✓ 新增成功！';
        setTimeout(function() { location.hash = '#about'; }, 600);
      } catch(err) { statusEl.textContent = '✗ ' + err.message; }
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
