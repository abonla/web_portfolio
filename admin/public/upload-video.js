const app = window.adminApp;

app.pages['upload-video'] = function(container) {
  container.innerHTML =
    '<h2 style="margin-bottom:20px;color:#f1f5f9;">新增 YouTube 影片</h2>' +
    '<div style="max-width:520px;">' +
      '<div class="section-box">' +
        '<h3>貼上 YouTube 連結</h3>' +
        '<div class="form-field"><label class="form-label">YouTube 網址</label><input class="form-input" id="yt-url" placeholder="https://www.youtube.com/watch?v=…"></div>' +
        '<div class="yt-preview hidden" id="yt-preview"><img class="yt-thumb-img" id="yt-thumb" src="" alt=""><div class="yt-meta" id="yt-meta"></div></div>' +
        '<div class="btn-row"><button class="btn-secondary" id="parse-btn">預覽</button><button class="btn-primary" id="save-btn" disabled>加入影片</button><button class="btn-secondary" onclick="location.hash=\'#works\'">取消</button></div>' +
        '<p id="status" class="text-muted" style="margin-top:8px;"></p>' +
      '</div>' +
    '</div>';

  let videoId = null;

  document.getElementById('parse-btn').addEventListener('click', async function() {
    const url = document.getElementById('yt-url').value.trim();
    const statusEl = document.getElementById('status');
    statusEl.textContent = '解析中…';
    try {
      const res = await fetch('/api/youtube/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      videoId = data.videoId;
      document.getElementById('yt-thumb').src = data.thumbUrl;
      document.getElementById('yt-meta').textContent = '影片 ID：' + videoId;
      document.getElementById('yt-preview').classList.remove('hidden');
      document.getElementById('save-btn').disabled = false;
      statusEl.textContent = '';
    } catch(err) { statusEl.textContent = '✗ ' + err.message; }
  });

  document.getElementById('save-btn').addEventListener('click', async function() {
    if (!videoId) return;
    const statusEl = document.getElementById('status');
    statusEl.textContent = '儲存中…';
    try {
      await fetch('/api/works', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'video', videoId, caption: '', categories: ['video'] }) });
      await app.refreshPendingCount();
      statusEl.textContent = '✓ 加入成功！';
      setTimeout(function() { location.hash = '#works'; }, 600);
    } catch(err) { statusEl.textContent = '✗ ' + err.message; }
  });
};
