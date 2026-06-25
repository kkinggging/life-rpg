// ============================================================
// 量化人生RPG — 打卡问答流
// ============================================================
import { useState, useMemo } from 'react'
import { CHECKINS, type CheckinDef, type Question } from '../utils'

interface Props {
  system: string
  onDone: (answers: Record<string, string>) => void
}

export default function CheckinFlow({ system, onDone }: Props) {
  const def: CheckinDef = CHECKINS.find(d => d.system === system)!
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [idx, setIdx] = useState(0)

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

  const pick = (val: string) => {
    const next = { ...answers, [q.id]: val }
    setAnswers(next)

    if (isLast) {
      // 收集完整答案（包含默认值的隐藏问题）
      const full: Record<string, string> = {}
      for (const qq of def.questions) {
        full[qq.id] = next[qq.id] ?? ''
      }
      onDone(full)
    } else {
      // 动画延迟进入下一题
      setTimeout(() => setIdx(i => i + 1), 120)
    }
  }

  return (
    <div className="flex flex-col">
      {/* 顶部：体系图标 + 标签 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{def.emoji}</span>
        <span className="text-sm text-slate-400">{def.label}</span>
      </div>

      {/* 步骤进度 */}
      <p className="text-xs text-slate-500 mb-5">
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
      <h2 className="text-lg font-semibold mb-5 text-center text-slate-100 px-2">
        {q.text}
      </h2>

      {/* 选项按钮 */}
      <div className="flex flex-col gap-2.5">
        {q.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => pick(opt.value)}
            className="tap flex items-center gap-4 px-4 py-3 min-h-[48px]
                       bg-slate-800 rounded-xl border border-slate-700/80
                       active:border-amber-500/60 active:bg-slate-700/80
                       transition-all text-left no-select"
          >
            <span className="text-2xl w-8 text-center">{opt.icon}</span>
            <span className="text-[15px] font-medium text-slate-200">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
