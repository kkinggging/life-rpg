// ============================================================
// 量化人生RPG — 仪表板（首页）
// ============================================================
import { useStore } from '../store'
import AttributeBar from '../components/AttributeBar'
import ExportImport from '../components/ExportImport'
import { BASE_ATTRS, DERIVED_SKILLS } from '../types'
import type { BaseAttr, DerivedSkill, CheckinSystem } from '../types'
import { CHECKINS, todayISO } from '../utils'
import { calcGamma } from '../math'

interface Props {
  onStartCheckin: () => void
}

export default function Dashboard({ onStartCheckin }: Props) {
  const { state } = useStore()

  const today = todayISO()

  // ── 今日已打卡系统 ──
  const todayRecs = state.checkinRecords.filter(r => r.date === today)
  const doneSystems = new Set(todayRecs.map(r => r.system))

  // ── 日期格式化：月/日 星期 ──
  const dateStr = new Date().toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="px-4 pt-safe pb-4 max-w-lg mx-auto">
      {/* ── 顶部：标题 + 日期 ── */}
      <div className="flex items-center justify-between mb-1 mt-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-100">⚔️ 个人 OS</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">v7</span>
        </div>
        <span className="text-xs text-slate-500">{dateStr}</span>
      </div>

      {/* ── 今日打卡状态条 ── */}
      <div className="flex flex-wrap gap-2 mb-5 mt-2">
        {CHECKINS.map(c => {
          const done = doneSystems.has(c.system as CheckinSystem)
          return (
            <span
              key={c.system}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                done
                  ? 'bg-green-900/40 text-green-400 border border-green-700/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/30'
              }`}
            >
              {done ? '✅' : '⬜'} {c.label}
            </span>
          )
        })}
      </div>

      {/* ── 基础属性 ── */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          基础属性
        </h2>
        <div className="divide-y divide-slate-700/30">
          {BASE_ATTRS.map((attr: BaseAttr) => (
            <AttributeBar
              key={attr}
              name={attr}
              value={state.baseAttrs[attr]}
              type="base"
            />
          ))}
        </div>
      </div>

      {/* ── 衍生技能 ── */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700/30">
        <h2 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          衍生技能
        </h2>
        <div className="divide-y divide-slate-700/30">
          {DERIVED_SKILLS.map((skill: DerivedSkill) => (
            <AttributeBar
              key={skill}
              name={skill}
              value={state.derivedSkills[skill]}
              type="derived"
            />
          ))}
        </div>
      </div>

      {/* ── 打卡主按钮 ── */}
      <button
        onClick={onStartCheckin}
        className="w-full tap flex items-center justify-center gap-3 px-4 py-5
                   bg-gradient-to-r from-amber-500 to-orange-500
                   rounded-2xl font-bold text-lg text-slate-900
                   active:scale-[0.97] transition-transform mb-5
                   shadow-lg shadow-amber-500/20 no-select"
      >
        ✍️ 今日打卡
      </button>

      {/* ── 统计信息 ── */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <span className="text-[11px] text-slate-500">
          掌控感阻尼: {calcGamma(state.derivedSkills.macroControl).toFixed(2)}
        </span>
        <span className="text-slate-700">·</span>
        <span className="text-[11px] text-slate-500">
          📋 {state.checkinRecords.length} 次记录
        </span>
      </div>

      {/* ── 导出/导入 ── */}
      <ExportImport />

      {/* ── 底部留白 ── */}
      <div className="h-4" />
    </div>
  )
}
