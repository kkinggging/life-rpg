// ============================================================
// 量化人生RPG — 里程碑矩阵
// 14项指标 (8项基础属性 + 6项派生技能)
// ============================================================

/** 8项基础属性 */
export type BaseAttr =
  | 'charm'
  | 'strength'
  | 'intellect'
  | 'social'
  | 'willpower'
  | 'health'
  | 'courage'
  | 'abstinence'

/** 6项派生技能 */
export type DerivedSkill =
  | 'mastery'
  | 'flow'
  | 'behavioralCues'
  | 'professional'
  | 'opportunity'
  | 'macroControl'

/** 里程碑条目 */
export interface MilestoneEntry {
  min: number
  max: number
  tier: number
  tierName: string
  label: string
  desc: string
}

// ============================================================
// 通用分段命名 (每个属性/技能各有专属标签label)
// ============================================================
const TIER_NAMES = ['', '入门', '基础', '进阶', '高手', '大师']

// ============================================================
// 基础属性里程碑 (8项 × 5段)
// ============================================================
export const BASE_ATTR_MILESTONES: Record<BaseAttr, MilestoneEntry[]> = {
  // --- 魅力值 ---
  charm: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '隐形者',
      desc: '在社交场合完全不被注意',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '普通路人',
      desc: '开始具备基本的社交存在感，偶尔被注意到',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '有型人士',
      desc: '开始被注意到',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '魅力焦点',
      desc: '进入房间时能引起注意',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '天然磁场',
      desc: '无需主动展示即产生吸引力',
    },
  ],

  // --- 力量值 ---
  strength: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '亚健康患者',
      desc: '体能处于明显低谷，日常活动即感疲惫',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '运动爱好者',
      desc: '开始有规律地进行体育锻炼，体能逐步回升',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '专项体育生',
      desc: '在某项运动中展现出超过常人的能力',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '职业教练',
      desc: '体能达到可指导他人的专业水平',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '竞技运动员',
      desc: '身体能力处于巅峰竞技状态',
    },
  ],

  // --- 智力值 ---
  intellect: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '盲从者',
      desc: '倾向于接受他人观点而不加甄别',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '逻辑追随者',
      desc: '开始运用逻辑思考，但仍依赖既定框架',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '独立思考者',
      desc: '能够形成自己的判断，不盲从权威',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '系统架构师',
      desc: '能够构建复杂的认知体系，融会贯通',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '范式创造者',
      desc: '创造出全新的思考框架，引领认知革命',
    },
  ],

  // --- 社交值 ---
  social: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '社交恐惧者',
      desc: '在社交场合感到强烈不安与回避',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '规范沟通者',
      desc: '能够进行基本的社交礼仪沟通',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '破局沟通者',
      desc: '能够打破僵局，主动引导对话方向',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '策略博弈者',
      desc: '精通社交策略，能够影响群体决策',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '精神领袖',
      desc: '以人格魅力引领群体，凝聚共识',
    },
  ],

  // --- 意志力 ---
  willpower: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '易碎者',
      desc: '面对挫折容易放弃，缺乏持续力',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '顺境克难者',
      desc: '在有利条件下能够坚持，逆境易动摇',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '原则坚守者',
      desc: '无论顺逆，坚定执行既定原则',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '深度自驱者',
      desc: '无需外部监督，内在驱动力极强',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '绝对泰然者',
      desc: '在极端压力下依然保持冷静与专注',
    },
  ],

  // --- 健康值 ---
  health: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '免疫崩溃者',
      desc: '身体防御系统脆弱，频繁生病',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '基础平衡者',
      desc: '身体各项指标处于正常范围',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '稳态保持者',
      desc: '持续保持良好健康状态，少受波动影响',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '精力盈余者',
      desc: '体能充沛，恢复能力远超常人',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '纯净有机体',
      desc: '身体达到接近完美的健康平衡状态',
    },
  ],

  // --- 勇气值 ---
  courage: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '怯懦者',
      desc: '面对风险与不确定性时选择回避',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '任务执行者',
      desc: '在有明确指令时能够克服恐惧行动',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '逆境挑战者',
      desc: '主动寻求挑战，在困难中成长',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '恐惧降伏者',
      desc: '能够驾驭恐惧，将其转化为动力',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '无畏修行者',
      desc: '已超越恐惧，以平和心态面对一切',
    },
  ],

  // --- 节制值 ---
  abstinence: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '欲望奴隶',
      desc: '无法抵抗即时诱惑，行为完全由欲望驱动',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '规则践行者',
      desc: '依靠外部规则约束行为',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '觉醒掌控者',
      desc: '开始意识到欲望的本质并主动管理',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '意志绝对主宰',
      desc: '欲望完全服从于理性意志',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '超凡禁欲宗师',
      desc: '达到超越欲望的精神自由境界',
    },
  ],
}

// ============================================================
// 派生技能里程碑 (6项 × 5段)
// ============================================================
export const DERIVED_SKILL_MILESTONES: Record<DerivedSkill, MilestoneEntry[]> = {
  // --- 掌控力 ---
  mastery: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '混乱新手',
      desc: '面对任务时缺乏系统方法，效率低下',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '基础合格者',
      desc: '能够完成常规任务，但缺乏深度',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '专项掌控者',
      desc: '在特定领域拥有扎实的专业能力',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '行业弄潮儿',
      desc: '在行业内具有引领趋势的能力',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '命运操盘手',
      desc: '对自身领域拥有绝对的掌控力与预见性',
    },
  ],

  // --- 心流 ---
  flow: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '极度内耗者',
      desc: '大量心理能量浪费在自我怀疑与纠结中',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '阶段顺畅者',
      desc: '在某些时段能够进入顺畅的工作状态',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '行为自然者',
      desc: '行为日趋自然，减少不必要的心理消耗',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '知行合一者',
      desc: '所想即所做，身心高度统一',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '绝对心流者',
      desc: '持续处于最优体验状态，行动与意识完全融合',
    },
  ],

  // --- 行为暗示 ---
  behavioralCues: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '环境顺从者',
      desc: '行为完全由环境决定，缺乏自我框架',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '职场得体者',
      desc: '能够在外在表现上符合社交规范',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '气场吸引者',
      desc: '开始散发出独特的个人气场',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '领袖级表达者',
      desc: '言行具有强大的感染力与号召力',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '宗师级潜沟通者',
      desc: '无需言语即可传递强大信息，达到潜沟通的最高境界',
    },
  ],

  // --- 职业力 ---
  professional: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '职场累赘',
      desc: '在职场中难以独立创造价值',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '任务执行者',
      desc: '能够按要求完成任务，但缺乏主动性',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '项目推动者',
      desc: '能够独立推动项目前进，创造可见成果',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '业务引擎',
      desc: '成为业务增长的核心驱动力',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '行业定义者',
      desc: '重新定义行业标准与游戏规则',
    },
  ],

  // --- 机会力 ---
  opportunity: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '机会盲人',
      desc: '对周围机会完全视而不见',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '被动接收者',
      desc: '只能看到明显的机会，等待机会上门',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '主动猎手',
      desc: '主动搜寻并识别潜在机会',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '价值枢纽',
      desc: '成为资源与机会汇聚的关键节点',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '生态构建者',
      desc: '创造全新的机会生态，让机会主动流向自己',
    },
  ],

  // --- 宏观掌控 ---
  macroControl: [
    {
      min: 0, max: 20, tier: 1, tierName: TIER_NAMES[1],
      label: '失控漂流者',
      desc: '生活完全处于被动应对状态',
    },
    {
      min: 21, max: 40, tier: 2, tierName: TIER_NAMES[2],
      label: '短暂有序者',
      desc: '偶尔能够掌控局面，但不稳定',
    },
    {
      min: 41, max: 60, tier: 3, tierName: TIER_NAMES[3],
      label: '稳定统筹者',
      desc: '能够稳定地管理和统筹多项事务',
    },
    {
      min: 61, max: 80, tier: 4, tierName: TIER_NAMES[4],
      label: '节奏定义者',
      desc: '主导生活节奏，影响周围环境的运转',
    },
    {
      min: 81, max: 100, tier: 5, tierName: TIER_NAMES[5],
      label: '全盘操盘手',
      desc: '对生活全局拥有绝对的掌控力与预见力',
    },
  ],
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 根据数值查找对应的里程碑段位
 * @param val 当前数值 (0-100)
 * @param milestones 里程碑数组
 * @returns 匹配的 MilestoneEntry，若数值越界则返回 null
 */
export function getMilestone(
  val: number,
  milestones: MilestoneEntry[],
): MilestoneEntry | null {
  for (const m of milestones) {
    if (val >= m.min && val <= m.max) {
      return m
    }
  }
  return null
}
