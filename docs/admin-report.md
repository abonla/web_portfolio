# 作品集後台系統 — 製作報告與操作說明

> 作者：Tony Cheng（程正邦）
> 完成日期：2026-04-18

---

## 一、專案背景

原作品集網站 (`abonla.github.io`) 為純靜態 HTML，部署於 GitHub Pages。所有作品資料、關於頁面內容、時間軸等資訊全部硬寫在 `index.html` 與 `js/index.js` 中，每次更新都需要手動編輯原始碼。

**目標：** 建立一套本機 Node.js 後台管理系統，讓非技術操作者也能透過瀏覽器介面新增/刪除作品、編輯個人資料、並一鍵發佈至 GitHub Pages，同時不改變原有靜態網站的運作方式。

---

## 二、系統架構

```
web_portfolio/
├── index.html              ← 最終靜態網頁（由 generator 產生）
├── data.json               ← 所有內容的資料來源
├── images/                 ← 原始圖片
├── images/thumbs/          ← 自動產生的縮圖
├── works/                  ← 3D 模型 zip 解壓目錄
├── js/, css/               ← 前端資源（不動）
├── admin/
│   ├── server.js           ← Express 後台伺服器（port 3001）
│   ├── migrate.js          ← 一次性遷移腳本
│   ├── generate.js         ← 重新產生 index.html 的 CLI
│   ├── template.html       ← 網頁模板（含 {{GRID_CONTENT}} 占位符）
│   ├── model-viewer-template.html  ← Three.js 檢視頁模板
│   ├── lib/
│   │   ├── generator.js        ← HTML 產生邏輯
│   │   ├── image-processor.js  ← Sharp 圖片壓縮 / 裁切
│   │   ├── model-generator.js  ← 3D 模型 zip 解壓 / 產生檢視頁
│   │   ├── git.js              ← simple-git 封裝
│   │   ├── parse-works.js      ← 遷移用：解析作品 HTML
│   │   └── parse-about.js      ← 遷移用：解析關於頁 HTML
│   ├── routes/
│   │   ├── works.js        ← /api/works CRUD
│   │   ├── upload.js       ← /api/upload/image
│   │   ├── youtube.js      ← /api/youtube/parse
│   │   ├── three.js        ← /api/upload/model
│   │   ├── about.js        ← /api/about 全部子路由
│   │   ├── settings.js     ← /api/settings
│   │   └── publish.js      ← /api/publish（SSE 串流）
│   └── public/             ← 後台 SPA 前端
│       ├── index.html
│       ├── style.css
│       ├── app.js          ← 核心路由 / fetch helper
│       ├── works.js
│       ├── upload-image.js
│       ├── upload-video.js
│       ├── upload-model.js
│       ├── about.js
│       └── settings.js
├── tests/                  ← Jest + Supertest 測試套件
├── package.json
└── jest.config.js
```

### 資料流

```
瀏覽器操作
    ↓ REST API
admin/server.js (Express)
    ↓ 讀寫
data.json  ←→  images/  ←→  works/
    ↓ node admin/generate.js
index.html
    ↓ git push
GitHub Pages
```

---

## 三、技術選型

| 項目 | 選擇 | 原因 |
|------|------|------|
| 執行環境 | Node.js 16 + Express 5 | 本機使用，不需部署後端 |
| 資料儲存 | `data.json` | 靜態網站不能用資料庫，JSON 最直接 |
| 圖片處理 | Sharp 0.32.6 | 高效能，支援裁切、縮圖、JPEG 品質控制 |
| 前端裁切 | Cropper.js（CDN） | 成熟的瀏覽器端圖片裁切元件 |
| 上傳處理 | Multer | Express 標準 multipart 處理 |
| Zip 解壓 | Unzipper | 支援串流解壓 |
| Git 操作 | simple-git | Promise 介面，支援串流輸出 |
| HTML 解析 | cheerio 0.22.0 | 一次性遷移用，相容 Node 16 |
| 測試 | Jest 29 + Supertest | API 整合測試 + 單元測試 |
| 前端 | 原生 JS + Fetch API | 不引入框架，後台夠簡單 |

---

## 四、製作流程

### 階段一：資料遷移（Plan 1）

1. 撰寫 `admin/migrate.js`：使用 cheerio 解析既有 `index.html`，將 359 件作品、14 條學習歷程、7 項技能、7 筆工作經歷全部萃取至 `data.json`。
2. 同時將 `index.html` 中的動態區塊替換為 `{{GRID_CONTENT}}`、`{{TIMELINE_DATA}}` 占位符，存為 `admin/template.html`。
3. 手動修正遷移後 `data.json` 中的幾個欄位（姓名、職稱、電話、Email 的 index 對應偏移問題）。

### 階段二：後端 API（Plan 2）

依序建立所有 REST 端點：

- **作品 CRUD**：GET / POST / PUT / DELETE `/api/works`
- **圖片上傳**：POST `/api/upload/image` → Sharp 壓縮原圖（max 1600px, 85% JPEG）+ 裁切縮圖（max 600px, 80% JPEG）
- **YouTube 解析**：POST `/api/youtube/parse` → 支援完整網址、youtu.be 短網址、純 ID
- **3D 模型上傳**：POST `/api/upload/model` → 解壓 zip、驗證 .obj 存在、產生 Three.js 檢視頁 HTML
- **關於頁面**：基本資料 / 技能 / 工作經歷 / 學習歷程各自獨立端點
- **網站設定**：GET / PUT `/api/settings`
- **發佈**：GET `/api/publish/status`（待發布數量）、POST `/api/publish`（SSE 串流 git 輸出）

### 階段三：後台 UI（Plan 3）

建立單頁應用（SPA），以 hash 路由切換頁面，不依賴任何前端框架。

- 深色主題介面（#0f1117 背景）
- 頂部列：品牌名稱 + 發佈按鈕（附待發布數量 badge）
- 左側選單：頁面導航
- 各功能頁面：作品列表、圖片上傳（含 Cropper.js）、影片上傳、3D 上傳、關於（4 tab）、設定

### 測試覆蓋

共 27 個測試，分佈於 6 個測試檔：

| 測試檔 | 測試數 | 涵蓋範圍 |
|--------|--------|----------|
| `migrate.test.js` | 5 | cheerio 解析器（image / video / 3D / workExp / skills） |
| `generator.test.js` | 8 | buildWorksHTML / buildAboutHTML / buildTimelineScript |
| `server.test.js` | 1 | GET /health |
| `image-processor.test.js` | 3 | processUpload（壓縮、裁切、檔名衝突） |
| `model-generator.test.js` | 3 | extractModelName / generateViewerHTML |
| `api.test.js` | 7 | Works CRUD + extractVideoId |

---

## 五、操作說明

### 5.1 啟動後台

```bash
cd web_portfolio
npm start
```

開啟瀏覽器：**http://localhost:3001**

> 後台只在本機執行，不會影響線上網站，關閉終端機即停止。

---

### 5.2 作品管理

**瀏覽作品**

左側選單點「作品」，會看到所有作品的縮圖格。

- 上方 tab 可篩選類型：全部 / DRAW / DESIGN / PHOTO / VIDEO / WEB / 3D / NEWS
- 每張卡片右上角有刪除按鈕（垃圾桶圖示），點擊後確認即刪除（連同圖片檔案）

**新增圖片作品**

1. 點選單「上傳圖片」（或作品頁右上角圖片按鈕）
2. 將圖片拖入虛線框，或點擊選擇檔案
3. 畫面出現裁切框，拖動調整縮圖範圍
4. 填寫：
   - **檔名前綴**（英文，用於命名圖片檔）
   - **說明文字**
   - **Fancybox 群組**（同群組可在燈箱中翻頁，留空則獨立）
   - **分類**（可多選，點擊 chip 切換）
5. 點「儲存」→ 自動壓縮並上傳，作品加入列表

**新增 YouTube 影片**

1. 點選單「新增影片」
2. 貼上 YouTube 網址（支援以下格式）：
   - `https://www.youtube.com/watch?v=XXXXXXXXXXX`
   - `https://youtu.be/XXXXXXXXXXX`
   - 直接貼 11 字元 Video ID
3. 確認縮圖預覽正確後填分類，點「儲存」

**新增 3D 模型**

1. 點選單「上傳 3D 模型」
2. 準備一個 `.zip` 壓縮檔，內含：
   - 一個 `.obj` 檔（幾何）
   - 一個 `.mtl` 檔（材質，選填）
   - 貼圖圖片（選填）
3. 拖入 zip 檔
4. 填寫標題，點「儲存」
5. 系統自動解壓並產生 Three.js 檢視頁（`works/<modelName>/index.html`）

---

### 5.3 關於頁面

左側選單點「關於」，共有四個 tab：

**基本資料 tab**

可編輯：姓名、現職職稱、學歷、電話、Email、Facebook、Instagram、自我介紹。
填寫完畢後點「儲存基本資料」。

**技能 tab**

- 點星星調整評分（1–5 顆）
- 可直接修改技能名稱
- 最下方「新增技能」按鈕可加入新項目
- 點「儲存技能」

**工作經歷 tab**

- 表格直接點擊欄位編輯（任期、公司、職稱）
- 最下方可新增一列
- 點「儲存工作經歷」

**學習歷程 tab**

- 每條時間軸可展開/收合
- 點「編輯」進入修改模式，可改標題、時間、說明、圖片連結
- 點「刪除」移除該條
- 右上角「新增」可加入新的時間軸條目

---

### 5.4 網站設定

左側選單點「設定」：

| 欄位 | 說明 |
|------|------|
| 網站標題 | `<title>` 與 OG title |
| 網站描述 | meta description 與 OG description |
| OG 分享圖片 | 社群分享預覽圖的路徑（相對於網站根目錄） |

修改後點「儲存設定」。

---

### 5.5 發佈到 GitHub Pages

所有修改都只存在本機 `data.json`，需要「發佈」才會更新線上網站。

1. 右上角「發佈」按鈕旁的數字顯示尚未發佈的變更數量
2. 點「發佈」按鈕，輸入 commit 訊息（如：「新增三月作品」）
3. 點「確認發佈」
4. 視窗內即時顯示 git 執行輸出：
   - `git add -A`
   - `git commit -m "..."`
   - `git push origin main`
5. 看到 `push` 成功後，約 1–2 分鐘 GitHub Pages 會自動更新

> **注意：** 發佈前系統會自動執行 `generate.js` 重新產生 `index.html`，確保所有最新資料都已寫入靜態網頁。

---

### 5.6 手動重新產生 index.html

如果需要在不發佈的情況下更新 `index.html`（例如本機預覽）：

```bash
node admin/generate.js
```

---

## 六、常見問題

**Q: 關閉後台後資料會不會消失？**
A: 不會。所有資料存在 `data.json`，後台只是讀寫這個檔案。

**Q: 可以在不同電腦上使用嗎？**
A: 可以，只要有安裝 Node.js 16+，執行 `npm install` 後再 `npm start` 即可。

**Q: 刪除作品後圖片也會刪掉嗎？**
A: 是的，刪除圖片作品時會同時刪除 `images/` 下的原圖和 `images/thumbs/` 下的縮圖。3D 模型刪除作品條目但不刪除 `works/` 目錄下的檔案（避免誤刪）。

**Q: 如果 index.html 和 data.json 不同步怎麼辦？**
A: 執行 `node admin/generate.js` 強制重新產生即可。

**Q: 測試怎麼跑？**
A: `npm test` — 27 個測試，約 2 秒完成。

---

## 七、Git 紀錄摘要

| Commit | 說明 |
|--------|------|
| 初始 | 建立 package.json、.gitignore、基本目錄結構 |
| Plan 1 | migrate.js 遷移腳本、parse-works/about、generator、template |
| Plan 2 | 全部 API 路由（works / upload / youtube / 3D / about / settings / publish） |
| `f48e12a` | 手動修正 data.json 基本資料欄位 |
| Plan 3 | 完整後台 SPA（index.html / style.css / app.js 及所有頁面模組） |
| `ff149cd` | Plan 3 完成，端對端驗證通過 |
