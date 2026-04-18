// tests/ai.test.js
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock BEFORE requiring server (jest.mock is hoisted automatically)
jest.mock('../admin/lib/gemini', () => ({
  callGemini: jest.fn(),
}));
const { callGemini } = require('../admin/lib/gemini');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-test-'));
const tmpDataPath = path.join(tmpDir, 'data.json');
const tmpTemplatePath = path.join(tmpDir, 'template.html');
const sampleData = {
  works: [],
  about: { photo: '', name: '', currentTitle: '', education: '', phone: '', email: '', facebook: '', instagram: '', bio: '', skills: [], workExperience: [], timeline: [] },
  meta: { siteTitle: '', description: '', ogImage: '' },
};
fs.writeFileSync(tmpDataPath, JSON.stringify(sampleData, null, 2));
fs.writeFileSync(tmpTemplatePath, '<html>{{GRID_CONTENT}}{{TIMELINE_DATA}}</html>');

// Create a fake image file inside tmpDir so the route can find it
const fakeImagePath = path.join(tmpDir, 'test.jpg');
fs.writeFileSync(fakeImagePath, Buffer.from('fake'));

process.env.DATA_PATH = tmpDataPath;
process.env.TEMPLATE_PATH = tmpTemplatePath;
process.env.OUTPUT_PATH = path.join(tmpDir, 'index.html');
process.env.ROOT_PATH = tmpDir;
process.env.GEMINI_API_KEY = 'test-key';

const { app } = require('../admin/server');

describe('POST /api/ai/caption', () => {
  test('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/ai/caption').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/imagePath|imageBase64/);
  });

  test('returns 400 when imagePath does not exist', async () => {
    const res = await request(app).post('/api/ai/caption').send({ imagePath: 'ghost.jpg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/不存在/);
  });

  test('returns AI result from imagePath', async () => {
    callGemini.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: '{"captionZh":"城市夜景","captionEn":"City night","categories":["PHOTO"],"fancyboxGroup":"city"}' }] } }],
    });
    const res = await request(app).post('/api/ai/caption').send({ imagePath: 'test.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.captionZh).toBe('城市夜景');
    expect(res.body.captionEn).toBe('City night');
    expect(res.body.categories).toEqual(['PHOTO']);
    expect(res.body.fancyboxGroup).toBe('city');
  });

  test('strips markdown code fences from Gemini response', async () => {
    callGemini.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: '```json\n{"captionZh":"插畫","captionEn":"Illustration","categories":["DRAW"],"fancyboxGroup":"art"}\n```' }] } }],
    });
    const res = await request(app).post('/api/ai/caption').send({ imagePath: 'test.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.captionZh).toBe('插畫');
  });
});
