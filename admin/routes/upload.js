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
      categories: JSON.parse(req.body.categories || '[]'),
      fancyboxGroup: req.body.fancyboxGroup || '',
    };

    res.json({ work });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, init };
