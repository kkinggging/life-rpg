// ============================================================
// 量化人生RPG — 打卡页 v6
// ============================================================
import { useState, useEffect, useRef } from 'react'
import type { BaseAttr, DerivedSkill } from '../types'
import { ATTR_META, SKILL_META } from '../types'
import { useStore } from '../store'
import CheckinFlow from '../components/CheckinFlow'
import QFilterPanel from '../components/QFilterPanel'
import { CHECKINS } from '../utils'

interface Props {
  onDone: () => void
  onCancel: () => void
}

export default function Checkin({ onDone, onCancel }: Props) {
  const { addCheckin, answerQFilter, state } = useStore()
  const [sys, setSys] = useState<string | null>(null)
  const [result, setResult] = useState<ReturnType<typeof addCheckin>>(null)
  const [showQFilter, setShowQFilter] = useState(false)
  const [qfilterResolved, setQfilterResolved] = useState(false)
  const qfilterStartRef = useRef(0)

  const handlePick = (s: string) => setSys(s)

  const handleDone = (answers: Record<string, string>) => {
    if (!sys) return
    const r = addCheckin(sys, answers)
    setResult(r)
  }

  const handleQFilterAnswer = (answer: number, responseTime: number) => {
    if (!result?.qfilterPending) return
    answerQFilter(result.qfilterPending, answer, responseTime)
    setQfilterResolved(true)
  }

  const handleQFilterSkip = () => {
    if (!result?.qfilterPending) return
    const rt = Date.now() - qfilterStartRef.current
    // -1 is the skip sentinel — store.tsx answerQFilter detects it and applies low rate
    answerQFilter(result.qfilterPending, -1, rt)
    setQfilterResolved(true)
  }

  const handleMore = () => {
    setSys(null)
    setResult(null)
    setShowQFilter(false)
    setQfilterResolved(false)
  }

  // When result arrives and has pending QFilter, show it
  useEffect(() => {
    if (result?.qfilterPending) {
      qfilterStartRef.current = Date.now()
      // Small delay so the user sees the completion first
      const t = setTimeout(() => setShowQFilter(true), 500)
      return () => clearTimeout(t)
    }
  }, [result])

  // ── Stage 1: 选体系 ──
  if (!sys) {
    return (
      <div className="px-4 pt-safe pt-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onCancel} className="tap text-slate-400 text-base no-select">← 返回</button>
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
  if (!result) {
    return (
      <div className="px-4 pt-safe pt-6 max-w-lg mx-auto">
        <button onClick={() => setSys(null)} className="tap text-slate-400 text-base mb-5 no-select">
          ← 换一个
        </button>
        <CheckinFlow system={sys} onDone={handleDone} />
      </div>
    )
  }

  // ── Stage 3: QFilter 弹窗 ──
  if (showQFilter && result.qfilterPending && !qfilterResolved) {
    return (
      <div className="px-4 pt-safe pt-6 max-w-lg mx-auto">
        <QFilterPanel
          pending={result.qfilterPending}
          onAnswer={handleQFilterAnswer}
          onSkip={handleQFilterSkip}
        />
      </div>
    )
  }

  // ── Stage 4: 完成 ──
  const changes = Object.entries(result.bonus).filter(([, v]) => v !== 0)
  const derivedChanges = (Object.keys(result.newDerived) as DerivedSkill[])
    .filter(sk => {
      const p = result.previousDerived[sk] ?? 0
      const n = result.newDerived[sk] ?? 0
      return Math.abs(n - p) > 0.1
    })
    .map(sk => ({
      key: sk,
      prev: result.previousDerived[sk] ?? 0,
      now: state.derivedSkills[sk] ?? result.newDerived[sk] ?? 0,
    }))

  return (
    <div className="px-4 pt-safe pt-6 max-w-lg mx-auto flex flex-col items-center text-center">
      <div className="text-6xl mb-3 animate-pop-in">✨</div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">打卡完成！</h2>
      <p className="text-sm text-slate-500 mb-5">{def.label}已记录</p>

      {/* 基础属性变化 */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 w-full border border-slate-700/30">
        <h3 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">基础属性变化</h3>
        {changes.length > 0 ? (
          <div className="space-y-2.5">
            {changes.map(([k, v]) => {
              const key = k as BaseAttr
              const meta = ATTR_META[key]
              if (!meta) return null
              const val = v as number
              return (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">{meta.emoji} {meta.label}</span>
                  <span className={`text-sm font-bold tabular-nums animate-flash ${val > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {val > 0 ? '+' : ''}{val.toFixed(1)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">今日休息也是一种策略。</p>
        )}
      </div>

      {/* 衍生技能变化 */}
      {derivedChanges.length > 0 && (
        <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 w-full border border-slate-700/30">
          <h3 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">衍生技能变化</h3>
          <div className="space-y-2.5">
            {derivedChanges.map(({ key, prev, now }) => {
              const meta = SKILL_META[key]
              return (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">{meta.emoji} {meta.label}</span>
                  <span className="text-slate-400 tabular-nums">
                    {Math.round(prev)} → <span className="text-blue-400 font-bold">{Math.round(now)}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* QFilter 结果标记 */}
      {qfilterResolved && (
        <div className="text-[11px] text-amber-400/80 mb-3">🧬 过渡提问已完成 · 增幅已调整</div>
      )}

      <button
        onClick={onDone}
        className="w-full max-w-xs tap px-4 py-4 bg-amber-500 rounded-2xl
                   font-bold text-lg text-slate-900
                   active:scale-[0.97] transition-transform no-select mt-2"
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
