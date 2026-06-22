// ============================================================
// 量化人生RPG — 打卡页
// ============================================================
import { useState } from 'react'
import type { Attributes, CheckinSystem } from '../types'
import { ATTR_META } from '../types'
import CheckinFlow from '../components/CheckinFlow'
import { CHECKINS } from '../utils'
import { useStore } from '../store'

interface Props {
  onDone: () => void
  onCancel: () => void
}

export default function Checkin({ onDone, onCancel }: Props) {
  const { addCheckin } = useStore()
  const [sys, setSys] = useState<CheckinSystem | null>(null)
  const [bonus, setBonus] = useState<Partial<Attributes> | null>(null)

  const handlePick = (s: CheckinSystem) => setSys(s)
  const handleDone = (answers: Record<string, string>) => {
    if (!sys) return
    const b = addCheckin(sys, answers)
    setBonus(b)
  }
  const handleMore = () => { setSys(null); setBonus(null) }

  // ── Stage 1: 选体系 ──
  if (!sys) {
    return (
      <div className="px-4 pt-6 pt-safe max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onCancel} className="tap text-slate-400 text-base no-select">
            ← 返回
          </button>
          <h1 className="text-lg font-bold text-slate-100">今日打卡</h1>
        </div>
        <p className="text-sm text-slate-500 mb-4">选择要打卡的体系：</p>
        <div className="flex flex-col gap-3">
          {CHECKINS.map(c => (
            <button
              key={c.system}
              onClick={() => handlePick(c.system)}
              className="tap flex items-center gap-4 px-5 py-5 bg-slate-800/80
                         rounded-2xl border border-slate-700/50
                         active:border-amber-500/50 active:bg-slate-700/80
                         transition-all text-left no-select"
            >
              <span className="text-3xl">{c.emoji}</span>
              <div>
                <div className="font-semibold text-base text-slate-100">{c.label}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">
                  {c.questions.filter(q => !q.dependsOn).length}-{c.questions.length} 个问题
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const def = CHECKINS.find(d => d.system === sys)!

  // ── Stage 2: 答题 ──
  if (!bonus) {
    return (
      <div className="px-4 pt-6 pt-safe max-w-lg mx-auto">
        <button
          onClick={() => setSys(null)}
          className="tap text-slate-400 text-base mb-5 no-select"
        >
          ← 换一个
        </button>
        <CheckinFlow system={sys} onDone={handleDone} />
      </div>
    )
  }

  // ── Stage 3: 完成 ──
  const changes = Object.entries(bonus).filter(([, v]) => (v as number) !== 0)
  return (
    <div className="px-4 pt-6 pt-safe max-w-lg mx-auto flex flex-col items-center text-center">
      <div className="text-6xl mb-3 animate-pop-in">✨</div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">打卡完成！</h2>
      <p className="text-sm text-slate-500 mb-6">{def.label}已记录</p>

      {/* 属性变化 */}
      {changes.length > 0 && (
        <div className="bg-slate-800/80 rounded-2xl p-4 mb-6 w-full max-w-xs border border-slate-700/30">
          <h3 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
            属性变化
          </h3>
          <div className="space-y-2.5">
            {changes.map(([k, v]) => {
              const key = k as keyof Attributes
              const meta = ATTR_META[key]
              const val = v as number
              return (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">
                    {meta.emoji} {meta.label}
                  </span>
                  <span className={`text-sm font-bold tabular-nums animate-flash ${
                    val > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {val > 0 ? '+' : ''}{val}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {changes.length === 0 && (
        <p className="text-sm text-slate-500 mb-6">今日休息也是一种策略。</p>
      )}

      <button
        onClick={onDone}
        className="w-full max-w-xs tap px-4 py-4 bg-amber-500 rounded-2xl
                   font-bold text-lg text-slate-900
                   active:scale-[0.97] transition-transform no-select"
      >
        返回仪表板
      </button>

      <button
        onClick={handleMore}
        className="w-full max-w-xs tap px-4 py-3 text-slate-400 mt-3 text-sm no-select"
      >
        继续打卡
      </button>
    </div>
  )
}
