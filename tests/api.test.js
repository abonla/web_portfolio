const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
    const video = list.find(function(w) { return w.type === 'video'; });
    const res = await request(app).delete('/api/works/' + video.id);
    expect(res.status).toBe(200);
    const after = (await request(app).get('/api/works')).body;
    expect(after.find(function(w) { return w.id === video.id; })).toBeUndefined();
  });
});

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

describe('PUT /api/about/info EN fields', () => {
  test('saves nameEn and bioEn fields', async () => {
    const res = await request(app)
      .put('/api/about/info')
      .send({ nameEn: 'Tony Cheng', bioEn: 'Bio in English' });
    expect(res.status).toBe(200);
    expect(res.body.nameEn).toBe('Tony Cheng');
    expect(res.body.bioEn).toBe('Bio in English');
  });
});
