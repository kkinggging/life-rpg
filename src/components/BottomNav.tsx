// ============================================================
// 量化人生RPG — 底部导航
// ============================================================
export type Tab = 'dashboard' | 'checkin' | 'history'

interface Props {
  current: Tab
  onChange: (t: Tab) => void
}

const tabs: { key: Tab; label: string; emoji: string }[] = [
  { key: 'dashboard', label: '属性', emoji: '📊' },
  { key: 'checkin',   label: '打卡', emoji: '✍️' },
  { key: 'history',   label: '历史', emoji: '📅' },
]

export default function BottomNav({ current, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/50 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(t => {
          const active = current === t.key
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`flex flex-col items-center justify-center gap-0.5 px-7 py-2 tap no-select transition-colors ${
                active ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              <span className="text-xl">{t.emoji}</span>
              <span className="text-[11px] font-medium">{t.label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
