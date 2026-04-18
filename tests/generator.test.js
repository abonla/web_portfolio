const { buildWorksHTML, buildAboutHTML, buildTimelineScript } = require('../admin/lib/generator');

const sampleAbout = {
  photo: 'images/獨照.jpg',
  name: '程正邦（Tony）',
  currentTitle: '三立新聞網 編輯組副組長',
  education: '輔仁大學大傳所',
  phone: '0905579995',
  email: 'abon8820@gmail.com',
  facebook: 'https://www.facebook.com/example',
  instagram: 'https://www.instagram.com/example',
  bio: '自我介紹文字',
  skills: [{ name: '新聞攝影', stars: 5 }, { name: '平面設計', stars: 2 }],
  workExperience: [{ period: '2024/4～現在', company: '三立新聞網', title: '編輯組副組長' }],
  timeline: [],
};

describe('buildWorksHTML', () => {
  test('generates image grid item', () => {
    const works = [{
      id: '1', type: 'image', src: 'images/foo.jpg', thumb: 'images/foom.jpg',
      caption: 'My caption', fancyboxGroup: 'painter', categories: ['painter', 'digital'], order: 0,
    }];
    const html = buildWorksHTML(works);
    expect(html).toContain('class="grid-item painter digital"');
    expect(html).toContain('href="images/foo.jpg"');
    expect(html).toContain('data-fancybox="painter"');
    expect(html).toContain('data-caption="My caption"');
    expect(html).toContain('src="images/foom.jpg"');
    expect(html).toContain('loading="lazy"');
  });

  test('generates video grid item', () => {
    const works = [{
      id: '2', type: 'video', videoId: 'abc123', caption: '', categories: ['video'], order: 0,
    }];
    const html = buildWorksHTML(works);
    expect(html).toContain('class="grid-item video"');
    expect(html).toContain('class="yt-facade" data-vid="abc123"');
    expect(html).toContain('i.ytimg.com/vi/abc123/mqdefault.jpg');
    expect(html).toContain('class="yt-play"');
  });

  test('generates 3D grid item', () => {
    const works = [{
      id: '3', type: 'three', src: 'model/doll.html', label: 'doll', categories: ['three'], order: 0,
    }];
    const html = buildWorksHTML(works);
    expect(html).toContain('class="grid-item three grid-item--width4"');
    expect(html).toContain('src="model/doll.html"');
  });

  test('respects order field', () => {
    const works = [
      { id: '2', type: 'video', videoId: 'b', caption: '', categories: ['video'], order: 1 },
      { id: '1', type: 'video', videoId: 'a', caption: '', categories: ['video'], order: 0 },
    ];
    const html = buildWorksHTML(works);
    expect(html.indexOf('data-vid="a"')).toBeLessThan(html.indexOf('data-vid="b"'));
  });
});

describe('buildAboutHTML', () => {
  test('includes name', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toContain('程正邦（Tony）');
  });

  test('includes work experience row', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toContain('三立新聞網');
    expect(html).toContain('編輯組副組長');
  });

  test('renders skill stars', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toMatch(/新聞攝影[\s\S]{0,200}⭐⭐⭐⭐⭐/);
  });
});

describe('buildTimelineScript', () => {
  test('outputs valid JS var data assignment', () => {
    const timeline = [{
      id: 't1', date: '2025-06-04', institution: '復興美工',
      heading: '畢業', body: '內文', image: 'images/foo.jpg', footer: '',
    }];
    const script = buildTimelineScript(timeline);
    expect(script).toContain('<script>');
    expect(script).toContain('var data =');
    expect(script).toContain('復興美工');
    expect(script).toContain('images/foo.jpg');
    expect(script).toContain('</script>');
    // Must be valid JS — eval it
    expect(() => { const fn = new Function(script.replace(/<\/?script>/g, '')); fn(); }).not.toThrow();
  });
});
