# 作品集網站效能優化報告

> **專案**：Tony Cheng Portfolio — https://abonla.github.io/web_portfolio/
> **優化日期**：2026-04-13
> **優化項目數**：4 項
> **涉及 Commit**：`375e43a` · `1c45f84` · `20aeaa6`

---

## 一、問題診斷

網站在手機幾乎無法開啟，桌機也載入緩慢，根本原因有三：

| # | 問題 | 影響 |
|---|------|------|
| 1 | **縮圖未壓縮**，226 張縮圖平均 130 KB，最大 653 KB | 頁面下載量過大，手機 4G 需數十秒 |
| 2 | **Masonry 每張圖觸發一次重排**，最多 200+ 次 CPU 計算 | 手機 CPU 過載，頁面凍結 |
| 3 | **53 個 YouTube iframe 同時載入** | 頁面建立 53 條外部連線，影片顯示空白或錯誤 |

---

## 二、優化項目

### 優化 1 — 縮圖批次壓縮

**Commit**：`375e43a`
**工具**：Python Pillow，JPEG quality = 70，最大寬度 600px

**方式**：
- 對所有縮圖（`*m.jpg`、`*m.png`、`*小.jpg`、`*s.jpg`）重新壓縮
- PNG 無透明度者轉為 JPEG
- 保留原始高解析圖（僅於點擊 Fancybox 後才下載）

**成果**：

```
壓縮前：~32 MB（246 個縮圖檔案）
壓縮後：~12 MB（246 個縮圖檔案）
節省：20 MB（降低 62%）
```

單張最大縮圖：653 KB → 70 KB（-89%）

---

### 優化 2 — Masonry 排版 Debounce

**Commit**：`375e43a`
**檔案**：`js/index.js`

**問題根源**：
```js
// 舊版：每張圖片載入就觸發一次排版（200+ 次）
$grid.imagesLoaded().progress(function () {
    $grid.masonry();
});
```

**修正後**：
```js
// 新版：200ms 內所有事件批次合併，只觸發一次排版
var layoutTimer;
$grid.imagesLoaded().progress(function () {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(function () {
        $grid.masonry('layout');
    }, 200);
});
```

**成果**：頁面載入期間排版計算次數從 200+ 次降至個位數，手機 CPU 負擔大幅減輕。

---

### 優化 3 — YouTube Facade 模式

**Commit**：`1c45f84`
**檔案**：`index.html`、`css/index.css`、`js/index.js`

**問題根源**：
- 53 個 `<iframe>` 在頁面載入時同時發起 YouTube 連線
- `file://` 本地協定被 YouTube 拒絕嵌入
- 手機頁面需建立 53 條外部網路連線

**修正方式**：將所有 iframe 改為「縮圖 + 播放按鈕」Facade，點擊後才動態插入 iframe。

```
頁面載入：53 張 YouTube 縮圖（i.ytimg.com，各約 5 KB）
使用者點擊：插入 youtube-nocookie.com iframe + autoplay=1
```

**成果**：
- 頁面載入期間 YouTube 連線：53 條 → **0 條**
- 頁面初始下載量減少約 **2–5 MB**（各 iframe 的 HTML/JS/CSS）
- 影片正常顯示（不再出現「觀看 YouTube」空白問題）

---

### 優化 4 — 點擊影片排版不跑版

**Commit**：`20aeaa6`
**檔案**：`css/index.css`、`js/index.js`

**問題根源**：
Facade 點擊後用 `replaceWith(iframe)` 直接替換 DOM 節點，iframe 高度（220px）與縮圖高度不同，導致 Masonry 重新計算後整頁跑版。

**修正方式**：使用 `padding-bottom: 56.25%` 固定 16:9 容器，iframe 以 `position: absolute` 填滿同一容器，容器高度前後一致。

```
點擊前：.yt-facade（padding-bottom: 56.25%）
           └── <img>（position: absolute，填滿）
           └── <button>播放鍵

點擊後：.yt-playing（padding-bottom: 56.25%，高度完全相同）
           └── <iframe>（position: absolute，填滿）
```

**成果**：點擊播放後 Masonry 排版完全不變，不需要觸發重排。

---

## 三、優化成果總覽

| 指標 | 優化前 | 優化後 | 改善幅度 |
|------|--------|--------|----------|
| 縮圖總下載量 | ~32 MB | ~12 MB | **-62%** |
| 單張最大縮圖 | 653 KB | ~70 KB | **-89%** |
| 頁面載入 YouTube 連線數 | 53 條 | 0 條 | **-100%** |
| Masonry 排版計算次數 | 200+ 次 | 個位數 | **-95%+** |
| 點擊影片是否跑版 | 是 | 否 | 修正 |
| 本機預覽影片是否顯示 | 否 | 顯示縮圖 | 修正 |

---

## 四、技術補充

### 為何縮圖大小影響手機最嚴重？

手機使用 4G/LTE，理論速度約 20–50 Mbps，但實際穩定速率往往只有 5–15 Mbps。
壓縮前縮圖 32 MB，手機需 17–51 秒才能載完所有縮圖；
壓縮後 12 MB，縮短至 6–19 秒，加上 `loading="lazy"` 只載入可見區域，體感更快。

### `loading="lazy"` 已存在，為何還需壓縮？

`loading="lazy"` 延遲下載視窗外的圖片，但視窗內的圖片仍立即下載。
首屏若有 10 張縮圖，壓縮前需下載 1.3 MB，壓縮後只需 ~0.7 MB，
首次顯示時間（FCP）直接受益。

### YouTube `youtube-nocookie.com` 的用途

取代 `www.youtube.com` 的隱私增強版 embed，不在使用者未互動前設置追蹤 Cookie，
對嵌入限制也略寬鬆，更適合用於 Facade 模式的動態載入。

---

*報告生成日期：2026-04-13*
