// goTop

$(function () {
	$('#BackTop').click(function () {
		$('html,body').animate({
			scrollTop: 0
		}, 333);
	});
	$(window).scroll(function () {
		if ($(this).scrollTop() > 300) {
			$('#BackTop').fadeIn(222);
		} else {
			$('#BackTop').stop().fadeOut(222);
		}
	}).scroll();
});

//選單過濾

$(function () {
	// init Isotope — 與 Masonry 使用相同欄寬設定，避免切換分頁跑版
	var $grid = $('.grid').isotope({
		layoutMode: 'masonry',
		masonry: {
			columnWidth: '.grid-sizer',
			gutter: '.gutter-sizer'
		},
		itemSelector: '.grid-item',
		percentPosition: true
	});

	// Relayout as images load so items get correct heights
	var layoutTimer;
	$grid.imagesLoaded().progress(function () {
		clearTimeout(layoutTimer);
		layoutTimer = setTimeout(function () {
			$grid.isotope('layout');
		}, 200);
	});

	// filter items on button click
	$('header').on('click', 'a', function () {
		var filterValue = $(this).attr('data-filter');
		$grid.isotope({ filter: filterValue });
		// Isotope 動畫完成後再觸發 3D iframe resize，確保 canvas 尺寸已正確
		$grid.one('arrangeComplete', function () {
			setTimeout(function () {
				$('.three iframe').each(function () {
					try {
						this.contentWindow.dispatchEvent(new Event('resize'));
					} catch (e) {}
				});
			}, 50);
		});
	});
});

//時間軸data

// timeline 動畫（初始化由 inline script 的 redrawTimeline 負責）
$(document).ready(function () {
	$("#myTimeline article").addClass("animate__animated animate__tada");
});

// timeline選單捲動

$(document).ready(function () {
	$('#timeline-menu a').click(function () {
		var y = $(this).attr('href');
		$('html, body').animate({
			scrollTop: $(y).offset().top
		}, 300);
	})
});

//about me顯示
$(document).ready(function () {
	$('.bio').hide();
	$('header ul a#me').click(function () {
		$('.bio').show();
	});
});

//螢幕寬度大於768px，skrollr.js執行，切換3d欄位寬度
$(document).ready(function () {
	if ($(window).width() > 768) {
		skrollr.init({
			forceHeight: false
		});
	} else {
		$('.grid-item.three').removeClass('grid-item--width4').addClass('grid-item--width2');
	}
});

//手機menu圖示切換
$(document).ready(function () {
	$('#menu .fa').click(function () {
		if ($(this).hasClass('fa-bars')) {
			$(this).removeClass('fa-bars').addClass('fa-times-circle');
		} else {
			$(this).removeClass('fa-times-circle').addClass('fa-bars');
		}

	});
});

//bs tooltip
$(document).ready(function () {
	var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl)
	})
});

// 手機版 3D 滾動按鈕：注入 ▲▼ 讓使用者可上下滑動頁面，同時保留 3D 觸控操作
$(document).ready(function () {
	$('.grid-item.three').append(
		'<div class="three-scroll-btns">' +
		'<button class="three-scroll-up">&#9650;</button>' +
		'<button class="three-scroll-down">&#9660;</button>' +
		'</div>'
	);
	$(document).on('click', '.three-scroll-up', function () {
		$('html, body').animate({ scrollTop: $(window).scrollTop() - 520 }, 300);
	});
	$(document).on('click', '.three-scroll-down', function () {
		$('html, body').animate({ scrollTop: $(window).scrollTop() + 520 }, 300);
	});
	// iOS Safari :active 不可靠，用 touchstart/touchend 模擬按壓變色
	$(document).on('touchstart', '.three-scroll-btns button', function () {
		$(this).addClass('is-active');
	}).on('touchend touchcancel', '.three-scroll-btns button', function () {
		$(this).removeClass('is-active');
	});
});

// Fancybox 雙語 caption：每次開啟時依當前語言讀取，不用快取值
$.fancybox.defaults.caption = function (instance, item) {
	var el = item.opts.$orig && item.opts.$orig[0];
	if (!el) return '';
	var isEn = document.documentElement.classList.contains('lang-en');
	var desc = isEn
		? (el.dataset.captionEn || el.dataset.captionZhBackup || el.dataset.caption || '')
		: (el.dataset.captionZhBackup || el.dataset.caption || '');
	// 從 href 取出檔名（去掉路徑和副檔名）
	var href = el.getAttribute('href') || '';
	var filename = href.split('/').pop().replace(/\.[^.]+$/, '') || '';
	if (filename) {
		return '<strong class="fb-caption-title">' + filename + '</strong>' +
			(desc ? '<br><span class="fb-caption-desc">' + desc + '</span>' : '');
	}
	return desc;
};

// YouTube 點擊播放（facade 容器原地換成 iframe，高度不變不跑版）
$(document).on('click', '.yt-facade', function () {
	var vid = $(this).data('vid');
	var iframe = '<iframe src="https://www.youtube-nocookie.com/embed/' + vid
		+ '?autoplay=1" frameborder="0"'
		+ ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"'
		+ ' allowfullscreen></iframe>';
	$(this)
		.removeClass('yt-facade')
		.addClass('yt-playing')
		.removeAttr('data-vid')
		.html(iframe);
	// 容器高度不變（padding-bottom 56.25% 維持），masonry 無需重排
});
