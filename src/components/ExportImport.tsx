// ============================================================
// 量化人生RPG — 数据导出/导入
// ============================================================
import { useStore } from '../store'

export default function ExportImport() {
  const { exportJSON, importJSON, markBackup, state } = useStore()

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
          alert('✅ 数据导入成功！即将刷新页面。')
          window.location.reload()
        } else {
          alert('❌ 数据格式不正确，导入失败。')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="space-y-3">
      <button
        onClick={doExport}
        className="w-full tap flex items-center justify-center gap-2 px-4 py-3.5
                   bg-amber-600/90 rounded-xl font-semibold text-[15px]
                   active:bg-amber-700 transition-colors no-select"
      >
        📤 导出数据备份
      </button>

      <button
        onClick={doImport}
        className="w-full tap flex items-center justify-center gap-2 px-4 py-3
                   bg-slate-800 rounded-xl font-medium text-[15px] text-slate-300
                   active:bg-slate-700 transition-colors no-select"
      >
        📥 导入数据恢复
      </button>

      {state.lastBackup && (
        <p className="text-[11px] text-slate-500 text-center">
          上次备份：{new Date(state.lastBackup).toLocaleString('zh-CN')}
        </p>
      )}

      <p className="text-[11px] text-slate-500 text-center pt-1">
        💡 数据仅存储在你的手机本地，建议每周导出一份备份。
      </p>
    </div>
  )
}
