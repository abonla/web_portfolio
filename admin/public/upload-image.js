const app = window.adminApp;

app.pages['upload-image'] = function (container) {
  let cropper = null;

  container.innerHTML =
    '<h2 style="margin-bottom:20px;color:#f1f5f9;">上傳圖片</h2>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">' +
      '<div class="section-box">' +
        '<h3>選擇圖片 &amp; 裁切縮圖範圍</h3>' +
        '<div class="upload-zone" id="drop-zone"><div class="upload-icon">📂</div>拖拉圖片到這裡，或點擊選擇<small class="text-muted" style="display:block;margin-top:6px;">支援 JPG、PNG、WebP</small></div>' +
        '<input type="file" id="file-input" accept="image/*" style="display:none">' +
        '<div class="crop-wrapper hidden" id="crop-wrapper"><div class="crop-container"><img id="crop-img" src="" alt=""></div><div class="crop-controls"><button class="btn-sm" id="reset-crop">重設裁切</button></div></div>' +
      '</div>' +
      '<div class="section-box">' +
        '<h3>作品資訊</h3>' +
        '<div class="form-field"><label class="form-label">檔名</label><input class="form-input" id="base-name" placeholder="例：媽祖插畫"></div>' +
        '<div class="form-field"><label class="form-label">說明文字（中）</label>' +
          '<div class="caption-row">' +
            '<textarea class="form-textarea" id="caption" placeholder="作品說明…"></textarea>' +
            '<button class="btn-ai" id="btn-ai-gen" type="button" disabled style="display:none">✨ AI 生成</button>' +
          '</div>' +
        '</div>' +
        '<div class="form-field"><label class="form-label">說明文字（英）</label><textarea class="form-textarea" id="caption-en" placeholder="English caption…"></textarea></div>' +
        '<div class="form-field"><label class="form-label">FancyBox 群組</label><input class="form-input" id="fancybox-group" placeholder="painter"></div>' +
        '<div class="form-field"><label class="form-label">分類標籤</label><div class="chip-group" id="chip-group"></div></div>' +
        '<div class="btn-row"><button class="btn-primary" id="save-btn" disabled>儲存作品</button><button class="btn-secondary" onclick="location.hash=\'#works\'">取消</button></div>' +
        '<p id="upload-status" class="text-muted" style="margin-top:10px;"></p>' +
      '</div>' +
    '</div>';

  app.buildChips(document.getElementById('chip-group'), ['painter']);

  const dropZone    = document.getElementById('drop-zone');
  const fileInput   = document.getElementById('file-input');
  const cropWrapper = document.getElementById('crop-wrapper');
  const cropImg     = document.getElementById('crop-img');
  const saveBtn     = document.getElementById('save-btn');
  const aiBtn       = document.getElementById('btn-ai-gen');
  const statusEl    = document.getElementById('upload-status');
  let selectedFile  = null;

  function loadFile(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = function (e) {
      cropImg.src = e.target.result;
      cropWrapper.classList.remove('hidden');
      dropZone.classList.add('hidden');
      if (cropper) cropper.destroy();
      cropper = new Cropper(cropImg, {
        viewMode: 1,
        autoCropArea: 1,
        movable: true,
        zoomable: false,
      });
      document.getElementById('base-name').value = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^\w\u4e00-\u9fff-]/g, '_');
      saveBtn.disabled = false;
      aiBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
  });
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  });
  document.getElementById('reset-crop').addEventListener('click', function () {
    if (cropper) cropper.reset();
  });

  aiBtn.addEventListener('click', async function () {
    if (!cropImg.src || !selectedFile) return;
    aiBtn.textContent = '生成中…';
    aiBtn.disabled = true;
    statusEl.textContent = '';
    try {
      // Extract base64 from the dataURL already loaded by FileReader
      const dataURL = cropImg.src;
      const commaIdx = dataURL.indexOf(',');
      const base64Data = dataURL.slice(commaIdx + 1);
      const mimeType = selectedFile.type || 'image/jpeg';

      const result = await app.POST('/ai/caption', {
        imageBase64: base64Data,
        mimeType: mimeType,
      });

      document.getElementById('caption').value = result.captionZh || '';
      document.getElementById('caption-en').value = result.captionEn || '';
      document.getElementById('fancybox-group').value = result.fancyboxGroup || '';

      // Update chip selection
      const chipGroup = document.getElementById('chip-group');
      chipGroup.querySelectorAll('.chip').forEach(function (chip) {
        chip.classList.toggle(
          'selected',
          (result.categories || []).includes(chip.dataset.cat)
        );
      });
    } catch (err) {
      statusEl.textContent = '✗ AI 生成失敗：' + err.message;
    }
    aiBtn.textContent = '✨ AI 生成';
    aiBtn.disabled = false;
  });

  saveBtn.addEventListener('click', async function () {
    if (!selectedFile || !cropper) return;
    saveBtn.disabled = true;
    statusEl.textContent = '處理中…';
    try {
      const cropData = cropper.getData(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('baseName', document.getElementById('base-name').value);
      formData.append('caption', document.getElementById('caption').value);
      formData.append('captionEn', document.getElementById('caption-en').value);
      formData.append('fancyboxGroup', document.getElementById('fancybox-group').value);
      formData.append(
        'categories',
        JSON.stringify(app.getSelectedChips(document.getElementById('chip-group')))
      );
      formData.append('crop', JSON.stringify(cropData));

      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error);
      const data = await uploadRes.json();

      await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.work),
      });
      await app.refreshPendingCount();
      statusEl.textContent = '✓ 儲存成功！';
      setTimeout(function () { location.hash = '#works'; }, 800);
    } catch (err) {
      statusEl.textContent = '✗ 錯誤：' + err.message;
      saveBtn.disabled = false;
    }
  });
};
