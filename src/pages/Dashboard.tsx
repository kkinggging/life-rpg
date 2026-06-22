// ============================================================
// 量化人生RPG — 仪表板（首页）
// ============================================================
import type { Attributes } from '../types'
import { ATTR_META } from '../types'
import { useStore } from '../store'
import AttributeBar from '../components/AttributeBar'
import ExportImport from '../components/ExportImport'
import { todayISO, CHECKINS } from '../utils'

interface Props {
  onStartCheckin: () => void
}

export default function Dashboard({ onStartCheckin }: Props) {
  const { state } = useStore()
  const { attributes } = state
  const attrKeys = Object.keys(attributes) as (keyof Attributes)[]

  const today = todayISO()
  const todayRecs = state.records.filter(r => r.date === today)
  const doneSystems = new Set(todayRecs.map(r => r.system))

  return (
    <div className="px-4 pt-6 pt-safe pb-4 max-w-lg mx-auto">
      {/* ── 顶部 ── */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-bold text-slate-100">⚔️ 人生 RPG</h1>
        <span className="text-xs text-slate-500">
          {new Date().toLocaleDateString('zh-CN', {
            month: 'long', day: 'numeric', weekday: 'short',
          })}
        </span>
      </div>

      {/* ── 今日状态条 ── */}
      <div className="flex flex-wrap gap-2 mb-5 mt-2">
        {CHECKINS.map(c => {
          const done = doneSystems.has(c.system)
          return (
            <span
              key={c.system}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                done
                  ? 'bg-green-900/40 text-green-400 border border-green-700/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/30'
              }`}
            >
              {done ? '✅' : '⬜'} {c.label}
            </span>
          )
        })}
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-500 border border-slate-700/30">
          📋 {state.records.length} 次记录
        </span>
      </div>

      {/* ── 属性面板 ── */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          属性面板
        </h2>
        {attrKeys.map(k => (
          <AttributeBar key={k} name={k} value={attributes[k]} />
        ))}
      </div>

      {/* ── 打卡主按钮 ── */}
      <button
        onClick={onStartCheckin}
        className="w-full tap flex items-center justify-center gap-3 px-4 py-5
                   bg-gradient-to-r from-amber-500 to-orange-500
                   rounded-2xl font-bold text-lg text-slate-900
                   active:scale-[0.97] transition-transform mb-5
                   shadow-lg shadow-amber-500/20 no-select"
      >
        ✍️ 今日打卡
      </button>

      {/* ── 导出/导入 ── */}
      <ExportImport />

      {/* ── 底部留白 ── */}
      <div className="h-4" />
    </div>
  )
}
