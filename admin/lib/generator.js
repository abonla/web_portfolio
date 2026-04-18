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
