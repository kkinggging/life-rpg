// ============================================================
// 量化人生RPG — 数据导出/导入 & 里程碑总览
// ============================================================
import { useState } from 'react'
import { useStore } from '../store'
import { MILESTONE_TIER_META } from '../types'

export default function ExportImport() {
  const { exportJSON, importJSON, markBackup, state } = useStore()
  const [showMilestones, setShowMilestones] = useState(false)

  const doExport = () => {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `life-rpg-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    markBackup()
  }

  const doImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const ok = importJSON(reader.result as string)
        if (ok) {
          alert('数据导入成功！即将刷新页面。')
          window.location.reload()
        } else {
          alert('数据格式不正确，导入失败。')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const tiers = Object.entries(MILESTONE_TIER_META).map(([tier, meta]) => ({
    tier: Number(tier),
    ...meta,
  }))

  return (
    <div className="space-y-3">
      {/* --- 导出 --- */}
      <button
        onClick={doExport}
        className="w-full tap flex items-center justify-center gap-2 px-4 py-3.5
                   bg-amber-600/90 rounded-xl font-semibold text-[15px]
                   active:bg-amber-700 transition-colors no-select"
      >
        📤 导出数据备份
      </button>

      {/* --- 导入 --- */}
      <button
        onClick={doImport}
        className="w-full tap flex items-center justify-center gap-2 px-4 py-3
                   bg-slate-800 rounded-xl font-medium text-[15px] text-slate-300
                   active:bg-slate-700 transition-colors no-select"
      >
        📥 导入数据恢复
      </button>

      {/* --- 里程碑总览 --- */}
      <button
        onClick={() => setShowMilestones(v => !v)}
        className="w-full tap flex items-center justify-center gap-2 px-4 py-3
                   bg-slate-800 rounded-xl font-medium text-[15px] text-slate-300
                   active:bg-slate-700 transition-colors no-select"
      >
        🔄 查看里程碑
      </button>

      {showMilestones && (
        <div className="rounded-xl bg-slate-800/60 p-4 space-y-2">
          <p className="text-[13px] font-semibold text-slate-200 mb-2">里程碑层级总览</p>
          {tiers.map(t => (
            <div key={t.tier} className="flex items-start gap-2 text-[12px]">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-600/30 text-amber-400
                               flex items-center justify-center text-[10px] font-bold mt-0.5">
                {t.tier}
              </span>
              <div>
                <p className="text-slate-300 font-medium">
                  {t.range[0]}-{t.range[1]} · {t.label}
                </p>
                <p className="text-slate-500 leading-relaxed">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- 上次备份时间 --- */}
      {state.lastBackup && (
        <p className="text-[11px] text-slate-500 text-center">
          上次备份：{new Date(state.lastBackup).toLocaleString('zh-CN')}
        </p>
      )}

      {/* --- 帮助提示 --- */}
      <p className="text-[11px] text-slate-500 text-center pt-1">
        数据仅存储在你的手机本地，建议每周导出备份
      </p>
    </div>
  )
}
