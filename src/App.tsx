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

// ============================================================
// Inner component (has access to store context)
// ============================================================

function AppInner() {
  const { state, importJSON } = useStore()
  const [tab, setTab] = useState<'dashboard' | 'checkin' | 'history'>('dashboard')
  const [showCalibration, setShowCalibration] = useState(false)

  // On mount: check if this is a first-time user (all attrs at default, no records)
  useEffect(() => {
    const allDefault = (Object.keys(DEFAULT_BASE_ATTRS) as BaseAttr[]).every(
      (key) => state.baseAttrs[key] === DEFAULT_BASE_ATTRS[key],
    )
    const noRecords = !state.checkinRecords || state.checkinRecords.length === 0
    if (allDefault && noRecords) {
      setShowCalibration(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // After calibration: persist the calibrated values and hide the calibration screen
  const handleCalibrationComplete = (values: Record<BaseAttr, number>) => {
    const newState = {
      ...DEFAULT_APP_STATE,
      baseAttrs: { ...values } as BaseAttrs,
    }
    importJSON(JSON.stringify(newState))
    setShowCalibration(false)
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
