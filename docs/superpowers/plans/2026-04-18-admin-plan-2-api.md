# Portfolio Admin — Plan 2: Backend API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all Express API routes: works CRUD, image upload with Sharp processing, YouTube URL parsing, 3D model zip upload with viewer generation, about management, site settings, and one-click git publish.

**Architecture:** Each feature group lives in its own route file under `admin/routes/`. All routes call `writeData()` from `server.js` after mutations, which atomically updates `data.json` and regenerates `index.html`. Image and 3D files are written to the repo root's `images/` and `model/` directories.

**Tech Stack:** Express, Sharp, Multer, Unzipper, simple-git, UUID

**Prerequisite:** Plan 1 complete — `data.json`, `admin/template.html`, `admin/server.js` all exist.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `admin/routes/works.js` | Create | GET/POST/PUT/DELETE for works list |
| `admin/routes/upload.js` | Create | POST /api/upload/image (multipart + crop) |
| `admin/routes/youtube.js` | Create | POST /api/youtube/validate, POST /api/works/video |
| `admin/routes/three.js` | Create | POST /api/upload/model (zip) |
| `admin/routes/about.js` | Create | GET/PUT for all about sub-sections |
| `admin/routes/publish.js` | Create | POST /api/publish (git add/commit/push) |
| `admin/routes/settings.js` | Create | GET/PUT for meta section |
| `admin/lib/image-processor.js` | Create | Sharp resize + crop helpers |
| `admin/lib/model-generator.js` | Create | zip extract + viewer HTML generation |
| `admin/lib/git.js` | Create | simple-git wrapper |
| `admin/model-viewer-template.html` | Create | Three.js viewer template with `{{MODEL_NAME}}` |
| `admin/server.js` | Modify | Mount all route files |
| `tests/image-processor.test.js` | Create | Unit tests for Sharp helpers |
| `tests/model-generator.test.js` | Create | Unit tests for model viewer generation |
| `tests/api.test.js` | Create | Integration tests for key routes |

---

## Task 1: Image processor (TDD)

**Files:**
- Create: `admin/lib/image-processor.js`
- Create: `tests/image-processor.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/image-processor.test.js`:

```js
const path = require('path');
const fs = require('fs');
const os = require('os');
const { processUpload } = require('../admin/lib/image-processor');

// Create a minimal test JPEG (~1x1 pixel) using Sharp
const sharp = require('sharp');

let tmpDir;
beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-test-'));
  // Create a 800x600 red JPEG for testing
  await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .jpeg().toFile(path.join(tmpDir, 'test-input.jpg'));
});

afterAll(() => { fs.rmSync(tmpDir, { recursive: true }); });

describe('processUpload', () => {
  test('produces original and thumbnail files', async () => {
    const inputPath = path.join(tmpDir, 'test-input.jpg');
    const outputDir = tmpDir;
    const baseName = 'testfile';
    const crop = { x: 0, y: 0, width: 800, height: 600 }; // full image crop

    const result = await processUpload({ inputPath, outputDir, baseName, crop });

    expect(result.originalPath).toContain('testfile.jpg');
    expect(result.thumbPath).toContain('testfilem.jpg');
    expect(fs.existsSync(result.originalPath)).toBe(true);
    expect(fs.existsSync(result.thumbPath)).toBe(true);

    // Verify original max width 1600
    const origMeta = await sharp(result.originalPath).metadata();
    expect(origMeta.width).toBeLessThanOrEqual(1600);

    // Verify thumbnail max width 600
    const thumbMeta = await sharp(result.thumbPath).metadata();
    expect(thumbMeta.width).toBeLessThanOrEqual(600);
  });

  test('applies crop before thumbnail generation', async () => {
    const inputPath = path.join(tmpDir, 'test-input.jpg');
    const outputDir = tmpDir;
    const baseName = 'cropped';
    // Crop to left half: 400x600 from 800x600
    const crop = { x: 0, y: 0, width: 400, height: 600 };

    const result = await processUpload({ inputPath, outputDir, baseName, crop });
    const thumbMeta = await sharp(result.thumbPath).metadata();

    // Thumbnail should have same aspect ratio as crop (400:600 = 2:3)
    expect(thumbMeta.width / thumbMeta.height).toBeCloseTo(400 / 600, 1);
  });

  test('adds timestamp suffix on filename conflict', async () => {
    const inputPath = path.join(tmpDir, 'test-input.jpg');
    const outputDir = tmpDir;
    const crop = { x: 0, y: 0, width: 800, height: 600 };

    // First upload
    await processUpload({ inputPath, outputDir, baseName: 'conflict', crop });
    // Second upload with same name
    const result2 = await processUpload({ inputPath, outputDir, baseName: 'conflict', crop });

    expect(result2.originalPath).toMatch(/conflict-\d+\.jpg/);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- tests/image-processor.test.js --verbose 2>&1 | head -20
```

Expected: `Cannot find module '../admin/lib/image-processor'`

- [ ] **Step 3: Create `admin/lib/image-processor.js`**

```js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Process an uploaded image:
 * - Applies crop region to produce thumbnail (max 600px wide, JPEG 80%)
 * - Resizes original to max 1600px wide (JPEG 85%)
 * - Handles filename conflicts by appending timestamp
 *
 * @param {object} opts
 * @param {string} opts.inputPath  - Path to uploaded temp file
 * @param {string} opts.outputDir  - Directory to write output files
 * @param {string} opts.baseName   - Base filename without extension
 * @param {{x,y,width,height}} opts.crop - Crop region in pixels (from Cropper.js)
 * @returns {{ originalPath, thumbPath, originalSrc, thumbSrc }}
 */
async function processUpload({ inputPath, outputDir, baseName, crop }) {
  const safeName = resolveFilename(outputDir, baseName);

  const originalPath = path.join(outputDir, `${safeName}.jpg`);
  const thumbPath    = path.join(outputDir, `${safeName}m.jpg`);

  // Original: resize to max 1600px wide, keep aspect ratio
  await sharp(inputPath)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(originalPath);

  // Thumbnail: extract crop then resize to max 600px wide
  await sharp(inputPath)
    .extract({ left: Math.round(crop.x), top: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height) })
    .resize({ width: 600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  // Derive relative src paths (relative to repo root)
  const rel = path.relative(path.join(__dirname, '..', '..'), outputDir).replace(/\\/g, '/');
  return {
    originalPath,
    thumbPath,
    originalSrc: `${rel}/${safeName}.jpg`,
    thumbSrc: `${rel}/${safeName}m.jpg`,
  };
}

function resolveFilename(dir, base) {
  const candidate = path.join(dir, `${base}.jpg`);
  if (!fs.existsSync(candidate)) return base;
  return `${base}-${Date.now()}`;
}

module.exports = { processUpload };
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- tests/image-processor.test.js --verbose
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add admin/lib/image-processor.js tests/image-processor.test.js
git commit -m "feat: add image processor (Sharp) with tests"
```

---

## Task 2: 3D model generator (TDD)

**Files:**
- Create: `admin/model-viewer-template.html`
- Create: `admin/lib/model-generator.js`
- Create: `tests/model-generator.test.js`

- [ ] **Step 1: Create `admin/model-viewer-template.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{MODEL_LABEL}}</title>
  <style>html,body{margin:0;height:100%;}#c{width:100%;height:100%;display:block;}</style>
</head>
<body>
  <canvas id="c"></canvas>
  <script type="module">
    import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';
    import {OrbitControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/controls/OrbitControls.js';
    import {OBJLoader2} from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/loaders/OBJLoader2.js';
    import {MTLLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/loaders/MTLLoader.js';
    import {MtlObjBridge} from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/loaders/obj2/bridge/MtlObjBridge.js';

    function main() {
      const canvas = document.querySelector('#c');
      const renderer = new THREE.WebGLRenderer({canvas});
      const fov = 45, aspect = 2, near = 0.1, far = 100;
      const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      camera.position.set(0, 10, 20);
      const controls = new OrbitControls(camera, canvas);
      controls.target.set(0, 5, 0);
      controls.update();
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('black');
      scene.add(new THREE.AmbientLight(0xffffff, 1.8));
      scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2));
      const dLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dLight.position.set(5, 10, 8); scene.add(dLight);
      const dLight2 = new THREE.DirectionalLight(0xffffff, 1);
      dLight2.position.set(-8, 6, -5); scene.add(dLight2);

      function frameArea(size, boxSize, boxCenter, cam) {
        const half = size * 0.5;
        const halfFov = THREE.MathUtils.degToRad(cam.fov * 0.5);
        const dist = half / Math.tan(halfFov);
        const dir = new THREE.Vector3().subVectors(cam.position, boxCenter)
          .multiply(new THREE.Vector3(1, 0, 1)).normalize();
        cam.position.copy(dir.multiplyScalar(dist).add(boxCenter));
        cam.near = boxSize / 100; cam.far = boxSize * 100;
        cam.updateProjectionMatrix();
        cam.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
      }

      const mtlLoader = new MTLLoader();
      mtlLoader.load('{{MODEL_NAME}}.mtl', (mtlResult) => {
        const objLoader = new OBJLoader2();
        objLoader.addMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlResult));
        objLoader.load('{{MODEL_NAME}}.obj', (root) => {
          scene.add(root);
          const box = new THREE.Box3().setFromObject(root);
          const boxSize = box.getSize(new THREE.Vector3()).length();
          const boxCenter = box.getCenter(new THREE.Vector3());
          frameArea(boxSize * 1.2, boxSize, boxCenter, camera);
          controls.maxDistance = boxSize * 10;
          controls.target.copy(boxCenter);
          controls.update();
        });
      });

      function resizeRendererToDisplaySize(r) {
        const c = r.domElement;
        const needResize = c.width !== c.clientWidth || c.height !== c.clientHeight;
        if (needResize) r.setSize(c.clientWidth, c.clientHeight, false);
        return needResize;
      }

      (function render() {
        if (resizeRendererToDisplaySize(renderer)) {
          camera.aspect = canvas.clientWidth / canvas.clientHeight;
          camera.updateProjectionMatrix();
        }
        renderer.render(scene, camera);
        requestAnimationFrame(render);
      })();
    }
    main();
  </script>
</body>
</html>
```

- [ ] **Step 2: Write failing tests**

Create `tests/model-generator.test.js`:

```js
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateViewerHTML, extractModelName } = require('../admin/lib/model-generator');

describe('extractModelName', () => {
  test('extracts name from .obj filename', () => {
    expect(extractModelName(['doll.obj', 'doll.mtl', 'face.png'])).toBe('doll');
  });

  test('returns null when no .obj found', () => {
    expect(extractModelName(['doll.mtl', 'face.png'])).toBeNull();
  });
});

describe('generateViewerHTML', () => {
  test('replaces MODEL_NAME placeholder', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '../admin/model-viewer-template.html'), 'utf8'
    );
    const html = generateViewerHTML('doll', 'My Doll', template);
    expect(html).toContain("mtlLoader.load('doll.mtl'");
    expect(html).toContain("objLoader.load('doll.obj'");
    expect(html).not.toContain('{{MODEL_NAME}}');
    expect(html).toContain('My Doll');
    expect(html).not.toContain('{{MODEL_LABEL}}');
  });
});
```

- [ ] **Step 3: Run tests — expect failure**

```bash
npm test -- tests/model-generator.test.js --verbose 2>&1 | head -15
```

Expected: `Cannot find module '../admin/lib/model-generator'`

- [ ] **Step 4: Create `admin/lib/model-generator.js`**

```js
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

/**
 * Finds the .obj file among a list of filenames and returns the base name.
 */
function extractModelName(filenames) {
  const obj = filenames.find(f => f.toLowerCase().endsWith('.obj'));
  return obj ? path.basename(obj, '.obj') : null;
}

/**
 * Fills in the viewer template with model name and label.
 */
function generateViewerHTML(modelName, label, template) {
  return template
    .replace(/\{\{MODEL_NAME\}\}/g, modelName)
    .replace(/\{\{MODEL_LABEL\}\}/g, label);
}

/**
 * Extracts a zip of model files into targetDir, validates contents,
 * generates the viewer HTML, and returns metadata.
 *
 * @param {string} zipPath  - Path to uploaded zip file
 * @param {string} modelDir - Directory to extract into (e.g. /repo/model/)
 * @param {string} label    - Human-readable label for the model
 * @param {string} viewerTemplate - Contents of model-viewer-template.html
 * @returns {{ modelName, viewerPath, viewerSrc, label }}
 */
async function processModelUpload({ zipPath, modelDir, label, viewerTemplate }) {
  // Extract zip and collect filenames
  const filenames = [];
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Parse())
    .on('entry', (entry) => {
      const fileName = path.basename(entry.path); // strip any subdirectory
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

  const hasOBJ = filenames.some(f => f === `${modelName}.obj`);
  const hasMTL = filenames.some(f => f === `${modelName}.mtl`);
  if (!hasOBJ || !hasMTL) throw new Error(`Zip must contain ${modelName}.obj and ${modelName}.mtl`);

  const viewerHTML = generateViewerHTML(modelName, label, viewerTemplate);
  const viewerPath = path.join(modelDir, `${modelName}.html`);
  fs.writeFileSync(viewerPath, viewerHTML, 'utf8');

  return {
    modelName,
    viewerPath,
    viewerSrc: `model/${modelName}.html`,
    label,
  };
}

module.exports = { extractModelName, generateViewerHTML, processModelUpload };
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test -- tests/model-generator.test.js --verbose
```

Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add admin/model-viewer-template.html admin/lib/model-generator.js tests/model-generator.test.js
git commit -m "feat: add 3D model generator with tests"
```

---

## Task 3: git wrapper

**Files:**
- Create: `admin/lib/git.js`

- [ ] **Step 1: Create `admin/lib/git.js`**

```js
const simpleGit = require('simple-git');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

/**
 * Returns the count of changed files (staged + unstaged) vs HEAD.
 */
async function getPendingCount() {
  const git = simpleGit(ROOT);
  const status = await git.status();
  return status.files.length;
}

/**
 * Runs git add -A, commit, push.
 * Streams output lines to onLog callback.
 * Returns { success: boolean, output: string }
 */
async function publish(commitMessage, onLog = () => {}) {
  const git = simpleGit(ROOT);
  const lines = [];

  function log(msg) { lines.push(msg); onLog(msg); }

  try {
    log('$ git add -A');
    await git.add('-A');
    log(`$ git commit -m "${commitMessage}"`);
    await git.commit(commitMessage);
    log('$ git push origin main');
    await git.push('origin', 'main');
    log('✓ Published successfully');
    return { success: true, output: lines.join('\n') };
  } catch (err) {
    log(`✗ Error: ${err.message}`);
    return { success: false, output: lines.join('\n') };
  }
}

module.exports = { getPendingCount, publish };
```

- [ ] **Step 2: Commit**

```bash
git add admin/lib/git.js
git commit -m "feat: add git wrapper for one-click publish"
```

---

## Task 4: Works API routes

**Files:**
- Create: `admin/routes/works.js`
- Modify: `admin/server.js`

- [ ] **Step 1: Create `admin/routes/works.js`**

```js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// These are injected by server.js
let readData, writeData, ROOT;
function init(deps) { ({ readData, writeData, ROOT } = deps); }

// GET /api/works — list all works
router.get('/', (req, res) => {
  const data = readData();
  res.json(data.works);
});

// POST /api/works — create new work entry (image/video/three)
// Body: { type, src, thumb, caption, categories, fancyboxGroup, videoId, label, order }
router.post('/', (req, res) => {
  const data = readData();
  const maxOrder = data.works.reduce((m, w) => Math.max(m, w.order), -1);
  const work = { id: uuidv4(), ...req.body, order: maxOrder + 1 };
  data.works.push(work);
  writeData(data);
  res.status(201).json(work);
});

// PUT /api/works/:id — update a work
router.put('/:id', (req, res) => {
  const data = readData();
  const idx = data.works.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.works[idx] = { ...data.works[idx], ...req.body, id: req.params.id };
  writeData(data);
  res.json(data.works[idx]);
});

// DELETE /api/works/:id — delete a work and its files
router.delete('/:id', (req, res) => {
  const data = readData();
  const idx = data.works.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const work = data.works[idx];

  // Delete image files
  if (work.type === 'image') {
    [work.src, work.thumb].forEach(rel => {
      const abs = path.join(ROOT, rel);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    });
  }
  // Delete 3D model files
  if (work.type === 'three') {
    const viewerPath = path.join(ROOT, work.src);
    if (fs.existsSync(viewerPath)) fs.unlinkSync(viewerPath);
    // Note: leaves texture/obj/mtl files (they may be shared)
  }

  data.works.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

module.exports = { router, init };
```

- [ ] **Step 2: Mount routes in `admin/server.js`**

Add after the existing route code in `server.js`:

```js
const worksRoute = require('./routes/works');
worksRoute.init({ readData, writeData, ROOT });
app.use('/api/works', worksRoute.router);
```

- [ ] **Step 3: Write API test**

Add to `tests/api.test.js` (create file):

```js
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Point server at a temp data.json for testing
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-api-test-'));
const tmpDataPath = path.join(tmpDir, 'data.json');
const tmpTemplatePath = path.join(tmpDir, 'template.html');

const sampleData = {
  works: [
    { id: 'w1', type: 'image', src: 'images/a.jpg', thumb: 'images/am.jpg', caption: 'A', categories: ['painter'], fancyboxGroup: 'painter', order: 0 },
  ],
  about: { photo: '', name: '', currentTitle: '', education: '', phone: '', email: '', facebook: '', instagram: '', bio: '', skills: [], workExperience: [], timeline: [] },
  meta: { siteTitle: '', description: '', ogImage: '' },
};
fs.writeFileSync(tmpDataPath, JSON.stringify(sampleData, null, 2));
fs.writeFileSync(tmpTemplatePath, '<html>{{GRID_CONTENT}}{{TIMELINE_DATA}}</html>');

// Monkey-patch ROOT before requiring server
process.env.DATA_PATH     = tmpDataPath;
process.env.TEMPLATE_PATH = tmpTemplatePath;
process.env.OUTPUT_PATH   = path.join(tmpDir, 'index.html');

const { app } = require('../admin/server');

describe('Works API', () => {
  test('GET /api/works returns array', async () => {
    const res = await request(app).get('/api/works');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('w1');
  });

  test('POST /api/works creates a new work', async () => {
    const res = await request(app).post('/api/works').send({
      type: 'video', videoId: 'xyz', caption: '', categories: ['video'],
    });
    expect(res.status).toBe(201);
    expect(res.body.videoId).toBe('xyz');
    expect(res.body.id).toBeDefined();
  });

  test('DELETE /api/works/:id removes it', async () => {
    const list = (await request(app).get('/api/works')).body;
    const video = list.find(w => w.type === 'video');
    const res = await request(app).delete(`/api/works/${video.id}`);
    expect(res.status).toBe(200);
    const after = (await request(app).get('/api/works')).body;
    expect(after.find(w => w.id === video.id)).toBeUndefined();
  });
});
```

> **Note on test isolation:** The test uses env vars to redirect `DATA_PATH`, `TEMPLATE_PATH`, and `OUTPUT_PATH`. Update `server.js` to read these env vars so tests don't touch the real `data.json`:

In `server.js`, replace the hardcoded paths:

```js
const DATA_PATH     = process.env.DATA_PATH     || path.join(ROOT, 'data.json');
const TEMPLATE_PATH = process.env.TEMPLATE_PATH || path.join(__dirname, 'template.html');
const OUTPUT_PATH   = process.env.OUTPUT_PATH   || path.join(ROOT, 'index.html');

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const html = generateHTML(data, template);
  fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
}
module.exports = { app, readData, writeData, ROOT, DATA_PATH };
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/api.test.js --verbose
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add admin/routes/works.js admin/server.js tests/api.test.js
git commit -m "feat: add works CRUD API"
```

---

## Task 5: Image upload route

**Files:**
- Create: `admin/routes/upload.js`
- Modify: `admin/server.js`

- [ ] **Step 1: Create `admin/routes/upload.js`**

```js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { processUpload } = require('../lib/image-processor');

const router = express.Router();
let readData, writeData, ROOT;
function init(deps) { ({ readData, writeData, ROOT } = deps); }

const upload = multer({ dest: require('os').tmpdir() });

// POST /api/upload/image
// multipart fields: file (image), baseName (string), crop (JSON string)
// Returns: { work } — the new data.json entry
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const crop = JSON.parse(req.body.crop || '{"x":0,"y":0,"width":9999,"height":9999}');
    const rawName = req.body.baseName || path.basename(req.file.originalname, path.extname(req.file.originalname));
    const baseName = rawName.replace(/[^\w\u4e00-\u9fff-]/g, '_');

    const imageDir = path.join(ROOT, 'images');
    const result = await processUpload({
      inputPath: req.file.path,
      outputDir: imageDir,
      baseName,
      crop,
    });

    // Build work entry (caller must POST to /api/works to persist)
    const work = {
      type: 'image',
      src: result.originalSrc,
      thumb: result.thumbSrc,
      caption: req.body.caption || '',
      categories: JSON.parse(req.body.categories || '[]'),
      fancyboxGroup: req.body.fancyboxGroup || '',
    };

    res.json({ work });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, init };
```

- [ ] **Step 2: Mount in `admin/server.js`**

```js
const uploadRoute = require('./routes/upload');
uploadRoute.init({ readData, writeData, ROOT });
app.use('/api/upload', uploadRoute.router);
```

- [ ] **Step 3: Commit**

```bash
git add admin/routes/upload.js admin/server.js
git commit -m "feat: add image upload route with Sharp processing"
```

---

## Task 6: YouTube route

**Files:**
- Create: `admin/routes/youtube.js`
- Modify: `admin/server.js`

- [ ] **Step 1: Create `admin/routes/youtube.js`**

```js
const express = require('express');
const router = express.Router();

// POST /api/youtube/parse
// Body: { url }
// Returns: { videoId } or 400 error
router.post('/parse', (req, res) => {
  const url = req.body.url || '';
  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });
  res.json({ videoId, thumbUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` });
});

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {
    // Not a valid URL — try bare ID (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  }
  return null;
}

module.exports = { router, extractVideoId };
```

- [ ] **Step 2: Mount in `admin/server.js`**

```js
const youtubeRoute = require('./routes/youtube');
app.use('/api/youtube', youtubeRoute.router);
```

- [ ] **Step 3: Add YouTube tests to `tests/api.test.js`**

Append to `tests/api.test.js`:

```js
const { extractVideoId } = require('../admin/routes/youtube');

describe('extractVideoId', () => {
  test('parses youtube.com/watch?v= URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=g53iDkd2XT4')).toBe('g53iDkd2XT4');
  });
  test('parses youtu.be short URL', () => {
    expect(extractVideoId('https://youtu.be/g53iDkd2XT4')).toBe('g53iDkd2XT4');
  });
  test('returns bare 11-char ID', () => {
    expect(extractVideoId('g53iDkd2XT4')).toBe('g53iDkd2XT4');
  });
  test('returns null for invalid URL', () => {
    expect(extractVideoId('not-a-url')).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/api.test.js --verbose
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add admin/routes/youtube.js admin/server.js tests/api.test.js
git commit -m "feat: add YouTube URL parsing route"
```

---

## Task 7: 3D model upload route

**Files:**
- Create: `admin/routes/three.js`
- Modify: `admin/server.js`

- [ ] **Step 1: Create `admin/routes/three.js`**

```js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processModelUpload } = require('../lib/model-generator');

const router = express.Router();
let readData, writeData, ROOT;
function init(deps) { ({ readData, writeData, ROOT } = deps); }

const upload = multer({ dest: require('os').tmpdir() });

// POST /api/upload/model
// multipart fields: file (zip), label (string)
// Returns: { work } — the new data.json entry (caller persists via /api/works)
router.post('/model', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.originalname.endsWith('.zip')) {
      return res.status(400).json({ error: 'File must be a .zip' });
    }

    const label = req.body.label || 'Untitled';
    const modelDir = path.join(ROOT, 'model');
    const viewerTemplate = fs.readFileSync(
      path.join(__dirname, '..', 'model-viewer-template.html'), 'utf8'
    );

    const result = await processModelUpload({
      zipPath: req.file.path,
      modelDir,
      label,
      viewerTemplate,
    });

    const work = {
      type: 'three',
      src: result.viewerSrc,
      label: result.label,
      categories: ['three'],
    };

    res.json({ work });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, init };
```

- [ ] **Step 2: Mount in `admin/server.js`**

```js
const threeRoute = require('./routes/three');
threeRoute.init({ readData, writeData, ROOT });
app.use('/api/upload', threeRoute.router);
```

- [ ] **Step 3: Commit**

```bash
git add admin/routes/three.js admin/server.js
git commit -m "feat: add 3D model zip upload route"
```

---

## Task 8: About API

**Files:**
- Create: `admin/routes/about.js`
- Modify: `admin/server.js`

- [ ] **Step 1: Create `admin/routes/about.js`**

```js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
let readData, writeData;
function init(deps) { ({ readData, writeData } = deps); }

// GET /api/about — full about object
router.get('/', (req, res) => res.json(readData().about));

// PUT /api/about/info — update name, title, phone, email, bio, photo, facebook, instagram, education
router.put('/info', (req, res) => {
  const data = readData();
  const allowed = ['name','currentTitle','education','phone','email','facebook','instagram','bio','photo'];
  allowed.forEach(k => { if (req.body[k] !== undefined) data.about[k] = req.body[k]; });
  writeData(data);
  res.json(data.about);
});

// PUT /api/about/skills — replace entire skills array
// Body: { skills: [{ name, stars }] }
router.put('/skills', (req, res) => {
  const data = readData();
  data.about.skills = req.body.skills || [];
  writeData(data);
  res.json(data.about.skills);
});

// PUT /api/about/work-experience — replace entire workExperience array
// Body: { workExperience: [{ period, company, title }] }
router.put('/work-experience', (req, res) => {
  const data = readData();
  data.about.workExperience = req.body.workExperience || [];
  writeData(data);
  res.json(data.about.workExperience);
});

// GET /api/about/timeline — list timeline entries
router.get('/timeline', (req, res) => res.json(readData().about.timeline));

// POST /api/about/timeline — add entry
// Body: { date, institution, heading, body, image, footer }
router.post('/timeline', (req, res) => {
  const data = readData();
  const entry = { id: uuidv4(), ...req.body };
  data.about.timeline.push(entry);
  writeData(data);
  res.status(201).json(entry);
});

// PUT /api/about/timeline/:id — update entry
router.put('/timeline/:id', (req, res) => {
  const data = readData();
  const idx = data.about.timeline.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.about.timeline[idx] = { ...data.about.timeline[idx], ...req.body, id: req.params.id };
  writeData(data);
  res.json(data.about.timeline[idx]);
});

// DELETE /api/about/timeline/:id — delete entry
router.delete('/timeline/:id', (req, res) => {
  const data = readData();
  const idx = data.about.timeline.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.about.timeline.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

module.exports = { router, init };
```

- [ ] **Step 2: Mount in `admin/server.js`**

```js
const aboutRoute = require('./routes/about');
aboutRoute.init({ readData, writeData });
app.use('/api/about', aboutRoute.router);
```

- [ ] **Step 3: Commit**

```bash
git add admin/routes/about.js admin/server.js
git commit -m "feat: add about management API"
```

---

## Task 9: Settings and Publish APIs

**Files:**
- Create: `admin/routes/settings.js`
- Create: `admin/routes/publish.js`
- Modify: `admin/server.js`

- [ ] **Step 1: Create `admin/routes/settings.js`**

```js
const express = require('express');
const router = express.Router();
let readData, writeData;
function init(deps) { ({ readData, writeData } = deps); }

// GET /api/settings
router.get('/', (req, res) => res.json(readData().meta));

// PUT /api/settings
// Body: { siteTitle, description, ogImage }
router.put('/', (req, res) => {
  const data = readData();
  ['siteTitle', 'description', 'ogImage'].forEach(k => {
    if (req.body[k] !== undefined) data.meta[k] = req.body[k];
  });
  writeData(data);
  res.json(data.meta);
});

module.exports = { router, init };
```

- [ ] **Step 2: Create `admin/routes/publish.js`**

```js
const express = require('express');
const { getPendingCount, publish } = require('../lib/git');
const router = express.Router();

// GET /api/publish/status — how many uncommitted files
router.get('/status', async (req, res) => {
  try {
    const count = await getPendingCount();
    res.json({ pendingCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/publish — commit and push
// Body: { message } (optional custom commit message)
router.post('/', async (req, res) => {
  const msg = req.body.message || `Update portfolio: ${new Date().toLocaleDateString('zh-TW')}`;
  // Stream output via SSE so the UI can show a live log
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  const result = await publish(msg, line => {
    res.write(`data: ${JSON.stringify({ line })}\n\n`);
  });

  res.write(`data: ${JSON.stringify({ done: true, success: result.success })}\n\n`);
  res.end();
});

module.exports = { router };
```

- [ ] **Step 3: Mount both in `admin/server.js`**

```js
const settingsRoute = require('./routes/settings');
settingsRoute.init({ readData, writeData });
app.use('/api/settings', settingsRoute.router);

const publishRoute = require('./routes/publish');
app.use('/api/publish', publishRoute.router);
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --verbose
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add admin/routes/settings.js admin/routes/publish.js admin/server.js
git commit -m "feat: add settings and publish (git) API routes"
```

---

## Task 10: Manual end-to-end smoke test

- [ ] **Step 1: Start the server**

```bash
npm start
```

- [ ] **Step 2: Test each endpoint with curl**

```bash
# Works list
curl http://localhost:3001/api/works | head -c 200

# YouTube parse
curl -s -X POST http://localhost:3001/api/youtube/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=g53iDkd2XT4"}' | head -c 100

# Publish status
curl http://localhost:3001/api/publish/status

# About
curl http://localhost:3001/api/about | head -c 200

# Settings
curl http://localhost:3001/api/settings
```

All should return valid JSON. No 500 errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Plan 2 complete — all backend API routes"
```

---

## Checklist before starting Plan 3

- [ ] `npm test` passes with no failures
- [ ] `GET /api/works` returns the full works array from data.json
- [ ] `POST /api/youtube/parse` correctly extracts video IDs
- [ ] `GET /api/about` returns the about object
- [ ] `GET /api/publish/status` returns `{ pendingCount: N }`
- [ ] `GET /api/settings` returns site meta
