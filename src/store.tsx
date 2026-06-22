// ============================================================
// 量化人生RPG — 全局状态管理
// ============================================================
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import type { AppState, Attributes, CheckinRecord, CheckinSystem } from './types'
import { DEFAULT_ATTRIBUTES, tierMultiplier } from './types'
import { CHECKINS, uid, todayISO } from './utils'

const KEY = 'life-rpg-state'

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as AppState
      if (s.attributes && s.records) return s
    }
  } catch { /* corrupt */ }
  return { attributes: { ...DEFAULT_ATTRIBUTES }, records: [], lastBackup: null }
}

function save(s: AppState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* quota */ }
}

// --- Reducer ---
type Action =
  | { type: 'CHECKIN'; record: CheckinRecord; bonus: Partial<Attributes> }
  | { type: 'IMPORT'; state: AppState }
  | { type: 'MARK_BACKUP' }

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'CHECKIN': {
      const attrs = { ...s.attributes }
      for (const [k, v] of Object.entries(a.bonus)) {
        if (v === undefined || v === 0) continue
        const key = k as keyof Attributes
        const multi = tierMultiplier(attrs[key])
        const delta = v * multi
        attrs[key] = Math.max(0, Math.min(100, Math.round((attrs[key] + delta) * 10) / 10))
      }
      const ns = { ...s, attributes: attrs, records: [...s.records, a.record] }
      save(ns)
      return ns
    }
    case 'IMPORT':
      save(a.state)
      return a.state
    case 'MARK_BACKUP': {
      const ns = { ...s, lastBackup: new Date().toISOString() }
      save(ns)
      return ns
    }
  }
}

// --- Context ---
interface Ctx {
  state: AppState
  addCheckin: (sys: CheckinSystem, answers: Record<string, string>) => Partial<Attributes>
  exportJSON: () => string
  importJSON: (json: string) => boolean
  markBackup: () => void
}

const C = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, load)

  // 每次 state 变化存盘（reducer 已存，这里是双保险）
  useEffect(() => { save(state) }, [state])

  const addCheckin = useCallback((sys: CheckinSystem, answers: Record<string, string>) => {
    const def = CHECKINS.find(d => d.system === sys)
    if (!def) return {}
    const bonus = def.calcBonus(answers)
    const rec: CheckinRecord = {
      id: uid(),
      date: todayISO(),
      system: sys,
      answers,
      attributeChanges: bonus,
    }
    dispatch({ type: 'CHECKIN', record: rec, bonus })
    return bonus
  }, [])

  const exportJSON = useCallback(() => JSON.stringify(state, null, 2), [state])

  const importJSON = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as AppState
      if (!parsed.attributes || !Array.isArray(parsed.records)) return false
      dispatch({ type: 'IMPORT', state: parsed })
      return true
    } catch { return false }
  }, [])

  const markBackup = useCallback(() => dispatch({ type: 'MARK_BACKUP' }), [])

  return (
    <C.Provider value={{ state, addCheckin, exportJSON, importJSON, markBackup }}>
      {children}
    </C.Provider>
  )
}

export function useStore() {
  const ctx = useContext(C)
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用')
  return ctx
}
