/**
 * API 合約型別定義。
 * 依據《展示前端_功能需求文件》第四節，後端實作時欄位可能微調，
 * 因此所有由網路取得的資料一律經過 normalize 後才進入畫面。
 */

/** 知識庫主題分類 */
export type Topic = 'social' | 'support' | 'trend'

/** 引用來源：功能 1 與功能 2 共用 */
export interface Source {
  document: string
  topic: Topic | string
  snippet: string
}

/** 檔期狀態。由後端判定，前端不自行以日期計算。 */
export type CampaignStatus = 'active' | 'expired' | 'upcoming'

export interface Campaign {
  id: string
  name: string
  effective_from: string
  effective_to: string
  /** 後端若回傳合約外的狀態值，原樣保留，由畫面顯示為「狀態未知」而非崩潰。 */
  status: CampaignStatus | (string & {})
}

/** POST /api/chat */
export interface ChatRequest {
  message: string
  topic?: Topic
}

/**
 * 問答的回應。
 *
 * `escalated` 代表問題被判定為敏感（法律爭議、醫療宣稱、個資等），
 * 助手刻意**不生成內容**，改為轉交真人處理 —— 與檔期的 `refused` 是同一類守門行為。
 *
 * 需求文件第四節的初版合約沒有 `status` 欄位，只有 `{ answer, sources }`。
 * 這裡是**向後相容的擴充**：後端若回傳舊格式，normalizeChat() 會視為 `answered`。
 */
export type ChatResponse =
  | { status: 'answered'; answer: string; sources: Source[] }
  | { status: 'escalated'; reason: string; category?: string }

/** POST /api/campaigns/{id}/generate */
export interface GenerateRequest {
  tone?: string
}

/**
 * 產生貼文的回應是一個 discriminated union。
 *
 * 注意：`refused` 是「業務層拒絕」，屬於成功的 HTTP 回應，不是錯誤。
 * 需求文件明訂前端必須把拒絕原因清楚呈現，不可當成一般錯誤吃掉。
 */
export type GenerateResponse =
  | { status: 'generated'; post: string; sources: Source[] }
  | { status: 'refused'; reason: string }

/** 所有端點共用的錯誤回應格式 */
export interface ApiErrorBody {
  error: string
}
