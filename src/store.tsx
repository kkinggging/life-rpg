// ============================================================
// Personal OS RPG — 全局状态管理 v6
// ============================================================
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import type {
  BaseAttr,
  DerivedSkill,
  BaseAttrs,
  DerivedSkills,
  AppState,
  CheckinRecord,
  QFilterRecord,
  BufferPool,
  BlackBox,
} from './types'
import { tierMultiplier } from './types'
import { calcAllDerivedSkills, calcGamma, bufferPoolCheck } from './math'
import { pickRandomQuestion, getConfidence, QUESTIONS } from './qfilter'
import { CHECKINS, uid, todayISO } from './utils'
import type { CheckinDef } from './utils'

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'life-rpg-state'

const BASE_ATTR_KEYS: ReadonlySet<string> = new Set([
  'charm', 'strength', 'intellect', 'social',
  'willpower', 'health', 'courage', 'abstinence',
])

// ============================================================
// Initial State
// ============================================================

const INITIAL_BASE_ATTRS: BaseAttrs = {
  charm: 25, strength: 25, intellect: 35, social: 25,
  willpower: 25, health: 25, courage: 25, abstinence: 20,
}

function computeInitialDerived(base: BaseAttrs): DerivedSkills {
  const mock: AppState = {
    baseAttrs: base,
    derivedSkills: {} as DerivedSkills,
    checkinRecords: [], qfilterRecords: [], bufferPools: [],
    blackBoxes: [], lastBackup: null, daysSinceFirstUse: 0, blindTestResults: [],
  }
  const { skills } = calcAllDerivedSkills(mock)
  return skills
}

const INITIAL_DERIVED_SKILLS = computeInitialDerived(INITIAL_BASE_ATTRS)

const INITIAL_STATE: AppState = {
  baseAttrs: { ...INITIAL_BASE_ATTRS },
  derivedSkills: { ...INITIAL_DERIVED_SKILLS },
  checkinRecords: [], qfilterRecords: [], bufferPools: [],
  blackBoxes: [], lastBackup: null, daysSinceFirstUse: 0, blindTestResults: [],
}

// ============================================================
// Persistence
// ============================================================

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.baseAttrs) {
        const mock: AppState = { ...parsed, bufferPools: [] }
        const { skills } = calcAllDerivedSkills(mock)
        return { ...parsed, derivedSkills: skills }
      }
    }
  } catch { /* corrupt */ }
  return {
    ...INITIAL_STATE,
    baseAttrs: { ...INITIAL_BASE_ATTRS },
    derivedSkills: { ...INITIAL_DERIVED_SKILLS },
  }
}

function saveState(s: AppState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* quota */ }
}

// ============================================================
// Reducer
// ============================================================

type Action =
  | { type: 'CHECKIN'; record: CheckinRecord; baseAttrDelta: Partial<BaseAttrs>; qFilterBonuses?: Partial<Record<DerivedSkill, number>> }
  | { type: 'QFILTER_SAVE'; record: QFilterRecord }
  | { type: 'IMPORT'; state: AppState }
  | { type: 'MARK_BACKUP' }

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'CHECKIN': {
      const attrs = { ...s.baseAttrs }
      for (const [k, v] of Object.entries(a.baseAttrDelta)) {
        if (v === undefined || v === 0) continue
        if (!BASE_ATTR_KEYS.has(k)) continue
        const key = k as keyof BaseAttrs
        const multi = tierMultiplier(attrs[key])
        attrs[key] = Math.max(0, Math.min(100, Math.round((attrs[key] + v * multi) * 10) / 10))
      }

      const intermediate: AppState = {
        ...s, baseAttrs: attrs,
        checkinRecords: [...s.checkinRecords, a.record],
      }

      const { skills, pools } = calcAllDerivedSkills(intermediate, a.qFilterBonuses)

      // 合并缓冲池
      const mergedPools: BufferPool[] = pools.map(p => {
        const old = s.bufferPools.find(o => o.skill === p.skill)
        if (!old) return p
        return {
          ...p,
          accumulated: (old.accumulated ?? 0) + (p.accumulated ?? 0),
        }
      })

      return { ...intermediate, derivedSkills: skills, bufferPools: mergedPools }
    }

    case 'QFILTER_SAVE': {
      return { ...s, qfilterRecords: [...s.qfilterRecords, a.record] }
    }

    case 'IMPORT': {
      const { skills } = calcAllDerivedSkills(a.state)
      return { ...a.state, derivedSkills: skills }
    }

    case 'MARK_BACKUP': {
      return { ...s, lastBackup: new Date().toISOString() }
    }

    default:
      return s
  }
}

// ============================================================
// Context Types
// ============================================================

export interface QFilterPending {
  skill: DerivedSkill
  questionId: string
  dimension: string
  questionText: string
  options: { label: string; value: number; icon: string }[]
}

export interface CheckinResult {
  bonus: Partial<BaseAttrs>
  previousDerived: DerivedSkills
  newDerived: DerivedSkills
  qfilterPending: QFilterPending | null
}

interface StoreContext {
  state: AppState
  addCheckin: (systemId: string, answers: Record<string, string>) => CheckinResult | null
  answerQFilter: (
    pending: QFilterPending,
    answer: number,
    responseTime: number,
  ) => void
  exportJSON: () => string
  importJSON: (json: string) => boolean
  markBackup: () => void
}

const Ctx = createContext<StoreContext | null>(null)

// ============================================================
// Provider
// ============================================================

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)
  const pendingQFilterRef = React.useRef<{ skill: DerivedSkill; answer: number; questionId: string } | null>(null)

  useEffect(() => { saveState(state) }, [state])

  const addCheckin = useCallback(
    (systemId: string, answers: Record<string, string>): CheckinResult | null => {
      const def = CHECKINS.find((d: CheckinDef) => d.system === systemId)
      if (!def) return null

      // 1. 计算基础属性增量
      const rawDelta = def.calcBonus(answers)
      const baseAttrDelta: Partial<BaseAttrs> = {}
      for (const [k, v] of Object.entries(rawDelta)) {
        if (BASE_ATTR_KEYS.has(k) && typeof v === 'number' && v !== 0) {
          ;(baseAttrDelta as Record<string, number>)[k] = v
        }
      }

      // 2. 预计算（同步，供 UI 即时反馈 — 无 QFilter）
      const prevDerived = { ...state.derivedSkills }
      const newBaseAttrs = { ...state.baseAttrs }
      for (const [k, v] of Object.entries(baseAttrDelta)) {
        const key = k as keyof BaseAttrs
        const multi = tierMultiplier(newBaseAttrs[key])
        newBaseAttrs[key] = Math.max(0, Math.min(100, Math.round((newBaseAttrs[key] + v * multi) * 10) / 10))
      }
      const intermediate: AppState = { ...state, baseAttrs: newBaseAttrs }
      const { skills: previewDerived } = calcAllDerivedSkills(intermediate)

      // 3. 检查缓冲池 — 是否触发 QFilter
      let qfilterPending: QFilterPending | null = null
      const { pools: currentPools } = calcAllDerivedSkills(intermediate)
      for (const pool of currentPools) {
        const check = bufferPoolCheck(pool.skill, pool.accumulated, pool.threshold)
        if (check.triggered && Math.random() < 0.4) {
          const q = pickRandomQuestion(pool.skill)
          if (q) {
            qfilterPending = {
              skill: pool.skill,
              questionId: q.id,
              dimension: q.dimension,
              questionText: q.text,
              options: q.options,
            }
            pendingQFilterRef.current = { skill: pool.skill, answer: 0, questionId: q.id }
            break
          }
        }
      }

      // 4. 派发 CHECKIN（无 QFilter 修正）
      const record: CheckinRecord = {
        id: uid(), date: todayISO(),
        system: systemId as CheckinRecord['system'],
        answers, baseAttrDelta,
      }
      dispatch({ type: 'CHECKIN', record, baseAttrDelta, qFilterBonuses: undefined })

      return { bonus: baseAttrDelta, previousDerived: prevDerived, newDerived: previewDerived, qfilterPending }
    },
    [state],
  )

  const answerQFilter = useCallback(
    (pending: QFilterPending, answer: number, responseTime: number) => {
      const confidence = getConfidence(responseTime)
      const record: QFilterRecord = {
        id: uid(), date: todayISO(),
        targetSkill: pending.skill,
        dimension: pending.dimension,
        questionVariant: pending.questionId,
        answer: answer * (confidence < 1.0 ? 0.7 : 1.0), // 低信度衰减
        responseTime, confidence,
      }

      // 存入记录
      dispatch({ type: 'QFILTER_SAVE', record })

      // 用 QFilter 得分重新结算衍生技能
      const qFilterBonuses: Partial<Record<DerivedSkill, number>> = {
        [pending.skill]: answer,
      }
      // 构造一个虚拟的 CHECKIN action 触发重算
      // 直接调用 recalc via empty delta
      const emptyDelta: Partial<BaseAttrs> = {}
      const dummyRecord: CheckinRecord = {
        id: uid(), date: todayISO(), system: 'diet' as any,
        answers: {}, baseAttrDelta: emptyDelta,
      }
      dispatch({ type: 'CHECKIN', record: dummyRecord, baseAttrDelta: emptyDelta, qFilterBonuses })
    },
    [],
  )

  const exportJSON = useCallback((): string => JSON.stringify(state, null, 2), [state])

  const importJSON = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as AppState
      if (!parsed.baseAttrs || !parsed.derivedSkills) return false
      dispatch({ type: 'IMPORT', state: parsed })
      return true
    } catch { return false }
  }, [])

  const markBackup = useCallback(() => dispatch({ type: 'MARK_BACKUP' }), [])

  return (
    <Ctx.Provider value={{ state, addCheckin, answerQFilter, exportJSON, importJSON, markBackup }}>
      {children}
    </Ctx.Provider>
  )
}

export function useStore(): StoreContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用')
  return ctx
}
