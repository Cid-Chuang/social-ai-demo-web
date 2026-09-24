import type { ReactNode } from 'react'

type Variant = 'refused' | 'escalated' | 'error'

/**
 * 提示區塊。
 *
 * 三種變體對應三種不同性質的結果，樣式刻意分開：
 *   refused   檔期非生效中，拒絕生成 —— 刻意設計的守門行為，不是錯誤
 *   escalated 問題涉及敏感內容，轉由真人處理 —— 同樣是守門行為
 *   error     真正的系統或網路錯誤
 */
const VARIANT: Record<Variant, string> = {
  refused: 'border-refuse-rule bg-refuse-bg text-refuse',
  escalated: 'border-escalate-rule bg-escalate-bg text-escalate',
  error: 'border-fault-rule bg-fault-bg text-fault',
}

export function Notice({
  variant,
  title,
  meta,
  children,
}: {
  variant: Variant
  title: string
  /** 選填的補充標示，例如敏感內容的分類 */
  meta?: string
  children: ReactNode
}) {
  return (
    <section
      role={variant === 'error' ? 'alert' : 'status'}
      className={`mt-6 rounded-[3px] border px-5 py-[18px] ${VARIANT[variant]}`}
    >
      <h3 className="m-0 mb-1.5 text-[15px] font-bold">{title}</h3>
      <p className="m-0">{children}</p>
      {meta ? <p className="m-0 mt-2.5 text-[13px] opacity-75">{meta}</p> : null}
    </section>
  )
}
