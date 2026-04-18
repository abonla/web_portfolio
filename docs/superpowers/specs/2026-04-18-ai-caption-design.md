# AI 說明生成功能 設計文件

**Goal:** 在後台新增「✨ AI 生成」按鈕，讓使用者上傳圖片或編輯現有作品時，可一鍵呼叫 Gemini Vision 生成中英文說明、建議分類、建議 Fancybox 群組。

**Architecture:** 後端新增 `/api/ai/caption` 端點代理呼叫 Gemini API，API key 保留在伺服器端不暴露於前端。`data.json` 每筆作品新增 `captionEn` 欄位，`generator.js` 將英文說明寫入 HTML data attribute，供未來中英切換使用。

**Tech Stack:** Gemini 2.0 Flash（`gemini-2.0-flash`）、Node.js fetch、Gemini REST API（`generativelanguage.googleapis.com`）

---

## 資料模型變更

`data.json` 每筆 `works` 項目新增選填欄位：

```json
{
  "id": "...",
  "type": "image",
  "caption": "中文說明",
  "captionEn": "English caption",
  "categories": ["PHOTO"],
  "fancyboxGroup": "nature"
}
```

`captionEn` 為選填，舊資料不填視為空字串，不影響現有功能。

---

## 後端

### 新路由：`admin/routes/ai.js`

**端點：** `POST /api/ai/caption`

**Request body：**
```json
{ "imagePath": "images/photo01.jpg" }
```

`imagePath` 為相對於專案根目錄的路徑。後端讀取檔案、轉 base64、附上 MIME type，組成 Gemini multipart request。

**Prompt（固定）：**
```
這是一張作品集圖片。請用繁體中文和英文各寫一句簡短說明（20字以內），
並從以下分類中選出最符合的一個或多個：DRAW、DESIGN、PHOTO、VIDEO、WEB、3D、NEWS。
同時建議一個 Fancybox 群組名稱（英文小寫，如 nature、portrait、poster）。
請以 JSON 格式回傳，欄位為 captionZh、captionEn、categories（陣列）、fancyboxGroup。
只回傳 JSON，不要其他文字。
```

**Response：**
```json
{
  "captionZh": "城市夜景攝影",
  "captionEn": "City night photography",
  "categories": ["PHOTO"],
  "fancyboxGroup": "cityscape"
}
```

**錯誤處理：**
- 檔案不存在 → 400
- Gemini 回傳非 JSON → 500，回傳 `{ error: "AI 回傳格式錯誤" }`
- API key 未設定 → 500，回傳 `{ error: "GEMINI_API_KEY 未設定" }`

**API key 來源：** `process.env.GEMINI_API_KEY`（已在 `~/.claude/settings.json` env 區塊設定，server 啟動時自動注入）

### 修改：`admin/routes/works.js`

`PUT /api/works/:id` 已支援任意欄位更新，無需修改。

### 修改：`admin/lib/generator.js`

`buildWorksHTML` 產生圖片 grid item 時，若 `captionEn` 存在則加上 data attribute：

```html
<div class="grid-item" data-caption-en="English caption" ...>
```

---

## 前端

### 修改：`admin/public/upload-image.js`

圖片載入 Cropper.js 後，說明文字欄（`<input id="caption">`）旁新增按鈕：

```html
<button id="btn-ai-gen" type="button">✨ AI 生成</button>
```

按鈕行為：
1. 顯示 loading 狀態（按鈕文字改為「生成中…」，disabled）
2. 呼叫 `POST /api/ai/caption`，傳入已上傳圖片的路徑（upload 完成後 server 回傳的 `src`）
3. 成功後：
   - `#caption` 填入 `captionZh`
   - `#caption-en`（新增隱藏欄位）填入 `captionEn`
   - 分類 chips 依 `categories` 自動勾選
   - `#fancybox-group` 填入 `fancyboxGroup`
4. 失敗後：按鈕旁顯示錯誤訊息

**時機限制：** 圖片尚未上傳時按鈕為 disabled（需先上傳才有路徑可傳給後端）。

新增英文說明欄位（置於中文說明欄位正下方）：

```
說明（中文）  [________________] [✨ AI 生成]
說明（英文）  [________________]
```

### 修改：`admin/public/works.js`

每張作品卡片右上角動作區增加「✨」按鈕（與刪除按鈕並排）。

點擊流程：
1. 按鈕顯示 loading
2. 呼叫 `POST /api/ai/caption`，傳入該作品的 `src`（圖片路徑）
3. 彈出確認 modal，顯示 AI 建議內容：
   ```
   說明（中）：城市夜景攝影
   說明（英）：City night photography
   分類：PHOTO
   群組：cityscape
   ```
   兩個按鈕：「套用」/ 「取消」
4. 按「套用」→ 呼叫 `PUT /api/works/:id`，更新 caption / captionEn / categories / fancyboxGroup

**限制：** 只對 `type === 'image'` 的作品顯示此按鈕（影片和 3D 模型無圖片檔可分析）。

---

## 不在此次範圍內

- 網站前台的中英切換按鈕（另立專案）
- 批次對所有作品生成（手動逐一操作即可）
- 影片 / 3D 模型的 AI 說明生成
