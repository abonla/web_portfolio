const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();

let readData, writeData, ROOT;
function init(deps) { readData = deps.readData; writeData = deps.writeData; ROOT = deps.ROOT; }

router.get('/', function(req, res) {
  res.json(readData().works);
});

router.post('/', function(req, res) {
  const data = readData();
  const newWork = Object.assign({ id: uuidv4() }, req.body);
  const newCats = newWork.categories || [];

  // Sort by current order so we can find insertion position
  data.works.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

  // Find the last work that shares at least one category with the new work
  let insertIdx = data.works.length; // default: append to end
  if (newCats.length > 0) {
    for (let i = data.works.length - 1; i >= 0; i--) {
      const wCats = data.works[i].categories || [];
      if (wCats.some(function(c) { return newCats.includes(c); })) {
        insertIdx = i + 1;
        break;
      }
    }
  }

  data.works.splice(insertIdx, 0, newWork);

  // Re-assign sequential orders after insertion
  data.works.forEach(function(w, i) { w.order = i; });

  writeData(data);
  res.status(201).json(newWork);
});

router.put('/:id', function(req, res) {
  const data = readData();
  const idx = data.works.findIndex(function(w) { return w.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.works[idx] = Object.assign({}, data.works[idx], req.body, { id: req.params.id });
  writeData(data);
  res.json(data.works[idx]);
});

router.delete('/:id', function(req, res) {
  const data = readData();
  const idx = data.works.findIndex(function(w) { return w.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const work = data.works[idx];

  if (work.type === 'image') {
    [work.src, work.thumb].forEach(function(rel) {
      if (!rel) return;
      const abs = path.join(ROOT, rel);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    });
  }
  if (work.type === 'three') {
    const viewerPath = path.join(ROOT, work.src);
    if (fs.existsSync(viewerPath)) fs.unlinkSync(viewerPath);
  }

  data.works.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

module.exports = { router, init };
