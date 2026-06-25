// ============================================================
// 量化人生RPG — Q_filter 过渡筛选提问面板
// 缓冲池触发后弹出，用于校准衍生技能值
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react'
import type { DerivedSkill } from '../types'
import { SKILL_META } from '../types'
import { pickRandomQuestion, getConfidence } from '../qfilter'
import type { QFilterQuestion } from '../qfilter'

interface Props {
  skill: DerivedSkill
  onAnswer: (questionId: string, answer: number, responseTime: number) => void
  onSkip: () => void
}

export default function QFilterPanel({ skill, onAnswer, onSkip }: Props) {
  const [question, setQuestion] = useState<QFilterQuestion | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // 组件挂载时随机抽取题目并记录起始时间
  useEffect(() => {
    const q = pickRandomQuestion(skill)
    setQuestion(q)
    startTimeRef.current = Date.now()
  }, [skill])

  const handleSelect = useCallback(
    (value: number) => {
      if (!question) return
      const responseTime = Date.now() - startTimeRef.current
      onAnswer(question.id, value, responseTime)
    },
    [question, onAnswer],
  )

  const meta = SKILL_META[skill]

  // 无匹配题目时的降级展示
  if (!question) {
    return (
      <div className="mx-4 mt-6 p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 text-center">
        <p className="text-slate-400 text-sm mb-4">
          暂无 {meta.label} 的筛选题目，请跳过。
        </p>
        <button
          onClick={onSkip}
          className="tap px-8 py-3 bg-slate-700/80 rounded-xl border border-slate-600/60
                     text-slate-300 text-sm font-medium
                     active:bg-slate-600/80 transition-colors no-select"
        >
          跳过
        </button>
      </div>
    )
  }

  return (
    <div
      className="mx-4 mt-6 bg-slate-800/95 rounded-2xl border border-slate-700/80
                 shadow-lg shadow-black/30 overflow-hidden animate-pop-in"
    >
      {/* ── 头部：筛选提示 ── */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-slate-700/60">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-lg">
          🔬
        </div>
        <div>
          <p className="text-amber-400 text-sm font-semibold tracking-wide">
            过渡筛选提问
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            系统正在校准 {meta.emoji} {meta.label} 数值
          </p>
        </div>
      </div>

      {/* ── 目标技能标签 ── */}
      <div className="px-5 pt-4 pb-1">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </span>
        <span className="ml-2 text-xs text-slate-500">
          {question.dimension}
        </span>
      </div>

      {/* ── 问题文本 ── */}
      <div className="px-5 pt-3 pb-4">
        <p className="text-[15px] leading-relaxed text-slate-200 font-medium">
          {question.text}
        </p>
      </div>

      {/* ── 选项按钮 ── */}
      <div className="px-5 pb-4 flex flex-col gap-2.5">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className="tap flex items-center gap-4 px-4 py-3.5 bg-slate-700/70
                       rounded-xl border border-slate-600/70
                       active:border-amber-500/50 active:bg-slate-600/80
                       transition-all text-left no-select group"
          >
            <span className="text-xl w-8 text-center flex-shrink-0">
              {opt.icon}
            </span>
            <span className="text-[14px] font-medium text-slate-200 flex-1">
              {opt.label}
            </span>
            <span className="text-xs text-slate-500 font-mono group-active:text-amber-400 transition-colors">
              +{opt.value}
            </span>
          </button>
        ))}
      </div>

      {/* ── 跳过按钮 ── */}
      <div className="px-5 pb-5">
        <button
          onClick={onSkip}
          className="tap w-full py-3 bg-transparent rounded-xl border border-slate-700/60
                     text-slate-500 text-sm
                     active:border-slate-600 active:text-slate-400
                     transition-colors no-select"
        >
          跳过
        </button>
      </div>
    </div>
  )
}
