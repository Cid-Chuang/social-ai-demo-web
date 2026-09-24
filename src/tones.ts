/**
 * 可選的品牌語氣。
 *
 * 這組值同時是 mock 資料 `MIDAUTUMN_POSTS` 的鍵值，兩邊必須一致，
 * 否則語氣比較會取到同一篇貼文而看不出差異。
 */
export const TONES = ['幽默風趣', '溫暖親切', '專業沉穩', '簡潔俐落'] as const

export type Tone = (typeof TONES)[number]
