import type { Campaign } from '../api'

/** class 需為完整字串,Tailwind 才掃得到。 */
const STATUS: Record<string, { label: string; className: string }> = {
  active: { label: '生效中', className: 'badge bg-status-active-bg text-status-active' },
  expired: { label: '已過期', className: 'badge bg-status-expired-bg text-status-expired' },
  upcoming: { label: '尚未開始', className: 'badge bg-status-upcoming-bg text-status-upcoming' },
}

const UNKNOWN = { label: '狀態未知', className: 'badge bg-rule-soft text-ink-soft' }

/**
 * 檔期狀態標籤。
 * 狀態一律由後端判定，前端不以日期自行推算。
 */
export function StatusBadge({ status }: { status: Campaign['status'] }) {
  const meta = STATUS[status] ?? UNKNOWN
  return <span className={meta.className}>{meta.label}</span>
}
