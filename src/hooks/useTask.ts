import { useCallback, useRef, useState } from 'react'
import { ApiError } from '../api'

export type TaskState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'done'; data: T }
  | { status: 'error'; message: string }

/**
 * 非同步請求的狀態管理。
 *
 * 只有真正的錯誤(ApiError 或未預期例外)會進入 error 狀態；
 * 業務層的拒絕結果屬於正常回傳值，由呼叫端自行判讀。
 */
export function useTask<T>() {
  const [state, setState] = useState<TaskState<T>>({ status: 'idle' })
  const seq = useRef(0)

  const run = useCallback(async (work: () => Promise<T>) => {
    const ticket = ++seq.current
    setState({ status: 'pending' })

    try {
      const data = await work()
      if (ticket === seq.current) setState({ status: 'done', data })
    } catch (err) {
      if (ticket !== seq.current) return
      setState({
        status: 'error',
        message: err instanceof ApiError ? err.message : '發生未預期的錯誤，請稍後再試。',
      })
    }
  }, [])

  const reset = useCallback(() => {
    seq.current++
    setState({ status: 'idle' })
  }, [])

  return { state, run, reset }
}
