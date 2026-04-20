const app = window.adminApp;

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const NAV_ITEMS = [
  { key: 'cis',     label: '設計（主選單）' },
  { key: 'cis6',    label: '設計 > 宜蘭好羹' },
  { key: 'cis5',    label: '設計 > 台北捷運' },
  { key: 'cis3',    label: '設計 > 大叔咖啡' },
  { key: 'cis2',    label: '設計 > 狗日攝影' },
  { key: 'cis4',    label: '設計 > 武台開打' },
  { key: 'cis1',    label: '設計 > 雀姊蛋糕' },
  { key: 'cis7',    label: '設計 > 渡商創研' },
  { key: 'cis8',    label: '設計 > 熊出沒' },
  { key: 'painter', label: '繪畫（主選單）' },
  { key: 'sketch',  label: '繪畫 > 素描' },
  { key: 'water',   label: '繪畫 > 水彩' },
  { key: 'ink',     label: '繪畫 > 水墨' },
  { key: 'oil',     label: '繪畫 > 油畫' },
  { key: 'mark',    label: '繪畫 > 麥克筆' },
  { key: 'digital', label: '繪畫 > 電繪' },
  { key: 'photo',   label: '攝影' },
  { key: 'video',   label: '影片' },
  { key: 'web',     label: '網頁' },
  { key: 'three',   label: '3D' },
  { key: 'news',    label: '新聞' },
  { key: 'me',      label: '關於' },
];

app.pages['settings'] = async function(container) {
  const [meta, navLabels] = await Promise.all([
    app.GET('/settings'),
    app.GET('/nav'),
  ]);

  const navRows = NAV_ITEMS.map(function(item) {
    const v = navLabels[item.key] || {};
    return '<tr>' +
      '<td style="padding:4px 8px;color:#94a3b8;white-space:nowrap;">' + esc(item.label) + '</td>' +
      '<td style="padding:4px 4px;"><input class="form-input nav-zh" data-key="' + item.key + '" value="' + esc(v.zh||'') + '" placeholder="中文" style="width:130px;"></td>' +
      '<td style="padding:4px 4px;"><input class="form-input nav-en" data-key="' + item.key + '" value="' + esc(v.en||'') + '" placeholder="English" style="width:160px;"></td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<h2 style="margin-bottom:20px;color:#f1f5f9;">網站設定</h2>' +

    '<div class="section-box" style="max-width:600px;margin-bottom:24px;">' +
      '<h3>SEO / Open Graph</h3>' +
      '<div class="form-field"><label class="form-label">網站標題</label><input class="form-input" id="s-title" value="' + esc(meta.siteTitle) + '"></div>' +
      '<div class="form-field"><label class="form-label">網站描述</label><textarea class="form-textarea" id="s-desc">' + esc(meta.description) + '</textarea></div>' +
      '<div class="form-field"><label class="form-label">OG 圖片路徑</label><input class="form-input" id="s-og" value="' + esc(meta.ogImage) + '" placeholder="images/web02.png"></div>' +
      '<div class="btn-row"><button class="btn-primary" id="save-settings">儲存設定</button></div>' +
      '<p id="s-status" class="text-muted" style="margin-top:8px;"></p>' +
    '</div>' +

    '<div class="section-box" style="max-width:600px;">' +
      '<h3>導覽列文字</h3>' +
      '<table style="border-collapse:collapse;width:100%;">' +
        '<thead><tr>' +
          '<th style="padding:4px 8px;text-align:left;color:#64748b;">項目</th>' +
          '<th style="padding:4px 4px;text-align:left;color:#64748b;">中文</th>' +
          '<th style="padding:4px 4px;text-align:left;color:#64748b;">英文</th>' +
        '</tr></thead>' +
        '<tbody>' + navRows + '</tbody>' +
      '</table>' +
      '<div class="btn-row" style="margin-top:12px;"><button class="btn-primary" id="save-nav">儲存導覽列</button></div>' +
      '<p id="nav-status" class="text-muted" style="margin-top:8px;"></p>' +
    '</div>';

  document.getElementById('save-settings').addEventListener('click', async function() {
    const statusEl = document.getElementById('s-status');
    try {
      await app.PUT('/settings', {
        siteTitle:   document.getElementById('s-title').value,
        description: document.getElementById('s-desc').value,
        ogImage:     document.getElementById('s-og').value,
      });
      statusEl.textContent = '✓ 已儲存';
      await app.refreshPendingCount();
    } catch(err) { statusEl.textContent = '✗ ' + err.message; }
  });

  document.getElementById('save-nav').addEventListener('click', async function() {
    const statusEl = document.getElementById('nav-status');
    try {
      const payload = {};
      NAV_ITEMS.forEach(function(item) {
        const zh = container.querySelector('.nav-zh[data-key="' + item.key + '"]').value.trim();
        const en = container.querySelector('.nav-en[data-key="' + item.key + '"]').value.trim();
        payload[item.key] = { zh, en };
      });
      await app.PUT('/nav', payload);
      statusEl.textContent = '✓ 已儲存';
      await app.refreshPendingCount();
    } catch(err) { statusEl.textContent = '✗ ' + err.message; }
  });
};
