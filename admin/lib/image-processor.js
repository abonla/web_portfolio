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

  await sharp(inputPath)
    .extract({ left: Math.round(crop.x), top: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height) })
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
