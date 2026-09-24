import type { Source } from '../api'

/** 知識庫主題的中文對照。合約外的值直接原樣顯示。 */
const TOPIC_LABEL: Record<string, string> = {
  social: '社群經營',
  support: '客服支援',
  trend: '趨勢觀察',
}

/**
 * 引用來源清單。功能 1（問答）與功能 2（檔期貼文）共用。
 * 在桌面版以側註形式與內容並列，強調回覆有明確出處。
 */
export function SourceCitationList({ sources }: { sources: Source[] }) {
  return (
    <>
      <h3 className="m-0 mb-4 text-[13px] font-bold text-ink-soft">引用來源</h3>

      {sources.length === 0 ? (
        <p className="m-0 text-[13px] text-ink-faint">這次回覆沒有附上引用來源。</p>
      ) : (
        <ol className="m-0 grid list-none gap-[18px] p-0">
          {sources.map((source, index) => (
            <li
              key={`${source.document}-${index}`}
              className="grid grid-cols-[22px_minmax(0,1fr)] gap-2"
            >
              <span className="pt-0.5 text-xs font-bold text-indigo" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <p className="m-0 text-[13.5px] font-bold break-all">{source.document}</p>
                {source.topic ? (
                  <span className="mt-[3px] inline-block rounded-full bg-indigo-wash px-2.5 py-px text-[11.5px] text-ink-soft">
                    {TOPIC_LABEL[source.topic] ?? source.topic}
                  </span>
                ) : null}
                {source.snippet ? (
                  <p className="m-0 mt-1.5 border-l-2 border-rule pl-2.5 text-[13px] leading-[1.7] text-ink-soft">
                    {source.snippet}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
