// ============================================================
// 量化人生RPG — 打卡页
// ============================================================
import { useState } from 'react'
import type { DerivedSkill, BaseAttr } from '../types'
import { ATTR_META } from '../types'
import { useStore } from '../store'
import CheckinFlow from '../components/CheckinFlow'
import QFilterPanel from '../components/QFilterPanel'
import { CHECKINS } from '../utils'

interface Props {
  onDone: () => void
  onCancel: () => void
}

/** addCheckin 返回值 */
interface CheckinOutcome {
  bonus: Partial<Record<string, number>>
  qfilterTriggered: boolean
  targetSkill?: DerivedSkill
}

export default function Checkin({ onDone, onCancel }: Props) {
  const { addCheckin, answerQFilter } = useStore()
  const [sys, setSys] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<CheckinOutcome | null>(null)
  const [qfilterDone, setQfilterDone] = useState(false)

  const handlePick = (s: string) => setSys(s)

  const handleDone = (answers: Record<string, string>) => {
    if (!sys) return
    const result = addCheckin(sys, answers) as unknown as CheckinOutcome
    setOutcome({ ...result, qfilterTriggered: result.qfilterTriggered ?? false })
  }

  const handleMore = () => {
    setSys(null)
    setOutcome(null)
    setQfilterDone(false)
  }

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
                  {c.questions.length}个问题
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
  if (!outcome) {
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
  const changes = Object.entries(outcome.bonus).filter(([, v]) => v !== 0)
  const showQFilter = outcome.qfilterTriggered && !!outcome.targetSkill && !qfilterDone

  return (
    <div className="px-4 pt-6 pt-safe max-w-lg mx-auto flex flex-col items-center text-center">
      {/* 完成动画 */}
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
              const key = k as BaseAttr
              const meta = ATTR_META[key]
              if (!meta) return null
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

      {/* QFilter 面板 */}
      {showQFilter && (
        <QFilterPanel
          skill={outcome.targetSkill!}
          onAnswer={(questionId, answer, responseTime) => {
            answerQFilter(outcome.targetSkill!, questionId, answer, responseTime)
            setQfilterDone(true)
          }}
          onSkip={() => setQfilterDone(true)}
        />
      )}

      {/* 操作按钮 — QFilter 完成/不触发时显示 */}
      {!showQFilter && (
        <>
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
        </>
      )}
    </div>
  )
}
