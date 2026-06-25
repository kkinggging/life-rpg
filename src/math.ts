// ============================================================
// Personal OS RPG — 核心数学引擎 v13
// ============================================================
// 恢复 7:3 双引擎公式 + 收敛阻尼
//
//   contribution_j = 0.7·B̄_j + 0.3·Q_effective
//   Q_effective = Q_score (≥0 triggered) or B̄_j×0.5 (未触发)
//   ΔS_j = (contribution_j - S_j_current) × damping × γ(K) × λ(S_j)
//
//   damping = 0.20（每次闭合20% gap，配合γ·λ自然衰减）
// ============================================================

import {
  type DerivedSkill,
  type AppState,
  type BufferPool,
  type DerivedSkillDef,
} from './types';

// ---------------------------------------------------------------------------
// 0. 衍生技能权重配置
// ---------------------------------------------------------------------------

export const SKILL_DEFS: DerivedSkillDef[] = [
  {
    id: 'mastery', label: '熟练度', tier: 1,
    description: '测试阶段性的状态，与当下的环境事务有关',
    inputs: [
      { source: 'intellect', weight: 4 },
      { source: 'social', weight: 3 },
      { source: 'health', weight: 2 },
      { source: 'charm', weight: 1 },
    ],
  },
  {
    id: 'flow', label: '流动感', tier: 1,
    description: '测定有无内耗，做事情的产出效率，外显的自然感',
    inputs: [
      { source: 'charm', weight: 4 },
      { source: 'intellect', weight: 3 },
      { source: 'social', weight: 2 },
      { source: 'courage', weight: 1 },
    ],
  },
  {
    id: 'behavioralCues', label: '强行为线索', tier: 1,
    description: '稀缺的潜沟通信号，建立于流动感之上并带有持续性',
    inputs: [
      { source: 'charm', weight: 3 },
      { source: 'courage', weight: 3 },
      { source: 'willpower', weight: 2 },
      { source: 'social', weight: 1 },
      { source: 'intellect', weight: 1 },
    ],
  },
  {
    id: 'opportunity', label: '机会捕捉能力', tier: 1,
    description: '在非常恰当的时机捕猎机会，主动价值交换',
    inputs: [
      { source: 'intellect', weight: 5 },
      { source: 'charm', weight: 3 },
      { source: 'social', weight: 2 },
    ],
  },
  {
    id: 'professional', label: '工作业务能力', tier: 2,
    description: '测定工作实际的能力，与个人兴趣驱动的坚定有关',
    inputs: [
      { source: 'mastery', weight: 4 },
      { source: 'flow', weight: 4 },
      { source: 'intellect', weight: 2 },
    ],
  },
  {
    id: 'macroControl', label: '掌控感', tier: 3,
    description: '统筹全局，受激素水平/心态客观影响，作为全局阻尼',
    inputs: [
      { source: 'abstinence', weight: 6 },
      { source: 'opportunity', weight: 1 },
      { source: 'behavioralCues', weight: 1 },
      { source: 'flow', weight: 1 },
      { source: 'mastery', weight: 1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// 参数
// ---------------------------------------------------------------------------

/** 收敛阻尼：每周期闭合 gap 的比例（配合 γ·λ 自然衰减）
 *  0.30: 一次打卡 close 30% gap × γ×λ≈60% → 实际 18%
 *      → 5次打卡接近 target, 3次打卡差距减半
 *      → 衍生技能不再永久滞后于基础属性
 */
const CONVERGENCE_DAMPING = 0.30;

/** QFilter 未触发时 Q_effective = B̄_j × DEFAULT_Q_RATIO */
const DEFAULT_Q_RATIO = 0.5;

const MILESTONE_BOUNDARIES = [21, 41, 61, 81, 101] as const;

function getNextMilestoneThreshold(currentVal: number): number {
  for (const b of MILESTONE_BOUNDARIES) {
    if (currentVal < b) return b;
  }
  return 101;
}

// ---------------------------------------------------------------------------
// 1. 加权基础分 B̄_j
// ---------------------------------------------------------------------------

function resolveSourceValue(source: string, state: AppState, values: Record<string, number>): number {
  if (source in values) return values[source];
  const baseAttrs = state.baseAttrs as unknown as Record<string, number>;
  if (source in baseAttrs) return baseAttrs[source];
  return 0;
}

export function calcWeightedBase(
  inputs: { source: string; weight: number }[],
  state: AppState,
  values: Record<string, number>,
): number {
  let num = 0, den = 0;
  for (const { source, weight } of inputs) {
    num += resolveSourceValue(source, state, values) * weight;
    den += weight;
  }
  return den > 0 ? num / den : 0;
}

// ---------------------------------------------------------------------------
// 2. γ(K) — Sigmoid 阻尼
// ---------------------------------------------------------------------------

export function calcGamma(macroControlVal: number): number {
  return 0.5 + 1 / (1 + Math.exp(-(macroControlVal - 50) / 10));
}

// ---------------------------------------------------------------------------
// 3. λ(S_j) — 饱和度限速
// ---------------------------------------------------------------------------

export function calcLambda(currentVal: number): number {
  return 1 - Math.pow(currentVal / 100, 2);
}

// ---------------------------------------------------------------------------
// 4. 7:3 混合收敛引擎（v13）
//    contribution_j = 0.7·B̄_j + 0.3·Q_effective
//    ΔS_j = (contribution_j - S_j_current) × damping × γ(K) × λ(S_j)
//
//    qFilterScores: DerivedSkill → Q_filter 得分 (0-100)
//       未提供 → Q_effective = B̄_j × 0.5（DEFAULT_Q_RATIO）
//    lockedSkills: 已锁定的技能集合，跳过计算（增量为 0）
// ---------------------------------------------------------------------------

export interface DerivedCalcInput {
  state: AppState;
  qFilterScores?: Partial<Record<DerivedSkill, number>>;
  lockedSkills?: Set<DerivedSkill>;
}

export function calcAllDerivedSkills(input: DerivedCalcInput): {
  skills: Record<DerivedSkill, number>;
  pools: BufferPool[];
} {
  const { state, qFilterScores, lockedSkills } = input;
  const sorted = [...SKILL_DEFS].sort((a, b) => a.tier - b.tier);

  // 工作值映射
  const values: Record<string, number> = {
    ...(state.baseAttrs as unknown as Record<string, number>),
    ...(state.derivedSkills as unknown as Record<string, number>),
  };

  // γ(K)
  const kRaw = state.derivedSkills.macroControl ?? 25;
  const gamma = calcGamma(kRaw);

  const skills: Record<string, number> = {};
  const pools: BufferPool[] = [];

  for (const def of sorted) {
    const sid = def.id as DerivedSkill;

    // 锁定检查：已锁定的技能不增长（也不倒退）
    if (lockedSkills?.has(sid)) {
      const current = values[sid] ?? 0;
      skills[sid] = current;
      // 锁定的池：accumulated 保持不变, lockedUntil 保持不变
      const oldPool = state.bufferPools.find(p => p.skill === sid);
      pools.push({
        skill: sid,
        accumulated: oldPool?.accumulated ?? 0,
        threshold: getNextMilestoneThreshold(current),
        lockedUntil: oldPool?.lockedUntil ?? null,
      });
      continue;
    }

    // B̄_j：加权基础分（使用当前工作值映射）
    const weightedBase = calcWeightedBase(def.inputs, state, values);

    // Q_effective
    const qScore = qFilterScores?.[sid];
    const qEff = qScore !== undefined ? qScore : weightedBase * DEFAULT_Q_RATIO;

    // 7:3 贡献值
    const contribution = 0.7 * weightedBase + 0.3 * qEff;

    // current
    const current = values[sid] ?? 0;

    // λ(S_j)
    const lambda = calcLambda(current);

    // ΔS_j = (contribution - current) × damping × γ × λ
    const gap = contribution - current;
    const delta = gap * CONVERGENCE_DAMPING * gamma * lambda;

    const newVal = Math.max(0, Math.min(100, Math.round((current + delta) * 10) / 10));
    skills[sid] = newVal;
    values[sid] = newVal;

    // 缓冲池
    const oldPool = state.bufferPools.find(p => p.skill === sid);
    pools.push({
      skill: sid,
      accumulated: (oldPool?.accumulated ?? 0) + Math.abs(delta),
      threshold: getNextMilestoneThreshold(current),
      lockedUntil: oldPool?.lockedUntil ?? null,
    });
  }

  return {
    skills: skills as Record<DerivedSkill, number>,
    pools,
  };
}

// ---------------------------------------------------------------------------
// 5. 缓冲池触发检查
// ---------------------------------------------------------------------------

export function bufferPoolCheck(
  _skill: DerivedSkill,
  accumulated: number,
  threshold: number,
): { triggered: boolean } {
  return { triggered: accumulated >= threshold * 0.8 };
}

// ---------------------------------------------------------------------------
// 6. 基础属性增量 (deprecated — 实际计算在 store 中)
// ---------------------------------------------------------------------------

export function calcBaseAttrDelta(_raw: number, _current: number): number {
  return 0;
}
