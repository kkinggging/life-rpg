// ============================================================
// Personal OS RPG — 完整类型定义
// ============================================================

// ---------------------------------------------------------------------------
// 1. 基础属性 (8项)
// ---------------------------------------------------------------------------

export const BASE_ATTRS = [
  'charm',
  'strength',
  'intellect',
  'social',
  'willpower',
  'health',
  'courage',
  'abstinence',
] as const;

export type BaseAttr = (typeof BASE_ATTRS)[number];

export interface BaseAttrs {
  charm: number;
  strength: number;
  intellect: number;
  social: number;
  willpower: number;
  health: number;
  courage: number;
  abstinence: number;
}

// ---------------------------------------------------------------------------
// 2. 衍生技能 (6项)
// ---------------------------------------------------------------------------

export const DERIVED_SKILLS = [
  'mastery',
  'flow',
  'behavioralCues',
  'professional',
  'opportunity',
  'macroControl',
] as const;

export type DerivedSkill = (typeof DERIVED_SKILLS)[number];

export interface DerivedSkills {
  mastery: number;
  flow: number;
  behavioralCues: number;
  professional: number;
  opportunity: number;
  macroControl: number;
}

// 所有指标联合类型
export type Indicator = BaseAttr | DerivedSkill;

// ---------------------------------------------------------------------------
// 3. 里程碑层级
// ---------------------------------------------------------------------------

export interface MilestoneTierMeta {
  tier: number;
  range: [number, number];
  label: string;         // 层级标签，如 "被动退化层"
  description: string;   // 层级说明
}

export const MILESTONE_TIER_META: Record<number, Omit<MilestoneTierMeta, 'tier'>> = {
  1: { range: [0, 20],  label: '被动退化层',  description: '能力退化或停滞，缺乏系统训练与意识' },
  2: { range: [21, 40], label: '日常爱好者',  description: '具备基础意识与行动，但尚未形成系统' },
  3: { range: [41, 60], label: '专项践行者',  description: '在特定领域形成系统性的方法论与实践' },
  4: { range: [61, 80], label: '精英掌控层',  description: '达到卓越水平，具备引领与影响他人的能力' },
  5: { range: [81, 100], label: '绝对主宰层', description: '达到顶尖水准，掌控全局，引领范式' },
};

// ---------------------------------------------------------------------------
// 4. 单项里程碑
// ---------------------------------------------------------------------------

export interface Milestone {
  tier: number;
  range: [number, number];
  label: string;       // 身份/职称标签
  description: string; // 里程碑说明
}

// -------- 基础属性里程碑 --------

export const ATTR_MILESTONES: Record<BaseAttr, [Milestone, Milestone, Milestone, Milestone, Milestone]> = {
  charm: [
    { tier: 1, range: [0,  20], label: '隐形者',     description: '在社交场合中容易被人忽略，存在感较低，尚未建立个人风格与吸引力。' },
    { tier: 2, range: [21, 40], label: '普通路人',   description: '具备基本的社交礼仪，能在日常场景中正常交流，但缺乏突出的个人魅力。' },
    { tier: 3, range: [41, 60], label: '有型人士',   description: '开始形成个人风格，在社交场合能引起注意，具备一定的吸引力与辨识度。' },
    { tier: 4, range: [61, 80], label: '魅力焦点',   description: '成为社交场合的焦点人物，能够自然地吸引他人关注，具备强大的个人魅力。' },
    { tier: 5, range: [81, 100], label: '天然磁场',  description: '无需刻意表现即能吸引他人，气场强大，成为人群中的核心人物。' },
  ],
  strength: [
    { tier: 1, range: [0,  20], label: '亚健康患者', description: '体能处于低下状态，缺乏运动习惯，容易疲劳，身体机能明显不足。' },
    { tier: 2, range: [21, 40], label: '运动爱好者', description: '开始建立运动习惯，体能逐步提升，能完成基础的运动训练项目。' },
    { tier: 3, range: [41, 60], label: '专项体育生', description: '在某项运动中达到专项水平，具备系统的训练方法和良好的体能储备。' },
    { tier: 4, range: [61, 80], label: '职业教练',   description: '体能达到专业水准，能够指导他人训练，具备全面的运动知识与实践能力。' },
    { tier: 5, range: [81, 100], label: '竞技运动员', description: '达到竞技级别的体能水平，在专项运动中具备参赛能力，身体机能处于巅峰状态。' },
  ],
  intellect: [
    { tier: 1, range: [0,  20], label: '盲从者',     description: '缺乏独立思考能力，容易受他人观点影响，尚未建立自己的认知体系。' },
    { tier: 2, range: [21, 40], label: '逻辑追随者', description: '开始运用逻辑思维，能够理解他人的论证过程，但仍主要依赖外部信息。' },
    { tier: 3, range: [41, 60], label: '独立思考者', description: '具备独立的批判性思维能力，能够形成自己的见解与判断。' },
    { tier: 4, range: [61, 80], label: '系统架构师', description: '能够构建系统的知识框架与思维模型，在复杂问题中洞察本质。' },
    { tier: 5, range: [81, 100], label: '范式创造者', description: '能够创造新的思维范式与理论框架，引领领域内的认知革新。' },
  ],
  social: [
    { tier: 1, range: [0,  20], label: '社交恐惧者', description: '对社交场合感到焦虑不安，回避人际交往，社交能力处于萌芽阶段。' },
    { tier: 2, range: [21, 40], label: '规范沟通者', description: '能够在正式场合中进行规范的沟通交流，掌握基本的社交礼仪与技巧。' },
    { tier: 3, range: [41, 60], label: '破局沟通者', description: '能够突破社交壁垒，建立深度连接，在复杂人际关系中游刃有余。' },
    { tier: 4, range: [61, 80], label: '策略博弈者', description: '精通人际策略，能够影响和引导群体决策，具备卓越的谈判与协调能力。' },
    { tier: 5, range: [81, 100], label: '精神领袖',   description: '以思想与人格魅力凝聚人心，能够引领群体方向，成为精神核心。' },
  ],
  willpower: [
    { tier: 1, range: [0,  20], label: '易碎者',     description: '意志力薄弱，容易被诱惑和困难击倒，缺乏持续行动的能力。' },
    { tier: 2, range: [21, 40], label: '顺境克难者', description: '在顺境中能够保持行动力，但面对重大挫折时容易动摇。' },
    { tier: 3, range: [41, 60], label: '原则坚守者', description: '能够坚守自己的原则与承诺，在大多数情况下保持自律与执行力。' },
    { tier: 4, range: [61, 80], label: '深度自驱者', description: '不需要外部激励即能持续行动，具备强大的内在驱动力与耐力。' },
    { tier: 5, range: [81, 100], label: '绝对泰然者', description: '在任何境遇下都能保持内心的平静与坚定，意志力达到极高境界。' },
  ],
  health: [
    { tier: 1, range: [0,  20], label: '免疫崩溃者', description: '免疫系统脆弱，容易生病，身体长期处于亚健康或不健康状态。' },
    { tier: 2, range: [21, 40], label: '基础平衡者', description: '身体各项指标基本正常，能维持日常运转，但缺乏充沛的精力储备。' },
    { tier: 3, range: [41, 60], label: '稳态保持者', description: '身体机能处于稳定健康状态，具备良好的自我调节与恢复能力。' },
    { tier: 4, range: [61, 80], label: '精力盈余者', description: '精力充沛，身体机能优秀，能够承受高强度的工作与训练负荷。' },
    { tier: 5, range: [81, 100], label: '纯净有机体', description: '身体达到极佳的健康状态，各项指标优化至理想水平，精力旺盛。' },
  ],
  courage: [
    { tier: 1, range: [0,  20], label: '怯懦者',     description: '面对挑战与不确定性时易退缩，缺乏迈出舒适区的勇气。' },
    { tier: 2, range: [21, 40], label: '任务执行者', description: '在明确指令下能够执行任务，面对已知挑战有一定的应对能力。' },
    { tier: 3, range: [41, 60], label: '逆境挑战者', description: '主动迎接挑战，在逆境中能够保持前进的动力与决心。' },
    { tier: 4, range: [61, 80], label: '恐惧降伏者', description: '能够直面内心恐惧，将恐惧转化为行动的动力，具备强大的心理韧性。' },
    { tier: 5, range: [81, 100], label: '无畏修行者', description: '将勇气内化为生命修行的一部分，在任何境遇下都无畏无惧。' },
  ],
  abstinence: [
    { tier: 1, range: [0,  20], label: '欲望奴隶',         description: '被各种欲望驱使，缺乏自我约束能力，难以抵制短期诱惑。' },
    { tier: 2, range: [21, 40], label: '规则践行者',       description: '开始建立规则意识，能够按照设定的规则约束自己的行为。' },
    { tier: 3, range: [41, 60], label: '觉醒掌控者',       description: '意识到欲望的本质，能够主动管理自己的欲望与行为。' },
    { tier: 4, range: [61, 80], label: '意志绝对主宰',     description: '意志力完全主导行为，能够在任何诱惑下保持清醒与克制。' },
    { tier: 5, range: [81, 100], label: '超凡禁欲宗师',   description: '将禁欲升华为生命哲学，在克制中获得真正的自由与力量。' },
  ],
};

// -------- 衍生技能里程碑 --------

export const SKILL_MILESTONES: Record<DerivedSkill, [Milestone, Milestone, Milestone, Milestone, Milestone]> = {
  mastery: [
    { tier: 1, range: [0,  20], label: '混乱新手',    description: '技能掌握度低，缺乏系统的学习路径，处于摸索与试错阶段。' },
    { tier: 2, range: [21, 40], label: '基础合格者',  description: '掌握了基础技能，能够完成常规任务，具备基本的职业能力。' },
    { tier: 3, range: [41, 60], label: '专项掌控者',  description: '在核心领域具备深度掌控力，能够独立解决复杂问题。' },
    { tier: 4, range: [61, 80], label: '行业弄潮儿',  description: '在行业内具备领先地位，能够引领技术方向与创新潮流。' },
    { tier: 5, range: [81, 100], label: '命运操盘手',  description: '技能达到顶尖水平，能够掌控自己的职业命运，成为行业标杆。' },
  ],
  flow: [
    { tier: 1, range: [0,  20], label: '极度内耗者',  description: '注意力涣散，行动与思维脱节，长期处于低效与内耗状态。' },
    { tier: 2, range: [21, 40], label: '阶段顺畅者',  description: '在某些时段能够进入专注状态，行动与思维较为协调。' },
    { tier: 3, range: [41, 60], label: '行为自然者',  description: '行为流畅自然，能够较为轻松地进入专注状态并保持高效。' },
    { tier: 4, range: [61, 80], label: '知行合一者',  description: '思想与行动高度统一，能够持续保持高效的心流状态。' },
    { tier: 5, range: [81, 100], label: '绝对心流者',  description: '在任何情境下都能迅速进入深度心流，达到人境合一的境界。' },
  ],
  behavioralCues: [
    { tier: 1, range: [0,  20], label: '环境顺从者',   description: '行为受环境主导，缺乏自主的行为表达，容易被情境左右。' },
    { tier: 2, range: [21, 40], label: '职场得体者',   description: '在职场环境中行为得体，符合基本的行为规范与礼仪。' },
    { tier: 3, range: [41, 60], label: '气场吸引者',   description: '行为举止具备吸引力和影响力，能在团队中形成正面气场。' },
    { tier: 4, range: [61, 80], label: '领袖级表达者', description: '行为表达具备领袖气质，能够通过言行感染和领导他人。' },
    { tier: 5, range: [81, 100], label: '宗师级潜沟通者', description: '精通潜意识层面的沟通艺术，行为本身即是最强大的表达。' },
  ],
  professional: [
    { tier: 1, range: [0,  20], label: '职场累赘',    description: '在团队中缺乏贡献，需要他人大量支持才能完成基本任务。' },
    { tier: 2, range: [21, 40], label: '任务执行者',  description: '能够独立完成分配的任务，具备基本的职业素养与执行力。' },
    { tier: 3, range: [41, 60], label: '项目推动者',  description: '能够主导项目推进，具备跨团队协调与资源整合能力。' },
    { tier: 4, range: [61, 80], label: '业务引擎',    description: '成为业务增长的核心驱动力，能够创造显著的价值与影响。' },
    { tier: 5, range: [81, 100], label: '行业定义者',  description: '具备重新定义行业标准与格局的能力，成为领域内的标杆人物。' },
  ],
  opportunity: [
    { tier: 1, range: [0,  20], label: '机会盲人',    description: '对周围的机遇缺乏感知能力，即使机会出现也无法识别。' },
    { tier: 2, range: [21, 40], label: '被动接收者',  description: '能够识别并接收明显的机遇，但缺乏主动挖掘的意识。' },
    { tier: 3, range: [41, 60], label: '主动猎手',    description: '积极寻找和创造机遇，具备敏锐的机会感知与捕捉能力。' },
    { tier: 4, range: [61, 80], label: '价值枢纽',    description: '成为资源与机会的汇聚节点，能够连接和盘活多方价值。' },
    { tier: 5, range: [81, 100], label: '生态构建者',  description: '能够构建完整的机遇生态系统，创造并分配机会给他人。' },
  ],
  macroControl: [
    { tier: 1, range: [0,  20], label: '失控漂流者',  description: '生活与工作处于被动失控状态，缺乏整体规划与掌控能力。' },
    { tier: 2, range: [21, 40], label: '短暂有序者',  description: '短期内能够维持一定的秩序，但难以持久，容易被打乱节奏。' },
    { tier: 3, range: [41, 60], label: '稳定统筹者',  description: '能够稳定地统筹多线事务，保持长期的有序与高效。' },
    { tier: 4, range: [61, 80], label: '节奏定义者',  description: '能够定义自己的节奏与规则，主动塑造而非被动适应环境。' },
    { tier: 5, range: [81, 100], label: '全盘操盘手',  description: '全方位的掌控能力，能够统筹规划人生的各个维度，达到全局最优。' },
  ],
};

// 统一里程碑映射: indicator → milestones
export const ALL_MILESTONES: Record<Indicator, Milestone[]> = {
  ...ATTR_MILESTONES,
  ...SKILL_MILESTONES,
};

// ---------------------------------------------------------------------------
// 5. 属性与技能元数据
// ---------------------------------------------------------------------------

export interface IndicatorMeta {
  label: string;       // 中文标签
  emoji: string;       // Emoji 图标
  color: string;       // 颜色
  description: string; // 描述
}

export const ATTR_META: Record<BaseAttr, IndicatorMeta> = {
  charm:      { label: '魅力',   emoji: '✨', color: '#f59e0b', description: '搭讪、社交场合的吸引力与存在感' },
  strength:   { label: '力量',   emoji: '💪', color: '#ef4444', description: '体能、力量训练带来的身体素质' },
  intellect:  { label: '智力',   emoji: '🧠', color: '#3b82f6', description: '学习、深度思考与认知体系的构建' },
  social:     { label: '社交',   emoji: '🤝', color: '#10b981', description: '人际交往、沟通博弈与群体影响力' },
  willpower:  { label: '意志力', emoji: '🔥', color: '#8b5cf6', description: '自律、执行力和内心的坚韧程度' },
  health:     { label: '健康',   emoji: '🫀', color: '#ec4899', description: '身体机能、免疫力与精力充沛度' },
  courage:    { label: '勇气',   emoji: '🦁', color: '#f97316', description: '面对恐惧与挑战时的行动力' },
  abstinence: { label: '禁欲',   emoji: '🧘', color: '#6366f1', description: '对欲望的觉察、管理与克制能力' },
};

export const SKILL_META: Record<DerivedSkill, IndicatorMeta> = {
  mastery:        { label: '熟练度',       emoji: '⚙️', color: '#f59e0b', description: '测试阶段性的状态，与当下的环境事务有关' },
  flow:           { label: '流动感',       emoji: '🌊', color: '#06b6d4', description: '测定有无内耗，做事情的产出效率，外显的自然感' },
  behavioralCues: { label: '强行为线索',   emoji: '🦅', color: '#d946ef', description: '稀缺的潜沟通信号，建立于流动感之上并带有持续性' },
  professional:   { label: '工作业务能力', emoji: '📊', color: '#eab308', description: '测定工作实际的能力，与个人兴趣驱动的坚定有关' },
  opportunity:    { label: '机会捕捉能力', emoji: '🎯', color: '#22c55e', description: '在非常恰当的时机捕猎机会，主动价值交换' },
  macroControl:   { label: '掌控感',       emoji: '🏛️', color: '#6366f1', description: '统筹全局，受激素水平/心态客观影响，作为全局阻尼' },
};

// 统一元数据映射: indicator → meta
export const INDICATOR_META: Record<Indicator, IndicatorMeta> = {
  ...ATTR_META,
  ...SKILL_META,
};

// ---------------------------------------------------------------------------
// 6. 打卡体系类型
// ---------------------------------------------------------------------------

export type CheckinSystem = 'diet' | 'fitness' | 'social' | 'study' | 'work' | 'meditation' | 'sleep' | string;

// ---------------------------------------------------------------------------
// 7. 核心数据接口
// ---------------------------------------------------------------------------

/** 打卡记录 */
export interface CheckinRecord {
  id: string;
  date: string;                        // ISO date YYYY-MM-DD
  system: CheckinSystem;
  answers: Record<string, string>;     // 问题ID → 答案
  baseAttrDelta: Partial<BaseAttrs>;   // 基础属性变化量
}

/** Q-Filter 记录 */
export interface QFilterRecord {
  id: string;
  date: string;              // ISO date YYYY-MM-DD
  targetSkill: DerivedSkill; // 目标衍生技能
  dimension: string;         // 评测维度
  questionVariant: string;   // 题目变体
  answer: number;            // 回答值 0-100
  responseTime: number;      // 响应时间 (ms)
  confidence: number;        // 系统置信度 0-1
}

/** 缓冲池状态 */
export interface BufferPool {
  skill: DerivedSkill;
  accumulated: number;       // 已累积值
  threshold: number;         // 解锁阈值
  lockedUntil: string | null; // 锁定截止日期 ISO date，为 null 表示未锁定
}

/** 黑盒检测结果 */
export interface BlackBox {
  skill: DerivedSkill;
  boundary: number;          // 边界值
  startDate: string;         // 检测开始日期 ISO date
  endDate: string;           // 检测结束日期 ISO date
  flags: string[];           // 触发的标记列表
  verdict: 'stable' | 'volatile' | 'degrading' | 'breakthrough'; // 判定结果
}

/** 盲测结果 */
export interface BlindTestResult {
  date: string;                        // ISO date YYYY-MM-DD
  blind: Record<DerivedSkill, number>; // 盲测值映射
  formula: Record<DerivedSkill, string>; // 公式映射 (表达式字符串)
}

/** 衍生技能定义 (用户可配置的 DAG 节点) */
export interface DerivedSkillDef {
  id: DerivedSkill | string;
  label: string;
  description: string;
  inputs: { source: string; weight: number }[]; // 输入源与权重
  tier: number;                                 // DAG 层级编号
}

// ---------------------------------------------------------------------------
// 8. 全局应用状态
// ---------------------------------------------------------------------------

export interface AppState {
  baseAttrs: BaseAttrs;
  derivedSkills: DerivedSkills;
  checkinRecords: CheckinRecord[];
  qfilterRecords: QFilterRecord[];
  bufferPools: BufferPool[];
  blackBoxes: BlackBox[];
  lastBackup: string | null;
  daysSinceFirstUse: number;
  blindTestResults: BlindTestResult[];
}

// ---------------------------------------------------------------------------
// 9. 默认初始值
// ---------------------------------------------------------------------------

/** 基础属性初始值：除智力 35、禁欲 20 外，其余均从 25 起步 */
export const DEFAULT_BASE_ATTRS: BaseAttrs = {
  charm: 25,
  strength: 25,
  intellect: 35,
  social: 25,
  willpower: 25,
  health: 25,
  courage: 25,
  abstinence: 20,
};

/** 衍生技能初始值：均从 20 起步 */
export const DEFAULT_DERIVED_SKILLS: DerivedSkills = {
  mastery: 20,
  flow: 20,
  behavioralCues: 20,
  professional: 20,
  opportunity: 20,
  macroControl: 20,
};

/** 应用初始状态 */
export const DEFAULT_APP_STATE: AppState = {
  baseAttrs: { ...DEFAULT_BASE_ATTRS },
  derivedSkills: { ...DEFAULT_DERIVED_SKILLS },
  checkinRecords: [],
  qfilterRecords: [],
  bufferPools: [],
  blackBoxes: [],
  lastBackup: null,
  daysSinceFirstUse: 0,
  blindTestResults: [],
};

// ---------------------------------------------------------------------------
// 10. 工具函数
// ---------------------------------------------------------------------------

/**
 * 分段倍率系数
 *   0-60  → 1.00 (线性增长)
 *   60-80 → 0.60 (减速)
 *   80-95 → 0.25 (大幅减速)
 *   95-100 → 0.10 (极慢)
 */
export function tierMultiplier(val: number): number {
  if (val < 60) return 1.0;
  if (val < 80) return 0.6;
  if (val < 95) return 0.25;
  return 0.1;
}

/**
 * 根据数值获取对应的里程碑条目
 */
export function getMilestone(val: number, milestones: Milestone[]): Milestone {
  const clamped = Math.max(0, Math.min(100, val));
  for (const m of milestones) {
    if (clamped >= m.range[0] && clamped <= m.range[1]) return m;
  }
  // fallback: 返回最后一个
  return milestones[milestones.length - 1];
}

/**
 * 根据数值获取所属的里程碑层级 (1-5)
 */
export function getMilestoneTier(val: number): number {
  if (val <= 20) return 1;
  if (val <= 40) return 2;
  if (val <= 60) return 3;
  if (val <= 80) return 4;
  return 5;
}

/**
 * 根据数值获取里程碑层级标签
 */
export function getMilestoneLabel(val: number): string {
  const tier = getMilestoneTier(val);
  return MILESTONE_TIER_META[tier]?.label ?? '未知';
}

/**
 * 获取某个指标在当前数值下的完整里程碑信息
 */
export function getIndicatorMilestone(indicator: Indicator, val: number): Milestone {
  const milestones = ALL_MILESTONES[indicator];
  if (!milestones) throw new Error(`Unknown indicator: ${indicator}`);
  return getMilestone(val, milestones);
}
