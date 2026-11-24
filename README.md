# 詩詞閱讀本地網頁文檔 — 技術實現指南

本專案是一套零外部依賴、可離線於 `file://` 直接開啟的古典詩詞本地閱讀文檔。本文整理其核心架構與前端技術要點，方便作為類似靜態閱讀器或古籍網頁文檔的實作參考。

---

## 1. 設計原則

- **Single-File Portable Output**：由建置腳本將 HTML、CSS、JS 與詩歌內容打包成單一獨立的 `index.html`，無外部字型、CDN 或本地伺服器依賴，複製單一檔案即可在任何裝置離線閱讀。
- **Progressive Enhancement & Minimal JS**：版面、目錄分類折疊、錨點跳轉、系統晝夜主題、響應式排版與設置面板開合皆以原生 HTML / CSS 實現；JavaScript 僅用於搜尋篩選、點擊逐行顯現與參數記憶。停用 JS 時全文仍完整可讀。
- **`file://` 相容性**：避免使用 `fetch()` 載入本地 JSON 與 `<script type="module">`（兩者在 `file://` 下均會觸發瀏覽器 CORS 限制），改採建置期靜態內嵌與傳統 IIFE 腳本。

---

## 2. 檔案結構與資料格式

```text
.
├── data/
│   └── tangshi300.json   # 結構化詩歌資料源（UTF-8 繁體中文）
├── style.css             # 排版、主題、響應式與遮罩淡入樣式
├── search.js             # 目錄搜尋、點擊顯現與設置同步（原生 JS）
├── build.py              # Python 3 標準函式庫建置腳本
├── index.html            # 建置產出之單檔獨立閱讀文檔
└── fade-demo.html        # 三種淡入方案與速度參數的互動測試頁
```

### 資料前處理要點（`data/source.json`）

```json
{
  "id": "p008",
  "title": "山中送別",
  "alt_title": "送別",
  "author": "王維",
  "category": "五言絕句",
  "lines": [
    "山中相送罷，日暮掩柴扉。",
    "春草明年綠，王孫歸不歸？"
  ],
  "notes": ["明年 一作：年年"]
}
```

- **異文分離**：將正文內嵌的 `(一作：...)` 抽離至獨立 `notes` 欄位，避免破壞詩句居中對稱。
- **聯句正規化**：將同一段落中合併的多聯拆分為「每聯一行」，同時保留單聯內含問號／驚嘆號的結構（如「鄉書何處達？歸雁洛陽邊。」）。
- **簡繁校對**：針對常見簡轉繁自動轉換誤字（如松／鬆、斗／鬥、征／徵、乾／幹、里／裏、鐘／鍾、髮／發、余／餘）與半形標點進行批量修正。

---

## 3. 版面架構與單首滿版定位

### 雙欄獨立捲動佈局與左滑隱藏目錄
- 容器 `.layout` 使用 CSS Flex（`height: 100dvh; overflow: hidden`），使左側 `.sidebar`（固定寬度 `17.5rem`）與右側 `.reader`（`flex: 1 1 auto; min-width: 0`）各自獨立捲動。
- **左滑隱藏與純 CSS 開關**：以隱藏的 `<input type="checkbox" id="sidebar-toggle">` 搭配 `<label>` 控制側欄狀態，不依賴 JS 即可點擊收合／展開。桌面端透過 `margin-inline-start: calc(-1 * var(--sidebar-width))` 向左滑出並讓閱讀區平滑擴展至全螢幕居中；窄視窗（`<= 760px`）則切換為 `position: fixed` 左側抽屜並以 `translateX(-100%)` 滑出。
- **手勢整合**：透過 `touchstart/touchmove/touchend` 支援觸控即時跟手左滑隱藏與左緣右滑呼出（並排除設置滑桿避免誤觸），另以 `wheel` 水平位移偵測支援筆記本觸控板雙指左滑隱藏。

### 單首滿版居中 ＋ 連續滾動
- 在捲動容器 `.reader` 上設定 `container-type: size` 且 `padding-block: 0`，使 `100cqh` 精準等於閱讀區當下的可視高度（同時適配桌面滿版與窄視窗扣除目錄後的剩餘高度）。
- 每首詩 `.poem` 設定：
  ```css
  min-height: 100dvh; /* fallback */
  min-height: 100cqh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  scroll-margin-top: 0;
  ```
- **效果**：
  - 點擊目錄錨點 `#p001` 時，短詩獨佔整個可視區域且垂直／水平居中；長詩（如《長恨歌》）因使用 `min-height` 而自然向下延伸，詩題不會被裁切。
  - 不使用強制 `scroll-snap`，保留滑鼠滾輪／觸控板平滑連續翻閱下一首的體驗。
  - **避坑**：移除 `content-visibility: auto`，避免遠距離錨點跳轉時因預估高度與實際 `100cqh` 不一致導致定位偏移或捲軸跳動。

---

## 4. 中文詩詞居中排版與斷句換行

- **斷句原子化**：建置時依標點（`，`、`；`、`：`、`？`、`！`）將每聯切分為 `<span class="clause">`，套用 `display: inline-block; max-width: 100%;`。
  - 寬螢幕時上下句並排於同一行居中；窄螢幕時只於標點處換行，不會在詞句中間斷裂。
- **標點視覺居中補償**：全形句末標點右側帶有空白，容易使整行視覺偏左。透過 `.verse { padding-inline-start: 0.45em; hanging-punctuation: allow-end; }` 微調視覺重心。
- **字體棧**：正文採用系統內建襯線宋體棧（`"Songti TC", "Source Han Serif TC", "Noto Serif TC", "STSong", "PMingLiU", Georgia, serif`），側欄 UI 採系統無襯線體，兼顧古典韻味與離線可用性。

---

## 5. 點擊漸層遮罩淡入（CSS Mask Wipe）與設置面板

### 為何選用 CSS Mask Wipe（而非逐字拆 DOM）
全集 320 首詩合計約 3 萬字；若將每字拆為獨立 `<span>`，靜態 HTML 會膨脹 4–5 倍且新增數萬個 DOM 節點。改以每句 `<span class="clause">` 套用移動式線性漸層遮罩（搭配 `-webkit-mask-*` 前綴兼容 Safari），可做到**零額外 DOM、不影響選字複製與 `Cmd+F` 搜尋**，同時呈現由左至右平滑顯現的閱讀節奏：

```css
@keyframes maskWipe {
  from { -webkit-mask-position: 100% 0; mask-position: 100% 0; }
  to   { -webkit-mask-position: 0% 0;   mask-position: 0% 0; }
}

.js-reveal .verse.is-revealed .clause {
  -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 42%, transparent 58%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 0%, #000 42%, transparent 58%, transparent 100%);
  -webkit-mask-size: 260% 100%;
  mask-size: 260% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  animation: maskWipe max(var(--scan-dur, 2500ms), 1ms) ease-out both;
  animation-delay: calc(var(--clause-i, 0) * var(--scan-delay, 1250ms));
}
```

- **漸層寬度計算**：`mask-size: 260% 100%` 配 `42% / 58%` 斷點，確保起點（`100% 0`）全透明、終點（`0% 0`）全不透明，中間保留柔和羽化邊緣。
- **0ms 邊界保護**：以 `max(var(--scan-dur), 1ms)` 避免將時長設為 `0ms` 時部分瀏覽器跳過動畫終態導致文字未顯現。
- **漸進增強與無障礙**：隱藏規則限定於 `.js-reveal` 之下（由 JS 啟動時加在 `<html>`）；在無 JS、`@media print` 與 `@media (prefers-reduced-motion: reduce)` 下皆自動回退為直接可見。

### 單擊觸發與事件委派
- 在 `#reader` 綁定單一 `click` 事件委派（取代為 2,000+ 行個別綁定監聽器），相容滑鼠單擊與觸控螢幕點按。
- 隱藏狀態不繪製佔位線，保留原始行高避免版面跳動；點擊該首詩頁面區域任意位置（含寬螢幕左右留白，且非拖曳選字 `window.getSelection().toString()`）一律嚴格依詩篇原本先後順序逐行淡入下一句，避免誤點下方區域導致後句提前出現。

### 側欄底部設置面板
- 以原生 `<details class="settings-panel">` 固定於側欄底部，無需 JS 控制開合。
- 透過 CSS Custom Properties `--scan-dur`（單句掃描，預設 `2500ms`，範圍 `0–10000ms`）與 `--scan-delay`（上下句延遲，預設 `1250ms`，範圍 `0–10000ms`）即時生效，滑桿與數字輸入框雙向同步；另附「**背景明暗呼吸**」開關及「**呼吸週期**」（`2–60s`，預設 `12s`）與「**明暗幅度**」（`1–30%`，預設 `6%`）調整項，採獨立 GPU 合成層 `body::before` 均勻純色僅動畫 `opacity`（配合 2-stop `alternate` 正弦曲線與微暖色偏，避免主執行緒重繪與徑向漸層 8-bit 環帶，在低電量模式下亦保持流暢），所有設定皆以 `try/catch` 包裹 `localStorage` 持久化。

---

## 6. 左側目錄與即時搜尋

- **純 HTML 目錄**：以 `<details class="toc-group" open>` 分組收合各體裁，詩目使用 `<a href="#p001">` 跳轉。
- **輕量多關鍵字檢索**：建置期將每首詩的「詩題＋異名＋作者＋體裁＋正文」預寫於 `<li data-q="...">`。搜尋時將輸入以空白切分多關鍵字（AND 匹配），以原生 `hidden` 屬性切換顯示、自動展開命中分組，並支援 `Enter` 跳轉首筆結果與 `Esc` 一鍵清除。

---

## 7. 系統晝夜主題與列印

- `<head>` 加入 `<meta name="color-scheme" content="light dark">`，`:root` 宣告 `color-scheme: light dark`，讓原生捲軸、搜尋框清除鈕與初始畫布同步跟隨系統明暗模式，避免夜間開啟時白屏閃爍。
- 配色集中於 CSS Custom Properties，在 `@media (prefers-color-scheme: dark)` 中切換為低對比暖墨石色系，減少長時間閱讀疲勞。
- `@media print` 隱藏側欄、解除 `100cqh` 滿版與遮罩隱藏，確保列印或輸出 PDF 時內容完整緊湊。

---

## 8. 建置與擴充方式

修改 `data/tangshi300.json`、`style.css` 或 `search.js` 後，於專案根目錄執行：

```bash
python3 build.py
```

即可重新產生包含完整樣式與腳本的單檔 `index.html`。若需實驗不同的動畫策略或節奏參數，可直接開啟 `fade-demo.html` 進行對照微調。
