const { buildWorksHTML, buildAboutHTML, buildTimelineScript } = require('../admin/lib/generator');

const sampleAbout = {
  photo: 'images/獨照.jpg',
  name: '程正邦（Tony）',
  nameEn: 'Tony Cheng',
  currentTitle: '三立新聞網 編輯組副組長',
  currentTitleEn: 'Deputy Editor, Sanlih E-Television',
  education: '輔仁大學大傳所',
  educationEn: 'Fu Jen Catholic University (MA)',
  phone: '0905579995',
  email: 'abon8820@gmail.com',
  facebook: 'https://www.facebook.com/example',
  instagram: 'https://www.instagram.com/example',
  bio: '自我介紹文字',
  bioEn: 'Self-introduction in English',
  skills: [
    { name: '新聞攝影', nameEn: 'Photojournalism', stars: 5 },
    { name: '平面設計', nameEn: 'Graphic Design', stars: 2 },
  ],
  workExperience: [{ period: '2024/4～現在', company: '三立新聞網', companyEn: 'Sanlih E-Television', title: '編輯組副組長', titleEn: 'Deputy Editor' }],
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

  test('includes data-caption-en attribute', () => {
    const works = [
      {
        id: '1',
        type: 'image',
        src: 'images/a.jpg',
        thumb: 'images/am.jpg',
        caption: 'Test',
        captionEn: 'Test EN',
        categories: ['painter'],
        fancyboxGroup: 'g',
        order: 0,
      },
    ];
    const html = buildWorksHTML(works);
    expect(html).toContain('data-caption-en="Test EN"');
  });
});

describe('buildAboutHTML', () => {
  test('wraps name in bilingual spans', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toContain('<span class="lang-zh">程正邦（Tony）</span>');
    expect(html).toContain('<span class="lang-en">Tony Cheng</span>');
  });

  test('wraps work experience in bilingual spans', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toContain('<span class="lang-zh">三立新聞網</span>');
    expect(html).toContain('<span class="lang-en">Sanlih E-Television</span>');
    expect(html).toContain('<span class="lang-zh">編輯組副組長</span>');
    expect(html).toContain('<span class="lang-en">Deputy Editor</span>');
  });

  test('renders skill stars with bilingual name', () => {
    const html = buildAboutHTML(sampleAbout);
    expect(html).toContain('<span class="lang-zh">新聞攝影</span>');
    expect(html).toContain('<span class="lang-en">Photojournalism</span>');
    expect(html).toMatch(/Photojournalism[\s\S]{0,300}⭐⭐⭐⭐⭐/);
  });

  test('falls back to zh when en is empty', () => {
    const aboutNoEn = Object.assign({}, sampleAbout, { nameEn: '' });
    const html = buildAboutHTML(aboutNoEn);
    expect(html).toContain('<span class="lang-en">程正邦（Tony）</span>');
  });
});

describe('buildTimelineScript', () => {
  test('outputs dataZh and dataEn with redrawTimeline function', () => {
    const timeline = [{
      id: 't1', date: '2025-06-04', institution: '復興美工', institutionEn: 'Fuxing Art School',
      heading: '畢業', headingEn: 'Graduation', body: '內文', bodyEn: 'Body text', image: 'images/foo.jpg', footer: '',
    }];
    const script = buildTimelineScript(timeline);
    expect(script).toContain('<script>');
    expect(script).toContain('var dataZh =');
    expect(script).toContain('var dataEn =');
    expect(script).toContain('function redrawTimeline');
    expect(script).toContain('復興美工');
    expect(script).toContain('Fuxing Art School');
    expect(script).toContain('images/foo.jpg');
    expect(script).toContain('</script>');
  });

  test('falls back to zh when en fields are absent', () => {
    const timeline = [{
      id: 't2', date: '2024-01-01', institution: '測試機構',
      heading: '標題', body: '內文', footer: '',
    }];
    const script = buildTimelineScript(timeline);
    const enSection = script.split('var dataEn =')[1];
    expect(enSection).toContain('測試機構');
    expect(enSection).toContain('標題');
  });
});
