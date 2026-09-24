import type { ReactNode } from 'react'

type Variant = 'refused' | 'error'

/**
 * 提示區塊。
 *
 * `refused` 用於「檔期非生效中、拒絕生成」—— 這是刻意設計的展示行為，
 * 不是錯誤，因此與 `error` 分開呈現。
 */
const VARIANT: Record<Variant, string> = {
  refused: 'border-refuse-rule bg-refuse-bg text-refuse',
  error: 'border-fault-rule bg-fault-bg text-fault',
}

export function Notice({
  variant,
  title,
  children,
}: {
  variant: Variant
  title: string
  children: ReactNode
}) {
  return (
    <section
      role={variant === 'error' ? 'alert' : 'status'}
      className={`mt-6 rounded-[3px] border px-5 py-[18px] ${VARIANT[variant]}`}
    >
      <h3 className="m-0 mb-1.5 text-[15px] font-bold">{title}</h3>
      <p className="m-0">{children}</p>
    </section>
  )
}
