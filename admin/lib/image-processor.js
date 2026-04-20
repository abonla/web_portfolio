const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processUpload({ inputPath, outputDir, baseName, crop }) {
  const safeName = resolveFilename(outputDir, baseName);

  const originalPath = path.join(outputDir, safeName + '.jpg');
  const thumbPath    = path.join(outputDir, safeName + 'm.jpg');

  await sharp(inputPath)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(originalPath);

  const meta = await sharp(inputPath).metadata();
  const imgW = meta.width || 9999;
  const imgH = meta.height || 9999;
  const cx = Math.max(0, Math.round(crop.x));
  const cy = Math.max(0, Math.round(crop.y));
  const cw = Math.min(Math.round(crop.width), imgW - cx);
  const ch = Math.min(Math.round(crop.height), imgH - cy);

  await sharp(inputPath)
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .resize({ width: 600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  const rel = path.relative(path.join(__dirname, '..', '..'), outputDir).replace(/\\/g, '/');
  return {
    originalPath,
    thumbPath,
    originalSrc: rel + '/' + safeName + '.jpg',
    thumbSrc: rel + '/' + safeName + 'm.jpg',
  };
}

function resolveFilename(dir, base) {
  const candidate = path.join(dir, base + '.jpg');
  if (!fs.existsSync(candidate)) return base;
  return base + '-' + Date.now();
}

module.exports = { processUpload };
