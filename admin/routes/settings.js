const express = require('express');
const router = express.Router();
let readData, writeData;
function init(deps) { readData = deps.readData; writeData = deps.writeData; }

router.get('/', function(req, res) { res.json(readData().meta); });

router.put('/', function(req, res) {
  const data = readData();
  ['siteTitle', 'description', 'ogImage'].forEach(function(k) {
    if (req.body[k] !== undefined) data.meta[k] = req.body[k];
  });
  writeData(data);
  res.json(data.meta);
});

module.exports = { router, init };
