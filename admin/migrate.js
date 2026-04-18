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
  $('.grid-item').each(function() {
    const $el = $(this);
    if ($el.hasClass('bio') || $el.hasClass('me')) return;
    if ($el.hasClass('grid-sizer') || $el.hasClass('gutter-sizer')) return;
    let item;
    if ($el.hasClass('three')) {
      item = parseThreeItem($, $el);
    } else if ($el.find('.yt-facade').length) {
      item = parseVideoItem($, $el);
    } else if ($el.find('a[data-fancybox]').length) {
      item = parseImageItem($, $el);
    } else {
      return;
    }
    item.order = order++;
    works.push(item);
  });

  // ── Parse about ──
  const $info = $('.grid-item.bio .info');
  const skillsTable = $info.find('table').first();
  const skills = parseSkills($, skillsTable);

  const bio = $('.grid-item.bio article p').first().text().trim();

  const expTable = $('.grid-item.bio article table').last();
  const workExperience = parseWorkExperience($, expTable);

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
      timeline = raw.map(function(entry) {
        const imgTag = (entry.body || []).find(function(b) { return b.tag === 'img'; });
        const h2Tag  = (entry.body || []).find(function(b) { return b.tag === 'h2'; });
        const pTag   = (entry.body || []).find(function(b) { return b.tag === 'p'; });
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
    works: works,
    about: {
      photo: photo, name: name, currentTitle: currentTitle, education: education,
      phone: phone, email: email, facebook: facebook, instagram: instagram,
      bio: bio, skills: skills, workExperience: workExperience, timeline: timeline,
    },
    meta: {
      siteTitle: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content') || '',
    },
  };
  fs.writeFileSync(path.join(ROOT, 'data.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log('✓ data.json written (' + works.length + ' works, ' + timeline.length + ' timeline entries)');

  // ── Build template.html ──
  $('.grid').html('\n      <div class="grid-sizer"></div>\n      <div class="gutter-sizer"></div>\n      {{GRID_CONTENT}}\n    ');
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
