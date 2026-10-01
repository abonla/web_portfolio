# 網頁設計專案成果與儲存架構說明文件

> **學號**：`414440642`  
> **姓名**：`程正邦`（`414440642_程正邦`）  
> **系所**：輔仁大學 應用美術學系  
> **課程**：網頁設計  
> **作品集線上站點**：[abonla.github.io](https://abonla.github.io)

---

## 📌 一、專案總覽

本專案為輔仁大學應用美術學系網頁設計課程之綜合成果，包含兩大核心架構：
1. **個人作品集網站與本地端動態管理系統**：整合靜態發佈（GitHub Pages）與本地 Express 後台系統，具備作品資料庫編輯、圖片壓縮處理與一鍵生成發佈機制。
2. **幸運物 3D 動態互動網頁作業（蘋果與小熊）**：以 Three.js 低面數（Low-Poly）打造之 3D 互動單元，具備滑鼠目光跟隨、物件懸停回饋、吃蘋果多段關節動畫與原生音效合成。

---

## 🗄️ 二、專案儲存架構詳解（專案是怎麼被儲存的）

本專案考量靜態伺服器（GitHub Pages）無資料庫之特性，採用**「檔案型資料來源（Flat-file Data Store）＋靜態生成（Static Site Generation, SSG）＋本地動態管理後台」**之混合架構儲存與運作。

### 1. 儲存目錄結構圖

```text
web_portfolio/
├── README.md                      ← 本說明文件（414440642_程正邦）
├── index.html                     ← 作品集前端展示頁（由 generator.js 根據 data.json 自動產生）
├── data.json                      ← 核心資料來源（所有作品、簡介、經歷之 JSON 儲存庫）
├── images/                        ← 高解析度作品原圖儲存目錄
│   └── thumbs/                    ← 由 Sharp 自動縮放壓縮之縮圖快取
├── model/                         ← 既有 3D 展示物件與 HTML 容器
├── js/ & css/                     ← 作品集靜態展示所需之腳本與樣式庫
│
├── lucky-charm/                   ← 【作業單元】幸運物 3D 動態互動網頁
│   ├── index.html                 ← 幸運物互動頁面骨架與 HUD 介面
│   ├── style.css                  ← 森林暖調視覺系統、毛玻璃設計與動畫樣式
│   ├── main.js                    ← Three.js 程序化低面數建模、音效合成與動畫時序
│   └── README.md                  ← 幸運物作業設計理念與互動機制報告
│
├── admin/                         ← 【後台系統】本地 Node.js + Express 管理後端
│   ├── server.js                  ← 後台伺服器核心（監聽 port 3001）
│   ├── template.html              ← 作品集頁面之 HTML 模板（具備佔位符）
│   ├── generate.js                ← 手動觸發 index.html 重新生成腳本
│   ├── lib/                       ← 核心功能模組庫
│   │   ├── generator.js           ← 結合 data.json 與 template.html 產生 index.html
│   │   ├── image-processor.js     ← Sharp 圖片裁切與縮圖處理邏輯
│   │   └── git.js                 ← simple-git 一鍵提交並發佈至 GitHub
│   ├── routes/                    ← RESTful API 路由（作品 CRUD、上傳、發佈）
│   └── public/                    ← 後台前端單頁應用（SPA）介面
│
├── docs/                          ← 專案開發報告與系統分析說明
├── package.json                   ← 專案套件依賴設定
└── node_modules/                  ← 相依套件庫（如 express, sharp, simple-git 等）
```

---

## ⚙️ 三、各模組資料儲存與流轉機制

### 1. 作品集資料持久化儲存 (`data.json`)
- **單一信任來源（Single Source of Truth）**：
  網站所有作品（圖文、影音、3D 模型）、作者自傳、經歷時程、技能項目等均不直接寫死在 HTML 原始碼中，而是統一儲存在 [`data.json`](data.json) 內。
- **儲存格式**：
  採用標準 JSON 陣列與物件格式，便於結構化擴充與跨平台讀取。

```text
瀏覽器後台操作 ➔ /api/works API ➔ 寫入 data.json ➔ generator.js 自動編譯 ➔ 覆寫 index.html
```

### 2. 靜態檔案編譯與儲存 (`generator.js`)
- 當透過後台修改或新增作品時，後端會讀取 [`admin/template.html`](admin/template.html)。
- 將 `data.json` 的資料逐一轉譯為標準 HTML DOM 節點，替換模板中的 `{{GRID_CONTENT}}` 與 `{{ABOUT_CONTENT}}` 佔位符。
- 最終將結果覆寫回根目錄的 [`index.html`](index.html)，確保上傳至 GitHub Pages 時無須後端資料庫即可直接呈現。

### 3. 多媒體與圖片快取儲存 (`images/`)
- **雙層儲存策略**：
  - 原始圖檔：保存在 `images/`，保留最佳品質。
  - Web 最佳化縮圖：上傳時由後端呼叫 **Sharp** 圖片引擎，自動壓縮為高效率 WebP / JPEG 格式並存至 `images/thumbs/`，大幅提升前端載入效能。

### 4. 幸運物 3D 網頁的儲存機制 (`lucky-charm/`)
- **程序化幾何儲存（Procedural Geometry）**：
  為避免外部 3D 模型檔案（.obj / .gltf / .fbx）因路徑異動或貼圖遺失產生破圖，**低面數小熊與蘋果皆以 Three.js 幾何原形在程式碼中程序化建構**。
- **Web Audio 記憶體音效儲存**：
  互動過程中的咀嚼脆響、歡呼和弦、彈跳音等，皆以瀏覽器原生 `AudioContext` 透過演算法在記憶體中即時合成震盪頻率，不需儲存或載入任何外部 `.mp3` 檔案。

### 5. 版本控制與遠端儲存 (`Git & GitHub Pages`)
- 專案由本地 Git 進行版本歷程控管。
- 後台內建 `simple-git` 模組，可透過後台介面的「一鍵發佈」將更新後的 `data.json`、`index.html` 及媒體資產自動 commit 並 push 至 GitHub 遠端倉庫，同步部署於 GitHub Pages。

---

## 🚀 四、如何啟動與檢視

### 1. 安裝環境與相依套件
在專案根目錄下開啟終端機（PowerShell / Command Prompt）：
```bash
# 安裝所有必要模組（Express、Sharp 等）
npm install
```

### 2. 啟動本機後台與靜態託管
```bash
# 啟動本地端伺服器（預設 Port 3001）
npm start
```

### 3. 瀏覽網址
- **本地後台管理介面**：[http://localhost:3001](http://localhost:3001)
- **幸運物 3D 互動作業頁面**：[http://localhost:3001/portfolio/lucky-charm/index.html](http://localhost:3001/portfolio/lucky-charm/index.html)
- **作品集首頁（本地版）**：[http://localhost:3001/portfolio/index.html](http://localhost:3001/portfolio/index.html)

---

## 👨‍🎓 五、作者資訊

- **作者**：程正邦（Tony Cheng）
- **學號標記**：`414440642_程正邦`
- **系所學校**：天主教輔仁大學 應用美術學系
- **文件建置時間**：2026 年
