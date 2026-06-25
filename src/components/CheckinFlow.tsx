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

  // 已走的路径：线性遍历全量 def.questions，跳过不满足依赖的
  // 而非只过滤 visible —— 解决 dependsOn 题型首问即终的 bug
  const path: Question[] = useMemo(() => {
    const result: Question[] = []
    const currentAnswers: Record<string, string> = {}
    // 把当前已有答案回填，用于 forward-looking 依赖判断
    for (const [k, v] of Object.entries(answers)) currentAnswers[k] = v
    for (const q of def.questions) {
      if (!q.dependsOn) {
        result.push(q)
        continue
      }
      const depsOk = q.dependsOn.matches.includes(currentAnswers[q.dependsOn.questionId] ?? '')
      if (depsOk) result.push(q)
    }
    return result
  }, [answers, def.questions])

  const q = path[idx]
  const isLast = idx >= path.length - 1

  // 如果 Q1 选了某答案后 path 扩展出新题，但 idx 还没变 — 需要触发递进
  // 通过把递进逻辑放在 effect 中处理（但最简单的是在 pick 中处理）

  const pick = useCallback((val: string) => {
    if (locking || doneRef.current) return
    setLocking(true)

    // 1. 写入答案
    const next = { ...answers, [q.id]: val }
    setAnswers(next)

    // 2. 计算写上这个答案后，接下来还有没有可见的问题
    //    用 def.questions 全量扫描，和 path 的过滤逻辑一致
    const projected: Question[] = []
    for (const qq of def.questions) {
      if (!qq.dependsOn) { projected.push(qq); continue }
      // qq 依赖的 question 当前答案（可能在 next 中）
      const depVal = next[qq.dependsOn.questionId] ?? ''
      if (qq.dependsOn.matches.includes(depVal)) projected.push(qq)
    }
    // 当前 idx 指向的是刚回答完的题，如果 projected 后面还有题则递进
    const hasNext = idx + 1 < projected.length

    if (!hasNext) {
      // 真的到头了 —— 收工
      doneRef.current = true
      const full: Record<string, string> = {}
      for (const qq of def.questions) {
        full[qq.id] = next[qq.id] ?? ''
      }
      setTimeout(() => onDone(full), 350)
    } else {
      setTimeout(() => {
        setIdx(i => i + 1)
        setLocking(false)
      }, 200)
    }
  }, [locking, answers, q, idx, def.questions, onDone])

  // 当前问题文本
  const totalSteps = path.length

  return (
    <div className="flex flex-col">
      {/* 顶部：体系图标 + 标签 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{def.emoji}</span>
        <span className="text-sm text-slate-400">{def.label}</span>
      </div>

      {/* 步骤进度 */}
      <p className="text-xs text-slate-500 mb-1">
        第 {idx + 1}/{totalSteps} 问
      </p>

      {/* 进度条 */}
      <div className="h-1 bg-slate-700/60 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${((idx + 1) / totalSteps) * 100}%`,
            backgroundColor: def.color,
          }}
        />
      </div>

      {/* 当前问题 */}
      <h2 className="text-lg font-semibold mb-5 text-slate-100 px-2 leading-relaxed">
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

      {/* 回答反馈 */}
      {locking && (
        <div className="mt-4 py-3 px-4 bg-slate-800/60 rounded-xl border border-amber-500/30
                        text-center text-sm text-amber-400 animate-pop-in">
          {isLast ? '✓ 已记录，正在保存…' : '✓ 已选择，进入下一问…'}
        </div>
      )}
    </div>
  )
}
