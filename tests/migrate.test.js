const { parseImageItem, parseVideoItem, parseThreeItem } = require('../admin/lib/parse-works');
const { parseWorkExperience, parseSkills } = require('../admin/lib/parse-about');
const cheerio = require('cheerio');

describe('parseImageItem', () => {
  test('extracts src, thumb, caption, categories, fancyboxGroup', () => {
    const html = `<div class="grid-item painter digital">
      <a href="images/foo.jpg" data-fancybox="painter" data-caption="Test caption">
        <img src="images/foom.jpg" />
      </a>
    </div>`;
    const $ = cheerio.load(html);
    const result = parseImageItem($, $('.grid-item').first());
    expect(result.type).toBe('image');
    expect(result.src).toBe('images/foo.jpg');
    expect(result.thumb).toBe('images/foom.jpg');
    expect(result.caption).toBe('Test caption');
    expect(result.categories).toEqual(['painter', 'digital']);
    expect(result.fancyboxGroup).toBe('painter');
  });
});

describe('parseVideoItem', () => {
  test('extracts videoId', () => {
    const html = `<div class="grid-item video">
      <div class="yt-facade" data-vid="abc123">
        <img src="..." /><button class="yt-play"></button>
      </div>
    </div>`;
    const $ = cheerio.load(html);
    const result = parseVideoItem($, $('.grid-item').first());
    expect(result.type).toBe('video');
    expect(result.videoId).toBe('abc123');
    expect(result.categories).toEqual(['video']);
  });
});

describe('parseThreeItem', () => {
  test('extracts src and label from iframe', () => {
    const html = `<div class="grid-item three grid-item--width4">
      <iframe src="model/doll.html" frameborder="0"></iframe>
    </div>`;
    const $ = cheerio.load(html);
    const result = parseThreeItem($, $('.grid-item').first());
    expect(result.type).toBe('three');
    expect(result.src).toBe('model/doll.html');
    expect(result.label).toBe('doll');
    expect(result.categories).toEqual(['three']);
  });
});

describe('parseWorkExperience', () => {
  test('extracts period, company, title from table rows', () => {
    const html = `<table>
      <tr><td>2024/4～現在</td><th>三立新聞網</th><td>編輯組副組長</td></tr>
      <tr><td>2022/2～2024/4</td><th>中天新聞</th><td>文字記者</td></tr>
    </table>`;
    const $ = cheerio.load(html);
    const result = parseWorkExperience($, $('table'));
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ period: '2024/4～現在', company: '三立新聞網', title: '編輯組副組長' });
    expect(result[1].company).toBe('中天新聞');
  });
});

describe('parseSkills', () => {
  test('counts star characters as rating', () => {
    const html = `<table>
      <tr><td>新聞攝影</td><td>⭐⭐⭐⭐⭐</td></tr>
      <tr><td>平面設計</td><td>⭐⭐</td></tr>
    </table>`;
    const $ = cheerio.load(html);
    const result = parseSkills($, $('table'));
    expect(result[0]).toEqual({ name: '新聞攝影', stars: 5 });
    expect(result[1]).toEqual({ name: '平面設計', stars: 2 });
  });
});
