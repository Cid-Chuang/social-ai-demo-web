import * as real from './client'
import * as mock from './mock'

/**
 * 資料來源的單一切換點。
 *
 * 需求文件要求：後端未就緒時先以 mock 開發，之後「只需切換 base URL 即可接上真實後端」。
 * 因此假資料集中在這裡切換，不散落在各元件中。
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export const api = useMock ? mock : real

export const isMockMode = useMock

export { ApiError } from './client'
export type * from './types'
