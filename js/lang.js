// lang.js — ZH / EN language toggle
// setLang is exposed globally so the button onclick can call it directly.

(function () {
  var STORAGE_KEY = 'portfolio-lang';

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

    localStorage.setItem(STORAGE_KEY, lang);
  };

  // Initialize on load
  var saved = localStorage.getItem(STORAGE_KEY) || 'zh';
  window.setLang(saved);
})();
