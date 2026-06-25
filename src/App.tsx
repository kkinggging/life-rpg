// ============================================================
// 量化人生RPG — App 根组件
// ============================================================
import { useState, useEffect } from 'react'
import { StoreProvider, useStore } from './store'
import Dashboard from './pages/Dashboard'
import Checkin from './pages/Checkin'
import History from './pages/History'
import Calibration from './components/Calibration'
import BottomNav from './components/BottomNav'
import type { BaseAttr, BaseAttrs } from './types'
import { DEFAULT_BASE_ATTRS, DEFAULT_APP_STATE } from './types'

// ⚠️ 每次发版递增此版本号 → iOS PWA 自动检测并强制刷新
const APP_VERSION = '9'

async function checkVersionAndUpdate() {
  const stored = localStorage.getItem('app-version')
  if (stored === APP_VERSION) return // 版本一致，无需操作

  // 版本不一致 → 清除所有缓存 + 注销旧 SW
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map(k => caches.delete(k)))
  } catch { /* ignore */ }

  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map(r => r.unregister()))
  } catch { /* ignore */ }

  localStorage.setItem('app-version', APP_VERSION)
  window.location.reload()
}

// ============================================================
// Inner component (has access to store context)
// ============================================================

function AppInner() {
  const { state, importJSON } = useStore()
  const [tab, setTab] = useState<'dashboard' | 'checkin' | 'history'>('dashboard')
  const [showCalibration, setShowCalibration] = useState(false)
  const [checking, setChecking] = useState(true)

  // 版本检测 — 每次启动时运行
  useEffect(() => {
    checkVersionAndUpdate().finally(() => setChecking(false))
  }, [])

  // On mount: check if this is a first-time user
  useEffect(() => {
    if (checking) return
    const allDefault = (Object.keys(DEFAULT_BASE_ATTRS) as BaseAttr[]).every(
      (key) => state.baseAttrs[key] === DEFAULT_BASE_ATTRS[key],
    )
    const noRecords = !state.checkinRecords || state.checkinRecords.length === 0
    if (allDefault && noRecords) {
      setShowCalibration(true)
    }
  }, [checking]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCalibrationComplete = (values: Record<BaseAttr, number>) => {
    const newState = {
      ...DEFAULT_APP_STATE,
      baseAttrs: { ...values } as BaseAttrs,
    }
    importJSON(JSON.stringify(newState))
    setShowCalibration(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">⚔️ 加载中…</p>
      </div>
    )
  }

  if (showCalibration) {
    return <Calibration onComplete={handleCalibrationComplete} />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      {tab === 'dashboard' && (
        <Dashboard onStartCheckin={() => setTab('checkin')} />
      )}
      {tab === 'checkin' && (
        <Checkin
          onDone={() => setTab('dashboard')}
          onCancel={() => setTab('dashboard')}
        />
      )}
      {tab === 'history' && <History />}
      <BottomNav current={tab} onChange={setTab} />
    </div>
  )
}

// ============================================================
// Root component — wraps everything in StoreProvider
// ============================================================

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
