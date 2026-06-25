// ============================================================
// Personal OS RPG — 核心数学引擎 v2
// ============================================================
// 技术依据：tech-spec 第 4 节「7:3 双引擎转化模型」
//
// 核心模型变更（v5→v6）：
// - 衍生技能不再直接等于加权平均，改用目标跟踪收敛模型
// - S_j 向 target = B̄_j 缓慢收敛，模拟"现实整合滞后于基础能力"
// - γ(K) + λ(S_j) + QFilter 共同决定收敛速率
// ============================================================

import {
  type DerivedSkill,
  type AppState,
  type BufferPool,
  type DerivedSkillDef,
} from './types';

// ---------------------------------------------------------------------------
// 0. 衍生技能权重配置（来源：tech-spec §10.2）
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
// 1. 收敛速率
//    来源：tech-spec §4.2（7:3 模型的实现）
//
//    基础速率 0.10：每次打卡，衍生技能向目标收敛 10%（约 50 次打卡满程）
//    Q_filter ≥ 75 → 翻倍至 0.20（心智整合成功，加速）
//    Q_filter < 75 → 减半至 0.05（心智未整合，放缓）
// ---------------------------------------------------------------------------

const BASE_CONVERGENCE = 0.03;
const QFILTER_HIGH_CONVERGENCE = 0.06;
const QFILTER_LOW_CONVERGENCE = 0.015;

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

const MILESTONE_BOUNDARIES = [21, 41, 61, 81, 101] as const;

function getNextMilestoneThreshold(currentVal: number): number {
  for (const b of MILESTONE_BOUNDARIES) {
    if (currentVal < b) return b;
  }
  return 101;
}

// ---------------------------------------------------------------------------
// 2. 加权基础分 B̄_j = Σ(B_i · W_ji) / Σ(W_ji)
//    来源：tech-spec §4.3
// ---------------------------------------------------------------------------

function resolveSourceValue(source: string, state: AppState, values: Record<string, number>): number {
  if (source in values) return values[source];
  const baseAttrs = state.baseAttrs as unknown as Record<string, number>;
  if (source in baseAttrs) return baseAttrs[source];
  const derived = state.derivedSkills as unknown as Record<string, number>;
  if (source in derived) return derived[source];
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
// 3. 掌控感阻尼系数 γ(K) — Sigmoid
//    γ(K) = 0.5 + 1 / (1 + e^(-(K-50)/10))
//    来源：tech-spec §4.4
// ---------------------------------------------------------------------------

export function calcGamma(macroControlVal: number): number {
  return 0.5 + 1 / (1 + Math.exp(-(macroControlVal - 50) / 10));
}

// ---------------------------------------------------------------------------
// 4. 饱和度限速系数 λ(S_j) = 1 - (S_j/100)²
//    来源：tech-spec §4.5
// ---------------------------------------------------------------------------

export function calcLambda(currentVal: number): number {
  return 1 - Math.pow(currentVal / 100, 2);
}

// ---------------------------------------------------------------------------
// 5. 目标跟踪收敛模型
//    ΔS_j = (target_j - S_j_current) × rate × γ(K) × λ(S_j_current)
//
//    关键：
//    - target_j = B̄_j（加权基础分），不是 S_j 的旧值
//    - 衍生技能 LAG 在基础能力后面，模拟现实整合时间
//    - γ(K) 为全局阻尼，λ 为个人饱和度限速
// ---------------------------------------------------------------------------

/**
 * 结算全部衍生技能（目标跟踪收敛模型）。
 *
 * @param state       - 当前应用状态
 * @param qFilterSkips - 本轮已跳过的 QFilter 技能（收敛率 0.10）
 * @param qFilterBonuses - 技能 → QFilter 得分（≥75→0.20，<75→0.05）
 * @returns 更新后的技能值与缓冲池
 */
export function calcAllDerivedSkills(
  state: AppState,
  qFilterBonuses?: Partial<Record<DerivedSkill, number>>,
): { skills: Record<DerivedSkill, number>; pools: BufferPool[] } {
  const sorted = [...SKILL_DEFS].sort((a, b) => a.tier - b.tier);

  // 工作值映射（基础属性 + 逐层计算的衍生技能）
  const values: Record<string, number> = {
    ...(state.baseAttrs as unknown as Record<string, number>),
    ...(state.derivedSkills as unknown as Record<string, number>),
  };

  // γ(K)：取上一周期的掌控感。首周期无历史 → 按基础属性初算
  const kRaw = state.derivedSkills.macroControl ?? 25;
  const gamma = calcGamma(kRaw);

  const skills: Record<string, number> = {};
  const pools: BufferPool[] = [];

  for (const def of sorted) {
    const sid = def.id as DerivedSkill;

    // target_j：加权基础分（用当前工作值映射）
    const target = calcWeightedBase(def.inputs, state, values);

    // current_j
    const current = values[sid] ?? 0;

    // 收敛率：基础 0.10 ± QFilter 修正
    const qf = qFilterBonuses?.[sid];
    let rate = BASE_CONVERGENCE;
    if (qf !== undefined) {
      rate = qf >= 75 ? QFILTER_HIGH_CONVERGENCE : QFILTER_LOW_CONVERGENCE;
    }

    // λ(S_j_current)：当前技能越高，推进越慢
    const lambda = calcLambda(current);

    // ΔS_j
    const gap = target - current;
    const delta = gap * rate * gamma * lambda;

    const newVal = Math.max(0, Math.min(100, Math.round((current + delta) * 10) / 10));
    skills[sid] = newVal;
    values[sid] = newVal; // 下游技能可引用

    // 缓冲池：累计移动量（用于里程碑晋级检测）
    pools.push({
      skill: sid,
      accumulated: Math.abs(delta),
      threshold: getNextMilestoneThreshold(current),
      lockedUntil: null,
    });
  }

  return {
    skills: skills as Record<DerivedSkill, number>,
    pools,
  };
}

// ---------------------------------------------------------------------------
// 6. 基础属性增量
// ---------------------------------------------------------------------------

export function calcBaseAttrDelta(_raw: number, _current: number): number {
  // 基础属性用 store 里的 tierMultiplier 直接乘，不再二次封装
  return 0; // deprecated — 实际计算在 store 中
}

// ---------------------------------------------------------------------------
// 7. 缓冲池触发检查
//    触发条件：accumulated >= threshold × 0.8
// ---------------------------------------------------------------------------

export function bufferPoolCheck(
  _skill: DerivedSkill,
  accumulated: number,
  threshold: number,
): { triggered: boolean } {
  return { triggered: accumulated >= threshold * 0.8 };
}
