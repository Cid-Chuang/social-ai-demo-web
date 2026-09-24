import { useState } from 'react'
import { isMockMode } from './api'
import { ChatPanel } from './panels/ChatPanel'
import { CampaignPanel } from './panels/CampaignPanel'
import { TonePanel } from './panels/TonePanel'

const TABS = [
  { id: 'chat', label: '問答展示' },
  { id: 'campaign', label: '檔期貼文生成' },
  { id: 'tone', label: '語氣比較' },
] as const

type TabId = (typeof TABS)[number]['id']

const SHELL = 'mx-auto w-full max-w-[1180px] px-4 sm:px-6'

export function App() {
  const [tab, setTab] = useState<TabId>('chat')

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-desk-edge bg-desk">
        <div className={SHELL}>
          <div className="pt-[18px] sm:flex sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-6">
            <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em]">社群經營 AI 助手</h1>
            <p className="m-0 mt-0.5 text-[13px] text-ink-faint sm:mt-0">
              唯讀能力展示，不會發佈任何內容
            </p>
          </div>

          <nav className="mt-3.5 flex gap-5 sm:gap-7" role="tablist" aria-label="展示功能">
            {TABS.map((item) => {
              const selected = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={`cursor-pointer border-b-2 pb-2.5 text-[15px] transition-colors ${
                    selected
                      ? 'border-indigo font-bold text-ink'
                      : 'border-transparent text-ink-soft hover:text-ink'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className={`${SHELL} pt-7 pb-16 sm:pt-10 sm:pb-20`}>
        <div role="tabpanel" id="panel-chat" aria-labelledby="tab-chat" hidden={tab !== 'chat'}>
          {tab === 'chat' ? <ChatPanel /> : null}
        </div>

        <div
          role="tabpanel"
          id="panel-campaign"
          aria-labelledby="tab-campaign"
          hidden={tab !== 'campaign'}
        >
          {tab === 'campaign' ? <CampaignPanel /> : null}
        </div>

        <div role="tabpanel" id="panel-tone" aria-labelledby="tab-tone" hidden={tab !== 'tone'}>
          {tab === 'tone' ? <TonePanel /> : null}
        </div>

        <p className="mt-10 border-t border-desk-edge pt-[18px] text-[13px] text-ink-faint">
          {isMockMode
            ? '目前為展示資料模式，回覆由前端內建的範例資料產生，未連線後端服務。'
            : '目前連線至後端服務，回覆由知識庫檢索與模型生成。'}
        </p>
      </main>
    </>
  )
}
