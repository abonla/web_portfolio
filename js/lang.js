(function () {
  var STORAGE_KEY = 'portfolio-lang';

  function setLang(lang) {
    var html = document.documentElement;
    html.classList.remove('lang-zh', 'lang-en');
    html.classList.add('lang-' + lang);
    html.setAttribute('lang', lang === 'en' ? 'en' : 'zh-TW');

    // Update toggle button text (show the opposite language as the label)
    var btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = lang === 'en' ? '中' : 'EN';

    // Swap data-caption for Fancybox lightbox items
    document.querySelectorAll('[data-caption-en]').forEach(function (el) {
      var zh = el.dataset.captionZhBackup || el.dataset.caption;
      var en = el.dataset.captionEn || zh;
      if (!el.dataset.captionZhBackup) el.dataset.captionZhBackup = zh;
      el.dataset.caption = lang === 'en' ? en : zh;
    });

    // Timeline redraw (if initialized)
    if (typeof redrawTimeline === 'function') redrawTimeline(lang);

    localStorage.setItem(STORAGE_KEY, lang);
  }

  // Initialize from localStorage, default to Chinese
  var saved = localStorage.getItem(STORAGE_KEY) || 'zh';
  setLang(saved);

  // Script is at the bottom of <body>, so DOM is already ready — attach directly.
  var btn = document.getElementById('lang-toggle');
  if (btn) {
    btn.textContent = saved === 'en' ? '中' : 'EN';
    btn.addEventListener('click', function () {
      var current = document.documentElement.classList.contains('lang-en') ? 'en' : 'zh';
      setLang(current === 'en' ? 'zh' : 'en');
    });
  }
})();
