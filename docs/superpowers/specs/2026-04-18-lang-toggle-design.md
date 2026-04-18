# 中英語言切換功能 設計文件

**Goal:** 在作品集網站加入 ZH/EN 切換按鈕，涵蓋導覽列子選單、作品說明（Fancybox 燈箱）、About 頁面全部內容；後台新增批次 AI 生成作品英文說明、About 英文欄位與 AI 翻譯功能。

**Architecture:** 三階段依序完成。第一階段在後台填充英文內容（批次 AI 作品說明、About 英文欄位）；第二階段修改 generator 輸出雙語 HTML（`<span class="lang-zh">` / `<span class="lang-en">` 配對）；第三階段在前台加入切換按鈕與 `js/lang.js`，透過 `<html>` 的 CSS class 控制顯示語言，Fancybox 燈箱的 caption 以 JS swap `data-caption` 屬性處理。

**Tech Stack:** Node.js + Express（後端）、Gemini 2.0 Flash（AI 翻譯/說明）、SSE（批次進度串流）、原生 JS + CSS class toggle（前台切換）、localStorage（記憶語言偏好）

---

## 資料模型變更

`data.json` → `about` 物件新增英文欄位：

```json
{
  "about": {
    "name": "程正邦（Tony）",
    "nameEn": "Tony Cheng",
    "currentTitle": "三立新聞網 編輯組副組長",
    "currentTitleEn": "Deputy Editor, Sanlih E-Television",
    "education": "輔仁大學大傳所、銘傳大學大傳系、復興商工美工科",
    "educationEn": "Fu Jen Catholic University (MA, Mass Communication), Ming Chuan University (BA, Mass Communication), Fuxing Commercial & Industrial School (Fine Arts)",
    "bio": "...",
    "bioEn": "...",
    "skills": [
      { "name": "採訪寫作", "nameEn": "Journalism Writing", "stars": 5 }
    ],
    "workExperience": [
      {
        "period": "2024/4~",
        "company": "三立新聞網",
        "companyEn": "Sanlih E-Television",
        "title": "編輯組副組長",
        "titleEn": "Deputy Editor"
      }
    ],
    "timeline": [
      {
        "id": "...",
        "date": "...",
        "institution": "東南工專環工科",
        "institutionEn": "Tungnan University",
        "heading": "武術啟蒙之路",
        "headingEn": "The Beginning of Martial Arts",
        "body": "...",
        "bodyEn": "...",
        "footer": "...",
        "image": "..."
      }
    ]
  }
}
```

所有 EN 欄位為選填，舊資料視為空字串，不影響現有中文顯示。

---

## 第一階段：後台內容準備

### 1A. 批次 AI 生成作品英文說明

#### 後端：`admin/routes/ai.js` 新增端點

**`POST /api/ai/batch-caption`（SSE）**

- Response header: `Content-Type: text/event-stream`
- 篩選條件：`type === 'image'` 且 `captionEn` 為空字串或 undefined
- 逐件呼叫 `callGemini`（與現有 `/api/ai/caption` 相同邏輯）
- 每件完成後立即 `writeData()`（避免中途失敗遺失進度）
- 速率限制：每件之間 `setTimeout` 6000ms（≈ 10件/分鐘，低於 Gemini free tier 15 RPM）
- SSE 格式：

```
data: {"type":"progress","current":1,"total":45,"id":"xxx","src":"images/a.jpg","captionEn":"City night"}

data: {"type":"done","processed":45,"skipped":0}

data: {"type":"error","id":"xxx","message":"..."}
```

- 跳過 `type !== 'image'` 和已有 `captionEn` 的作品（`skipped` 計數）

#### 前端：`admin/public/works.js`

作品頁工具列新增「✨ 批次生成英文說明」按鈕（置於現有按鈕右側）。

點擊後彈出進度 modal：
- 標題：「批次 AI 生成英文說明」
- 進度條：`current / total`
- 目前處理中的圖片名稱
- 即時 log（最新 5 筆，捲動顯示）
- 完成後顯示「已處理 N 件」+ 關閉按鈕

使用 `EventSource` 接收 SSE，完成後重新載入作品列表。

### 1B. About 英文欄位與 AI 翻譯

#### 後端：`admin/routes/ai.js` 新增端點

**`POST /api/ai/translate`**

Request:
```json
{ "text": "採訪寫作", "context": "job skill name" }
```

Response:
```json
{ "en": "Journalism Writing" }
```

Prompt（固定）：
```
請將以下繁體中文翻譯成英文。只回傳英文翻譯，不要其他文字。
Context: {{context}}
Text: {{text}}
```

#### 後端：`admin/routes/about.js` 修改

現有 `PUT /api/about/info`、`PUT /api/about/skills`、`PUT /api/about/work-experience`、`PUT /api/about/timeline/:id` 均已透過 `Object.assign` 儲存任意欄位，**無需修改**，新增的 EN 欄位會自動儲存。

#### 前端：`admin/public/about.js` 修改

**基本資料 tab** — 在各欄位下方加入英文對應欄位：

```
姓名（中）   [________________]
姓名（英）   [________________] [✨ AI 翻譯]

現職（中）   [________________]
現職（英）   [________________] [✨ AI 翻譯]

學歷（中）   [________________]
學歷（英）   [________________] [✨ AI 翻譯]

自我介紹（中）  [textarea]
自我介紹（英）  [textarea]      [✨ AI 翻譯]
```

AI 翻譯按鈕：讀取對應中文欄位的值 → `POST /api/ai/translate` → 填入英文欄位。

**技能 tab** — 每列加入 `nameEn` 欄位：

```
[採訪寫作] [Journalism Writing] [★★★★★] [刪除]
```

列尾的 AI 翻譯小按鈕（✨）翻譯該列的 name。

**工作經歷 tab** — 每列加入 companyEn、titleEn：

```
| 任期 | 公司（中）| 公司（英）| 職稱（中）| 職稱（英）| ✨ |
```

點擊 ✨ 翻譯該列的 company 和 title。

**學習歷程 tab** — 每條展開後加入 institutionEn、headingEn、bodyEn 欄位，旁邊有 AI 翻譯按鈕。

---

## 第二階段：Generator 雙語輸出

### `admin/lib/generator.js` — `buildAboutHTML` 修改

輸出雙語 span 配對的 helper 函式：

```js
function bilingual(zh, en) {
  return '<span class="lang-zh">' + esc(zh) + '</span>' +
         '<span class="lang-en">' + esc(en || zh) + '</span>';
}
```

注意：`en || zh` 確保 EN 欄位空白時 fallback 到中文，不顯示空白。

所有可翻譯文字套用 `bilingual()`：
- `h2` 姓名、`【技能】`、`【工作經歷】` 標題
- 技能表格每列的技能名稱
- 工作經歷表格的公司名、職稱
- 自我介紹段落（`<p>` 包兩個 span）
- `<h2>【學習歷程】`

學習歷程 timeline script（`buildTimelineScript`）：同時輸出 `headingEn`、`bodyEn`、`institutionEn` 到 timeline 資料，供學習歷程插件的 EN 模式使用（timeline 插件本身不支援雙語，改為輸出兩份 timeline data：`var dataZh` 和 `var dataEn`，切換時重繪）。

### `admin/template.html` — 導覽列子選單更新

DRAW 子選單（6 項）更新為雙語：

| 中文 | 英文 |
|------|------|
| 素描 | Sketch |
| 水彩 | Watercolor |
| 水墨 | Ink Wash |
| 油畫 | Oil Painting |
| 麥克筆 | Marker |
| 電繪 | Digital |

DESIGN 子選單（品牌名，保留中文，不翻譯）：宜蘭好羹、台北捷運、大叔咖啡、狗日攝影、武台開打、雀姊蛋糕、渡商創研。

```html
<li><a data-filter=".sketch" href="javascript:;">
  <span class="lang-zh">素描</span>
  <span class="lang-en">Sketch</span>
</a></li>
```

---

## 第三階段：前台語言切換

### `template.html` 變更

1. `<html lang="en">` → 改為由 JS 動態設定
2. 在 `<header>` 內 `<nav>` 之前加入切換按鈕：
```html
<button id="lang-toggle" title="Switch language">EN</button>
```
3. 在 `</body>` 前加入：`<script src="js/lang.js"></script>`

### 新建 `js/lang.js`

```js
(function () {
  var STORAGE_KEY = 'portfolio-lang';

  function setLang(lang) {
    var html = document.documentElement;
    html.classList.remove('lang-zh', 'lang-en');
    html.classList.add('lang-' + lang);
    html.setAttribute('lang', lang === 'en' ? 'en' : 'zh-TW');

    // 更新切換按鈕文字（顯示「可切換到哪個語言」）
    var btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = lang === 'en' ? '中' : 'EN';

    // Swap data-caption for Fancybox lightbox
    document.querySelectorAll('[data-caption-en]').forEach(function (el) {
      var zh = el.dataset.captionZhBackup || el.dataset.caption;
      var en = el.dataset.captionEn || zh;
      if (!el.dataset.captionZhBackup) el.dataset.captionZhBackup = zh;
      el.dataset.caption = lang === 'en' ? en : zh;
    });

    // Timeline 重繪（如果 timeline 已初始化）
    if (typeof redrawTimeline === 'function') redrawTimeline(lang);

    localStorage.setItem(STORAGE_KEY, lang);
  }

  // 初始化：讀取 localStorage，預設中文
  var saved = localStorage.getItem(STORAGE_KEY) || 'zh';
  setLang(saved);

  // 按鈕點擊
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('lang-toggle');
    if (btn) {
      // 補齊初始按鈕文字（DOMContentLoaded 前 setLang 已執行但按鈕可能不存在）
      btn.textContent = saved === 'en' ? '中' : 'EN';
      btn.addEventListener('click', function () {
        var current = document.documentElement.classList.contains('lang-en') ? 'en' : 'zh';
        setLang(current === 'en' ? 'zh' : 'en');
      });
    }
  });
})();
```

### `css/index.css` 新增

```css
/* 語言切換 */
.lang-en { display: none; }
html.lang-en .lang-zh { display: none; }
html.lang-en .lang-en { display: inline; }

/* 切換按鈕 */
#lang-toggle {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.5);
  color: white;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 12px;
  vertical-align: middle;
}
#lang-toggle:hover { background: rgba(255,255,255,0.15); }
```

### Timeline 雙語處理

`buildTimelineScript` 輸出兩份 data 和一個切換函式：

```html
<script>
var dataZh = [...]; // 原有中文資料
var dataEn = [...]; // 英文資料（institutionEn/headingEn/bodyEn，缺則 fallback 中文）
function redrawTimeline(lang) {
  $('#myTimeline').empty();
  $('#myTimeline').albeTimeline({ data: lang === 'en' ? dataEn : dataZh });
}
// 初始化（由 lang.js 的 setLang 呼叫，或頁面載入時直接跑中文）
</script>
```

---

## 不在此次範圍內

- DESIGN 子選單品牌名翻譯（保留中文）
- 頁面 `<title>` 和 meta description 多語言切換
- 學習歷程 footer 欄位的英文翻譯（footer 通常為空，跳過）
- 批次翻譯 About 所有欄位（後台 AI 翻譯按鈕逐欄手動觸發）
