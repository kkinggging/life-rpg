// ============================================================
// 量化人生RPG — 属性条组件
// ============================================================
import type { Attributes } from '../types'
import { ATTR_META, tierLabel } from '../types'

interface Props {
  name: keyof Attributes
  value: number
  onClick?: () => void
}

export default function AttributeBar({ name, value, onClick }: Props) {
  const m = ATTR_META[name]
  const pct = Math.min(100, Math.max(0, value))

  const tier = tierLabel(pct)

  return (
    <div
      className={`py-2.5 ${onClick ? 'cursor-pointer active:opacity-70' : ''} no-select`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-200">
          {m.emoji} {m.label}
        </span>
        <span className="flex items-center gap-1.5">
          {tier && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-700/80 text-slate-400 font-medium">
              {tier}
            </span>
          )}
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: m.color }}
          >
            {Math.round(pct)}
          </span>
        </span>
      </div>
      <div className="h-2.5 bg-slate-700/70 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full attr-bar"
          style={{
            width: `${pct}%`,
            backgroundColor: m.color,
            boxShadow: `0 0 10px ${m.color}33`,
          }}
        />
      </div>
    </div>
  )
}
