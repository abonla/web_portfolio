const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
let readData, writeData;
function init(deps) { readData = deps.readData; writeData = deps.writeData; }

router.get('/', function(req, res) { res.json(readData().about); });

router.put('/info', function(req, res) {
  const data = readData();
  const allowed = ['name','currentTitle','education','phone','email','facebook','instagram','bio','photo'];
  allowed.forEach(function(k) { if (req.body[k] !== undefined) data.about[k] = req.body[k]; });
  writeData(data);
  res.json(data.about);
});

router.put('/skills', function(req, res) {
  const data = readData();
  data.about.skills = req.body.skills || [];
  writeData(data);
  res.json(data.about.skills);
});

router.put('/work-experience', function(req, res) {
  const data = readData();
  data.about.workExperience = req.body.workExperience || [];
  writeData(data);
  res.json(data.about.workExperience);
});

router.get('/timeline', function(req, res) { res.json(readData().about.timeline); });

router.post('/timeline', function(req, res) {
  const data = readData();
  const entry = Object.assign({ id: uuidv4() }, req.body);
  data.about.timeline.push(entry);
  writeData(data);
  res.status(201).json(entry);
});

router.put('/timeline/:id', function(req, res) {
  const data = readData();
  const idx = data.about.timeline.findIndex(function(t) { return t.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.about.timeline[idx] = Object.assign({}, data.about.timeline[idx], req.body, { id: req.params.id });
  writeData(data);
  res.json(data.about.timeline[idx]);
});

router.delete('/timeline/:id', function(req, res) {
  const data = readData();
  const idx = data.about.timeline.findIndex(function(t) { return t.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.about.timeline.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

module.exports = { router, init };
