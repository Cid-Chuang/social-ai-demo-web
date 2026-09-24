import { ApiError } from './client'
import type { Campaign, ChatRequest, ChatResponse, GenerateRequest, GenerateResponse, Source } from './types'

/**
 * 後端尚未就緒時使用的假資料層。
 * 介面與 client.ts 完全一致，切換 VITE_USE_MOCK 即可換成真實後端。
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 刻意模擬 LLM 的生成耗時，讓 loading 狀態在開發階段就看得到。 */
const THINKING_MS = 1400

const BRAND_VOICE: Source = {
  document: 'brand_voice.md',
  topic: 'social',
  snippet:
    '禾光生活的語氣是「懂生活的朋友」：用第二人稱說話，句子短，不用驚嘆號堆疊情緒。避免「最強」「第一」等絕對用語，改用具體的生活場景描述產品。',
}

const POSTING_GUIDE: Source = {
  document: 'posting_guideline.md',
  topic: 'social',
  snippet:
    '每則貼文以一個生活情境開場，產品資訊放在第三行之後。主題標籤控制在三個以內，結尾固定引導至官網選購頁，不使用倒數計時話術。',
}

const SUPPORT_FAQ: Source = {
  document: 'support_faq.md',
  topic: 'support',
  snippet:
    '出貨時間為下單後 2 個工作天內，離島加計 3 天。七天鑑賞期自簽收日起算，商品須保持完整包裝。退換貨一律由客服專線或官方 LINE 受理。',
}

const TREND_REPORT: Source = {
  document: 'trend_2026q3.md',
  topic: 'trend',
  snippet:
    '2026 年第三季社群觀察：短影音的完播率比去年同期下降 12%,圖文貼文互動率回升。生活提案型內容（情境示範）的分享數為純商品圖的 2.3 倍。',
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'midautumn-2026',
    name: '中秋節檔期',
    effective_from: '2026-09-15',
    effective_to: '2026-09-30',
    status: 'active',
  },
  {
    id: 'mothers-day-2026',
    name: '母親節檔期',
    effective_from: '2026-05-01',
    effective_to: '2026-05-12',
    status: 'expired',
  },
  {
    id: 'anniversary-2026',
    name: '週年慶檔期',
    effective_from: '2026-10-05',
    effective_to: '2026-10-20',
    status: 'upcoming',
  },
  {
    id: 'xmas-2026',
    name: '耶誕節檔期',
    effective_from: '2026-12-01',
    effective_to: '2026-12-26',
    status: 'upcoming',
  },
]

const CHAT_REPLIES: { match: RegExp; answer: string; sources: Source[] }[] = [
  {
    match: /語氣|口吻|tone|風格/i,
    answer:
      '禾光生活的品牌語氣定位是「懂生活的朋友」，而不是推銷員。實際寫作時掌握三點：\n\n第一，用第二人稱直接對讀者說話，句子盡量短，一句講一件事。\n第二，不靠驚嘆號或倒數話術製造急迫感，改用具體的生活場景讓人自己產生畫面。\n第三，避開「最強」「第一」「唯一」這類絕對用語，它們在社群留言區容易被挑戰。\n\n貼文結構上，建議第一行先給一個生活情境，產品資訊放到第三行之後再出現。',
    sources: [BRAND_VOICE, POSTING_GUIDE],
  },
  {
    match: /出貨|退貨|退換|運費|鑑賞期|客服/,
    answer:
      '出貨時間是下單後 2 個工作天內，離島地區再加計 3 天。\n\n七天鑑賞期從簽收當天開始算，退回時商品與包裝需保持完整。退換貨請一律引導客戶走客服專線或官方 LINE,社群留言區不直接處理個案，避免個資外流。',
    sources: [SUPPORT_FAQ],
  },
  {
    match: /趨勢|成效|數據|互動率|短影音/,
    answer:
      '2026 年第三季的觀察重點有兩個。\n\n短影音的完播率比去年同期掉了 12%,圖文貼文的互動率反而回升，代表受眾對於「需要花時間看完」的內容更挑剔了。\n\n另一個是生活提案型內容（把產品放進實際使用情境示範）的分享數，是純商品圖的 2.3 倍。建議本季把資源往情境式圖文傾斜。',
    sources: [TREND_REPORT, POSTING_GUIDE],
  },
]

/**
 * 敏感內容規則。命中時助手不生成內容，改為轉人工。
 *
 * 關鍵字刻意寫得精準：用 /告/ 會誤判「告訴我品牌語氣」這種一般問題，
 * 所以改用「提告」「要告」等明確語境。誤判在展示場合比漏判更難看。
 */
const SENSITIVE_RULES: { match: RegExp; category: string; reason: string }[] = [
  {
    match: /提告|要告|訴訟|律師|求償|賠償|法律責任|消保官/,
    category: '法律爭議與客訴求償',
    reason:
      '這則訊息涉及法律爭議或求償，助手不會自行擬定對外說法。已轉由真人客服接手，並同步通知法務。',
  },
  {
    match: /療效|治療|療程|醫療|改善.*(失眠|過敏|疼痛)|功效.*(疾病|症狀)/,
    category: '醫療與療效宣稱',
    reason:
      '這則訊息涉及醫療或療效宣稱，依法不得由助手自行生成對外說法。已轉由真人審核，必要時會請法務確認用語。',
  },
  {
    match: /個資|身分證|私人電話|住家地址|把.*(電話|地址).*(貼|公開|回覆)/,
    category: '個人資料揭露',
    reason:
      '這則訊息要求在公開管道揭露個人資料，助手不會執行。已轉由真人客服改以私訊管道處理。',
  },
]

const FALLBACK_REPLY: ChatResponse = {
  status: 'answered',
  answer:
    '知識庫目前沒有直接對應這個問題的內容。\n\n可以試著問品牌語氣的設定、出貨與退換貨規則，或是本季的社群趨勢觀察 —— 這幾個主題在知識庫中有完整的參考文件。',
  sources: [BRAND_VOICE],
}

const MIDAUTUMN_PRODUCT: Source = {
  document: 'product_midautumn_2026.md',
  topic: 'social',
  snippet:
    '中秋檔期主打戶外折疊桌椅組，組合價 1,880 元（原價 2,380 元），檔期 9/15 至 9/30。溝通主軸為「不烤肉也能過節」的陽台場景。',
}

/**
 * 同一檔期、不同語氣的貼文。
 *
 * 語氣比較功能要能看出差異才有展示價值，所以四種語氣是分別寫的，
 * 不是同一段文字換幾個詞：幽默版從一個笑點切入、專業版先講規格、
 * 簡潔版把句子壓到最短、溫暖版維持生活場景敘事。
 */
const MIDAUTUMN_POSTS: Record<string, string> = {
  幽默風趣:
    '烤肉這件事，年年說要改革，年年還是站在煙裡流淚。\n\n今年我們決定擺爛得徹底一點：折疊桌搬到陽台，柚子剝一半放著，風自己會來。不用顧火，不用搶位子，衣服也不會有味道。\n\n禾光戶外折疊桌椅組，中秋檔期組合價 1,880 元，到 9/30。\n官網選購：生活提案專區\n\n#中秋 #陽台生活 #禾光生活',
  溫暖親切:
    '中秋連假的陽台，是一年裡最適合待著的地方。\n\n把折疊小桌搬出來，柚子剝一半放著，風從欄杆吹進來剛剛好。不用烤肉也能過節，坐得舒服比什麼都重要。\n\n禾光戶外折疊桌椅組，中秋檔期組合價 1,880 元，即日起到 9/30。\n官網選購：生活提案專區\n\n#中秋 #陽台生活 #禾光生活',
  專業沉穩:
    '中秋連假前，先把陽台整理成可以久坐的地方。\n\n折疊桌椅收納後厚度 12 公分，靠牆即可；桌面經防潑處理，柚子汁與茶漬擦拭即除。三人以內的家庭聚會，尺寸剛好。\n\n禾光戶外折疊桌椅組，中秋檔期組合價 1,880 元（原價 2,380 元），檔期至 9/30。\n官網選購：生活提案專區\n\n#中秋 #陽台生活 #禾光生活',
  簡潔俐落:
    '中秋，把陽台變成第二個客廳。\n\n折疊桌椅一組，柚子一顆，風自己會來。\n\n禾光戶外折疊桌椅組｜中秋組合價 1,880 元｜至 9/30\n官網選購：生活提案專區\n\n#中秋 #陽台生活 #禾光生活',
}

const DEFAULT_POST = {
  post:
    '生活裡的節奏，其實是被家裡的細節決定的。\n\n一張坐得住的椅子、一盞不刺眼的燈，回到家之後的兩個小時就會完全不一樣。\n\n本檔期精選生活提案組合，詳細內容請見官網選購頁。\n\n#禾光生活 #生活提案',
  sources: [BRAND_VOICE, POSTING_GUIDE],
}

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  await delay(THINKING_MS)

  // 供展示錯誤處理用的觸發字，真實後端不會有這個行為。
  if (req.message.includes('測試錯誤')) {
    throw new ApiError('知識庫檢索服務暫時無法使用，請稍後再試。')
  }

  // 敏感內容優先於一般問答判斷：寧可轉人工，不要生成有風險的內容。
  const sensitive = SENSITIVE_RULES.find((r) => r.match.test(req.message))
  if (sensitive) {
    return { status: 'escalated', reason: sensitive.reason, category: sensitive.category }
  }

  const hit = CHAT_REPLIES.find((r) => r.match.test(req.message))
  return hit
    ? { status: 'answered', answer: hit.answer, sources: hit.sources }
    : FALLBACK_REPLY
}

export async function getCampaigns(): Promise<Campaign[]> {
  await delay(400)
  return MOCK_CAMPAIGNS
}

export async function generatePost(id: string, req: GenerateRequest): Promise<GenerateResponse> {
  await delay(THINKING_MS)

  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === id)
  if (!campaign) {
    throw new ApiError('找不到這個檔期，請重新整理後再試。')
  }

  if (campaign.status === 'expired') {
    return {
      status: 'refused',
      reason: `此檔期已於 ${campaign.effective_to} 結束，無法生成貼文。`,
    }
  }

  if (campaign.status === 'upcoming') {
    return {
      status: 'refused',
      reason: `此檔期自 ${campaign.effective_from} 起才生效，目前無法生成貼文。`,
    }
  }

  if (id === 'midautumn-2026') {
    const post = MIDAUTUMN_POSTS[req.tone ?? ''] ?? MIDAUTUMN_POSTS['溫暖親切']
    return {
      status: 'generated',
      post: post as string,
      sources: [BRAND_VOICE, POSTING_GUIDE, MIDAUTUMN_PRODUCT],
    }
  }

  return { status: 'generated', post: DEFAULT_POST.post, sources: DEFAULT_POST.sources }
}
