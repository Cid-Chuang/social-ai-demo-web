import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Campaign, GenerateResponse } from '../api'
import { useTask } from '../hooks/useTask'
import { Notice } from '../components/Notice'
import { Skeleton } from '../components/Skeleton'
import { SourceCitationList } from '../components/SourceCitationList'
import { StatusBadge } from '../components/StatusBadge'

const TONES = ['幽默風趣', '溫暖親切', '專業沉穩', '簡潔俐落']

/** 功能 2：依指定檔期生成貼文，並正確處理過期／未生效的檔期。 */
export function CampaignPanel() {
  const list = useTask<Campaign[]>()
  const generation = useTask<GenerateResponse>()
  const [selectedId, setSelectedId] = useState('')
  const [tone, setTone] = useState(TONES[0])

  const loadCampaigns = list.run
  useEffect(() => {
    void loadCampaigns(() => api.getCampaigns())
  }, [loadCampaigns])

  const campaigns = list.state.status === 'done' ? list.state.data : []
  const selected = campaigns.find((campaign) => campaign.id === selectedId)
  const pending = generation.state.status === 'pending'
  const generated =
    generation.state.status === 'done' && generation.state.data.status === 'generated'
      ? generation.state.data
      : null

  function generate() {
    if (!selected || pending) return
    void generation.run(() => api.generatePost(selected.id, { tone }))
  }

  return (
    <section>
      <p className="m-0 mb-6 max-w-[62ch] text-ink-soft">
        選擇檔期後生成對應貼文。助手只會為生效中的檔期生成內容 ——
        已過期或尚未開始的檔期會被擋下並說明原因，這是刻意的設計。
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div>
          <div className="sheet">
            <div className="flex items-center justify-between gap-4 border-b border-rule-soft px-5 py-3.5">
              <span className="field-label">可選檔期</span>
              {list.state.status === 'done' ? (
                <span className="hint">共 {campaigns.length} 個</span>
              ) : null}
            </div>

            {list.state.status === 'pending' ? (
              <p className="m-0 px-5 py-6 text-[13px] text-ink-faint">正在載入檔期清單…</p>
            ) : null}

            {list.state.status === 'done' && campaigns.length === 0 ? (
              <p className="m-0 px-5 py-6 text-[13px] text-ink-faint">目前沒有可選的檔期。</p>
            ) : null}

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
                    name="campaign"
                    value={campaign.id}
                    checked={on}
                    onChange={() => {
                      setSelectedId(campaign.id)
                      generation.reset()
                    }}
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

          {list.state.status === 'error' ? (
            <Notice variant="error" title="無法取得檔期清單">
              {list.state.message}
            </Notice>
          ) : null}
        </div>

        <div>
          <div className="sheet grid gap-3.5 p-5 sm:p-[26px]">
            <div className="grid gap-1.5">
              <label className="field-label" htmlFor="tone">
                品牌語氣
              </label>
              <select
                id="tone"
                className="input py-2.5"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              >
                {TONES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
              <span className="hint">
                {selected ? `已選擇：${selected.name}` : '請先選擇一個檔期'}
              </span>
              {/* 刻意不因檔期狀態停用按鈕：是否能生成由後端判定，前端負責呈現結果。 */}
              <button
                type="button"
                className="btn w-full sm:w-auto"
                onClick={generate}
                disabled={!selected || pending}
              >
                {pending ? '生成中…' : '產生貼文'}
              </button>
            </div>
          </div>

          {generation.state.status === 'error' ? (
            <Notice variant="error" title="這次沒有生成成功">
              {generation.state.message}
            </Notice>
          ) : null}

          {generation.state.status === 'done' && generation.state.data.status === 'refused' ? (
            <Notice variant="refused" title="這個檔期不會生成貼文">
              {generation.state.data.reason}
            </Notice>
          ) : null}

          {generation.state.status === 'idle' ? (
            <div className="mt-6 rounded-[3px] border border-dashed border-rule px-5 py-8 text-ink-faint sm:px-[30px] sm:py-[34px]">
              <p className="m-0 max-w-[46ch]">
                {selected
                  ? `按下「產生貼文」，助手會依「${selected.name}」的檔期資料生成內容。`
                  : '選擇檔期並按下「產生貼文」後，結果會顯示在這裡。'}
              </p>
            </div>
          ) : null}

          {pending || generated ? (
            <article
              className={`sheet mt-6 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] ${
                pending ? 'sheet-working' : ''
              }`}
            >
              <div className="p-5 sm:px-[30px] sm:py-7">
                <dl className="m-0 mb-[18px] flex flex-wrap gap-x-7 gap-y-1 border-b border-rule-soft pb-4 text-sm text-ink-soft">
                  <div className="flex gap-2.5">
                    <dt className="font-bold text-ink">檔期</dt>
                    <dd className="m-0">{selected?.name ?? ''}</dd>
                  </div>
                  <div className="flex gap-2.5">
                    <dt className="font-bold text-ink">語氣</dt>
                    <dd className="m-0">{tone}</dd>
                  </div>
                </dl>

                {pending ? (
                  <Skeleton message="正在依檔期資料生成貼文，大約需要數秒到十幾秒…" />
                ) : (
                  <p className="generated text-base">{generated?.post ?? ''}</p>
                )}
              </div>

              <aside className="border-t border-rule-soft bg-[#fbfcfd] p-5 md:border-t-0 md:border-l md:p-6">
                {pending ? (
                  <p className="m-0 text-[13px] text-ink-faint">來源會在貼文生成後一併列出。</p>
                ) : (
                  <SourceCitationList sources={generated?.sources ?? []} />
                )}
              </aside>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  )
}
