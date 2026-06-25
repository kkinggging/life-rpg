// ============================================================
// 量化人生RPG — 打卡问答流
// ============================================================
import { useState, useMemo, useRef, useCallback } from 'react'
import { CHECKINS, type CheckinDef, type Question } from '../utils'

interface Props {
  system: string
  onDone: (answers: Record<string, string>) => void
}

export default function CheckinFlow({ system, onDone }: Props) {
  const def: CheckinDef = CHECKINS.find(d => d.system === system)!
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [idx, setIdx] = useState(0)
  const [locking, setLocking] = useState(false)
  const doneRef = useRef(false)

  // 根据依赖过滤可见问题
  const visible: Question[] = useMemo(
    () => def.questions.filter(q => {
      if (!q.dependsOn) return true
      return q.dependsOn.matches.includes(answers[q.dependsOn.questionId] || '')
    }),
    [answers, def],
  )

  const q: Question = visible[idx]
  const isLast: boolean = idx >= visible.length - 1

  const pick = useCallback((val: string) => {
    // 防止重复点击
    if (locking) return
    setLocking(true)

    const next = { ...answers, [q.id]: val }
    setAnswers(next)

    if (isLast) {
      if (doneRef.current) return
      doneRef.current = true
      // 收集完整答案（包含默认值的隐藏问题）
      const full: Record<string, string> = {}
      for (const qq of def.questions) {
        full[qq.id] = next[qq.id] ?? ''
      }
      // 短延迟给用户看回答效果
      setTimeout(() => onDone(full), 250)
    } else {
      setTimeout(() => {
        setIdx(i => i + 1)
        setLocking(false)
      }, 200)
    }
  }, [locking, answers, q, isLast, def.questions, onDone, idx])

  return (
    <div className="flex flex-col">
      {/* 顶部：体系图标 + 标签 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{def.emoji}</span>
        <span className="text-sm text-slate-400">{def.label}</span>
      </div>

      {/* 步骤进度 */}
      <p className="text-xs text-slate-500 mb-1">
        第 {idx + 1}/{visible.length} 问
      </p>

      {/* 进度条 */}
      <div className="h-1 bg-slate-700/60 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${((idx + 1) / visible.length) * 100}%`,
            backgroundColor: def.color,
          }}
        />
      </div>

      {/* 当前问题 */}
      <h2 className="text-lg font-semibold mb-5 text-slate-100 px-2">
        {q.text}
      </h2>

      {/* 选项按钮 */}
      <div className="flex flex-col gap-2.5">
        {q.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => pick(opt.value)}
            disabled={locking}
            className="tap flex items-center gap-4 px-4 py-3 min-h-[48px]
                       bg-slate-800 rounded-xl border border-slate-700/80
                       active:border-amber-500/60 active:bg-slate-700/80
                       disabled:opacity-60 disabled:cursor-not-allowed
                       transition-all text-left no-select"
          >
            <span className="text-2xl w-8 text-center">{opt.icon}</span>
            <span className="text-[15px] font-medium text-slate-200">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* 回答反馈 — 选完后短暂显示 */}
      {locking && (
        <div className="mt-4 py-3 px-4 bg-slate-800/60 rounded-xl border border-amber-500/30
                        text-center text-sm text-amber-400 animate-pop-in">
          {isLast ? '✓ 已记录，正在保存…' : '✓ 已选择，进入下一问…'}
        </div>
      )}
    </div>
  )
}
