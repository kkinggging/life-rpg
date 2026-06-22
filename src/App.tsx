// ============================================================
// 量化人生RPG — App 根组件
// ============================================================
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Checkin from './pages/Checkin'
import History from './pages/History'
import BottomNav from './components/BottomNav'
import type { Tab } from './components/BottomNav'

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')

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
