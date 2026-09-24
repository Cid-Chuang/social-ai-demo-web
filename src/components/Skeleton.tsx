/** 生成等待中的稿件骨架。搭配稿紙頂端的掃描線一起出現。 */
const WIDTHS = ['w-full', 'w-[92%]', 'w-[78%]', 'w-[85%]']

export function Skeleton({ message }: { message: string }) {
  return (
    <div>
      <p className="m-0 mb-[18px] text-[13.5px] text-ink-soft" role="status">
        {message}
      </p>
      <div className="grid gap-3" aria-hidden="true">
        {WIDTHS.map((width) => (
          <div key={width} className={`h-[11px] rounded-sm bg-rule-soft ${width}`} />
        ))}
      </div>
    </div>
  )
}
