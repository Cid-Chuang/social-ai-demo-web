# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 這是什麼

「社群經營 AI 助手」的**對外展示前端** —— 純前端 SPA，用來向客戶示範兩項能力：依知識庫回答問題（RAG 問答）、依檔期生成貼文。

需求來源是 `../docs/展示前端_功能需求文件.md`，動到功能範圍前先看那份文件。文件第八節的驗收標準是這個專案的實際規格。

該文件是**內部文件，不在本 repo 內** —— 上述路徑是內部工作目錄的相對位置。若在只有本 repo 的環境下工作（例如 clone 後），該檔案不存在，請以本檔與 README 記載的約定為準，不要憑猜測改動既有行為。

**這不是操作後臺**。畫面上永遠不能出現任何「發佈」按鈕或看起來像送出到 FB / LINE 的動作，這是需求文件明訂的唯讀原則。

## 技術棧

**React + Tailwind CSS，全面使用 TypeScript 強化型別。** 這是專案既定的技術選型，新增程式碼一律遵循，不要引入其他樣式方案（CSS Modules、styled-components、元件庫）或 `.jsx` / `.js` 檔。

| | 版本 | 備註 |
|---|---|---|
| React | 19 | 純 SPA，無 SSR。需求文件明訂不需要 SSR。 |
| TypeScript | 7 | `strict` 全開，另含 `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax`。 |
| Tailwind CSS | 4 | CSS-first 設定，詳見下方「樣式」一節。 |
| Vite | 8 | 建置與開發伺服器。 |
| Vitest | 5 | 單元測試，jsdom 環境。 |

型別是這個專案的第一道防線。特別是 `api/types.ts` 裡 `GenerateResponse` 與 `ChatResponse` 的 discriminated union，它讓 `generated` / `refused`、`answered` / `escalated` 在編譯期就無法混用。新增 API 回應時沿用同樣的做法，不要用 optional 欄位含糊帶過。

型別擋不住的部分由單元測試補上，見下方「測試」一節。

刻意**不使用**：登入／會員系統、資料庫、狀態管理函式庫（Redux / Zustand 等）、路由函式庫。目前的規模用 `useState` 加兩個面板就夠，引入前先確認真的需要。

## 指令

```bash
npm run dev         # 開發伺服器 http://localhost:5173
npm run build       # tsc -b 型別檢查 + vite build
npm run preview     # 預覽 dist/
npm run typecheck   # 只做型別檢查
npm test            # 跑單元測試（vitest run）
npm run test:watch  # 監看模式
```

專案**沒有 linter**。動過程式碼後的最低驗證是 `npm run typecheck` 加 `npm test`；
動過畫面行為則還要實際開瀏覽器跑一次驗收標準。

## 測試

只測「型別擋不住、但改壞了會在展示現場出糗」的邏輯，不追求覆蓋率：

| 檔案 | 測什麼 |
|---|---|
| `src/api/client.test.ts` | 守門結果（`refused` / `escalated`）必須是正常回應而非錯誤；欄位缺漏或格式不符時不讓畫面壞掉；HTTP 與連線錯誤轉成友善訊息 |
| `src/hooks/useTask.test.ts` | 競態保護：先送出的慢回應不得覆蓋後送出的快回應；`reset()` 之後進行中的請求回來也不寫入狀態 |

兩個要點：

- API 測試刻意透過對外的 `postChat` / `getCampaigns` / `generatePost` 進行，而不是直接測內部的
  `normalize*()` —— 這樣連同 fetch 包裝與錯誤處理一起涵蓋，也不需要為了測試把內部函式匯出。
- `vite.config.ts` 的 `test.env` **釘死了 `VITE_API_BASE_URL`**。不釘的話 Vitest 會讀
  `.env.local`，測試結果就會隨每個人的本機設定而不同（這個坑實際踩過一次）。

## 最重要的一件事：`refused` 不是錯誤

`POST /api/campaigns/{id}/generate` 有兩種成功回應：

```ts
type GenerateResponse =
  | { status: 'generated'; post: string; sources: Source[] }
  | { status: 'refused'; reason: string }
```

`refused` 代表助手判定該檔期非生效中而拒絕生成，是 **HTTP 200 的正常回應**，不是錯誤。整個 demo 要傳達的核心能力就是「系統守得住檔期規則」，所以：

- `api/client.ts` 的 `normalizeGenerate()` 把 `refused` 當合法回傳值，只有兩者皆不成立才 throw
- `components/Notice.tsx` 用不同樣式與標題區分 `refused`（暖陶色）與 `error`（紅色）
- `CampaignPanel` 的「產生貼文」按鈕**刻意不因檔期狀態停用** —— 能不能生成由後端判定，前端先擋下來就展示不到拒絕行為了

改動這條路徑時，不要把 `refused` 併進 catch 區塊或錯誤狀態。

## 第二種守門行為：`escalated`

`POST /api/chat` 除了正常作答，還可能回傳 `escalated` —— 問題涉及法律爭議、醫療宣稱或
個資時，助手**刻意不生成內容**，改為轉真人處理。與 `refused` 是同一類行為，樣式上也分開
（`Notice` 的 `escalated` 變體為沉靜的藍綠，不是警示色）。

這是對需求文件初版合約的**向後相容擴充**：初版合約只有 `{ answer, sources }` 沒有 `status`，
`normalizeChat()` 因此只在明確為 `escalated` 時走轉人工分支，其餘一律視為 `answered`。
後端沿用舊格式也能運作。

mock 的敏感關鍵字寫在 `SENSITIVE_RULES`，刻意寫得精準 —— 用 `/告/` 會誤判「告訴我品牌語氣」
這種一般問題。**誤判在展示場合比漏判更難看**，調整規則後請回頭測一般問題還能不能正常作答。

## 其他不可回退的約定

**檔期狀態由後端給，前端不算日期。** `active` / `expired` / `upcoming` 一律採用後端回傳值，不以 `effective_from` / `effective_to` 自行推算，這樣展示資料可以任意調整而不受瀏覽器時鐘影響。合約外的狀態值顯示為「狀態未知」而非崩潰。

**檔期選擇器是卡片清單，不是 `<select>`。** 需求文件字面寫「下拉選單」，但下拉選單一次只看得到一個狀態標籤，觀眾無法一眼看出三種狀態同時存在。現在是 `role="radiogroup"` 的卡片清單，語意上仍是單選。這是刻意偏離，不要「修正」回去。

**介面文字一律繁體中文，且用全形標點**（，。？：）。需求文件本身用半形逗號，那是文件的撰寫習慣，不是介面規範。

**無襯線／襯線的資訊分工。** 介面文字用台北黑體（sans），模型生成的答案與貼文用 Noto Serif TC（serif，`.generated` 類別）。讓觀眾一眼分辨「系統介面」與「模型產出」，後者才是展示要評估的對象。

## 架構

### 資料層的單一切換點

```
api/types.ts    API 合約型別
api/client.ts   真實後端：fetch 包裝、60 秒逾時、錯誤正規化、缺欄位容錯
api/mock.ts     展示資料，介面與 client.ts 完全一致
api/index.ts    依 VITE_USE_MOCK 決定匯出哪一個
```

元件一律 `import { api } from '../api'`，不直接碰 client 或 mock。**新增端點時兩邊都要加**，否則切換模式會炸。

`client.ts` 裡所有網路資料都經過 `normalize*()` 才進畫面 —— 後端欄位微調時不能整頁白畫面，這是需求文件的容錯要求。`mock.ts` 回傳的資料已經是正確形狀，不經過 normalize。

環境變數（見 `.env.example`）：

| 變數 | 說明 |
|---|---|
| `VITE_API_BASE_URL` | 後端位址。程式中不寫死任何網址。 |
| `VITE_USE_MOCK` | `true` 用內建展示資料不發網路請求；`false` 呼叫真實後端。 |

在 mock 模式下，問題中輸入「測試錯誤」會觸發錯誤處理展示（真實後端沒有這個行為）。

### `hooks/useTask.ts` 的競態保護

每次請求領一個遞增號碼，回來時號碼對不上就整包丟棄。情境是使用者送出問題 A（慢）後不等結果又送出 B（快），沒有保護的話 A 的回應晚到會蓋掉 B 的答案 —— 畫面顯示 B 的提問配 A 的答案，在 demo 場合特別致命。

只有真正的錯誤會進 `error` 狀態；業務層的拒絕結果是正常回傳值，由呼叫端判讀。

這段邏輯有單元測試把關（`src/hooks/useTask.test.ts`），改動後務必跑 `npm test`。

## 樣式：Tailwind v4

CSS-first 設定，沒有 `tailwind.config.js`。全部在 `src/styles/global.css`：

- `@theme` 定義設計 token，會自動產生 utility（`--color-ink` → `text-ink` / `bg-ink` / `border-ink`）
- `@layer components` 放重複四次以上的樣式（`.sheet` `.btn` `.input` `.badge` `.chip` `.generated`），其餘用 utility 直接寫在 JSX

**class 名必須是完整靜態字串。** Tailwind 靜態掃描原始碼決定產生哪些 class，`` `text-status-${status}` `` 這種組字串的寫法編不出樣式。`StatusBadge.tsx` 與 `Notice.tsx` 用查表對應完整 class 字串就是為此。

`.sheet-working` 的掃描線是全站唯一的非互動動畫，已在 `prefers-reduced-motion` 下停用。

## 字型

介面用**台北黑體**（Taipei Sans TC Beta 1.000，OFL-1.1，採教育部國字標準字體），自行託管以確保 demo 現場沒網路也不掉字型。

`src/fonts/` 下的 woff2 與 css 由 `scripts/build-fonts.py` 產生且**已納入版控，請勿手動編輯**。要重新產生：

```bash
python3 -m venv .venv && .venv/bin/pip install fonttools brotli
.venv/bin/python scripts/build-fonts.py
```

原始 TTF（各約 20MB）快取在 `.fontcache/`，已 gitignore，腳本會自動下載並驗 sha256。

字型依 OFL-1.1 散布，`src/fonts/OFL.txt` 與 `src/fonts/NOTICE.md` 是授權要求的隨附文件，
**不要刪除或搬移**。若之後換字型或改變子集方式，NOTICE.md 的內容要跟著更新。

幾個踩過的坑，改字型前先看 `scripts/build-fonts.py` 的檔頭說明：

- **不要改用上游的 webfont 套件**。它按 Unicode 區塊順序切分 CJK，繁中常用字散佈在整個 U+4E00–U+9FFF，實測首頁要下載 37 個檔、7.88 MB。現在自切的版本是 2 個檔、1.6 MB。
- **不要加 `unicode-range`**。試過分層，CSS 從 16KB 膨脹到 157KB。這個頁面必定是滿版中文，子集一定會下載，精確列碼位換不到任何東西。未收錄的罕用字瀏覽器會自動退到 font stack 下一個字型。
- **字重最粗只到 700**。台北黑體只有 Light / Regular / Bold 三個字重。

## P1 選做功能的進度

需求文件第三節的五項選做功能：

| 功能 | 狀態 |
|---|---|
| 敏感內容展示 | 已完成（ChatPanel 的 `escalated` 分支） |
| 語氣切換比較 | 已完成（`panels/TonePanel.tsx`） |
| 雲端 vs 本地模型比較 | 未做，合約需加 model 參數 |
| 語音輸入 | 未做，需要 STT 端點 |
| 評測儀表板 | 未做，需要評測資料 |

未做的三項都需要後端配合，後端就緒前做會做白工。

`TonePanel` 平行呼叫兩次 `generatePost`，只有 tone 不同。兩欄的引用來源相同時會收斂成
一份顯示在下方 —— 因為只有語氣不同，檢索到的來源通常一致，重複列兩次會把版面灌滿。
