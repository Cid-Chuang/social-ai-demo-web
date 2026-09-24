import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { api } from '../api'
import type { ChatResponse, Topic } from '../api'
import { useTask } from '../hooks/useTask'
import { Notice } from '../components/Notice'
import { Skeleton } from '../components/Skeleton'
import { SourceCitationList } from '../components/SourceCitationList'

const TOPICS: { value: Topic | ''; label: string }[] = [
  { value: '', label: '全部知識庫' },
  { value: 'social', label: '社群經營' },
  { value: 'support', label: '客服支援' },
  { value: 'trend', label: '趨勢觀察' },
]

const SAMPLES = [
  '我們的品牌語氣應該是什麼樣子？',
  '客戶問出貨要幾天，該怎麼回？',
  '這一季的社群趨勢有什麼變化？',
  // 刻意觸發敏感內容判定，展示助手不自動回答而是轉人工
  '有客人說要提告，我該在留言區怎麼回？',
]

/** 功能 1：依知識庫回答問題。單輪問答，不串接上下文。 */
export function ChatPanel() {
  const [message, setMessage] = useState('')
  const [topic, setTopic] = useState<Topic | ''>('')
  const [asked, setAsked] = useState('')
  const { state, run } = useTask<ChatResponse>()

  const pending = state.status === 'pending'
  const answered = state.status === 'done' && state.data.status === 'answered' ? state.data : null
  const escalated = state.status === 'done' && state.data.status === 'escalated' ? state.data : null

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const text = message.trim()
    if (!text || pending) return

    setAsked(text)
    void run(() => api.postChat(topic ? { message: text, topic } : { message: text }))
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit()
  }

  return (
    <section>
      <p className="m-0 mb-6 max-w-[62ch] text-ink-soft">
        助手會先到知識庫中檢索相關段落，再據此回答。每則回覆都會附上實際引用的文件與原文片段。
      </p>

      <form className="sheet grid gap-3.5 p-5 sm:p-[26px]" onSubmit={submit}>
        <div className="grid gap-1.5">
          <label className="field-label" htmlFor="chat-input">
            想問什麼
          </label>
          <textarea
            id="chat-input"
            className="input min-h-24 resize-y"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="例如：我們的品牌語氣應該是什麼樣子？"
          />
          <span className="hint">按 Cmd / Ctrl + Enter 送出</span>
        </div>

        <div className="grid gap-1.5">
          <label className="field-label" htmlFor="chat-topic">
            檢索範圍
          </label>
          <select
            id="chat-topic"
            className="input py-2.5"
            value={topic}
            onChange={(event) => setTopic(event.target.value as Topic | '')}
          >
            {TOPICS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((text) => (
              <button key={text} type="button" className="chip" onClick={() => setMessage(text)}>
                {text}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="btn w-full sm:w-auto"
            disabled={pending || message.trim() === ''}
          >
            {pending ? '生成中…' : '送出提問'}
          </button>
        </div>
      </form>

      {state.status === 'error' ? (
        <Notice variant="error" title="這次沒有取得回覆">
          {state.message}
        </Notice>
      ) : null}

      {/* 敏感內容：助手刻意不生成答案，改為轉人工。這與錯誤是不同性質的結果。 */}
      {escalated ? (
        <Notice
          variant="escalated"
          title="這個問題已轉由真人處理"
          {...(escalated.category ? { meta: `判定分類：${escalated.category}` } : {})}
        >
          {escalated.reason}
        </Notice>
      ) : null}

      {state.status === 'idle' ? (
        <div className="mt-6 rounded-[3px] border border-dashed border-rule px-5 py-8 text-ink-faint sm:px-[30px] sm:py-[34px]">
          <p className="m-0 max-w-[46ch]">
            回覆會顯示在這裡，並一併列出助手實際查閱的知識庫文件與原文片段。
          </p>
        </div>
      ) : null}

      {pending || answered ? (
        <article
          className={`sheet mt-6 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] ${
            pending ? 'sheet-working' : ''
          }`}
        >
          <div className="p-5 sm:px-[30px] sm:py-7">
            <p className="m-0 mb-[18px] flex gap-2.5 border-b border-rule-soft pb-4 text-sm text-ink-soft">
              <span className="font-bold whitespace-nowrap text-ink">提問</span>
              <span>{asked}</span>
            </p>

            {pending ? (
              <Skeleton message="正在檢索知識庫並生成回覆，大約需要數秒到十幾秒…" />
            ) : (
              <p className="generated">{answered?.answer ?? ''}</p>
            )}
          </div>

          <aside className="border-t border-rule-soft bg-[#fbfcfd] p-5 md:border-t-0 md:border-l md:p-6">
            {pending ? (
              <p className="m-0 text-[13px] text-ink-faint">來源會在回覆完成後一併列出。</p>
            ) : (
              <SourceCitationList sources={answered?.sources ?? []} />
            )}
          </aside>
        </article>
      ) : null}
    </section>
  )
}
