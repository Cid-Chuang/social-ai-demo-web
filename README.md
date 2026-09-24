# 社群經營 AI 助手 · 能力展示前端

對外示範用的唯讀展示前端，實作《展示前端_功能需求文件》中的 P0 功能：

1. **問答展示** —— 依知識庫回答問題，並列出實際引用的文件與原文片段
2. **檔期貼文生成** —— 依指定檔期生成貼文；檔期已過期或尚未開始時，清楚顯示拒絕原因

這不是操作後臺，畫面上不存在任何發佈到 FB / LINE 的功能。

> **關於需求文件**
> 《展示前端_功能需求文件》是內部文件，不在本 repo 內。本 README 與 `CLAUDE.md`
> 中對它的引用（`../docs/展示前端_功能需求文件.md`）是內部工作目錄的路徑，
> clone 本 repo 不會取得該檔案。文件中的規格與驗收標準已盡可能反映在本 README
> 與程式碼註解中。

## 技術棧

React 19 · TypeScript · Vite · Tailwind CSS v4 · 台北黑體（自行託管）

## 開始開發

```bash
npm install
cp .env.example .env.local   # 首次執行
npm run dev                  # http://localhost:5173
```

## 環境變數

| 變數 | 說明 |
|---|---|
| `VITE_API_BASE_URL` | 後端服務位址。程式中不寫死任何網址。 |
| `VITE_USE_MOCK` | `true` 時使用前端內建的展示資料，不發出網路請求；`false` 時呼叫 `VITE_API_BASE_URL`。 |

後端就緒後，把 `.env.local` 的 `VITE_USE_MOCK` 改為 `false` 並填入實際網址即可，元件不需要任何改動。

## 指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm run build` | 型別檢查 + 產出 `dist/` |
| `npm run preview` | 預覽 build 產物 |
| `npm run typecheck` | 只做型別檢查 |

## 專案結構

```
src/
├── api/
│   ├── types.ts    API 合約型別。generate 的回應是 generated | refused 的 union
│   ├── client.ts   真實後端:fetch 包裝、逾時、錯誤正規化、缺欄位容錯
│   ├── mock.ts     展示資料層，介面與 client.ts 一致
│   └── index.ts    唯一的資料來源切換點（依 VITE_USE_MOCK）
├── components/
│   ├── SourceCitationList.tsx  引用來源（功能 1、2 共用）
│   ├── StatusBadge.tsx         檔期狀態標籤
│   ├── Notice.tsx              拒絕生成 / 錯誤提示
│   └── Skeleton.tsx            生成等待中的骨架
├── fonts/                      台北黑體子集（由 scripts/build-fonts.py 產生）
├── hooks/useTask.ts            非同步請求狀態（含競態保護）
├── panels/
│   ├── ChatPanel.tsx           功能 1
│   └── CampaignPanel.tsx       功能 2
└── styles/global.css           Tailwind 主題（@theme）與共用元件類別
```

樣式以 Tailwind utility 為主，寫在 JSX 裡。重複出現四次以上的樣式
（`.sheet`、`.btn`、`.input`、`.badge` 等）收在 `global.css` 的
`@layer components`，避免 JSX 被十幾個 class 塞爆。設計 token 定義在 `@theme`
區塊，會自動產生對應的 utility（例如 `--color-ink` 產生 `text-ink`、`bg-ink`）。

## 幾個刻意的設計決定

**`refused` 不是錯誤。** `POST /api/campaigns/{id}/generate` 回傳 `status: "refused"` 時屬於正常的
HTTP 200 回應，代表助手判定該檔期非生效中而拒絕生成。前端把它與真正的錯誤分開呈現（不同樣式、
不同標題），因為「系統守得住檔期規則」正是這個展示要傳達的能力。

**「產生貼文」按鈕不會因檔期狀態而停用。** 能不能生成由後端判定，前端只負責呈現結果。
若在前端先擋下來，就展示不到拒絕行為了。

**狀態標籤一律採用後端回傳值。** 前端不以日期自行推算 active / expired / upcoming，
這樣展示資料可以任意調整而不受瀏覽器時鐘影響。合約外的狀態值會顯示為「狀態未知」而非崩潰。

**介面文字用無襯線體，模型生成的內容用襯線體。** 讓觀眾一眼分辨「系統介面」與「模型產出」，
後者才是展示要評估的對象。

## 字型

介面使用**台北黑體**（Taipei Sans TC Beta，OFL-1.1），採教育部國字標準字體，自行託管，
離線可用。模型生成的內容使用 Noto Serif TC（Google Fonts）。

字型的來源、雜湊與授權條款見 `src/fonts/NOTICE.md`，授權全文見 `src/fonts/OFL.txt`。

字型子集是自己切的，不是直接用上游的 webfont 套件 —— 原因寫在 `scripts/build-fonts.py`
的檔頭：上游按 Unicode 區塊順序切分，繁中常用字散佈在整個 CJK 區，實測首頁要下載
37 個檔、7.88 MB。本專案改成按 Big5 字頻分層切成兩層：

| 層 | 內容 | 何時下載 |
|---|---|---|
| `common` | ASCII、全形標點、注音 + Big5 一級字（常用字） | 一定會載 |
| `ext` | Big5 二級字（次常用字） | 頁面出現罕用字時才載 |

`src/fonts/` 下的 woff2 與 css 都已納入版控，平時不需重跑。要重新產生：

```bash
python3 -m venv .venv && .venv/bin/pip install fonttools brotli
.venv/bin/python scripts/build-fonts.py
```

台北黑體只提供 Light / Regular / Bold 三個字重，所以版面最粗只到 700
（原本 masthead 用的 900 已調整）。

## 展示資料模式

`VITE_USE_MOCK=true` 時內建四個檔期，涵蓋三種狀態：

| 檔期 | 狀態 | 按下產生貼文的結果 |
|---|---|---|
| 中秋節檔期 | 生效中 | 生成貼文 + 三筆引用來源 |
| 母親節檔期 | 已過期 | 拒絕，說明已於 2026-05-12 結束 |
| 週年慶檔期 | 尚未開始 | 拒絕，說明自 2026-10-05 起才生效 |
| 耶誕節檔期 | 尚未開始 | 拒絕，說明自 2026-12-01 起才生效 |

問答的展示資料涵蓋品牌語氣、客服規則、社群趨勢三個主題。
在問題中輸入「測試錯誤」可觸發錯誤處理的展示（真實後端沒有這個行為）。
