//瀑布流排版

$(function () {
	// external js: masonry.pkgd.js, imagesloaded.pkgd.js

	// init Masonry
	var $grid = $('.grid').masonry({
		itemSelector: '.grid-item',
		percentPosition: true,
		columnWidth: '.grid-sizer',
		gutter: '.gutter-sizer'
	});
	// layout Masonry after each image loads
	$grid.imagesLoaded().progress(function () {
		$grid.masonry();
	});
});

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
	// init Isotope
	var $grid = $('.grid').isotope({
		// options
	});
	// filter items on button click
	$('header').on('click', 'a', function () {
		var filterValue = $(this).attr('data-filter');
		$grid.isotope({
			filter: filterValue
		});
	});
});

//時間軸data

var data = [{
		time: '1997-06-21',
		header: '東南工專環工科',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/拳兒.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: "武術啟蒙之路"
			},
			{
				tag: 'p',
				content: '嘆服美劇《馬蓋先》的足智多謀，以為化學有趣又實用，沒去念復興美工，選擇念環工科，後來發現自己粗枝大葉，不適合做實驗，倒是挺適合習武，受漫畫《拳兒》啟發，加入國術社，在武壇教練<a href="https://www.wutang.moreward.com/?page_id=58" target="_blank">林仲曦</a>指導下，習練<a href="https://www.youtube.com/watch?v=6w9rplNXMM0" target="_blank">八極拳</a>、<a href="https://www.youtube.com/watch?v=6xzqbm42fis" target="_blank">螳螂拳</a>、<a href="https://www.youtube.com/watch?v=yfy7XVSugUU" target="_blank">太極拳</a>、<a href="https://www.youtube.com/watch?v=__u29fI8nqI" target="_blank">迷蹤拳</a>、<a href="https://www.youtube.com/watch?v=MOYyBXmno3k" target="_blank">劈掛掌</a>，參加全國大專院校國術比賽獲得<a href="images/中正盃.jpg" data-lightbox="timeline" data-title="全國大專院校國術比賽" target="_blank">拳術對練第五名</a>。'
			}
		],
		footer: '參加社團：國術社'
	},
	{
		time: '2007-06-15',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/地球村.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '練習英文會話'
			},
			{
				tag: 'p',
				content: '大學畢業考研究所，由於英文未達低標無法口試，耿耿於懷，加上三不五時出國採訪，深感語言之重要，工作之餘到地球村補英日文，加強聽說能力。'
			}
		],
	},
	{
		time: '2012-10-15',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/視丘.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '學習人像打光'
			},
			{
				tag: 'p',
				content: '一名好的攝影記者，不僅要能在新聞現場搶拍到畫面，也被期待在專題報導中，把人物或商品拍得精緻完美，而棚拍經驗正是我最缺乏的，一直很想到<a href="https://www.fotosoft.com.tw/" target="_blank">視丘攝影學院</a>接受正統攝影教育，但實在無法放棄工作一年上全修班，只好報名基礎人像攝影班和台北攝影學會的人像外拍課體驗一下。'
			}
		],
	}, {
		time: '2008-06-15',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/散打.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '接觸實戰武術'
			},
			{
				tag: 'p',
				content: '習練傳統武術多年，沒有實戰經驗，心中始終有點遺憾，在公司附近武館「傳龍會」<a href="https://www.youtube.com/user/tstootoo/featured" target="_blank">陳建宇</a>教練指導下，學習散打、柔術，參加陽明盃散打比賽，獲得<a href="images/陽明盃.jpg" data-lightbox="timeline" data-title="陽明盃散打比賽" target="_blank">男子組超重量級第三名</a>，圖為昔日戰友和教練（背影）。'
			}
		],
	}, {
		time: '2016-04-15',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/軟體.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '學習美工軟體'
			},
			{
				tag: 'p',
				content: '鑑於大眾媒體轉型和自媒體的興起，深感所學之不足，到<a href="https://www.pcschool.com.tw/" target="_blank">巨匠電腦</a>學剪接特效、3D動畫、電腦繪圖、平面設計和網頁製作，為了熟練操作，同一門課選擇不同老師重修，幾乎把所有老師的課都上過一輪。'
			}
		],
	},
	{
		time: '2000-09-20',
		header: '銘傳大學大傳系',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/銘傳.JPG',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: "琴聲飄揚學影視"
			}, {
				tag: 'p',
				content: '插大考取銘傳大學大傳系，選修電視組，在校園媒體<a href="https://www.facebook.com/MingChuanMCTV" target="_blank">銘傳電視台</a>當助理，採訪校園新聞，畢業製作的劇情短片《TOMORROW IS TODAY》，代表學校參加廣電比賽，校慶快報比賽獲得<a href="images/快報.jpg" data-lightbox="timeline" data-title="銘傳大學校慶快報比賽">團體第二名</a>。'
			}
		],
		footer: '參加社團：吉他社<a href="images/銘傳成績單.jpg" style="float:right; display:block;" data-lightbox="timeline" data-title="銘傳大傳系成績單" target="_blank">銘傳成績單</a>'
	},
	{
		time: '2002-09-15',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/金門.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '金門新聞兵'
			},
			{
				tag: 'p',
				content: '大學畢業，自願到外島服役，原本是金門運指部政戰士，服役半年多，被挑選為新聞兵，到金防部支援到退伍，隨著司令視察部隊採訪軍聞，刊登在《<a href="https://ttt0920.pixnet.net/blog/post/99711661" target="_blank">正氣中華報</a>》。'
			}
		],
	},
	{
		time: '2003-06-02',
		header: '蘋果日報',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/Apple_Daily_logo.png',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: "跟拍名人八卦"
			}, {
				tag: 'p',
				content: '退伍後當過攝影助理、遊戲編輯，最後在《<a href="https://tw.appledaily.com/home/" target="_blank">蘋果日報</a>》生根落腳，從特勤記者幹起，中間換線跑過唱片、綜藝新聞，繞了一圈回歸特勤中心擔任主管。'
			}
		],
		footer: '職務：娛樂記者、特勤中心副主任'
	},
	{
		time: '2020-06-06',
		header: '輔仁大學大傳所',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/20200606_114903s.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: "統計論文拿高分"
			},
			{
				tag: 'p',
				content: '充實的兩年，修了60個學分，看了許多paper，沒日沒夜地趕報告，在院長<a href="http://www.gsmc.url.tw/teacherdetail.php?url=%E6%B4%AA%E9%9B%85%E6%85%A7" target="_blank">洪雅慧</a>教授指導下，完成碩士論文《<a href="https://hdl.handle.net/11296/afm2jx" target="_blank">反送中事件的第一人效果和第三人效果－以2020年台灣總統大選為例</a>》。此外，還到大學部旁聽實務課程，加入柔道社和乙組一起練習對摔。'
			}
		],
		footer: '參加社團：柔道社 <a href="images/輔大成績單.jpg" style="float:right; display:block;" data-lightbox="timeline" data-title="輔大大傳所成績單" target="_blank">輔大成績單</a>'
	},
	{
		time: '2021-01-15',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/idm.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '正規設計教育'
			},
			{
				tag: 'p',
				content: '巨匠電腦讓我學會了軟體操作，卻無法教我創意發想，報考台科、北科設計所失利後，興起到南陽街設計升學教室<a href="http://www.idesignmate.com/" target="_blank">IDM</a>上課的念頭，從設計理論和麥克筆表現技法學起，並到<a href="http://www.fhvs.ntpc.edu.tw/" target="_blank">復興美工</a>念夜間部，一償宿願，開始沒日沒夜趕圖的日子。'
			}
		],
	},
	{
		time: '2021-10-01',
		header: '辰紘行銷',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/159974m.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '轉換跑道做美術設計'
			},
			{
				tag: 'p',
				content: '《蘋果》老闆黎智英被中共抓去關後，易主經營大裁員，我離開待了18年的公司，嘗試轉換跑道做設計相關的工作，在「辰紘行銷」當視覺設計，幫台北捷運設計活動海報、燈箱，還有政府標案提案設計，作品屢獲業主肯定，在比稿中勝出，發標執行。'
			}
		],
	},
	{
		time: '2022-02-01',
		header: '中天新聞',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/中天新聞.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '練口條看畫面說故事'
			},
			{
				tag: 'p',
				content: '在行銷公司待半年，想了解電視台運作，到中天電視政論節目當企劃，後來公司覺得我的新聞資歷做節目太可惜，把我調到新聞部做D-Live、發即時新聞，在中天電視當2年文字記者；2023年中天電視成立中天新聞網，缺能拍能寫的突發記者，又被調到網路新聞部門跑社會線。'
			}
		],
	},
	{
		time: '2024-04-01',
		header: '三立新聞網',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/三立新聞.png',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '狂發稿衝流量文筆獲肯定'
			},
			{
				tag: 'p',
				content: '在中天新聞網跑社會線期間，因為文筆好、工作認真，被三立新聞網主管注意到，被挖角去當小夜主管，即使不用在外面跑新聞，我仍在公司狂發稿追新聞，彌補小夜人力之不足，發稿量和新聞流量，在主管群中名列前茅，獲得主管肯定。'
			}
		],
	},
	{
		time: '2025-06-04',
		header: '復興商工美工科',
		body: [{
				tag: 'img',
				attr: {
					src: 'images/復興美工畢業展.jpg',
					width: '150px',
					cssclass: 'img-responsive'
				}
			},
			{
				tag: 'h2',
				content: '品學兼優畢業獲表揚'
			},
			{
				tag: 'p',
				content: '為了彌補兒時沒念復興美工的遺憾，輔大碩士畢業2年後，又到復興商工美工科夜間部學畫畫，熱心服務的我獲選班代，每學期名列前茅拿獎學金，並通過人像速寫中階檢定，畢業展5幅作品入選，在美麗永安藝文中心展出，獲局長獎和教師會表揚。'
			}
		],
	},
];

// 執行timeline加動畫
$(document).ready(function () {
	$("#myTimeline").albeTimeline(data);
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
	var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl)
	})
});
