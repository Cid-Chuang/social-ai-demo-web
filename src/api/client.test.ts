import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, generatePost, getCampaigns, postChat } from './client'

/**
 * 這裡測的是「型別擋不住」的那一層：
 *
 * 1. 業務層的守門結果（refused / escalated）必須被當成正常回應，不能併進錯誤處理
 * 2. 後端欄位與需求文件初版合約有出入時，畫面不能壞掉
 *
 * 測試刻意透過對外的 postChat / getCampaigns / generatePost 進行，
 * 而不是直接測內部的 normalize*()，這樣連同 fetch 包裝與錯誤處理一起涵蓋。
 */

function respondWith(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/chat', () => {
  it('escalated 是正常回應，不會被當成錯誤丟出', async () => {
    respondWith({
      status: 'escalated',
      reason: '這則訊息涉及法律爭議，已轉由真人客服接手。',
      category: '法律爭議與客訴求償',
    })

    await expect(postChat({ message: '有客人說要提告' })).resolves.toEqual({
      status: 'escalated',
      reason: '這則訊息涉及法律爭議，已轉由真人客服接手。',
      category: '法律爭議與客訴求償',
    })
  })

  it('escalated 缺少 reason 時補上預設說明，而不是顯示空白', async () => {
    respondWith({ status: 'escalated' })

    const result = await postChat({ message: '測試' })
    expect(result).toEqual({ status: 'escalated', reason: '這個問題已轉由真人處理。' })
  })

  it('初版合約沒有 status 欄位，仍視為已作答', async () => {
    respondWith({
      answer: '品牌語氣是「懂生活的朋友」。',
      sources: [{ document: 'brand_voice.md', topic: 'social', snippet: '片段' }],
    })

    const result = await postChat({ message: '品牌語氣？' })
    expect(result.status).toBe('answered')
    expect(result).toMatchObject({ answer: '品牌語氣是「懂生活的朋友」。' })
  })

  it('sources 不是陣列時回空陣列，不讓畫面壞掉', async () => {
    respondWith({ answer: '答案', sources: null })

    const result = await postChat({ message: '測試' })
    expect(result.status === 'answered' && result.sources).toEqual([])
  })

  it('來源缺欄位時補預設值', async () => {
    respondWith({ answer: '答案', sources: [{ topic: 'social' }] })

    const result = await postChat({ message: '測試' })
    expect(result.status === 'answered' && result.sources[0]).toEqual({
      document: '未標示文件',
      topic: 'social',
      snippet: '',
    })
  })
})

describe('POST /api/campaigns/{id}/generate', () => {
  it('refused 是正常回應，不會被當成錯誤丟出', async () => {
    respondWith({ status: 'refused', reason: '此檔期已於 2026-05-12 結束，無法生成貼文。' })

    await expect(generatePost('mothers-day-2026', {})).resolves.toEqual({
      status: 'refused',
      reason: '此檔期已於 2026-05-12 結束，無法生成貼文。',
    })
  })

  it('refused 缺少 reason 時補上預設說明', async () => {
    respondWith({ status: 'refused' })

    await expect(generatePost('x', {})).resolves.toEqual({
      status: 'refused',
      reason: '此檔期目前非生效中，無法生成貼文。',
    })
  })

  it('沒有 status 但有 post 時視為已生成（向後相容初版合約）', async () => {
    respondWith({ post: '貼文內容', sources: [] })

    await expect(generatePost('x', {})).resolves.toEqual({
      status: 'generated',
      post: '貼文內容',
      sources: [],
    })
  })

  it('既不是 generated 也不是 refused 時視為格式錯誤', async () => {
    respondWith({ unexpected: true })

    await expect(generatePost('x', {})).rejects.toThrow(ApiError)
    await expect(generatePost('x', {})).rejects.toThrow('服務回應的格式無法解析。')
  })

  it('檔期 id 會做 URL 編碼', async () => {
    const fetchMock = respondWith({ status: 'refused', reason: '無法生成' })

    await generatePost('前後 檔期/2026', {})
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.test/api/campaigns/%E5%89%8D%E5%BE%8C%20%E6%AA%94%E6%9C%9F%2F2026/generate',
    )
  })
})

describe('GET /api/campaigns', () => {
  it('缺少 id 的檔期會被濾掉', async () => {
    respondWith({
      campaigns: [
        { id: 'ok', name: '有效檔期', effective_from: '2026-01-01', effective_to: '2026-01-31', status: 'active' },
        { name: '沒有 id 的檔期', status: 'active' },
      ],
    })

    const campaigns = await getCampaigns()
    expect(campaigns).toHaveLength(1)
    expect(campaigns[0]?.id).toBe('ok')
  })

  it('合約外的狀態值原樣保留，交由畫面顯示為「狀態未知」', async () => {
    respondWith({ campaigns: [{ id: 'x', status: 'paused' }] })

    const campaigns = await getCampaigns()
    expect(campaigns[0]).toMatchObject({ status: 'paused', name: '未命名檔期' })
  })

  it('campaigns 不是陣列時回空陣列', async () => {
    respondWith({ campaigns: 'oops' })

    await expect(getCampaigns()).resolves.toEqual([])
  })
})

describe('錯誤處理', () => {
  it('HTTP 錯誤時採用後端提供的 error 訊息', async () => {
    respondWith({ error: '知識庫檢索服務暫時無法使用。' }, { ok: false, status: 503 })

    await expect(postChat({ message: '測試' })).rejects.toThrow('知識庫檢索服務暫時無法使用。')
  })

  it('HTTP 錯誤但沒有 error 欄位時，訊息帶上狀態碼', async () => {
    respondWith(null, { ok: false, status: 500 })

    await expect(postChat({ message: '測試' })).rejects.toThrow('服務回應異常（HTTP 500）。')
  })

  it('連線失敗時給友善訊息，而不是把原始例外丟給畫面', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(getCampaigns()).rejects.toThrow('暫時無法連線到服務，請確認後端是否已啟動。')
  })
})
