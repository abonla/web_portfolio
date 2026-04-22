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
  const captionEn = escapeAttr(w.captionEn || '');
  const titleZh = escapeAttr(w.titleZh || '');
  const titleEn = escapeAttr(w.titleEn || '');
  return `<div class="${classes}">
        <a href="${w.src}" data-fancybox="${w.fancyboxGroup}" data-caption="${caption}" data-caption-en="${captionEn}" data-title-zh="${titleZh}" data-title-en="${titleEn}"><img loading="lazy" decoding="async" src="${w.thumb}" /></a>
      </div>`;
}

function buildVideoItem(w) {
  const ytThumb = `https://i.ytimg.com/vi/${w.videoId}/mqdefault.jpg`;
  const ytUrl = `https://www.youtube.com/watch?v=${w.videoId}`;
  const caption = escapeAttr(w.caption || '');
  const captionEn = escapeAttr(w.captionEn || '');
  const titleZh = escapeAttr(w.titleZh || '');
  const titleEn = escapeAttr(w.titleEn || '');
  return `<div class="grid-item video">
        <a href="${ytUrl}" class="yt-facade" data-fancybox="video" data-caption="${caption}" data-caption-en="${captionEn}" data-title-zh="${titleZh}" data-title-en="${titleEn}"><img src="${ytThumb}" alt="" loading="lazy" decoding="async"><span class="yt-play"></span></a>
      </div>`;
}

function buildThreeItem(w) {
  return `<div class="grid-item three grid-item--width4">
        <iframe src="${w.src}" frameborder="0"></iframe>
      </div>`;
}

/**
 * Returns a bilingual span pair. Falls back to zh when en is empty.
 * Pass block=true to convert newlines to <br> (for paragraph content).
 */
function bilingual(zh, en, block) {
  const zhHtml = block
    ? esc(zh).replace(/\n/g, '<br>')
    : esc(zh);
  const enHtml = block
    ? esc(en || zh).replace(/\n/g, '<br>')
    : esc(en || zh);
  return '<span class="lang-zh">' + zhHtml + '</span>' +
         '<span class="lang-en">' + enHtml + '</span>';
}

/**
 * Builds the about/bio section HTML (the .grid-item.bio divs).
 */
function buildAboutHTML(about) {
  const stars = n => '⭐'.repeat(Math.max(0, Math.min(5, n)));
  const skillRows = about.skills.map(s =>
    `<tr><td>${bilingual(s.name, s.nameEn)}</td><td>${stars(s.stars)}</td></tr>`
  ).join('\n            ');
  const expRows = about.workExperience.map(e =>
    `<tr><td>${esc(e.period)}</td><th>${bilingual(e.company, e.companyEn)}</th><td>${bilingual(e.title, e.titleEn)}</td></tr>`
  ).join('\n            ');

  return `<div class="grid-item me grid-item--width2 bio">
        <div class="info animate__animated animate__tada">
          <img loading="lazy" decoding="async" src="${about.photo}" />
          <h2>${bilingual(about.name, about.nameEn)}</h2>
          <ul>
            <li><i class="fa fa-id-card-o" aria-hidden="true"></i>&nbsp;${bilingual(about.currentTitle, about.currentTitleEn)}</li>
            <li><i class="fa fa-graduation-cap" aria-hidden="true"></i>&nbsp;${bilingual(about.education, about.educationEn)}</li>
            <li>&nbsp;<i class="fa fa-phone" aria-hidden="true"></i>&nbsp;&nbsp;<a href="tel:+886-${about.phone}">${esc(about.phone)}</a></li>
            <li><i class="fa fa-envelope-o" aria-hidden="true"></i>&nbsp;&nbsp;<a href="mailto:${about.email}">${esc(about.email)}</a></li>
          </ul>
          <h2>${bilingual('【技能】', 'Skills')}</h2>
          <table>${skillRows}</table>
        </div>
        <article>
          <p>${bilingual(about.bio, about.bioEn, true)}</p>
          <div id="social">
            <p>
              <a href="${about.facebook}" id="fb" target="_blank"><i class="fa fa-facebook-square fa-2x" aria-hidden="true"></i></a>
              <a href="${about.instagram}" id="ig" target="_blank"><i class="fa fa-instagram fa-2x" aria-hidden="true"></i></a>
            </p>
          </div>
          <hr>
          <h2>${bilingual('【工作經歷】', 'Work Experience')}</h2>
          <table>${expRows}</table>
        </article>
      </div>
      <div class="grid-item grid-item--width2 bio">
        <h2>${bilingual('【學習歷程】', 'Learning Journey')}</h2>
        <div id="myTimeline"></div>
      </div>`;
}

/**
 * Builds the inline <script> with dataZh, dataEn, and redrawTimeline for the timeline plugin.
 */
function buildTimelineScript(timeline) {
  const sorted = [...timeline].sort((a, b) => a.date.localeCompare(b.date));

  function makeEntry(t, lang) {
    const institution = lang === 'en' ? (t.institutionEn || t.institution) : t.institution;
    const heading = lang === 'en' ? (t.headingEn || t.heading) : t.heading;
    const body = lang === 'en' ? (t.bodyEn || t.body) : t.body;
    const bodyParts = [];
    if (t.image) {
      bodyParts.push(`{ tag: 'img', attr: { src: '${t.image}', width: '150px', cssclass: 'img-responsive' } }`);
    }
    bodyParts.push(`{ tag: 'h2', content: ${JSON.stringify(heading)} }`);
    bodyParts.push(`{ tag: 'p', content: ${JSON.stringify(body)} }`);
    return `{
    time: ${JSON.stringify(t.date)},
    header: ${JSON.stringify(institution)},
    body: [${bodyParts.join(', ')}],
    footer: ${JSON.stringify(t.footer || '')}
  }`;
  }

  const zhEntries = sorted.map(t => makeEntry(t, 'zh'));
  const enEntries = sorted.map(t => makeEntry(t, 'en'));

  return `<script>
var dataZh = [
  ${zhEntries.join(',\n  ')}
];
var dataEn = [
  ${enEntries.join(',\n  ')}
];
function redrawTimeline(lang) {
  $('#myTimeline').empty();
  $('#myTimeline').albeTimeline(lang === 'en' ? dataEn : dataZh);
}
redrawTimeline('zh');
</script>`;
}

function lbl(navLabels, key, lang) {
  const n = navLabels && navLabels[key];
  if (!n) return key;
  return lang === 'en' ? (n.en || n.zh || key) : (n.zh || key);
}

function buildNavHTML(navLabels) {
  const L = navLabels || {};
  function bi(key) {
    return '<span class="lang-zh">' + esc(lbl(L, key, 'zh')) + '</span>' +
           '<span class="lang-en">' + esc(lbl(L, key, 'en')) + '</span>';
  }
  return `    <nav id="menu">
      <label for="3bar"><i class="fa fa-bars fa-3x" aria-hidden="true"></i></label><input type="checkbox" id="3bar">
      <ul>
        <li><a id="cis" data-filter=".cis1, .cis2, .cis3, .cis4, .cis5, .cis6, .cis7, .cis8" href="javascript:; ">${bi('cis')}</a>
          <ul id="submenu">
            <li id="cis6"><a data-filter=".cis6" href="javascript:;">${bi('cis6')}</a></li>
            <li id="cis5"><a data-filter=".cis5" href="javascript:;">${bi('cis5')}</a></li>
            <li id="cis3"><a data-filter=".cis3" href="javascript:;">${bi('cis3')}</a></li>
            <li id="cis2"><a data-filter=".cis2" href="javascript:;">${bi('cis2')}</a></li>
            <li id="cis4"><a data-filter=".cis4" href="javascript:;">${bi('cis4')}</a></li>
            <li id="cis1"><a data-filter=".cis1" href="javascript:;">${bi('cis1')}</a></li>
            <li id="cis7"><a data-filter=".cis7" href="javascript:;">${bi('cis7')}</a></li>
            <li id="cis8"><a data-filter=".cis8" href="javascript:;">${bi('cis8')}</a></li>
          </ul>
        </li>
        <li><a id="painter" data-filter=".painter" href="javascript:;">${bi('painter')}</a>
          <ul id="submenu">
            <li id="cis1"><a data-filter=".sketch" href="javascript:;">${bi('sketch')}</a></li>
            <li id="cis2"><a data-filter=".water" href="javascript:;">${bi('water')}</a></li>
            <li id="cis4"><a data-filter=".ink" href="javascript:;">${bi('ink')}</a></li>
            <li id="cis3"><a data-filter=".oil" href="javascript:;">${bi('oil')}</a></li>
            <li id="cis5"><a data-filter=".mark" href="javascript:;">${bi('mark')}</a></li>
            <li id="cis6"><a data-filter=".digital" href="javascript:;">${bi('digital')}</a></li>
          </ul>
        </li>
        <li><a id="photo" data-filter=".photo" href="javascript:;">${bi('photo')}</a></li>
        <li><a id="video" data-filter=".video" href="javascript:;">${bi('video')}</a></li>
        <li><a id="web" data-filter=".web" href="javascript:;">${bi('web')}</a></li>
        <li><a id="three" data-filter=".three" href="javascript:;">${bi('three')}</a></li>
        <li><a id="news" data-filter=".news" href="javascript:;">${bi('news')}</a></li>
        <li><a id="me" data-filter=".bio" href="javascript:;">${bi('me')}</a></li>
      </ul>
    </nav>`;
}

/**
 * Assembles index.html from template + data.
 * Template must contain: {{GRID_CONTENT}}, {{NAV_CONTENT}}, {{TIMELINE_DATA}}
 */
function generateHTML(data, template) {
  const worksHTML = buildWorksHTML(data.works.filter(w => w.type !== 'about'));
  const aboutHTML = buildAboutHTML(data.about);
  const timelineScript = buildTimelineScript(data.about.timeline);
  const navHTML = buildNavHTML(data.navLabels);

  return template
    .replace('{{NAV_CONTENT}}', navHTML)
    .replace('{{GRID_CONTENT}}', worksHTML + '\n      ' + aboutHTML)
    .replace('{{TIMELINE_DATA}}', timelineScript);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

module.exports = { buildWorksHTML, buildAboutHTML, buildTimelineScript, generateHTML };
