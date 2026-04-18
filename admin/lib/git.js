const simpleGit = require('simple-git');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

async function getPendingCount() {
  const git = simpleGit(ROOT);
  const status = await git.status();
  return status.files.length;
}

async function publish(commitMessage, onLog) {
  if (!onLog) onLog = function() {};
  const git = simpleGit(ROOT);
  const lines = [];

  function log(msg) { lines.push(msg); onLog(msg); }

  try {
    log('$ git add -A');
    await git.add('-A');
    log('$ git commit -m "' + commitMessage + '"');
    await git.commit(commitMessage);
    log('$ git push origin main');
    await git.push('origin', 'main');
    log('✓ Published successfully');
    return { success: true, output: lines.join('\n') };
  } catch (err) {
    log('✗ Error: ' + err.message);
    return { success: false, output: lines.join('\n') };
  }
}

module.exports = { getPendingCount, publish };
