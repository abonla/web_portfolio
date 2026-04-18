const app = window.adminApp;

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

app.pages['settings'] = async function(container) {
  const meta = await app.GET('/settings');
  container.innerHTML =
    '<h2 style="margin-bottom:20px;color:#f1f5f9;">網站設定</h2>' +
    '<div class="section-box" style="max-width:600px;">' +
      '<h3>SEO / Open Graph</h3>' +
      '<div class="form-field"><label class="form-label">網站標題</label><input class="form-input" id="s-title" value="' + esc(meta.siteTitle) + '"></div>' +
      '<div class="form-field"><label class="form-label">網站描述</label><textarea class="form-textarea" id="s-desc">' + esc(meta.description) + '</textarea></div>' +
      '<div class="form-field"><label class="form-label">OG 圖片路徑</label><input class="form-input" id="s-og" value="' + esc(meta.ogImage) + '" placeholder="images/web02.png"></div>' +
      '<div class="btn-row"><button class="btn-primary" id="save-settings">儲存設定</button></div>' +
      '<p id="s-status" class="text-muted" style="margin-top:8px;"></p>' +
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
};
