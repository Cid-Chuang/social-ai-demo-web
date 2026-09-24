import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../api'
import { useTask } from './useTask'

/**
 * useTask 的競態保護是型別擋不住、但改壞了會在展示現場出糗的邏輯：
 * 使用者連續送出兩個請求時，先送的慢回應不得覆蓋後送的快回應，
 * 否則畫面會出現「B 的提問配 A 的答案」。
 */

/** 建立一個可以由測試決定何時完成的 Promise */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useTask', () => {
  it('初始為 idle', () => {
    const { result } = renderHook(() => useTask<string>())
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('送出後進入 pending，完成後帶出資料', async () => {
    const task = deferred<string>()
    const { result } = renderHook(() => useTask<string>())

    act(() => {
      void result.current.run(() => task.promise)
    })
    expect(result.current.state).toEqual({ status: 'pending' })

    await act(async () => {
      task.resolve('答案')
      await task.promise
    })
    expect(result.current.state).toEqual({ status: 'done', data: '答案' })
  })

  it('先送出的慢回應不會覆蓋後送出的快回應', async () => {
    const slow = deferred<string>()
    const fast = deferred<string>()
    const { result } = renderHook(() => useTask<string>())

    // A 先送出（慢），B 後送出（快）
    act(() => {
      void result.current.run(() => slow.promise)
    })
    act(() => {
      void result.current.run(() => fast.promise)
    })

    await act(async () => {
      fast.resolve('B 的答案')
      await fast.promise
    })
    expect(result.current.state).toEqual({ status: 'done', data: 'B 的答案' })

    // A 晚到，必須被丟棄
    await act(async () => {
      slow.resolve('A 的答案')
      await slow.promise
    })
    expect(result.current.state).toEqual({ status: 'done', data: 'B 的答案' })
  })

  it('先送出的請求失敗時，也不會蓋掉後送出的成功結果', async () => {
    const slow = deferred<string>()
    const fast = deferred<string>()
    const { result } = renderHook(() => useTask<string>())

    act(() => {
      void result.current.run(() => slow.promise)
    })
    act(() => {
      void result.current.run(() => fast.promise)
    })

    await act(async () => {
      fast.resolve('B 的答案')
      await fast.promise
    })

    await act(async () => {
      slow.reject(new ApiError('A 逾時了'))
      await slow.promise.catch(() => undefined)
    })
    expect(result.current.state).toEqual({ status: 'done', data: 'B 的答案' })
  })

  it('reset 之後，進行中的請求回來也不會寫入狀態', async () => {
    const task = deferred<string>()
    const { result } = renderHook(() => useTask<string>())

    act(() => {
      void result.current.run(() => task.promise)
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toEqual({ status: 'idle' })

    await act(async () => {
      task.resolve('已經不需要的答案')
      await task.promise
    })
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('ApiError 的訊息原樣顯示給使用者', async () => {
    const { result } = renderHook(() => useTask<string>())

    await act(async () => {
      await result.current.run(() => Promise.reject(new ApiError('知識庫檢索服務暫時無法使用。')))
    })
    expect(result.current.state).toEqual({
      status: 'error',
      message: '知識庫檢索服務暫時無法使用。',
    })
  })

  it('非預期的例外不外洩技術細節，改用統一的友善訊息', async () => {
    const { result } = renderHook(() => useTask<string>())

    await act(async () => {
      await result.current.run(() => Promise.reject(new TypeError('cannot read property of undefined')))
    })
    expect(result.current.state).toEqual({
      status: 'error',
      message: '發生未預期的錯誤，請稍後再試。',
    })
  })
})
