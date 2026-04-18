# Portfolio Admin Backend — Design Spec

**Date:** 2026-04-18  
**Project:** web_portfolio (Tony Cheng's Portfolio, GitHub Pages)  
**Status:** Approved

---

## Overview

A local Node.js admin tool that lets the owner manage the portfolio website through a browser UI at `http://localhost:3001`. Changes are stored in `data.json` and auto-regenerate `index.html`. A one-click publish button commits and pushes to GitHub, triggering automatic GitHub Pages deployment.

---

## Constraints

- Site is static HTML hosted on GitHub Pages — no server runtime in production
- All admin work happens on the owner's local machine
- Existing `index.html` structure, CSS, and JS must remain functionally intact
- Image naming convention: original `filename.jpg`, thumbnail `filenamem.jpg`
- YouTube facade pattern (`yt-facade` + `data-vid`) must be preserved

---

## Architecture

### Runtime

| Layer | Technology |
|---|---|
| Admin server | Node.js + Express |
| Admin UI | Vanilla JS served from `admin/public/` |
| Image processing | Sharp (resize, compress, apply crop) |
| Crop UI | Cropper.js (in browser) |
| HTML generation | Custom generator script (`admin/generator.js`) |
| Git operations | `simple-git` npm package |
| Content store | `data.json` at repo root |

### File Structure (additions only)

```
web_portfolio/
├── admin/
│   ├── server.js            # Express server (port 3001)
│   ├── public/
│   │   ├── index.html       # Admin UI shell
│   │   ├── app.js           # Admin frontend JS
│   │   └── style.css        # Admin styles
│   ├── generator.js         # data.json → index.html
│   └── template.html        # index.html static scaffold (nav, head, footer)
├── data.json                # All content (works, about, meta)
├── index.html               # Auto-generated — do not edit manually
├── images/                  # Originals + thumbnails (*m.jpg)
├── package.json
└── .gitignore               # Add: node_modules/, admin/node_modules/
```

### Starting the Admin

```bash
npm start
# Opens http://localhost:3001 in default browser
```

---

## Data Model (`data.json`)

```json
{
  "works": [
    {
      "id": "uuid-v4",
      "type": "image",
      "src": "images/filename.jpg",
      "thumb": "images/filenamem.jpg",
      "caption": "說明文字",
      "categories": ["painter", "digital"],
      "fancyboxGroup": "painter",
      "order": 0
    },
    {
      "id": "uuid-v4",
      "type": "video",
      "videoId": "g53iDkd2XT4",
      "caption": "",
      "categories": ["video"],
      "order": 1
    }
  ],
  "about": {
    "photo": "images/獨照.jpg",
    "name": "程正邦（Tony）",
    "currentTitle": "三立新聞網 編輯組副組長",
    "education": "輔仁大學大傳所、銘傳大學大傳系、復興商工美工科",
    "phone": "0905579995",
    "email": "abon8820@gmail.com",
    "facebook": "https://www.facebook.com/chengpang.cheng",
    "instagram": "https://www.instagram.com/abonla/",
    "bio": "自我介紹長文…",
    "skills": [
      { "name": "新聞攝影", "stars": 5 },
      { "name": "採訪寫作", "stars": 4 }
    ],
    "workExperience": [
      {
        "period": "2024/4～現在",
        "company": "三立新聞網",
        "title": "編輯組副組長"
      }
    ],
    "timeline": [
      {
        "id": "uuid-v4",
        "date": "2025-06-04",
        "institution": "復興商工美工科",
        "heading": "品學兼優畢業獲表揚",
        "body": "內文段落（可含 HTML 連結）",
        "image": "images/復興美工畢業展.jpg",
        "footer": ""
      }
    ]
  },
  "meta": {
    "siteTitle": "程正邦作品集",
    "description": "一個熱愛學習的中年大叔…",
    "ogImage": "images/web02.png"
  }
}
```

---

## Admin UI — Pages

### 1. Works Management (`/`)

- Masonry-style card grid of all works (image + video)
- Filter tabs: ALL / DESIGN / DRAW / PHOTO / VIDEO / WEB / 3D / NEWS
- Each card shows: thumbnail, caption preview, category tags, Edit / Delete buttons
- **Add Work** button opens upload panel (image) or YouTube panel (video)
- Card delete triggers confirmation before removing from `data.json` and deleting image files

### 2. Image Upload & Crop Panel

**Upload step:**
- Drag-and-drop zone or file picker (JPG, PNG, WebP)
- File appears in Cropper.js canvas immediately after selection

**Crop step:**
- User adjusts crop rectangle freely (no fixed aspect ratio enforced)
- "縮圖預覽" button shows what the thumbnail will look like
- "重設裁切" resets to full image

**Server processing (on submit):**
- Original: resized to max 1600px wide, compressed to ≤ 85% JPEG quality → `images/filename.jpg`
- Thumbnail: crop region applied, resized to max 600px wide → `images/filenamem.jpg`
- Both written to `images/`, then `data.json` updated, then `index.html` regenerated

**Metadata fields (same panel):**
- Caption textarea
- Category chips (multi-select): painter, digital, sketch, water, ink, oil, cis1–cis7, photo, web, three, news
- FancyBox group (auto-derived from primary category, editable)

### 3. YouTube Video Panel

- URL input field (accepts `youtube.com/watch?v=`, `youtu.be/`, full or short)
- Auto-extracts video ID on input
- Shows YouTube CDN thumbnail preview (`mqdefault.jpg`) immediately
- No local download of thumbnail — uses CDN at runtime
- Saves `{ type: "video", videoId, caption, categories: ["video"] }` to `data.json`

### 4. About — 4 Sub-tabs

**基本資料:**
- Profile photo upload (cropped to square, displayed as circle in site)
- Name, current title, education, phone, email, Facebook URL, Instagram URL
- Bio textarea (plain text with line breaks preserved)

**技能:**
- Editable list: skill name + 1–5 star rating (click to set)
- Add / delete rows
- Drag to reorder

**工作經歷:**
- Inline editable table: period | company | title
- Add row (prepends to top) / delete row
- Order is manual (drag handle)

**學習歷程:**
- Collapsible cards, one per timeline entry
- Fields: date (YYYY-MM-DD), institution name, heading, body text (HTML allowed for links), image upload, footer note
- Entries sorted by date descending in the UI; generator sorts ascending for the timeline plugin
- Add / delete entries

### 5. Site Settings (`/settings`)

- Site title, meta description, OG image upload

---

## HTML Generator (`admin/generator.js`)

Reads `data.json` and writes `index.html` by:
1. Loading `admin/template.html` (static scaffold: `<head>`, nav, footer, scripts — everything except the grid items)
2. Iterating `data.works` to produce `.grid-item` divs in order
3. Rendering the About block from `data.about` (personal info, skills table, work experience table, timeline `data` array inline in `<script>`)
4. Writing the result to `index.html` at repo root

**Generator is called automatically after every save action** — the user never runs it manually.

---

## One-Click Publish

Button in top navbar shows badge count of unsaved-to-git changes (tracked by comparing git status).

On click:
1. `git add -A`
2. `git commit -m "Update portfolio: <auto-summary>"` — auto-summary lists counts: e.g., "新增 2 張插畫、刪除 1 支影片"
3. `git push origin main`
4. Terminal output streamed to a log panel in the UI
5. On success: badge clears, shows "GitHub Pages 更新中…"
6. On failure: error message shown with full git output

---

## Image Processing Rules

| Output | Max dimension | Quality | Naming |
|---|---|---|---|
| Original | 1600px wide | JPEG 85% | `filename.jpg` |
| Thumbnail | 600px wide | JPEG 80% | `filenamem.jpg` |

- PNG inputs converted to JPEG unless they have transparency (kept as PNG)
- WebP inputs converted to JPEG for browser compatibility
- Crop is applied before thumbnail resize; original is resized without crop
- Filenames: slugified from original filename, with timestamp suffix if conflict (`filename-1713456789.jpg`)

---

## Migration: Existing Content → data.json

Before first use, a one-time migration script (`admin/migrate.js`) is run:
1. Parses the existing `index.html` to extract all `.grid-item` divs
2. Extracts image `src`, `data-caption`, CSS classes into `data.works`
3. Extracts the `data` array from `index.js` into `data.about.timeline`
4. Extracts work experience table rows into `data.about.workExperience`
5. Writes `data.json`
6. Runs generator to verify round-trip produces equivalent HTML

Migration is a one-shot script, not part of the ongoing admin.

---

## Error Handling

- Upload fails (file too large, wrong type): inline error in drop zone
- Git push fails (auth, network): full error shown in log panel, no partial state
- Generator fails: error logged, `index.html` not overwritten
- Invalid YouTube URL: inline validation before save

---

---

## 3D Model Management

### How it works

Each 3D model is a self-contained Three.js viewer (`model/modelname.html`) that loads an `.obj` + `.mtl` + texture files from the same directory. The viewer is embedded as a full-width `<iframe>` in the main grid.

### Upload flow

1. User uploads a **zip file** containing the model files:
   - `modelname.obj`
   - `modelname.mtl`
   - Texture files (PNG / JPG, referenced inside the `.mtl`)
2. Server extracts zip to `model/` directory (flat, all files at `model/` level)
3. Server generates `model/modelname.html` from a shared viewer template — camera uses `frameArea()` to auto-fit the model's bounding box (same logic as existing viewers)
4. Entry added to `data.json` as `{ type: "three", src: "model/modelname.html", label: "模型名稱", categories: ["three"] }`
5. `index.html` regenerated

### Viewer template

The generated HTML is identical to existing `doll.html` structure, with the model filename parameterised:

```js
mtlLoader.load('{{modelname}}.mtl', ...)
objLoader.load('{{modelname}}.obj', ...)
```

Camera position uses the automatic `frameArea()` bounding-box fit. The user can preview in the admin before publishing; if the framing is unsatisfactory, they delete and re-upload.

### Data model entry

```json
{
  "id": "uuid-v4",
  "type": "three",
  "src": "model/doll.html",
  "label": "娃娃",
  "categories": ["three"],
  "order": 0
}
```

### Admin UI

- Same Works list shows 3D entries with a `[3D]` badge and an iframe thumbnail (static screenshot not available — shows a placeholder cube icon)
- **Add 3D Model** button opens upload panel: zip drop zone + label field
- Delete removes the `.html` and all associated model files from `model/`
- No edit after upload — to update a model, delete and re-upload

### Limitations

- Camera auto-fit produces good-enough framing for most models; hand-tuned positions from existing viewers are not migrated
- Zip must contain exactly one `.obj` and one `.mtl` at root level; nested folders not supported
- Large model files (`.obj` > 20MB) may slow down git push

---

## Out of Scope

- Authentication (local tool, single user)
- Cloud hosting of the admin
- Real-time preview pane of the live site
- Drag-to-reorder works in the grid (can add later)
- PDF upload management
