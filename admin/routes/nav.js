const express = require('express');
const router = express.Router();
let readData, writeData;
function init(deps) { readData = deps.readData; writeData = deps.writeData; }

router.get('/', function(req, res) { res.json(readData().navLabels || {}); });

router.put('/', function(req, res) {
  const data = readData();
  if (!data.navLabels) data.navLabels = {};
  const allowed = ['cis','cis1','cis2','cis3','cis4','cis5','cis6','cis7','cis8',
    'painter','sketch','water','ink','oil','mark','digital',
    'photo','video','web','three','news','me'];
  allowed.forEach(function(k) {
    if (req.body[k]) data.navLabels[k] = { zh: req.body[k].zh || '', en: req.body[k].en || '' };
  });
  writeData(data);
  res.json(data.navLabels);
});

module.exports = { router, init };
