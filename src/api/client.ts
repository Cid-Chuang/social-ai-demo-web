import type {
  Campaign,
  ChatRequest,
  ChatResponse,
  GenerateRequest,
  GenerateResponse,
  Source,
} from './types'

/** 後端或網路層的真實錯誤。業務層的「拒絕生成」不走這條路。 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** LLM 生成可能需要十幾秒，逾時放寬到 60 秒。 */
const TIMEOUT_MS = 60_000

async function request<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(BASE_URL + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('等待回應超過 60 秒，請稍後再試一次。')
    }
    throw new ApiError('暫時無法連線到服務，請確認後端是否已啟動。')
  } finally {
    clearTimeout(timer)
  }

  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).error === 'string'
        ? ((payload as Record<string, unknown>).error as string)
        : `服務回應異常(HTTP ${res.status})。`
    throw new ApiError(message)
  }

  if (payload === null || typeof payload !== 'object') {
    throw new ApiError('服務回應的格式無法解析。')
  }

  return payload as T
}

/* ── 容錯處理：缺欄位時給合理預設值，不讓畫面整個壞掉 ───────────── */

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeSources(raw: unknown): Source[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const r = asRecord(item)
    return {
      document: asString(r.document, '未標示文件'),
      topic: asString(r.topic),
      snippet: asString(r.snippet),
    }
  })
}

/**
 * 問答回應的正規化。
 *
 * `escalated`（敏感內容轉人工）與 `answered` 都是合法的成功回應。
 * 需求文件初版合約沒有 `status` 欄位，因此只要不是明確的 escalated，
 * 一律視為 answered —— 舊格式 `{ answer, sources }` 不改也能運作。
 */
function normalizeChat(raw: unknown): ChatResponse {
  const r = asRecord(raw)

  if (r.status === 'escalated') {
    const category = asString(r.category)
    return {
      status: 'escalated',
      reason: asString(r.reason, '這個問題已轉由真人處理。'),
      ...(category ? { category } : {}),
    }
  }

  return {
    status: 'answered',
    answer: asString(r.answer),
    sources: normalizeSources(r.sources),
  }
}

function normalizeCampaigns(raw: unknown): Campaign[] {
  const list = asRecord(raw).campaigns
  if (!Array.isArray(list)) return []
  return list
    .map((item) => {
      const r = asRecord(item)
      return {
        id: asString(r.id),
        name: asString(r.name, '未命名檔期'),
        effective_from: asString(r.effective_from),
        effective_to: asString(r.effective_to),
        status: asString(r.status),
      }
    })
    .filter((c) => c.id !== '')
}

/**
 * 產生貼文的回應正規化。
 *
 * refused 與 generated 都是合法的成功回應，只有兩者皆不成立時才視為格式錯誤。
 */
function normalizeGenerate(raw: unknown): GenerateResponse {
  const r = asRecord(raw)

  if (r.status === 'refused') {
    return {
      status: 'refused',
      reason: asString(r.reason, '此檔期目前非生效中，無法生成貼文。'),
    }
  }

  if (r.status === 'generated' || typeof r.post === 'string') {
    return {
      status: 'generated',
      post: asString(r.post),
      sources: normalizeSources(r.sources),
    }
  }

  throw new ApiError('服務回應的格式無法解析。')
}

/* ── 對外的 API ─────────────────────────────────────────────── */

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  return normalizeChat(await request('/api/chat', req))
}

export async function getCampaigns(): Promise<Campaign[]> {
  return normalizeCampaigns(await request('/api/campaigns'))
}

export async function generatePost(id: string, req: GenerateRequest): Promise<GenerateResponse> {
  return normalizeGenerate(await request(`/api/campaigns/${encodeURIComponent(id)}/generate`, req))
}
