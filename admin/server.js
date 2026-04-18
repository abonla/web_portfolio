const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateHTML } = require('./lib/generator');

const ROOT = path.env && process.env.ROOT_PATH ? process.env.ROOT_PATH : path.join(__dirname, '..');
const DATA_PATH = process.env.DATA_PATH || path.join(ROOT, 'data.json');
const TEMPLATE_PATH = process.env.TEMPLATE_PATH || path.join(__dirname, 'template.html');
const OUTPUT_PATH = process.env.OUTPUT_PATH || path.join(ROOT, 'index.html');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve admin UI static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve portfolio assets from repo root (images, model, css, js)
app.use('/portfolio', express.static(ROOT));

// Health check
app.get('/health', function(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Utility: read data.json
function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

// Utility: write data.json and regenerate index.html
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const html = generateHTML(data, template);
  fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
}

// Export for route files (Plan 2) and tests
module.exports = { app, readData, writeData, ROOT, DATA_PATH, TEMPLATE_PATH, OUTPUT_PATH };

// Only listen when run directly (not required by tests)
if (require.main === module) {
  app.listen(PORT, function() {
    console.log('Admin server running at http://localhost:' + PORT);
  });
}
