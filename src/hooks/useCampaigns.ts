import { useEffect } from 'react'
import { api } from '../api'
import type { Campaign } from '../api'
import { useTask } from './useTask'

/**
 * 載入檔期清單。功能 2（檔期貼文生成）與語氣比較共用。
 */
export function useCampaigns() {
  const { state, run } = useTask<Campaign[]>()

  useEffect(() => {
    void run(() => api.getCampaigns())
  }, [run])

  return {
    campaigns: state.status === 'done' ? state.data : [],
    loading: state.status === 'pending',
    loaded: state.status === 'done',
    error: state.status === 'error' ? state.message : null,
  }
}
