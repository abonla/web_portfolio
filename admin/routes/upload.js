const express = require('express');
const multer = require('multer');
const path = require('path');
const { processUpload } = require('../lib/image-processor');

const router = express.Router();
let readData, writeData, ROOT;
function init(deps) { readData = deps.readData; writeData = deps.writeData; ROOT = deps.ROOT; }

const upload = multer({ dest: require('os').tmpdir() });

router.post('/image', upload.single('file'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const crop = JSON.parse(req.body.crop || '{"x":0,"y":0,"width":9999,"height":9999}');
    const rawName = req.body.baseName || path.basename(req.file.originalname || 'upload', path.extname(req.file.originalname || ''));
    const baseName = rawName.replace(/[^\w\u4e00-\u9fff-]/g, '_');

    const imageDir = path.join(ROOT, 'images');
    const result = await processUpload({
      inputPath: req.file.path,
      outputDir: imageDir,
      baseName: baseName,
      crop: crop,
    });

    const work = {
      type: 'image',
      src: result.originalSrc,
      thumb: result.thumbSrc,
      caption: req.body.caption || '',
      captionEn: req.body.captionEn || '',
      titleZh: req.body.titleZh || '',
      titleEn: req.body.titleEn || '',
      categories: JSON.parse(req.body.categories || '[]'),
      fancyboxGroup: req.body.fancyboxGroup || '',
    };

    res.json({ work });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/replace/:id', upload.single('file'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const data = readData();
    const idx = data.works.findIndex(function(w) { return w.id === req.params.id; });
    if (idx === -1) return res.status(404).json({ error: 'Work not found' });
    const work = data.works[idx];

    const crop = JSON.parse(req.body.crop || '{"x":0,"y":0,"width":9999,"height":9999}');
    const rawName = req.body.baseName ||
      path.basename(work.src || req.file.originalname || 'upload', path.extname(work.src || req.file.originalname || ''));
    const baseName = rawName.replace(/[^\w\u4e00-\u9fff-]/g, '_');

    const imageDir = path.join(ROOT, 'images');
    const result = await processUpload({
      inputPath: req.file.path,
      outputDir: imageDir,
      baseName: baseName,
      crop: crop,
    });

    // 刪除舊圖
    const fs = require('fs');
    [work.src, work.thumb].forEach(function(rel) {
      if (!rel) return;
      const abs = path.join(ROOT, rel);
      if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch(e) {}
    });

    data.works[idx].src = result.originalSrc;
    data.works[idx].thumb = result.thumbSrc;
    writeData(data);
    res.json({ src: result.originalSrc, thumb: result.thumbSrc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, init };
