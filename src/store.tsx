// ============================================================
// Personal OS RPG — 全局状态管理 v13
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
} from './types'
import { tierMultiplier, DEFAULT_DERIVED_SKILLS } from './types'
import { calcAllDerivedSkills, calcGamma, bufferPoolCheck } from './math'
import type { DerivedCalcInput } from './math'
import { pickRandomQuestion, getConfidence } from './qfilter'
import { CHECKINS, uid, todayISO } from './utils'
import type { CheckinDef } from './utils'

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'life-rpg-state'
const CALIBRATION_KEY = 'life-rpg-calibrated'

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
    derivedSkills: { ...DEFAULT_DERIVED_SKILLS },
    checkinRecords: [], qfilterRecords: [], bufferPools: [],
    blackBoxes: [], lastBackup: null, daysSinceFirstUse: 0, blindTestResults: [],
  }
  const { skills } = calcAllDerivedSkills({ state: mock, lockedSkills: new Set() })
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
        const input: DerivedCalcInput = { state: parsed, lockedSkills: getLockedSkills(parsed) }
        const { skills } = calcAllDerivedSkills(input)
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

/** 从 state 中提取当前已锁定的技能集合 */
function getLockedSkills(s: AppState): Set<DerivedSkill> {
  const today = todayISO()
  const locked = new Set<DerivedSkill>()
  for (const p of s.bufferPools ?? []) {
    if (p.lockedUntil && p.lockedUntil > today) {
      locked.add(p.skill)
    }
  }
  return locked
}

function saveState(s: AppState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* quota */ }
}

// ============================================================
// Reducer
// ============================================================

type Action =
  | { type: 'CHECKIN'; record: CheckinRecord; baseAttrDelta: Partial<BaseAttrs>; qFilterScores?: Partial<Record<DerivedSkill, number>> }
  | { type: 'LOCK_POOL'; skill: DerivedSkill; lockedUntil: string; retention: number }
  | { type: 'UNLOCK_EXPIRED' }
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

      // 获取当前已锁定的技能
      const locked = getLockedSkills(intermediate)

      // 用 7:3 公式结算衍生技能
      const input: DerivedCalcInput = {
        state: intermediate,
        qFilterScores: a.qFilterScores,
        lockedSkills: locked,
      }
      const { skills, pools } = calcAllDerivedSkills(input)

      return { ...intermediate, derivedSkills: skills, bufferPools: pools }
    }

    case 'LOCK_POOL': {
      const pools = (s.bufferPools ?? []).map(p =>
        p.skill === a.skill
          ? { ...p, accumulated: p.accumulated * a.retention, lockedUntil: a.lockedUntil }
          : p
      )
      return { ...s, bufferPools: pools }
    }

    case 'UNLOCK_EXPIRED': {
      const today = todayISO()
      const pools = (s.bufferPools ?? []).map(p =>
        p.lockedUntil && p.lockedUntil <= today
          ? { ...p, lockedUntil: null }
          : p
      )
      return { ...s, bufferPools: pools }
    }

    case 'QFILTER_SAVE': {
      return { ...s, qfilterRecords: [...s.qfilterRecords, a.record] }
    }

    case 'IMPORT': {
      const input: DerivedCalcInput = { state: a.state, lockedSkills: getLockedSkills(a.state) }
      const { skills } = calcAllDerivedSkills(input)
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
  answerQFilter: (pending: QFilterPending, answer: number, responseTime: number) => void
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

  const pendingCheckinRef = React.useRef<{
    record: CheckinRecord
    baseAttrDelta: Partial<BaseAttrs>
    triggeredSkill: DerivedSkill
  } | null>(null)

  // 启动时解锁已过期的池
  useEffect(() => {
    dispatch({ type: 'UNLOCK_EXPIRED' })
  }, [])

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
          ;(baseAttrDelta as Record<string, number>)[k] = Math.max(-1.0, Math.min(1.0, v))
        }
      }

      // 2. 预计算（同步，供 UI 即时反馈）
      const prevDerived = { ...state.derivedSkills }
      const newBaseAttrs = { ...state.baseAttrs }
      for (const [k, v] of Object.entries(baseAttrDelta)) {
        const key = k as keyof BaseAttrs
        const multi = tierMultiplier(newBaseAttrs[key])
        newBaseAttrs[key] = Math.max(0, Math.min(100, Math.round((newBaseAttrs[key] + v * multi) * 10) / 10))
      }
      const intermediate: AppState = { ...state, baseAttrs: newBaseAttrs }
      const locked = getLockedSkills(intermediate)
      const { skills: previewDerived } = calcAllDerivedSkills({ state: intermediate, lockedSkills: locked })

      // 3. 缓冲池累积 + QFilter 触发判断
      let qfilterPending: QFilterPending | null = null
      const skillMap: Record<string, DerivedSkill> = {
        diet: 'mastery', fitness: 'flow', social: 'behavioralCues',
        learning: 'opportunity', abstinence: 'macroControl',
      }
      const targetSkill: DerivedSkill = skillMap[systemId] ?? 'mastery'

      // 检查该技能的缓冲池是否达到触发阈值
      const pool = state.bufferPools.find(p => p.skill === targetSkill)
      const isPoolReady = pool && bufferPoolCheck(pool.skill, pool.accumulated, pool.threshold).triggered

      if (isPoolReady && Math.random() < 0.40) {
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

      // 4. 创建打卡记录
      const record: CheckinRecord = {
        id: uid(), date: todayISO(),
        system: systemId as CheckinRecord['system'],
        answers, baseAttrDelta,
      }

      // 5. 触发 QFilter → 延迟 dispatch（等待用户回答后一次性结算）
      if (qfilterPending) {
        pendingCheckinRef.current = { record, baseAttrDelta, triggeredSkill: qfilterPending.skill }
      } else {
        // 未触发：直接用 7:3 缺省 Q 值（Q_effective = B̄_j × 0.5）结算
        dispatch({ type: 'CHECKIN', record, baseAttrDelta, qFilterScores: undefined })
      }

      return { bonus: baseAttrDelta, previousDerived: prevDerived, newDerived: previewDerived, qfilterPending }
    },
    [state],
  )

  const answerQFilter = useCallback(
    (pending: QFilterPending, answer: number, responseTime: number) => {
      const stashed = pendingCheckinRef.current
      pendingCheckinRef.current = null
      const isSkip = answer < 0

      // 保存 QFilterRecord
      if (!isSkip) {
        const confidence = getConfidence(responseTime)
        const qfRecord: QFilterRecord = {
          id: uid(), date: todayISO(),
          targetSkill: pending.skill,
          dimension: pending.dimension,
          questionVariant: pending.questionId,
          answer: answer * (confidence < 1.0 ? 0.7 : 1.0),
          responseTime, confidence,
        }
        dispatch({ type: 'QFILTER_SAVE', record: qfRecord })
      }

      // 释放/锁定逻辑
      const effectiveScore = isSkip ? 0 : answer
      if (effectiveScore >= 75) {
        // ≥75: 100% 释放 — 给 QFilter 得分代入 7:3 公式
        if (stashed) {
          const qFilterScores: Partial<Record<DerivedSkill, number>> = {}
          qFilterScores[stashed.triggeredSkill] = effectiveScore
          dispatch({ type: 'CHECKIN', record: stashed.record, baseAttrDelta: stashed.baseAttrDelta, qFilterScores })
        }
      } else {
        // <75: 70% 留存 + 锁定14天
        const lockUntil = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
        // 先用低分结算（0.7×B̄_j 贡献）
        if (stashed) {
          const qFilterScores: Partial<Record<DerivedSkill, number>> = {}
          qFilterScores[stashed.triggeredSkill] = effectiveScore
          dispatch({ type: 'CHECKIN', record: stashed.record, baseAttrDelta: stashed.baseAttrDelta, qFilterScores })
        }
        // 然后锁定缓冲池
        dispatch({ type: 'LOCK_POOL', skill: pending.skill, lockedUntil: lockUntil, retention: 0.7 })
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
