const path = require('path');
const fs = require('fs');
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
