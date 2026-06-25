// ============================================================
// 量化人生RPG — 历史页（周打卡网格 + 属性/技能 + 里程碑）
// ============================================================
import { useStore } from '../store'
import ExportImport from '../components/ExportImport'
import type { BaseAttr, DerivedSkill } from '../types'
import {
  BASE_ATTRS,
  DERIVED_SKILLS,
  ATTR_META,
  SKILL_META,
  MILESTONE_TIER_META,
} from '../types'
import { CHECKINS, thisWeekRange, todayISO } from '../utils'
import {
  BASE_ATTR_MILESTONES,
  DERIVED_SKILL_MILESTONES,
  getMilestone,
  type MilestoneEntry,
} from '../milestones'

/** 14 项指标联合数据 */
const ALL_INDICATORS: { key: string; emoji: string; label: string; color: string; milestones: MilestoneEntry[] }[] = [
  ...BASE_ATTRS.map((a) => ({
    key: a,
    emoji: ATTR_META[a as BaseAttr].emoji,
    label: ATTR_META[a as BaseAttr].label,
    color: ATTR_META[a as BaseAttr].color,
    milestones: BASE_ATTR_MILESTONES[a as BaseAttr],
  })),
  ...DERIVED_SKILLS.map((s) => ({
    key: s,
    emoji: SKILL_META[s as DerivedSkill].emoji,
    label: SKILL_META[s as DerivedSkill].label,
    color: SKILL_META[s as DerivedSkill].color,
    milestones: DERIVED_SKILL_MILESTONES[s as DerivedSkill],
  })),
]

/** 迷你进度条组件 */
function MiniBar({
  emoji,
  label,
  val,
  color,
}: {
  emoji: string
  label: string
  val: number
  color: string
}) {
  const pct = Math.min(100, Math.max(0, val))
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-20 shrink-0 text-slate-300">
        {emoji} {label}
      </span>
      <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="text-sm font-bold tabular-nums w-7 text-right"
        style={{ color }}
      >
        {val}
      </span>
    </div>
  )
}

export default function History() {
  const { state } = useStore()
  const { start } = thisWeekRange()

  // ── 本周日期（周一 ~ 周日） ──
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日']
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    weekDays.push(d.toISOString().split('T')[0])
  }
  const today = todayISO()

  // ── 运行时数据（store 实际写入的 key） ──
  const records = (state as unknown as { records: any[] }).records ?? []
  const attributes = (state as unknown as { attributes: Record<string, number> }).attributes ?? {}
  const weekRecs = records.filter((r: any) => weekDays.includes(r.date))
  const systems = CHECKINS.map((c) => c.system)

  // ── 基础属性（按值降序） ──
  const baseAttrKeys = BASE_ATTRS as unknown as string[]
  const sortedBase = [...baseAttrKeys].sort(
    (a, b) => (attributes[b] ?? 0) - (attributes[a] ?? 0),
  )

  // ── 衍生技能（初始值，后续可能由派生公式计算） ──
  const derivedKeys = DERIVED_SKILLS as unknown as string[]
  const derivedVals: Record<string, number> = {}
  for (const k of derivedKeys) {
    // 如果 store 尚未展开 derivedSkills，则使用默认值
    derivedVals[k] = Math.round(
      ((state as any).derivedSkills?.[k] ??
        // 回退：以各基础属性均值作为临时技能值
        attributes[k] ??
        20),
    )
  }
  const sortedDerived = [...derivedKeys].sort(
    (a, b) => (derivedVals[b] ?? 0) - (derivedVals[a] ?? 0),
  )

  return (
    <div className="px-4 pt-6 pt-safe max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-slate-100 mb-4">📅 历史记录</h1>

      {/* ════════════════════════════════════════════════════════════
          本周打卡网格
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          本周打卡网格
        </h2>
        <div className="overflow-x-auto -mx-1">
          <table
            className="w-full text-center text-xs border-separate"
            style={{ borderSpacing: '2px 4px' }}
          >
            <thead>
              <tr>
                <th className="py-1 w-8" />
                {dayLabels.map((d, i) => (
                  <th
                    key={i}
                    className={`py-1 font-medium ${
                      weekDays[i] === today
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {systems.map((sys) => {
                const cfg = CHECKINS.find((c) => c.system === sys)!
                return (
                  <tr key={sys}>
                    <td className="py-2 text-left">
                      <span className="text-base">{cfg.emoji}</span>
                    </td>
                    {weekDays.map((day) => {
                      const hit = weekRecs.some(
                        (r: any) => r.date === day && r.system === sys,
                      )
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
          本周打卡 {weekRecs.length} 次
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════
          基础属性
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          基础属性
        </h2>
        <div className="space-y-2.5">
          {sortedBase.map((key) => {
            const meta = ATTR_META[key as BaseAttr]
            const val = Math.round(attributes[key] ?? 0)
            return (
              <MiniBar
                key={key}
                emoji={meta.emoji}
                label={meta.label}
                val={val}
                color={meta.color}
              />
            )
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          衍生技能
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          衍生技能
        </h2>
        <div className="space-y-2.5">
          {sortedDerived.map((key) => {
            const meta = SKILL_META[key as DerivedSkill]
            const val = Math.round(derivedVals[key] ?? 0)
            return (
              <MiniBar
                key={key}
                emoji={meta.emoji}
                label={meta.label}
                val={val}
                color={meta.color}
              />
            )
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          里程碑总览（14 项指标）
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          里程碑总览
        </h2>

        {/* 层级图例 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(MILESTONE_TIER_META).map(([tier, meta]) => (
            <span
              key={tier}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-700/50 text-[10px] text-slate-400"
            >
              <span
                className="w-3.5 h-3.5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-[8px] font-bold"
              >
                {tier}
              </span>
              {meta.label}
            </span>
          ))}
        </div>

        {/* 各项指标当前里程碑 */}
        <div className="space-y-1">
          {ALL_INDICATORS.map((ind) => {
            const isBase = (BASE_ATTRS as unknown as string[]).includes(ind.key)
            const val = Math.round(
              isBase
                ? (attributes[ind.key] ?? 0)
                : (derivedVals[ind.key] ?? 0),
            )
            const ms = getMilestone(val, ind.milestones)
            const tierMeta = ms
              ? MILESTONE_TIER_META[ms.tier]
              : null

            return (
              <div
                key={ind.key}
                className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors"
              >
                {/* 名称 */}
                <span className="w-24 shrink-0 text-slate-300 truncate">
                  {ind.emoji} {ind.label}
                </span>

                {/* 数值 */}
                <span className="w-6 text-right tabular-nums text-slate-500">
                  {val}
                </span>

                {/* 里程碑标签 */}
                <span className="flex-1 text-slate-400 truncate">
                  {ms?.label ?? '—'}
                </span>

                {/* 层级徽章 */}
                {ms && (
                  <span
                    className="shrink-0 w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-[10px] font-bold"
                    title={tierMeta ? `${tierMeta.label} · ${tierMeta.description}` : ''}
                  >
                    {ms.tier}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          导出/导入
      ════════════════════════════════════════════════════════════ */}
      <ExportImport />

      <div className="h-4" />
    </div>
  )
}
