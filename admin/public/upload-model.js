const app = window.adminApp;

app.pages['upload-model'] = function(container) {
  container.innerHTML =
    '<h2 style="margin-bottom:20px;color:#f1f5f9;">上傳 3D 模型</h2>' +
    '<div style="max-width:520px;">' +
      '<div class="section-box">' +
        '<h3>上傳 ZIP 壓縮檔</h3>' +
        '<p class="text-muted" style="margin-bottom:14px;">ZIP 內需包含同名的 .obj、.mtl 和材質貼圖</p>' +
        '<div class="upload-zone" id="model-drop-zone"><div class="upload-icon">📦</div>拖拉 .zip 到這裡，或點擊選擇</div>' +
        '<input type="file" id="model-file-input" accept=".zip" style="display:none">' +
        '<p id="file-name" class="text-muted" style="margin-top:8px;"></p>' +
        '<div class="form-field" style="margin-top:14px;"><label class="form-label">模型標籤</label><input class="form-input" id="model-label" placeholder="例：娃娃"></div>' +
        '<div class="btn-row"><button class="btn-primary" id="save-model-btn" disabled>上傳並產生 Viewer</button><button class="btn-secondary" onclick="location.hash=\'#works\'">取消</button></div>' +
        '<p id="model-status" class="text-muted" style="margin-top:8px;"></p>' +
      '</div>' +
    '</div>';

  let selectedZip = null;
  const dropZone  = document.getElementById('model-drop-zone');
  const fileInput = document.getElementById('model-file-input');
  const saveBtn   = document.getElementById('save-model-btn');

  function setFile(file) {
    selectedZip = file;
    document.getElementById('file-name').textContent = '選擇：' + file.name;
    document.getElementById('model-label').value = file.name.replace(/\.zip$/i, '').replace(/_/g, ' ');
    saveBtn.disabled = false;
  }

  dropZone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() { if (fileInput.files[0]) setFile(fileInput.files[0]); });
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault(); dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) setFile(file);
    else document.getElementById('model-status').textContent = '請選擇 .zip 檔案';
  });

  saveBtn.addEventListener('click', async function() {
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
      const data = await uploadRes.json();
      await fetch('/api/works', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data.work) });
      await app.refreshPendingCount();
      statusEl.textContent = '✓ 模型上傳成功！';
      setTimeout(function() { location.hash = '#works'; }, 800);
    } catch(err) {
      statusEl.textContent = '✗ ' + err.message;
      saveBtn.disabled = false;
    }
  });
};
