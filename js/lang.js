// lang.js — ZH / EN language toggle
// setLang is exposed globally so the button onclick can call it directly.

(function () {
  window.setLang = function (lang) {
    var html = document.documentElement;
    html.classList.remove('lang-zh', 'lang-en');
    html.classList.add('lang-' + lang);
    html.setAttribute('lang', lang === 'en' ? 'en' : 'zh-TW');

    var btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = lang === 'en' ? '中文' : 'EN';

    // Swap data-caption for Fancybox lightbox items
    document.querySelectorAll('[data-caption-en]').forEach(function (el) {
      var zh = el.dataset.captionZhBackup || el.dataset.caption;
      var en = el.dataset.captionEn || zh;
      if (!el.dataset.captionZhBackup) el.dataset.captionZhBackup = zh;
      el.dataset.caption = lang === 'en' ? en : zh;
    });

    // Timeline redraw (if initialized)
    if (typeof redrawTimeline === 'function') {
      try { redrawTimeline(lang); } catch (e) { /* ignore timeline errors */ }
    }

  };

  // Always start in Chinese on page load
  window.setLang('zh');
})();
