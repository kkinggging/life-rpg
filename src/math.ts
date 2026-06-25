// ============================================================
// Personal OS RPG — 核心数学引擎
// ============================================================
// 实现 tech-spec 第 4 节「7:3 双引擎转化模型」全部公式。
// 所有计算均为纯前端，无后端依赖。

import {
  type DerivedSkill,
  type AppState,
  type BufferPool,
  type DerivedSkillDef,
  tierMultiplier,
} from './types';

// ---------------------------------------------------------------------------
// 0. 衍生技能权重配置（DAG 拓扑定义）
//    来源：tech-spec §10.2 — 六项衍生技能加权公式
// ---------------------------------------------------------------------------

export const SKILL_DEFS: DerivedSkillDef[] = [
  // ---- Layer 1 (tier 1) ----
  {
    id: 'mastery',
    label: '熟练度',
    description: '测试阶段性的状态，与当下的环境事务有关',
    tier: 1,
    inputs: [
      { source: 'intellect', weight: 4 },
      { source: 'social', weight: 3 },
      { source: 'health', weight: 2 },
      { source: 'charm', weight: 1 },
    ],
  },
  {
    id: 'flow',
    label: '流动感',
    description: '测定有无内耗，做事情的产出效率，外显的自然感',
    tier: 1,
    inputs: [
      { source: 'charm', weight: 4 },
      { source: 'intellect', weight: 3 },
      { source: 'social', weight: 2 },
      { source: 'courage', weight: 1 },
    ],
  },
  {
    id: 'behavioralCues',
    label: '强行为线索',
    description: '稀缺的潜沟通信号，建立于流动感之上并带有持续性',
    tier: 1,
    inputs: [
      { source: 'charm', weight: 3 },
      { source: 'courage', weight: 3 },
      { source: 'willpower', weight: 2 },
      { source: 'social', weight: 1 },
      { source: 'intellect', weight: 1 },
    ],
  },
  {
    id: 'opportunity',
    label: '机会捕捉能力',
    description: '在非常恰当的时机捕猎机会，主动价值交换',
    tier: 1,
    inputs: [
      { source: 'intellect', weight: 5 },
      { source: 'charm', weight: 3 },
      { source: 'social', weight: 2 },
    ],
  },
  // ---- Layer 2 (tier 2) ----
  {
    id: 'professional',
    label: '工作业务能力',
    description: '测定工作实际的能力，与个人兴趣驱动的坚定有关',
    tier: 2,
    inputs: [
      { source: 'mastery', weight: 4 },
      { source: 'flow', weight: 4 },
      { source: 'intellect', weight: 2 },
    ],
  },
  // ---- Layer 3 (tier 3) ----
  {
    id: 'macroControl',
    label: '掌控感',
    description: '统筹全局，受激素水平/心态客观影响，作为全局阻尼',
    tier: 3,
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
// 辅助：根据当前值推算下一里程碑边界阈值
// 里程碑边界：21, 41, 61, 81, 101（101 代表上限哨兵）
// ---------------------------------------------------------------------------

const MILESTONE_BOUNDARIES = [21, 41, 61, 81, 101] as const;

function getNextMilestoneThreshold(currentVal: number): number {
  for (const b of MILESTONE_BOUNDARIES) {
    if (currentVal < b) return b;
  }
  return 101;
}

// ---------------------------------------------------------------------------
// 辅助：从 AppState 中解析输入源的值
// 先在 baseAttrs 中查找，未命中则在 derivedSkills 中查找
// ---------------------------------------------------------------------------

function resolveSourceValue(source: string, state: AppState): number {
  // 基础属性 — BaseAttrs 是已知键接口，通过 unknown 桥接为索引类型以支持动态键查找
  const baseAttrs = state.baseAttrs as unknown as Record<string, number>;
  if (source in baseAttrs) {
    return baseAttrs[source];
  }
  // 衍生技能 — 同理
  const derivedSkills = state.derivedSkills as unknown as Record<string, number>;
  if (source in derivedSkills) {
    return derivedSkills[source];
  }
  return 0;
}

// ---------------------------------------------------------------------------
// 1. 加权基础分 B̄_j
//    B̄_j = Σ(B_i * W_ji) / Σ(W_ji)
//    来源：tech-spec §4.3
// ---------------------------------------------------------------------------

/**
 * 计算衍生技能的加权基础分。
 *
 * @param inputs - 输入源及其权重列表
 * @param state  - 当前应用状态（从中读取 baseAttrs 与 derivedSkills）
 * @returns 加权平均分 (0-100)
 */
export function calcWeightedBase(
  inputs: { source: string; weight: number }[],
  state: AppState,
): number {
  let numerator = 0;
  let denominator = 0;

  for (const { source, weight } of inputs) {
    const val = resolveSourceValue(source, state);
    numerator += val * weight;
    denominator += weight;
  }

  return denominator > 0 ? numerator / denominator : 0;
}

// ---------------------------------------------------------------------------
// 2. 掌控感阻尼系数 γ(K) — Sigmoid
//    γ(K) = 0.5 + 1 / (1 + e^(-(K - 50) / 10))
//    来源：tech-spec §4.4
//
//    特性：
//      K = 0   → γ ≈ 0.5   (触底)
//      K = 50  → γ = 1.0   (中性)
//      K = 80  → γ ≈ 1.45  (高掌控)
//      K = 100 → γ ≈ 1.5   (上限)
// ---------------------------------------------------------------------------

/**
 * 计算掌控感阻尼系数。
 *
 * @param macroControlVal - 掌控感当前值 K (0-100)，应为上一结算周期的值
 * @returns 阻尼系数 γ ∈ [0.5, ~1.5]
 */
export function calcGamma(macroControlVal: number): number {
  return 0.5 + 1 / (1 + Math.exp(-(macroControlVal - 50) / 10));
}

// ---------------------------------------------------------------------------
// 3. 饱和度限速系数 λ(S_j)
//    λ(S_j) = 1 - (S_j / 100)²
//    来源：tech-spec §4.5
//
//    特性：
//      S_j = 0   → λ = 1.0
//      S_j = 50  → λ = 0.75
//      S_j = 80  → λ = 0.36
//      S_j = 95  → λ ≈ 0.10
// ---------------------------------------------------------------------------

/**
 * 计算饱和度限速系数。
 *
 * @param currentVal - 衍生技能当前值 S_j (0-100)
 * @returns 限速系数 λ ∈ [0, 1]
 */
export function calcLambda(currentVal: number): number {
  return 1 - Math.pow(currentVal / 100, 2);
}

// ---------------------------------------------------------------------------
// 4. 7:3 双引擎公式 — 衍生技能增量 ΔS_j
//    ΔS_j = [0.7·B̄_j + 0.3·Q_filter] · γ(K) · λ(S_j)
//    来源：tech-spec §4.2
//
//    Q_filter 缺省规则（tech-spec §5.2）：
//      未触发/未回答时，Q_filter = B̄_j × 0.5
// ---------------------------------------------------------------------------

/**
 * 计算衍生技能单次结算周期的增量 ΔS_j。
 *
 * @param weightedBase - 加权基础分 B̄_j
 * @param qFilterScore - Q_filter 过渡筛选得分 (0-100)，为 null 时按 B̄_j × 0.5 缺省
 * @param gamma        - 掌控感阻尼系数 γ(K)
 * @param lambda       - 饱和度限速系数 λ(S_j)
 * @returns 衍生技能得分增量 ΔS_j
 */
export function calcDerivedDelta(
  weightedBase: number,
  qFilterScore: number | null,
  gamma: number,
  lambda: number,
): number {
  const qFilter = qFilterScore ?? weightedBase * 0.5;
  return (0.7 * weightedBase + 0.3 * qFilter) * gamma * lambda;
}

// ---------------------------------------------------------------------------
// 5. 全量衍生技能结算
//    按 DAG 拓扑序依次计算，保证跨层依赖时上游技能值已固化。
//    返回更新后的技能值与缓冲池状态。
//    来源：tech-spec §4.3（计算次序）+ §5.1（缓冲池）
// ---------------------------------------------------------------------------

/**
 * 结算全部衍生技能。
 *
 * 计算流程：
 *   1. 按 tier 升序排列 SKILL_DEFS
 *   2. 维护工作值映射（baseAttrs + 已结算技能），确保 DAG 依赖正确
 *   3. 获取 γ(K)：有 macroControl 历史则计算，首周期默认 γ = 1.0
 *   4. 逐技能计算 B̄_j → λ(S_j) → ΔS_j
 *   5. 增量累加入对应缓冲池，技能值即时更新
 *
 * @param state - 当前应用状态
 * @returns 更新后的技能值与缓冲池数组
 */
export function calcAllDerivedSkills(state: AppState): {
  skills: Record<DerivedSkill, number>;
  pools: BufferPool[];
} {
  // ---- 按 tier 排序 ----
  const sorted = [...SKILL_DEFS].sort((a, b) => a.tier - b.tier);

  // ---- 工作值映射：基础属性 + 已有衍生技能（后续逐技能覆盖）----
  const values: Record<string, number> = {
    ...(state.baseAttrs as unknown as Record<string, number>),
    ...(state.derivedSkills as unknown as Record<string, number>),
  };

  // ---- 掌控感阻尼 γ(K) ----
  // 首周期（无 macroControl 历史）默认 γ = 1.0
  const macroControlVal = state.derivedSkills.macroControl;
  const gamma =
    macroControlVal !== undefined && macroControlVal !== null
      ? calcGamma(macroControlVal)
      : 1.0;

  // ---- 复用现有缓冲池，缺失的按需创建 ----
  const poolMap = new Map<DerivedSkill, BufferPool>();
  for (const p of state.bufferPools) {
    poolMap.set(p.skill, { ...p });
  }

  // ---- 输出容器 ----
  const skills: Record<string, number> = {};
  const pools: BufferPool[] = [];

  for (const def of sorted) {
    const skillId = def.id as DerivedSkill;

    // --- 加权基础分 B̄_j（使用工作值映射，保证 DAG 依赖正确）---
    let numerator = 0;
    let denominator = 0;
    for (const { source, weight } of def.inputs) {
      numerator += (values[source] ?? 0) * weight;
      denominator += weight;
    }
    const weightedBase = denominator > 0 ? numerator / denominator : 0;

    // --- 饱和度限速 λ(S_j) ---
    const currentVal = values[skillId] ?? 0;
    const lambda = calcLambda(currentVal);

    // --- 增量 ΔS_j（Q_filter 缺省为 null → 使用 B̄_j × 0.5）---
    const delta = calcDerivedDelta(weightedBase, null, gamma, lambda);

    // --- 更新技能值 ---
    const newVal = Math.min(100, Math.max(0, currentVal + delta));
    skills[skillId] = newVal;
    values[skillId] = newVal; // 供下游技能引用

    // --- 缓冲池 ---
    let pool = poolMap.get(skillId);
    if (!pool) {
      pool = {
        skill: skillId,
        accumulated: 0,
        threshold: getNextMilestoneThreshold(currentVal),
        lockedUntil: null,
      };
    }
    pool.accumulated += delta;
    // 若已跨过当前阈值边界，更新为下一级阈值
    if (newVal >= pool.threshold) {
      pool.threshold = getNextMilestoneThreshold(newVal);
    }
    pools.push(pool);
  }

  return {
    skills: skills as Record<DerivedSkill, number>,
    pools,
  };
}

// ---------------------------------------------------------------------------
// 6. 基础属性增量（带分段阈值倍率）
//    ΔB_effective = ΔB_raw × T(B_current)
//    来源：tech-spec §2.3
// ---------------------------------------------------------------------------

/**
 * 计算基础属性的有效增量（应用分段阈值倍率）。
 *
 * @param rawDelta   - 原始增量 ΔB_raw
 * @param currentVal - 属性当前值
 * @returns 有效增量（已乘阈值倍率）
 */
export function calcBaseAttrDelta(rawDelta: number, currentVal: number): number {
  return rawDelta * tierMultiplier(currentVal);
}

// ---------------------------------------------------------------------------
// 7. 缓冲池触发检查
//    来源：tech-spec §5.2 — 累积值 ≥ 阈值 × 0.8 时具备触发资格
// ---------------------------------------------------------------------------

/**
 * 检查缓冲池是否达到触发阈值。
 *
 * 触发条件：accumulated >= threshold × 0.8
 *
 * @param _skill      - 衍生技能标识（保留用于未来扩展）
 * @param accumulated - 当前累积值
 * @param threshold   - 晋级阈值（下一里程碑边界）
 * @returns { triggered: true } 当累积值 ≥ 阈值的 80%
 */
export function bufferPoolCheck(
  _skill: DerivedSkill,
  accumulated: number,
  threshold: number,
): { triggered: boolean } {
  return { triggered: accumulated >= threshold * 0.8 };
}
