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
  return `<div class="${classes}">
        <a href="${w.src}" data-fancybox="${w.fancyboxGroup}" data-caption="${caption}" data-caption-en="${captionEn}"><img loading="lazy" decoding="async" src="${w.thumb}" /></a>
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
