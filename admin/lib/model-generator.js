const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

function extractModelName(filenames) {
  const obj = filenames.find(function(f) { return f.toLowerCase().endsWith('.obj'); });
  return obj ? path.basename(obj, '.obj') : null;
}

function generateViewerHTML(modelName, label, template) {
  return template
    .replace(/\{\{MODEL_NAME\}\}/g, modelName)
    .replace(/\{\{MODEL_LABEL\}\}/g, label);
}

async function processModelUpload(opts) {
  const zipPath = opts.zipPath;
  const modelDir = opts.modelDir;
  const label = opts.label;
  const viewerTemplate = opts.viewerTemplate;

  const filenames = [];
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Parse())
    .on('entry', function(entry) {
      const fileName = path.basename(entry.path);
      if (entry.type === 'File') {
        filenames.push(fileName);
        entry.pipe(fs.createWriteStream(path.join(modelDir, fileName)));
      } else {
        entry.autodrain();
      }
    })
    .promise();

  const modelName = extractModelName(filenames);
  if (!modelName) throw new Error('No .obj file found in zip');

  const viewerHTML = generateViewerHTML(modelName, label, viewerTemplate);
  const viewerPath = path.join(modelDir, modelName + '.html');
  fs.writeFileSync(viewerPath, viewerHTML, 'utf8');

  return {
    modelName: modelName,
    viewerPath: viewerPath,
    viewerSrc: 'model/' + modelName + '.html',
    label: label,
  };
}

module.exports = { extractModelName, generateViewerHTML, processModelUpload };
