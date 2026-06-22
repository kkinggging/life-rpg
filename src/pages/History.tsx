// ============================================================
// 量化人生RPG — 历史页
// ============================================================
import { useStore } from '../store'
import { thisWeekRange, CHECKINS, todayISO } from '../utils'
import ExportImport from '../components/ExportImport'
import type { Attributes, CheckinSystem } from '../types'
import { ATTR_META } from '../types'

export default function History() {
  const { state } = useStore()
  const { start } = thisWeekRange()

  // 周日期数组
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日']
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    weekDays.push(d.toISOString().split('T')[0])
  }
  const today = todayISO()

  // 本周记录
  const weekRecs = state.records.filter(r => weekDays.includes(r.date))

  const systems = CHECKINS.map(c => c.system) as CheckinSystem[]

  // 属性排序（按值从高到低）
  const attrKeys = Object.keys(state.attributes) as (keyof Attributes)[]
  const sorted = [...attrKeys].sort((a, b) => state.attributes[b] - state.attributes[a])

  return (
    <div className="px-4 pt-6 pt-safe max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-slate-100 mb-4">📅 历史记录</h1>

      {/* ── 本周打卡网格 ── */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          本周打卡
        </h2>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-center text-xs border-separate" style={{ borderSpacing: '2px 4px' }}>
            <thead>
              <tr>
                <th className="py-1 w-8"></th>
                {dayLabels.map((d, i) => (
                  <th
                    key={i}
                    className={`py-1 font-medium ${
                      weekDays[i] === today ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {systems.map(sys => {
                const cfg = CHECKINS.find(c => c.system === sys)!
                return (
                  <tr key={sys}>
                    <td className="py-2 text-left">
                      <span className="text-base">{cfg.emoji}</span>
                    </td>
                    {weekDays.map(day => {
                      const hit = weekRecs.some(r => r.date === day && r.system === sys)
                      return (
                        <td key={day} className="py-2">
                          {hit ? (
                            <span className="text-green-400 text-sm">●</span>
                          ) : (
                            <span className="text-slate-700 text-sm">○</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 text-center mt-2">
          本周打卡 {weekRecs.length} 次 · ● 已完成 ○ 未打卡
        </p>
      </div>

      {/* ── 属性概览 ── */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          属性概览
        </h2>
        <div className="space-y-2.5">
          {sorted.map(key => {
            const meta = ATTR_META[key]
            const val = Math.round(state.attributes[key])
            const pct = Math.min(100, Math.max(0, val))
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm w-20 shrink-0 text-slate-300">
                  {meta.emoji} {meta.label}
                </span>
                <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: meta.color }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums w-7 text-right" style={{ color: meta.color }}>
                  {val}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          总打卡次数：{state.records.length}
        </p>
      </div>

      {/* ── 导出/导入 ── */}
      <ExportImport />

      <div className="h-4" />
    </div>
  )
}
