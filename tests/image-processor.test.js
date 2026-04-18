const path = require('path');
const fs = require('fs');
const os = require('os');
const { processUpload } = require('../admin/lib/image-processor');
const sharp = require('sharp');

let tmpDir;
beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-test-'));
  await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .jpeg().toFile(path.join(tmpDir, 'test-input.jpg'));
});

afterAll(() => { fs.rmSync(tmpDir, { recursive: true }); });

describe('processUpload', () => {
  test('produces original and thumbnail files', async () => {
    const inputPath = path.join(tmpDir, 'test-input.jpg');
    const outputDir = tmpDir;
    const baseName = 'testfile';
    const crop = { x: 0, y: 0, width: 800, height: 600 };

    const result = await processUpload({ inputPath, outputDir, baseName, crop });

    expect(result.originalPath).toContain('testfile.jpg');
    expect(result.thumbPath).toContain('testfilem.jpg');
    expect(fs.existsSync(result.originalPath)).toBe(true);
    expect(fs.existsSync(result.thumbPath)).toBe(true);

    const origMeta = await sharp(result.originalPath).metadata();
    expect(origMeta.width).toBeLessThanOrEqual(1600);

    const thumbMeta = await sharp(result.thumbPath).metadata();
    expect(thumbMeta.width).toBeLessThanOrEqual(600);
  });

  test('applies crop before thumbnail generation', async () => {
    const inputPath = path.join(tmpDir, 'test-input.jpg');
    const outputDir = tmpDir;
    const baseName = 'cropped';
    const crop = { x: 0, y: 0, width: 400, height: 600 };

    const result = await processUpload({ inputPath, outputDir, baseName, crop });
    const thumbMeta = await sharp(result.thumbPath).metadata();

    expect(thumbMeta.width / thumbMeta.height).toBeCloseTo(400 / 600, 1);
  });

  test('adds timestamp suffix on filename conflict', async () => {
    const inputPath = path.join(tmpDir, 'test-input.jpg');
    const outputDir = tmpDir;
    const crop = { x: 0, y: 0, width: 800, height: 600 };

    await processUpload({ inputPath, outputDir, baseName: 'conflict', crop });
    const result2 = await processUpload({ inputPath, outputDir, baseName: 'conflict', crop });

    expect(result2.originalPath).toMatch(/conflict-\d+\.jpg/);
  });
});
