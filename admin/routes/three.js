const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processModelUpload } = require('../lib/model-generator');

const router = express.Router();
let readData, writeData, ROOT;
function init(deps) { readData = deps.readData; writeData = deps.writeData; ROOT = deps.ROOT; }

const upload = multer({ dest: require('os').tmpdir() });

router.post('/model', upload.single('file'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.originalname || !req.file.originalname.endsWith('.zip')) {
      return res.status(400).json({ error: 'File must be a .zip' });
    }

    const label = req.body.label || 'Untitled';
    const modelDir = path.join(ROOT, 'model');
    const viewerTemplate = fs.readFileSync(
      path.join(__dirname, '..', 'model-viewer-template.html'), 'utf8'
    );

    const result = await processModelUpload({
      zipPath: req.file.path,
      modelDir: modelDir,
      label: label,
      viewerTemplate: viewerTemplate,
    });

    const work = {
      type: 'three',
      src: result.viewerSrc,
      label: result.label,
      categories: ['three'],
    };

    res.json({ work });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, init };
