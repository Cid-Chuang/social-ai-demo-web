import type { Campaign } from '../api'
import { StatusBadge } from './StatusBadge'

/**
 * 檔期選擇器。
 *
 * 需求文件字面寫「下拉選單」，這裡做成卡片清單 —— 下拉選單一次只看得到一個狀態標籤，
 * 觀眾無法一眼看出生效中／已過期／尚未開始三種狀態同時存在。
 * 語意上仍是單選（role="radiogroup"）。
 */
export function CampaignPicker({
  campaigns,
  loading,
  loaded,
  selectedId,
  onSelect,
  name = 'campaign',
}: {
  campaigns: Campaign[]
  loading: boolean
  loaded: boolean
  selectedId: string
  onSelect: (id: string) => void
  /** 同一頁若出現多組選擇器，需給不同的 radio group 名稱 */
  name?: string
}) {
  return (
    <div className="sheet">
      <div className="flex items-center justify-between gap-4 border-b border-rule-soft px-5 py-3.5">
        <span className="field-label">可選檔期</span>
        {loaded ? <span className="hint">共 {campaigns.length} 個</span> : null}
      </div>

      {loading ? <p className="m-0 px-5 py-6 text-[13px] text-ink-faint">正在載入檔期清單…</p> : null}

      {loaded && campaigns.length === 0 ? (
        <p className="m-0 px-5 py-6 text-[13px] text-ink-faint">目前沒有可選的檔期。</p>
      ) : null}

      <div role="radiogroup" aria-label="可選檔期">
        {campaigns.map((campaign) => {
          const on = campaign.id === selectedId
          return (
            <label
              key={campaign.id}
              className={`grid cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-start gap-3
                border-b border-rule-soft px-[18px] py-4 last:border-b-0 ${
                  on ? 'bg-indigo-wash' : 'hover:bg-[#f7f8fa]'
                }`}
            >
              <input
                type="radio"
                name={name}
                value={campaign.id}
                checked={on}
                onChange={() => onSelect(campaign.id)}
                className="mt-[5px] accent-indigo"
              />
              <span>
                <span className="flex flex-wrap items-center gap-2.5 font-bold">
                  {campaign.name}
                  <StatusBadge status={campaign.status} />
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-soft">
                  {campaign.effective_from || '未標示'} 至 {campaign.effective_to || '未標示'}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
