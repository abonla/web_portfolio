# Portfolio Admin — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Node.js admin project, migrate existing content to `data.json`, build the HTML generator that regenerates `index.html` from `data.json`, and wire up a minimal Express server.

**Architecture:** A one-time migration script parses the existing `index.html` and `js/index.js` to extract all content into `data.json`. A generator reads `data.json` + `admin/template.html` and writes `index.html`. The Express server at port 3001 serves the admin UI (Plan 3) and exposes API routes (Plan 2); Plan 1 only adds the skeleton and health-check.

**Tech Stack:** Node.js 18+, Express 4, Cheerio (HTML parsing), Jest (tests), UUID

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Create | npm scripts, all dependencies |
| `admin/migrate.js` | Create | One-time: parse index.html + index.js → data.json, write template.html |
| `admin/template.html` | Create (by migrate.js) | Static scaffold of index.html with `{{GRID_CONTENT}}` and `{{TIMELINE_DATA}}` placeholders |
| `admin/lib/generator.js` | Create | `generateHTML(data) → string`; called after every save |
| `admin/server.js` | Create | Express entry point; `GET /health` only in this plan |
| `admin/public/.gitkeep` | Create | Placeholder; UI files added in Plan 3 |
| `js/index.js` | Modify | Remove the `var data = [...]` block (migrated to data.json, injected by generator) |
| `data.json` | Create (by migrate.js) | Content store |
| `tests/generator.test.js` | Create | Unit tests for generator |
| `tests/migrate.test.js` | Create | Unit tests for migration helpers |
| `.gitignore` | Modify | Add `node_modules/` |

---

## Task 1: npm setup

**Files:**
- Create: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create package.json**

Run in `web_portfolio/` root:

```bash
cd "C:/Users/abon8/Documents/GitHub/web_portfolio"
npm init -y
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install express cheerio uuid sharp multer unzipper simple-git
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev jest supertest
```

- [ ] **Step 4: Add scripts and Jest config to package.json**

Open `package.json` and replace the `"scripts"` section and add `"jest"`:

```json
{
  "scripts": {
    "start": "node admin/server.js",
    "migrate": "node admin/migrate.js",
    "test": "jest --testPathPattern=tests/"
  },
  "jest": {
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 5: Add node_modules to .gitignore**

Add to `.gitignore` (create if missing):

```
node_modules/
.superpowers/
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add Node.js project setup for admin"
```

---

## Task 2: Migration script — helpers (TDD)

**Files:**
- Create: `admin/lib/parse-works.js`
- Create: `admin/lib/parse-about.js`
- Create: `tests/migrate.test.js`

These two helper modules do the parsing. The migration script calls them.

- [ ] **Step 1: Write failing tests**

Create `tests/migrate.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- --verbose 2>&1 | head -40
```

Expected: `Cannot find module '../admin/lib/parse-works'`

- [ ] **Step 3: Create `admin/lib/parse-works.js`**

```js
const { v4: uuidv4 } = require('uuid');

const SKIP_CLASSES = new Set(['grid-item', 'grid-item--width2', 'grid-item--width4', 'me', 'bio']);

function getCategories($el) {
  return $el.attr('class').split(/\s+/).filter(c => !SKIP_CLASSES.has(c));
}

function parseImageItem($, $el) {
  const $a = $el.find('a[data-fancybox]');
  const categories = getCategories($el).filter(c => c !== 'video' && c !== 'three');
  return {
    id: uuidv4(),
    type: 'image',
    src: $a.attr('href') || '',
    thumb: $el.find('img').first().attr('src') || '',
    caption: $a.attr('data-caption') || '',
    fancyboxGroup: $a.attr('data-fancybox') || '',
    categories,
    order: 0,
  };
}

function parseVideoItem($, $el) {
  const $facade = $el.find('.yt-facade');
  return {
    id: uuidv4(),
    type: 'video',
    videoId: $facade.attr('data-vid') || '',
    caption: $facade.attr('data-caption') || '',
    categories: ['video'],
    order: 0,
  };
}

function parseThreeItem($, $el) {
  const src = $el.find('iframe').attr('src') || '';
  const label = src.replace('model/', '').replace('.html', '');
  return {
    id: uuidv4(),
    type: 'three',
    src,
    label,
    categories: ['three'],
    order: 0,
  };
}

module.exports = { parseImageItem, parseVideoItem, parseThreeItem };
```

- [ ] **Step 4: Create `admin/lib/parse-about.js`**

```js
function parseWorkExperience($, $table) {
  const rows = [];
  $table.find('tr').each((_, tr) => {
    const cells = $(tr).find('td, th');
    if (cells.length >= 3) {
      rows.push({
        period: $(cells[0]).text().trim(),
        company: $(cells[1]).text().trim(),
        title: $(cells[2]).text().trim(),
      });
    }
  });
  return rows;
}

function parseSkills($, $table) {
  const skills = [];
  $table.find('tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length >= 2) {
      const name = $(cells[0]).text().trim();
      const starsText = $(cells[1]).text();
      // Count star characters (⭐ or ★)
      const stars = (starsText.match(/[⭐★]/g) || []).length;
      if (name) skills.push({ name, stars });
    }
  });
  return skills;
}

module.exports = { parseWorkExperience, parseSkills };
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test -- --verbose 2>&1 | head -40
```

Expected: all 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add admin/lib/parse-works.js admin/lib/parse-about.js tests/migrate.test.js
git commit -m "feat: add content parsing helpers with tests"
```

---

## Task 3: Generator (TDD)

**Files:**
- Create: `admin/lib/generator.js`
- Create: `tests/generator.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/generator.test.js`:

```js
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
    // 5 stars for 新聞攝影
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- tests/generator.test.js --verbose 2>&1 | head -30
```

Expected: `Cannot find module '../admin/lib/generator'`

- [ ] **Step 3: Create `admin/lib/generator.js`**

```js
/**
 * Builds the <div class="grid-item ..."> HTML for all works.
 * Works are sorted by `order` ascending.
 */
function buildWorksHTML(works) {
  const sorted = [...works].sort((a, b) => a.order - b.order);
  return sorted.map(w => {
    if (w.type === 'image') return buildImageItem(w);
    if (w.type === 'video') return buildVideoItem(w);
    if (w.type === 'three') return buildThreeItem(w);
    return '';
  }).join('\n      ');
}

function buildImageItem(w) {
  const classes = ['grid-item', ...w.categories].join(' ');
  const caption = escapeAttr(w.caption);
  return `<div class="${classes}">
        <a href="${w.src}" data-fancybox="${w.fancyboxGroup}" data-caption="${caption}"><img loading="lazy" decoding="async" src="${w.thumb}" /></a>
      </div>`;
}

function buildVideoItem(w) {
  const ytThumb = `https://i.ytimg.com/vi/${w.videoId}/mqdefault.jpg`;
  return `<div class="grid-item video">
        <div class="yt-facade" data-vid="${w.videoId}"><img src="${ytThumb}" alt="" loading="lazy" decoding="async"><button class="yt-play" aria-label="播放"></button></div>
      </div>`;
}

function buildThreeItem(w) {
  return `<div class="grid-item three grid-item--width4">
        <iframe src="${w.src}" frameborder="0"></iframe>
      </div>`;
}

/**
 * Builds the about/bio section HTML (the .grid-item.bio divs).
 */
function buildAboutHTML(about) {
  const stars = n => '⭐'.repeat(Math.max(0, Math.min(5, n)));
  const skillRows = about.skills.map(s =>
    `<tr><td>${esc(s.name)}</td><td>${stars(s.stars)}</td></tr>`
  ).join('\n            ');
  const expRows = about.workExperience.map(e =>
    `<tr><td>${esc(e.period)}</td><th>${esc(e.company)}</th><td>${esc(e.title)}</td></tr>`
  ).join('\n            ');

  return `<div class="grid-item me grid-item--width2 bio">
        <div class="info animate__animated animate__tada">
          <img loading="lazy" decoding="async" src="${about.photo}" />
          <h2>${esc(about.name)}</h2>
          <ul>
            <li><i class="fa fa-id-card-o" aria-hidden="true"></i>&nbsp;${esc(about.currentTitle)}</li>
            <li><i class="fa fa-graduation-cap" aria-hidden="true"></i>&nbsp;${esc(about.education)}</li>
            <li>&nbsp;<i class="fa fa-phone" aria-hidden="true"></i>&nbsp;&nbsp;<a href="tel:+886-${about.phone}">${esc(about.phone)}</a></li>
            <li><i class="fa fa-envelope-o" aria-hidden="true"></i>&nbsp;&nbsp;<a href="mailto:${about.email}">${esc(about.email)}</a></li>
          </ul>
          <h2>【技能】</h2>
          <table>${skillRows}</table>
        </div>
        <article>
          <p>${esc(about.bio).replace(/\n/g, '<br>')}</p>
          <div id="social">
            <p>
              <a href="${about.facebook}" id="fb" target="_blank"><i class="fa fa-facebook-square fa-2x" aria-hidden="true"></i></a>
              <a href="${about.instagram}" id="ig" target="_blank"><i class="fa fa-instagram fa-2x" aria-hidden="true"></i></a>
            </p>
          </div>
          <hr>
          <h2>【工作經歷】</h2>
          <table>${expRows}</table>
        </article>
      </div>
      <div class="grid-item grid-item--width2 bio">
        <h2>【學習歷程】</h2>
        <div id="myTimeline"></div>
      </div>`;
}

/**
 * Builds the inline <script>var data = [...]</script> for the timeline plugin.
 */
function buildTimelineScript(timeline) {
  const sorted = [...timeline].sort((a, b) => a.date.localeCompare(b.date));
  const entries = sorted.map(t => {
    const bodyParts = [];
    if (t.image) {
      bodyParts.push(`{ tag: 'img', attr: { src: '${t.image}', width: '150px', cssclass: 'img-responsive' } }`);
    }
    bodyParts.push(`{ tag: 'h2', content: ${JSON.stringify(t.heading)} }`);
    bodyParts.push(`{ tag: 'p', content: ${JSON.stringify(t.body)} }`);
    return `{
    time: ${JSON.stringify(t.date)},
    header: ${JSON.stringify(t.institution)},
    body: [${bodyParts.join(', ')}],
    footer: ${JSON.stringify(t.footer || '')}
  }`;
  });
  return `<script>\nvar data = [\n  ${entries.join(',\n  ')}\n];\n</script>`;
}

/**
 * Assembles index.html from template + data.
 * Template must contain: {{GRID_CONTENT}}, {{TIMELINE_DATA}}
 */
function generateHTML(data, template) {
  const worksHTML = buildWorksHTML(data.works.filter(w => w.type !== 'about'));
  const aboutHTML = buildAboutHTML(data.about);
  const timelineScript = buildTimelineScript(data.about.timeline);

  return template
    .replace('{{GRID_CONTENT}}', worksHTML + '\n      ' + aboutHTML)
    .replace('{{TIMELINE_DATA}}', timelineScript);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}

module.exports = { buildWorksHTML, buildAboutHTML, buildTimelineScript, generateHTML };
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- tests/generator.test.js --verbose 2>&1 | head -50
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add admin/lib/generator.js tests/generator.test.js
git commit -m "feat: add HTML generator with tests"
```

---

## Task 4: Migration script

**Files:**
- Create: `admin/migrate.js`
- Modify: `js/index.js` (remove `var data = [...]` block)

Run once to produce `data.json` and `admin/template.html`.

- [ ] **Step 1: Create `admin/migrate.js`**

```js
#!/usr/bin/env node
/**
 * One-time migration: existing index.html + js/index.js → data.json + admin/template.html
 * Run: npm run migrate
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { parseImageItem, parseVideoItem, parseThreeItem } = require('./lib/parse-works');
const { parseWorkExperience, parseSkills } = require('./lib/parse-about');

const ROOT = path.join(__dirname, '..');

function main() {
  const htmlPath = path.join(ROOT, 'index.html');
  const jsPath   = path.join(ROOT, 'js', 'index.js');

  if (!fs.existsSync(htmlPath)) { console.error('index.html not found'); process.exit(1); }
  if (fs.existsSync(path.join(ROOT, 'data.json'))) {
    console.log('data.json already exists — delete it first to re-migrate.');
    process.exit(0);
  }

  const rawHTML = fs.readFileSync(htmlPath, 'utf8');
  const rawJS   = fs.readFileSync(jsPath, 'utf8');
  const $ = cheerio.load(rawHTML, { decodeEntities: false });

  // ── Parse works ──
  const works = [];
  let order = 0;
  $('.grid-item').each((_, el) => {
    const $el = $(el);
    if ($el.hasClass('bio') || $el.hasClass('me')) return; // skip about
    if ($el.hasClass('grid-sizer') || $el.hasClass('gutter-sizer')) return;
    let item;
    if ($el.hasClass('three')) {
      item = parseThreeItem($, $el);
    } else if ($el.find('.yt-facade').length) {
      item = parseVideoItem($, $el);
    } else if ($el.find('a[data-fancybox]').length) {
      item = parseImageItem($, $el);
    } else {
      return; // unknown — skip
    }
    item.order = order++;
    works.push(item);
  });

  // ── Parse about ──
  // Skills table: first <table> inside .info
  const $info = $('.grid-item.bio .info');
  const skillsTable = $info.find('table').first();
  const skills = parseSkills($, skillsTable);

  // Bio text
  const bio = $('.grid-item.bio article p').first().text().trim();

  // Work experience table (after 【工作經歷】 h2)
  const expTable = $('.grid-item.bio article table').last();
  const workExperience = parseWorkExperience($, expTable);

  // Profile photo
  const photo = $info.find('img').first().attr('src') || 'images/獨照.jpg';
  const name  = $info.find('h2').first().text().replace('【技能】', '').trim();
  const listItems = $info.find('ul li');
  const currentTitle = listItems.eq(0).text().trim();
  const education    = listItems.eq(1).text().trim();
  const phone = listItems.eq(2).find('a').text().trim();
  const email = listItems.eq(3).find('a').text().trim();
  const facebook  = $('#social a#fb').attr('href') || '';
  const instagram = $('#social a#ig').attr('href') || '';

  // ── Parse timeline from js/index.js ──
  const match = rawJS.match(/var data\s*=\s*(\[[\s\S]*?\]);\s*\n\/\/ 執行timeline/);
  let timeline = [];
  if (match) {
    try {
      const raw = new Function('return ' + match[1])();
      timeline = raw.map(entry => {
        const imgTag = (entry.body || []).find(b => b.tag === 'img');
        const h2Tag  = (entry.body || []).find(b => b.tag === 'h2');
        const pTag   = (entry.body || []).find(b => b.tag === 'p');
        return {
          id: uuidv4(),
          date: entry.time || '',
          institution: entry.header || '',
          heading: (h2Tag && h2Tag.content) || '',
          body: (pTag && pTag.content) || '',
          image: (imgTag && imgTag.attr && imgTag.attr.src) || '',
          footer: entry.footer || '',
        };
      });
    } catch (e) {
      console.warn('Could not parse timeline data:', e.message);
    }
  } else {
    console.warn('Timeline data pattern not found in js/index.js — timeline will be empty');
  }

  // ── Build data.json ──
  const data = {
    works,
    about: {
      photo, name, currentTitle, education, phone, email,
      facebook, instagram, bio, skills, workExperience, timeline,
    },
    meta: {
      siteTitle: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content') || '',
    },
  };
  fs.writeFileSync(path.join(ROOT, 'data.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ data.json written (${works.length} works, ${timeline.length} timeline entries)`);

  // ── Build template.html ──
  // Replace entire .grid content with placeholder (keep sizers)
  $('.grid').html(`
      <div class="grid-sizer"></div>
      <div class="gutter-sizer"></div>
      {{GRID_CONTENT}}
    `);
  // Add timeline data placeholder before </body>
  const templateHTML = $.html().replace('</body>', '{{TIMELINE_DATA}}\n</body>');
  fs.mkdirSync(path.join(ROOT, 'admin'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'admin', 'template.html'), templateHTML, 'utf8');
  console.log('✓ admin/template.html written');

  // ── Strip var data from js/index.js ──
  if (match) {
    const stripped = rawJS.replace(/var data\s*=\s*\[[\s\S]*?\];\s*\n/, '');
    fs.writeFileSync(jsPath, stripped, 'utf8');
    console.log('✓ var data removed from js/index.js');
  }

  console.log('\nMigration complete. Run `npm start` to launch the admin.');
}

main();
```

- [ ] **Step 2: Run the migration**

```bash
cd "C:/Users/abon8/Documents/GitHub/web_portfolio"
npm run migrate
```

Expected output:
```
✓ data.json written (N works, M timeline entries)
✓ admin/template.html written
✓ var data removed from js/index.js
Migration complete.
```

- [ ] **Step 3: Verify data.json looks correct**

Open `data.json`. Check:
- `works` array has all your images, videos, and 3D models
- `about.timeline` has all the learning history entries
- `about.skills` shows correct names and star counts
- `about.workExperience` shows all job rows

If any field is empty/wrong, edit `data.json` manually — it's just JSON.

- [ ] **Step 4: Verify the site still works**

Open `index.html` in a browser (file:// or live server). The page should look identical because `template.html` still has the old content. The generator (next step) will regenerate it from `data.json`.

- [ ] **Step 5: Commit**

```bash
git add admin/migrate.js data.json admin/template.html js/index.js
git commit -m "feat: migrate content to data.json, create template.html"
```

---

## Task 5: Wire up generator to produce index.html

**Files:**
- Create: `admin/generate.js` (CLI wrapper around generator.js)

- [ ] **Step 1: Create `admin/generate.js`**

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateHTML } = require('./lib/generator');

const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const html = generateHTML(data, template);
fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('✓ index.html regenerated');
```

- [ ] **Step 2: Add generate script to package.json**

In `package.json` scripts section, add:

```json
"generate": "node admin/generate.js"
```

- [ ] **Step 3: Run generator**

```bash
npm run generate
```

Expected: `✓ index.html regenerated`

- [ ] **Step 4: Verify the site looks correct**

Open `index.html` in a browser. Check:
- Masonry grid shows all works
- Navigation filter tabs still work
- About section has correct bio, skills, work experience
- Timeline renders (may need local server: `npx serve .`)

If the visual output has differences from the original, fix `admin/lib/generator.js` first, then re-run `npm run generate`.

- [ ] **Step 5: Commit**

```bash
git add admin/generate.js package.json
git commit -m "feat: add generate CLI script for index.html"
```

---

## Task 6: Express server skeleton

**Files:**
- Create: `admin/server.js`
- Create: `admin/public/.gitkeep`

- [ ] **Step 1: Create `admin/server.js`**

```js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateHTML } = require('./lib/generator');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve admin UI static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve portfolio assets (images, model, css, js) from repo root
// so the admin can display thumbnails
app.use('/portfolio', express.static(ROOT));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Utility: read data.json
function readData() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
}

// Utility: write data.json and regenerate index.html
function writeData(data) {
  fs.writeFileSync(path.join(ROOT, 'data.json'), JSON.stringify(data, null, 2), 'utf8');
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  const html = generateHTML(data, template);
  fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
}

// Export for use in route files (Plan 2)
module.exports = { app, readData, writeData, ROOT };

// Only start listening when run directly (not when required by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Admin server running at http://localhost:${PORT}`);
  });
}
```

- [ ] **Step 2: Create placeholder for UI files**

```bash
mkdir -p admin/public
touch admin/public/.gitkeep
```

- [ ] **Step 3: Start the server and test health check**

```bash
npm start &
curl http://localhost:3001/health
```

Expected:
```json
{"status":"ok","timestamp":"2026-04-18T..."}
```

Stop the background server: `kill %1`

- [ ] **Step 4: Write server test**

Create `tests/server.test.js`:

```js
const request = require('supertest');
const { app } = require('../admin/server');

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
```

- [ ] **Step 5: Run test**

```bash
npm test -- tests/server.test.js --verbose
```

Expected: 1 test PASS

- [ ] **Step 6: Commit**

```bash
git add admin/server.js admin/public/.gitkeep tests/server.test.js
git commit -m "feat: add Express server skeleton with health check"
```

---

## Task 7: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
npm test -- --verbose
```

Expected: all tests in `tests/` PASS (migrate helpers, generator, server)

- [ ] **Step 2: Verify round-trip integrity**

```bash
# Delete generated index.html and regenerate from scratch
mv index.html index.html.bak
npm run generate
# Compare — should be functionally identical
diff <(node -e "const c=require('cheerio');const $=c.load(require('fs').readFileSync('index.html','utf8'));console.log($('.grid-item').length)") \
     <(node -e "const c=require('cheerio');const $=c.load(require('fs').readFileSync('index.html.bak','utf8'));console.log($('.grid-item').length)")
rm index.html.bak
```

Expected: same number of grid items

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Foundation complete — data.json, generator, Express server"
```

---

## Checklist before starting Plan 2

- [ ] `npm test` passes with no failures
- [ ] `npm run generate` produces an `index.html` that looks correct in the browser
- [ ] `npm start` serves `http://localhost:3001/health` → `{"status":"ok"}`
- [ ] `data.json` contains all works, about, and timeline data
- [ ] `js/index.js` no longer contains `var data = [...]`
