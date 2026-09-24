import { useState } from 'react'
import { api } from '../api'
import type { GenerateResponse } from '../api'
import { TONES } from '../tones'
import type { Tone } from '../tones'
import { useCampaigns } from '../hooks/useCampaigns'
import { useTask } from '../hooks/useTask'
import { CampaignPicker } from '../components/CampaignPicker'
import { Notice } from '../components/Notice'
import { Skeleton } from '../components/Skeleton'
import { SourceCitationList } from '../components/SourceCitationList'

/** 同一檔期、單一語氣的生成結果。 */
function ToneColumn({
  tone,
  result,
  pending,
  showSources,
}: {
  tone: Tone
  result: GenerateResponse | null
  pending: boolean
  /** 兩欄來源相同時會收斂到下方統一顯示，此時欄內不重複列出 */
  showSources: boolean
}) {
  const generated = result?.status === 'generated' ? result : null

  return (
    <article className={`sheet ${pending ? 'sheet-working' : ''}`}>
      <div className="border-b border-rule-soft px-5 py-3.5">
        <span className="field-label">{tone}</span>
      </div>

      <div className="p-5">
        {pending ? (
          <Skeleton message="生成中…" />
        ) : result?.status === 'refused' ? (
          <p className="m-0 text-[14px] text-refuse">{result.reason}</p>
        ) : (
          <p className="generated text-base">{generated?.post ?? ''}</p>
        )}
      </div>

      {generated && showSources ? (
        <div className="border-t border-rule-soft bg-[#fbfcfd] p-5">
          <SourceCitationList sources={generated.sources} />
        </div>
      ) : null}
    </article>
  )
}

/**
 * P1 選做：語氣切換比較。
 *
 * 同一檔期套用兩種品牌語氣並排生成，讓觀眾直接看出語氣設定對產出的影響。
 * 重用功能 2 的 `POST /api/campaigns/{id}/generate`，只是以不同 tone 平行呼叫兩次。
 */
export function TonePanel() {
  const { campaigns, loading, loaded, error } = useCampaigns()
  const comparison = useTask<[GenerateResponse, GenerateResponse]>()
  const [selectedId, setSelectedId] = useState('')
  const [toneA, setToneA] = useState<Tone>('幽默風趣')
  const [toneB, setToneB] = useState<Tone>('專業沉穩')

  const selected = campaigns.find((campaign) => campaign.id === selectedId)
  const pending = comparison.state.status === 'pending'
  const pair = comparison.state.status === 'done' ? comparison.state.data : null
  const sameTone = toneA === toneB

  // 檔期非生效中時兩邊會拿到相同的拒絕原因，並排顯示兩次沒有意義，收斂成一則。
  const bothRefused = pair !== null && pair[0].status === 'refused' && pair[1].status === 'refused'

  // 兩邊只有語氣不同，檢索到的來源通常一致；相同時收斂成一份，避免整頁被重複內容灌滿。
  const sharedSources =
    pair && pair[0].status === 'generated' && pair[1].status === 'generated' &&
    JSON.stringify(pair[0].sources) === JSON.stringify(pair[1].sources)
      ? pair[0].sources
      : null

  function compare() {
    if (!selected || pending || sameTone) return
    void comparison.run(() =>
      Promise.all([
        api.generatePost(selected.id, { tone: toneA }),
        api.generatePost(selected.id, { tone: toneB }),
      ]),
    )
  }

  return (
    <section>
      <p className="m-0 mb-6 max-w-[62ch] text-ink-soft">
        同一個檔期套用兩種品牌語氣，並排生成後直接比較差異。兩邊使用相同的知識庫與檔期資料，
        唯一的變數是語氣設定。
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div>
          <CampaignPicker
            name="tone-campaign"
            campaigns={campaigns}
            loading={loading}
            loaded={loaded}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              comparison.reset()
            }}
          />

          {error ? (
            <Notice variant="error" title="無法取得檔期清單">
              {error}
            </Notice>
          ) : null}
        </div>

        <div>
          <div className="sheet grid gap-3.5 p-5 sm:p-[26px]">
            <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-1.5">
                <label className="field-label" htmlFor="tone-a">
                  語氣 A
                </label>
                <select
                  id="tone-a"
                  className="input py-2.5"
                  value={toneA}
                  onChange={(event) => setToneA(event.target.value as Tone)}
                >
                  {TONES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <label className="field-label" htmlFor="tone-b">
                  語氣 B
                </label>
                <select
                  id="tone-b"
                  className="input py-2.5"
                  value={toneB}
                  onChange={(event) => setToneB(event.target.value as Tone)}
                >
                  {TONES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
              <span className="hint">
                {sameTone
                  ? '兩邊的語氣相同，請換一個才比較得出差異'
                  : selected
                    ? `已選擇：${selected.name}`
                    : '請先選擇一個檔期'}
              </span>
              <button
                type="button"
                className="btn w-full sm:w-auto"
                onClick={compare}
                disabled={!selected || pending || sameTone}
              >
                {pending ? '生成中…' : '並排生成'}
              </button>
            </div>
          </div>

          {comparison.state.status === 'error' ? (
            <Notice variant="error" title="這次沒有生成成功">
              {comparison.state.message}
            </Notice>
          ) : null}

          {bothRefused && pair[0].status === 'refused' ? (
            <Notice variant="refused" title="這個檔期不會生成貼文">
              {pair[0].reason}
            </Notice>
          ) : null}

          {comparison.state.status === 'idle' ? (
            <div className="mt-6 rounded-[3px] border border-dashed border-rule px-5 py-8 text-ink-faint sm:px-[30px] sm:py-[34px]">
              <p className="m-0 max-w-[46ch]">
                選擇檔期與兩種語氣後按下「並排生成」，兩份結果會並列顯示在這裡。
              </p>
            </div>
          ) : null}

          {pending || (pair && !bothRefused) ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <ToneColumn
                tone={toneA}
                result={pair?.[0] ?? null}
                pending={pending}
                showSources={sharedSources === null}
              />
              <ToneColumn
                tone={toneB}
                result={pair?.[1] ?? null}
                pending={pending}
                showSources={sharedSources === null}
              />
            </div>
          ) : null}

          {sharedSources ? (
            <div className="sheet mt-6 p-5 sm:p-6">
              <SourceCitationList
                sources={sharedSources}
                title="兩則貼文共用的引用來源"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
