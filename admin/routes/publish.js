const express = require('express');
const { getPendingCount, publish } = require('../lib/git');
const router = express.Router();

router.get('/status', async function(req, res) {
  try {
    const count = await getPendingCount();
    res.json({ pendingCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async function(req, res) {
  const msg = (req.body && req.body.message) || ('Update portfolio: ' + new Date().toLocaleDateString('zh-TW'));
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  const result = await publish(msg, function(line) {
    res.write('data: ' + JSON.stringify({ line: line }) + '\n\n');
  });

  res.write('data: ' + JSON.stringify({ done: true, success: result.success }) + '\n\n');
  res.end();
});

module.exports = { router };
