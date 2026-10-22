# TYPHOON-SIM 颱風對台灣影響：原理 3D / 向量互動視覺化工作台

> **學號**：`414440642`  
> **姓名**：`程正邦`（`414440642_程正邦`）  
> **系所**：輔仁大學 應用美術學系  
> **課程**：網頁設計  
> **GitHub Pages 線上展示**：[https://abonla.github.io/web_portfolio/typhoon-workbench/](https://abonla.github.io/web_portfolio/typhoon-workbench/)

---

## 🌐 線上即時展示與驗收矩陣

| 頁面 / 報告單元 | 說明 | 線上 GitHub Pages 快速入口 |
| :--- | :--- | :--- |
| **🚀 主作品工作台** | 核心 3D 地形沙盤、氣旋模擬、音效與截圖 | [點此開啟主作品 (index.html)](https://abonla.github.io/web_portfolio/typhoon-workbench/index.html) |
| **📊 視覺化審查儀表板** | 規準量化評分、圖表雷達、架構驗收驗證 | [點此開啟儀表板 (review.html)](https://abonla.github.io/web_portfolio/typhoon-workbench/review.html) |
| **🔍 原始碼精確透視鏡** | 五大核心模組之原始程式碼高亮與關鍵行標記 | [點此開啟透視鏡 (pointout.html)](https://abonla.github.io/web_portfolio/typhoon-workbench/pointout.html) |
| **📑 工程決策報告** | 底層物理原理、效能預算與渲染三階段解析 | [檢視 response.md](response.md) |
| **✅ 自評量化評分表** | 四階段深度自評規準與落證檢核表 | [檢視 check.md](check.md) |

---

## 📌 一、專案核心理念與設計亮點

本專案為輔仁大學應用美術學系網頁設計課程之**「原理 3D / 向量動畫 Web 單頁應用」**專題作品。以中央氣象署氣象科學數據為基礎，解構颱風在台灣海峽與中央山脈地形間的流體力學與熱力學效應。

### 🌟 五大核心技術亮點

1. **模組 1：多媒體傳輸最佳化 (Payload Optimization)**
   - 全向量 SVG 幾何描繪本島地貌，無多餘重型外部位圖。
   - 示範 `<picture>` 標籤自動協商載入 **AVIF ➔ WebP ➔ Fallback**，並配置 `srcset 1x/2x` 與延遲載入 `loading="lazy"`，網路頻寬體積節省達 **84%**。

2. **模組 2：SVG Stroke Dashoffset 動畫技術**
   - 繪製 48 小時颱風行徑全路徑虛線導引，實時行經路徑採用 `stroke-dasharray` 與 `stroke-dashoffset` 達成 60 FPS 平滑勾勒。
   - 包含外圍逼近、越嶺登陸與海峽副低壓三大關鍵航路節點。

3. **模組 3：真正的 3D 台灣立體地形沙盤 (True 3D Topographic Massif)**
   - 徹底跳脫傳統 2D 扁平貼圖，以 DOM 空間分層建置真實 `transform: translateZ` 高程體系：
     - **海岸平原基座 (0m~500m)**：$Z = 14\text{px}$（含立體側厚沙盤裙層）
     - **丘陵與海岸山脈 (500m~1500m)**：$Z = 28\text{px}$
     - **雪山與中央山脈腹地 (1500m~2800m)**：$Z = 44\text{px}$
     - **百岳險峻高山脊樑 (2800m~3500m)**：$Z = 60\text{px}$
     - **玉山核心巨峰金字塔 (3500m~3952m)**：$Z = 78\text{px}$
     - **大氣層颱風氣旋盤**：$Z = 92\text{px}$
   - **玉山主峰地理位置精確校正**：坐標精準座落於中台灣脊樑核心 $(X = 104, Y = 250)$（北回歸線南側、南投嘉義交界），四向立體稜線輻射延伸，並附帶垂直 3D 全息雷射光柱與 HUD 數據銘牌。

4. **模組 4：3D 滑鼠鏡位旋轉與自由縮放 (Orbit & Zoom Controls)**
   - 滑鼠左鍵拖曳 360° 自由環繞旋轉（水平方位角與垂直俯仰角，自帶 $10^\circ \sim 85^\circ$ 防翻轉保護）。
   - 滑鼠滾輪無段平滑縮放（$0.5\times \sim 2.5\times$）。
   - 提供「⟲ 視角重置」鍵與等角 2.5D / 透視 3D / 平面 2D 一鍵切換。

5. **模組 5：純原生 Web Audio API 與高解析 3D 截圖引擎**
   - 零外部音效檔依賴，由瀏覽器底層音訊合成器（OscillatorNode + BiquadFilterNode）實時合成開關點擊音、磁吸回饋音與和弦完成聲。
   - 實裝 $1600 \times 1050$ 高解析度 3D 沙盤快照導出引擎，自動以當前相機傾角與視角渲染發光底座與未截斷 HUD 水印，一鍵自動下載 PNG。

---

## 🛠️ 二、本地預覽與開發指令

本專案採單一檔案高度內聚封裝架構，支援任何靜態網頁伺服器：

```bash
# 切換至專案目錄
cd typhoon-workbench

# 啟動微型預覽伺服器
node server.js
# 預覽伺服器將在 http://localhost:5173 運行
```

---

## 📂 三、檔案架構

```text
typhoon-workbench/
├── README.md                      ← 專案成果與線上展示說明文件（本檔）
├── index.html                     ← 3D 颱風視覺化工作台主程式 (包含完整 CSS/SVG/JS)
├── review.html                    ← 四階段規準量化評分與視覺化審查儀表板
├── pointout.html                  ← 原始碼精確落證透視鏡 (模組程式碼高亮比對)
├── response.md                    ← 工程決策與物理底層機制深度剖析報告
├── check.md                       ← 規準量化評分檢核自評表
└── server.js                      ← 本地開發預覽專用 Node.js HTTP 伺服器
```

---

© 2026 程正邦 (414440642) 輔仁大學應用美術學系 網頁設計專案成果
