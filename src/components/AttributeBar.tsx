// ============================================================
// 量化人生RPG — 属性条组件
// ============================================================

import {
  ATTR_META,
  SKILL_META,
  ATTR_MILESTONES,
  SKILL_MILESTONES,
  getMilestone,
} from '../types'
import type { BaseAttr, DerivedSkill } from '../types'

interface Props {
  /** 指标名称，如 'charm'、'mastery' */
  name: string
  /** 当前数值 0-100 */
  value: number
  /** 基础属性 or 衍生技能 */
  type: 'base' | 'derived'
  /** 覆写颜色（可选，默认从 ATTR_META / SKILL_META 读取） */
  color?: string
  /** 覆写 emoji（可选） */
  emoji?: string
  /** 覆写中文标签（可选） */
  label?: string
  /** 点击展开详情 */
  onClick?: () => void
}

export default function AttributeBar({
  name,
  value,
  type,
  color,
  emoji,
  label,
  onClick,
}: Props) {
  // ── 1. 查找元数据 ──
  const meta =
    type === 'base'
      ? ATTR_META[name as BaseAttr]
      : SKILL_META[name as DerivedSkill]

  const milestones =
    type === 'base'
      ? ATTR_MILESTONES[name as BaseAttr]
      : SKILL_MILESTONES[name as DerivedSkill]

  // ── 2. 计算衍生值 ──
  const pct = Math.min(100, Math.max(0, value))
  const resolvedColor = color ?? meta?.color ?? '#6366f1'
  const resolvedEmoji = emoji ?? meta?.emoji ?? '📊'
  const resolvedLabel = label ?? meta?.label ?? name
  const milestone = milestones ? getMilestone(pct, milestones) : undefined

  // ── 3. 渲染 ──
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={[
        'relative tap no-select px-4 py-2',
        'transition-colors duration-150',
        onClick ? 'cursor-pointer active:bg-white/5' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {/* 头部：左侧 emoji+标签 / 右侧 数值+里程碑 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
          <span aria-hidden="true">{resolvedEmoji}</span>
          <span>{resolvedLabel}</span>
        </span>

        <span className="flex items-center gap-2">
          {milestone && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-700/80 text-slate-400 font-medium leading-tight">
              {milestone.label}
            </span>
          )}
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: resolvedColor }}
          >
            {Math.round(pct)}
          </span>
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-2.5 bg-slate-700/70 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full attr-bar"
          style={{
            width: `${pct}%`,
            backgroundColor: resolvedColor,
            boxShadow: `0 0 10px ${resolvedColor}33`,
          }}
        />
      </div>
    </div>
  )
}
