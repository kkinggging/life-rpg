// ============================================================
// Personal OS RPG — 全局状态管理
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
  BlindTestResult,
} from './types'
import { tierMultiplier, ATTR_MILESTONES, SKILL_MILESTONES } from './types'
import { calcAllDerivedSkills, calcGamma, calcLambda, SKILL_DEFS, bufferPoolCheck } from './math'
import { pickRandomQuestion, getConfidence, QUESTIONS } from './qfilter'
import { CHECKINS, uid, todayISO } from './utils'
import type { CheckinDef } from './utils'

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'life-rpg-state'

const BASE_ATTR_KEYS: ReadonlySet<string> = new Set([
  'charm',
  'strength',
  'intellect',
  'social',
  'willpower',
  'health',
  'courage',
  'abstinence',
])

// ============================================================
// Initial State
// ============================================================

const INITIAL_BASE_ATTRS: BaseAttrs = {
  charm: 25,
  strength: 25,
  intellect: 35,
  social: 25,
  willpower: 25,
  health: 25,
  courage: 25,
  abstinence: 20,
}

const INITIAL_DERIVED_SKILLS: DerivedSkills = {
  mastery: 25,
  flow: 25,
  behavioralCues: 25,
  professional: 25,
  opportunity: 25,
  macroControl: 25,
}

const INITIAL_STATE: AppState = {
  baseAttrs: { ...INITIAL_BASE_ATTRS },
  derivedSkills: { ...INITIAL_DERIVED_SKILLS },
  checkinRecords: [],
  qfilterRecords: [],
  bufferPools: [],
  blackBoxes: [],
  lastBackup: null,
  daysSinceFirstUse: 0,
  blindTestResults: [],
}

// ============================================================
// localStorage 持久化
// ============================================================

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.baseAttrs && parsed.derivedSkills) return parsed
    }
  } catch {
    /* corrupt storage — fall through to default */
  }
  return {
    ...INITIAL_STATE,
    baseAttrs: { ...INITIAL_BASE_ATTRS },
    derivedSkills: { ...INITIAL_DERIVED_SKILLS },
  }
}

function saveState(s: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* quota exceeded — silently ignore */
  }
}

// ============================================================
// Reducer
// ============================================================

type Action =
  | { type: 'CHECKIN'; record: CheckinRecord; baseAttrDelta: Partial<BaseAttrs> }
  | { type: 'RECALC_DERIVED' }
  | { type: 'QFILTER_ANSWER'; record: QFilterRecord }
  | { type: 'BLACKBOX_CHECK'; blackBox: BlackBox }
  | { type: 'IMPORT'; state: AppState }
  | { type: 'MARK_BACKUP' }
  | { type: 'INCREMENT_DAY' }

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    // ----------------------------------------------------------
    // CHECKIN — 打卡
    //   1. 应用 tierMultiplier 更新基础属性
    //   2. 创建打卡记录
    //   3. 重新结算所有衍生技能 + 缓冲池
    // ----------------------------------------------------------
    case 'CHECKIN': {
      // --- 更新基础属性（应用分段倍率）---
      const attrs = { ...s.baseAttrs }
      for (const [k, v] of Object.entries(a.baseAttrDelta)) {
        if (v === undefined || v === 0) continue
        if (!BASE_ATTR_KEYS.has(k)) continue
        const key = k as keyof BaseAttrs
        const multi = tierMultiplier(attrs[key])
        const delta = v * multi
        attrs[key] = Math.max(
          0,
          Math.min(100, Math.round((attrs[key] + delta) * 10) / 10),
        )
      }

      // --- 构建中间态（基础属性已更新，记录已追加）---
      const intermediate: AppState = {
        ...s,
        baseAttrs: attrs,
        checkinRecords: [...s.checkinRecords, a.record],
      }

      // --- 重新结算衍生技能 ---
      const { skills, pools } = calcAllDerivedSkills(intermediate)

      return {
        ...intermediate,
        derivedSkills: skills,
        bufferPools: pools,
      }
    }

    // ----------------------------------------------------------
    // RECALC_DERIVED — 独立重算衍生技能
    // ----------------------------------------------------------
    case 'RECALC_DERIVED': {
      const { skills, pools } = calcAllDerivedSkills(s)
      return {
        ...s,
        derivedSkills: skills,
        bufferPools: pools,
      }
    }

    // ----------------------------------------------------------
    // QFILTER_ANSWER — Q-filter 答题
    //   记录答案；若置信度 >= 0.75 则触发衍生技能重算
    // ----------------------------------------------------------
    case 'QFILTER_ANSWER': {
      const nextState: AppState = {
        ...s,
        qfilterRecords: [...s.qfilterRecords, a.record],
      }

      if (a.record.confidence >= 0.75) {
        const { skills, pools } = calcAllDerivedSkills(nextState)
        return {
          ...nextState,
          derivedSkills: skills,
          bufferPools: pools,
        }
      }

      return nextState
    }

    // ----------------------------------------------------------
    // BLACKBOX_CHECK — 黑盒检测记录
    // ----------------------------------------------------------
    case 'BLACKBOX_CHECK': {
      return {
        ...s,
        blackBoxes: [...s.blackBoxes, a.blackBox],
      }
    }

    // ----------------------------------------------------------
    // IMPORT — 全量导入状态
    // ----------------------------------------------------------
    case 'IMPORT':
      return a.state

    // ----------------------------------------------------------
    // MARK_BACKUP — 更新上次备份时间
    // ----------------------------------------------------------
    case 'MARK_BACKUP': {
      return {
        ...s,
        lastBackup: new Date().toISOString(),
      }
    }

    // ----------------------------------------------------------
    // INCREMENT_DAY — 使用天数 +1
    // ----------------------------------------------------------
    case 'INCREMENT_DAY': {
      return {
        ...s,
        daysSinceFirstUse: s.daysSinceFirstUse + 1,
      }
    }

    default:
      return s
  }
}

// ============================================================
// Context
// ============================================================

interface StoreContext {
  state: AppState
  addCheckin: (systemId: string, answers: Record<string, string>) => void
  answerQFilter: (
    skillId: DerivedSkill,
    questionId: string,
    answer: number,
    responseTime: number,
  ) => void
  triggerBlackBoxCheck: (skillId: DerivedSkill) => void
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

  // --- 每次 state 变化自动写入 localStorage ---
  useEffect(() => {
    saveState(state)
  }, [state])

  // --- 缓冲池触发（state.bufferPools 更新后检查是否需弹出 QFilter）---
  useEffect(() => {
    for (const pool of state.bufferPools) {
      const check = bufferPoolCheck(pool.skill, pool.accumulated, pool.threshold)
      if (check.triggered && Math.random() < 0.4) {
        // 随机抽取一题 — 由 UI 层另行消费；此处仅保留抽取逻辑
        pickRandomQuestion(pool.skill)
      }
    }
  }, [state.bufferPools])

  // ==========================================================
  // addCheckin
  // ==========================================================
  const addCheckin = useCallback(
    (systemId: string, answers: Record<string, string>) => {
      // 1. 查找对应的打卡定义
      const def = CHECKINS.find((d: CheckinDef) => d.system === systemId)
      if (!def) return

      // 2. 计算基础属性增量
      const rawDelta = def.calcBonus(answers)

      // 3. 过滤：仅保留有效 BaseAttr 键且值非零
      const baseAttrDelta: Partial<BaseAttrs> = {}
      for (const [k, v] of Object.entries(rawDelta)) {
        if (BASE_ATTR_KEYS.has(k) && typeof v === 'number' && v !== 0) {
          ;(baseAttrDelta as Record<string, number>)[k] = v
        }
      }

      // 4. 创建打卡记录
      const record: CheckinRecord = {
        id: uid(),
        date: todayISO(),
        system: systemId as CheckinRecord['system'],
        answers,
        baseAttrDelta,
      }

      // 5. 派发 CHECKIN（内部完成属性更新 + 衍生技能结算）
      dispatch({ type: 'CHECKIN', record, baseAttrDelta })
    },
    [],
  )

  // ==========================================================
  // answerQFilter
  // ==========================================================
  const answerQFilter = useCallback(
    (
      skillId: DerivedSkill,
      questionId: string,
      answer: number,
      responseTime: number,
    ) => {
      // 从题库中查找题目以获取 dimension
      const question = QUESTIONS.find((q) => q.id === questionId)
      const confidence = getConfidence(responseTime)

      const record: QFilterRecord = {
        id: uid(),
        date: todayISO(),
        targetSkill: skillId,
        dimension: question?.dimension ?? '',
        questionVariant: questionId,
        answer,
        responseTime,
        confidence,
      }

      dispatch({ type: 'QFILTER_ANSWER', record })
    },
    [],
  )

  // ==========================================================
  // triggerBlackBoxCheck
  // ==========================================================
  const triggerBlackBoxCheck = useCallback(
    (skillId: DerivedSkill) => {
      const currentVal = state.derivedSkills[skillId]
      const boundary = currentVal
      const flags: string[] = []

      if (currentVal < 25) flags.push('critically_low')
      else if (currentVal < 40) flags.push('below_average')
      if (currentVal >= 80) flags.push('elite')

      let verdict: BlackBox['verdict'] = 'stable'
      if (currentVal < 20) verdict = 'degrading'
      else if (currentVal >= 90) verdict = 'breakthrough'

      const blackBox: BlackBox = {
        skill: skillId,
        boundary,
        startDate: todayISO(),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        flags,
        verdict,
      }

      dispatch({ type: 'BLACKBOX_CHECK', blackBox })
    },
    [state.derivedSkills],
  )

  // ==========================================================
  // exportJSON / importJSON / markBackup
  // ==========================================================
  const exportJSON = useCallback((): string => {
    return JSON.stringify(state, null, 2)
  }, [state])

  const importJSON = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as AppState
      if (!parsed.baseAttrs || !parsed.derivedSkills) return false
      dispatch({ type: 'IMPORT', state: parsed })
      return true
    } catch {
      return false
    }
  }, [])

  const markBackup = useCallback(() => {
    dispatch({ type: 'MARK_BACKUP' })
  }, [])

  // ==========================================================
  // Render
  // ==========================================================
  return (
    <Ctx.Provider
      value={{
        state,
        addCheckin,
        answerQFilter,
        triggerBlackBoxCheck,
        exportJSON,
        importJSON,
        markBackup,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

// ============================================================
// Hook
// ============================================================

export function useStore(): StoreContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用')
  return ctx
}
