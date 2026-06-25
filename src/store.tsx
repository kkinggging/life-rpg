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
import { tierMultiplier, DEFAULT_DERIVED_SKILLS } from './types'
import { calcAllDerivedSkills, calcGamma } from './math'
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
    // FIX: Use DEFAULT_DERIVED_SKILLS instead of {} as DerivedSkills type lie
    derivedSkills: { ...DEFAULT_DERIVED_SKILLS },
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
  // FIX: Holds pending checkin data when QFilter triggers; dispatched after QFilter answer or skip.
  // This prevents the double-dispatch bug where addCheckin and answerQFilter both moved skills.
  // Previously addCheckin dispatched CHECKIN at rate 0.10, then answerQFilter dispatched a second
  // CHECKIN at the QFilter rate, causing net convergence to be higher than intended.
  const pendingCheckinRef = React.useRef<{
    record: CheckinRecord
    baseAttrDelta: Partial<BaseAttrs>
    triggeredSkill: DerivedSkill
  } | null>(null)

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
          // Clamp raw deltas to ±1.0 — 健身增长应以月计量
          ;(baseAttrDelta as Record<string, number>)[k] = Math.max(-1.0, Math.min(1.0, v))
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

      // 3. QFilter 随机触发 — 20% 概率，与打卡体系联动选相关技能
      let qfilterPending: QFilterPending | null = null
      if (Math.random() < 0.20) {
        // 优选与当前打卡体系最相关的衍生技能
        const skillMap: Record<string, DerivedSkill> = {
          diet: 'mastery',
          fitness: 'flow',
          social: 'behavioralCues',
          learning: 'opportunity',
          abstinence: 'macroControl',
        }
        const targetSkill: DerivedSkill = skillMap[systemId] ?? 'mastery'
        const q = pickRandomQuestion(targetSkill)
        if (q) {
          qfilterPending = {
            skill: targetSkill,
            questionId: q.id,
            dimension: q.dimension,
            questionText: q.text,
            options: q.options.map(o => ({ label: o.label, value: o.value, icon: o.icon })),
          }
        }
      }

      // 4. Create checkin record
      const record: CheckinRecord = {
        id: uid(), date: todayISO(),
        system: systemId as CheckinRecord['system'],
        answers, baseAttrDelta,
      }

      // 5. Dispatch: delay if QFilter triggered (single dispatch with correct rate later)
      if (qfilterPending) {
        pendingCheckinRef.current = {
          record,
          baseAttrDelta,
          triggeredSkill: qfilterPending.skill,
        }
      } else {
        dispatch({ type: 'CHECKIN', record, baseAttrDelta, qFilterBonuses: undefined })
      }

      return { bonus: baseAttrDelta, previousDerived: prevDerived, newDerived: previewDerived, qfilterPending }
    },
    [state],
  )

  const answerQFilter = useCallback(
    (pending: QFilterPending, answer: number, responseTime: number) => {
      // FIX: Retrieve the stashed checkin data (saved in addCheckin when QFilter triggered).
      // Previously addCheckin dispatched CHECKIN immediately at rate 0.10, then answerQFilter
      // dispatched a second CHECKIN at the QFilter rate — causing a double-move.
      // Now addCheckin DELAYS dispatch when QFilter triggers, and answerQFilter does the single
      // correct dispatch with the proper QFilter bonus applied.
      const stashed = pendingCheckinRef.current
      pendingCheckinRef.current = null

      // FIX: answer < 0 is the skip sentinel — apply low rate without saving QFilterRecord
      const isSkip = answer < 0

      if (!isSkip) {
        const confidence = getConfidence(responseTime)
        const qfRecord: QFilterRecord = {
          id: uid(), date: todayISO(),
          targetSkill: pending.skill,
          dimension: pending.dimension,
          questionVariant: pending.questionId,
          answer: answer * (confidence < 1.0 ? 0.7 : 1.0), // 低信度衰减
          responseTime, confidence,
        }
        dispatch({ type: 'QFILTER_SAVE', record: qfRecord })
      }

      // Dispatch the pending checkin with QFilter bonus applied.
      // If skip: pass a low score (0) so calcAllDerivedSkills uses rate 0.05 (QFilter<75 per spec).
      if (stashed) {
        const qFilterBonuses: Partial<Record<DerivedSkill, number>> = {}
        qFilterBonuses[stashed.triggeredSkill] = isSkip ? 0 : answer
        dispatch({ type: 'CHECKIN', record: stashed.record, baseAttrDelta: stashed.baseAttrDelta, qFilterBonuses })
      }
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
