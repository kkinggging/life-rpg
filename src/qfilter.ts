// ============================================================
// 量化人生RPG — Q_filter 问答库
// 每个派生技能至少4题 (2维度 × 2变体措辞)
// ============================================================

import type { DerivedSkill } from './types'

// ============================================================
// 类型定义
// ============================================================

export interface QFilterQuestion {
  id: string
  skill: DerivedSkill
  dimension: string
  text: string
  options: QFilterOption[]
}

export interface QFilterOption {
  label: string
  value: number
  icon: string
}

// ============================================================
// 完整题库 (24题)
// ============================================================

export const QUESTIONS: QFilterQuestion[] = [

  // ========================================================
  // mastery — 熟练度 (4题)
  // ========================================================

  // dim: 执行流畅度 — variant A
  {
    id: 'mastery_flow_a',
    skill: 'mastery',
    dimension: '执行流畅度',
    text: '在处理今天突发的核心事务时，你产生"卡壳、愣住、需要停下来反复查阅资料或疏通心理"的瞬间，出现了几次？',
    options: [
      { label: '0次·丝滑完成', value: 90, icon: '✨' },
      { label: '1-2次·轻微卡顿', value: 70, icon: '👍' },
      { label: '3-5次·明确阻碍', value: 45, icon: '🤔' },
      { label: '5次以上·频繁卡壳', value: 22, icon: '😰' },
      { label: '完全停滞', value: 5, icon: '💀' },
    ],
  },

  // dim: 执行流畅度 — variant B
  {
    id: 'mastery_flow_b',
    skill: 'mastery',
    dimension: '执行流畅度',
    text: '今天有几次你明知道该做什么但卡住了？',
    options: [
      { label: '0次·丝滑完成', value: 90, icon: '✨' },
      { label: '1-2次·轻微卡顿', value: 70, icon: '👍' },
      { label: '3-5次·明确阻碍', value: 45, icon: '🤔' },
      { label: '5次以上·频繁卡壳', value: 22, icon: '😰' },
      { label: '完全停滞', value: 5, icon: '💀' },
    ],
  },

  // dim: 注意宽幅 — variant A
  {
    id: 'mastery_attention_a',
    skill: 'mastery',
    dimension: '注意宽幅',
    text: '在推进任务时，你的大脑是处于"紧绷于当前死角、无暇顾及周边环境"的窄聚焦，还是处于"余裕充足、能同时感知到环境变化与长远规划"的宽聚焦？',
    options: [
      { label: '宽聚焦·看到全盘', value: 90, icon: '✨' },
      { label: '偏宽·多数有余力', value: 70, icon: '👍' },
      { label: '偏窄·被眼前压住', value: 45, icon: '🤔' },
      { label: '窄聚焦·完全陷进去', value: 22, icon: '😰' },
      { label: '完全崩溃', value: 5, icon: '💀' },
    ],
  },

  // dim: 注意宽幅 — variant B
  {
    id: 'mastery_attention_b',
    skill: 'mastery',
    dimension: '注意宽幅',
    text: '今天工作时，你的注意力是被单一任务锁死，还是能自由切换并感知全局？',
    options: [
      { label: '自由切换·全局感知', value: 90, icon: '✨' },
      { label: '偏自由·大多能切换', value: 70, icon: '👍' },
      { label: '偏锁定·偶尔抽离', value: 45, icon: '🤔' },
      { label: '完全锁死', value: 22, icon: '😰' },
      { label: '思维瘫痪', value: 5, icon: '💀' },
    ],
  },

  // ========================================================
  // flow — 流动感 (4题)
  // ========================================================

  // dim: 决策逆反感 — variant A
  {
    id: 'flow_rumination_a',
    skill: 'flow',
    dimension: '决策逆反感',
    text: '在今天做出某个决定或完成某次表达后，你是否在事后产生了"反复回想、试图修正、甚至虚拟出多种场景去自我辩护"的心理背景噪音？',
    options: [
      { label: '完全没有·无心理残留', value: 90, icon: '✨' },
      { label: '微弱·一闪念', value: 70, icon: '👍' },
      { label: '中等·几件事回想', value: 45, icon: '🤔' },
      { label: '较强·长时间改写对话', value: 22, icon: '😰' },
      { label: '极度·被多版本场景占据', value: 5, icon: '💀' },
    ],
  },

  // dim: 决策逆反感 — variant B
  {
    id: 'flow_rumination_b',
    skill: 'flow',
    dimension: '决策逆反感',
    text: '今天做完某个选择后，你有没有忍不住在心里重播那个场景，想象"如果当时那样说/做就好了"？',
    options: [
      { label: '完全没有', value: 90, icon: '✨' },
      { label: '一闪而过即放下', value: 70, icon: '👍' },
      { label: '想了几次但可控', value: 45, icon: '🤔' },
      { label: '反复重播·消耗精力', value: 22, icon: '😰' },
      { label: '整晚被占据·无法自拔', value: 5, icon: '💀' },
    ],
  },

  // dim: 社会面具重量 — variant A
  {
    id: 'flow_mask_a',
    skill: 'flow',
    dimension: '社会面具重量',
    text: '在今天的公共交互中，你的肢体、语调、表情，是为了"扮演一个优秀的自己"而刻意维持的，还是处于一种"即便说错话也觉得无所谓"的全然松弛状态？',
    options: [
      { label: '全然松弛·不扮演', value: 90, icon: '✨' },
      { label: '轻微觉察·不过度', value: 70, icon: '👍' },
      { label: '一半一半', value: 45, icon: '🤔' },
      { label: '较重面具', value: 22, icon: '😰' },
      { label: '全面具', value: 5, icon: '💀' },
    ],
  },

  // dim: 社会面具重量 — variant B
  {
    id: 'flow_mask_b',
    skill: 'flow',
    dimension: '社会面具重量',
    text: '今天与人相处时，你的言行有多少比例是在"演"，有多少是自然流露？',
    options: [
      { label: '几乎全是自然流露', value: 90, icon: '✨' },
      { label: '偶尔扮演·大多真实', value: 70, icon: '👍' },
      { label: '各占一半', value: 45, icon: '🤔' },
      { label: '大部分在扮演', value: 22, icon: '😰' },
      { label: '全天都在演·精疲力竭', value: 5, icon: '💀' },
    ],
  },

  // ========================================================
  // behavioralCues — 强行为线索 (4题)
  // ========================================================

  // dim: 框架稳定性 — variant A
  {
    id: 'cues_frame_a',
    skill: 'behavioralCues',
    dimension: '框架稳定性',
    text: '当面对高位阶人物、高价值资源或潜在冲突场景时，你的呼吸频率是否发生显著变化？是否主动打断了自己的舒适节奏去迎合对方？',
    options: [
      { label: '完全没变·节奏不倒', value: 90, icon: '✨' },
      { label: '极轻微', value: 70, icon: '👍' },
      { label: '有紧张', value: 45, icon: '🤔' },
      { label: '明显回避/讨好', value: 22, icon: '😰' },
      { label: '完全被压制', value: 5, icon: '💀' },
    ],
  },

  // dim: 框架稳定性 — variant B
  {
    id: 'cues_frame_b',
    skill: 'behavioralCues',
    dimension: '框架稳定性',
    text: '今天遇到权威或强势人物时，你是否不自觉地改变了自己的语速、坐姿或观点？',
    options: [
      { label: '完全保持自我', value: 90, icon: '✨' },
      { label: '极轻微调整', value: 70, icon: '👍' },
      { label: '有意识但可控', value: 45, icon: '🤔' },
      { label: '明显改变·事后后悔', value: 22, icon: '😰' },
      { label: '完全变成另一个人', value: 5, icon: '💀' },
    ],
  },

  // dim: 能量留白度 — variant A
  {
    id: 'cues_silence_a',
    skill: 'behavioralCues',
    dimension: '能量留白度',
    text: '当对方抛出挑衅或含糊话题时，你是否能舒适地容忍现场沉默2秒以上而不急于自证或填补空白？',
    options: [
      { label: '完全舒适·沉默是空间', value: 90, icon: '✨' },
      { label: '基本舒适', value: 70, icon: '👍' },
      { label: '有些不适', value: 45, icon: '🤔' },
      { label: '明显不适·立刻填补', value: 22, icon: '😰' },
      { label: '极度回避沉默', value: 5, icon: '💀' },
    ],
  },

  // dim: 能量留白度 — variant B
  {
    id: 'cues_silence_b',
    skill: 'behavioralCues',
    dimension: '能量留白度',
    text: '今天对话中出现冷场时，你是安之若素还是立刻找话填满？',
    options: [
      { label: '安之若素·享受留白', value: 90, icon: '✨' },
      { label: '基本自在', value: 70, icon: '👍' },
      { label: '有些坐不住', value: 45, icon: '🤔' },
      { label: '赶紧找话填补', value: 22, icon: '😰' },
      { label: '冷场让我极度恐慌', value: 5, icon: '💀' },
    ],
  },

  // ========================================================
  // professional — 工作业务能力 (4题)
  // ========================================================

  // dim: 信息熵减率 — variant A
  {
    id: 'pro_entropy_a',
    skill: 'professional',
    dimension: '信息熵减率',
    text: '你今天产出的工作成果，是将复杂模糊的局势梳理得更加清晰可执行（熵减），还是制造了更多模糊点（熵增）？',
    options: [
      { label: '明确熵减', value: 90, icon: '✨' },
      { label: '偏熵减', value: 70, icon: '👍' },
      { label: '持平', value: 45, icon: '🤔' },
      { label: '偏熵增', value: 22, icon: '😰' },
      { label: '明显熵增', value: 5, icon: '💀' },
    ],
  },

  // dim: 信息熵减率 — variant B
  {
    id: 'pro_entropy_b',
    skill: 'professional',
    dimension: '信息熵减率',
    text: '回顾今天的工作，你是让事情变得更简单明了，还是让局面更复杂混乱？',
    options: [
      { label: '显著简化·化繁为简', value: 90, icon: '✨' },
      { label: '偏简化', value: 70, icon: '👍' },
      { label: '维持原状', value: 45, icon: '🤔' },
      { label: '偏复杂化', value: 22, icon: '😰' },
      { label: '制造混乱', value: 5, icon: '💀' },
    ],
  },

  // dim: 内驱力损耗 — variant A
  {
    id: 'pro_drive_a',
    skill: 'professional',
    dimension: '内驱力损耗',
    text: '今天驱使你推进高难任务的，是"对成果的强烈好奇与创造欲"，还是"对截止日期的恐惧或对世俗回报的算计"？',
    options: [
      { label: '纯内在驱动', value: 90, icon: '✨' },
      { label: '偏内在', value: 70, icon: '👍' },
      { label: '各半', value: 45, icon: '🤔' },
      { label: '偏外在·deadline推', value: 22, icon: '😰' },
      { label: '纯外在', value: 5, icon: '💀' },
    ],
  },

  // dim: 内驱力损耗 — variant B
  {
    id: 'pro_drive_b',
    skill: 'professional',
    dimension: '内驱力损耗',
    text: '今天你工作的主要动力源是内在兴趣还是外部压力？',
    options: [
      { label: '全凭兴趣与热爱', value: 90, icon: '✨' },
      { label: '大多内在驱动', value: 70, icon: '👍' },
      { label: '内外各半', value: 45, icon: '🤔' },
      { label: '多由压力推动', value: 22, icon: '😰' },
      { label: '纯粹被迫·毫无热情', value: 5, icon: '💀' },
    ],
  },

  // ========================================================
  // opportunity — 机会捕捉能力 (4题)
  // ========================================================

  // dim: 猎人直觉 — variant A
  {
    id: 'opp_hunter_a',
    skill: 'opportunity',
    dimension: '猎人直觉',
    text: '在近期交流或信息流中，你是否精准识别出了非公开、存在信息差、能形成价值闭环的切入点，并在24小时内付出了实际试探行动？',
    options: [
      { label: '识别且已行动', value: 90, icon: '✨' },
      { label: '识别·初步试探', value: 70, icon: '👍' },
      { label: '隐约感觉·未行动', value: 45, icon: '🤔' },
      { label: '不确定', value: 22, icon: '😰' },
      { label: '完全没有线索', value: 5, icon: '💀' },
    ],
  },

  // dim: 猎人直觉 — variant B
  {
    id: 'opp_hunter_b',
    skill: 'opportunity',
    dimension: '猎人直觉',
    text: '今天你发现了几个别人没注意到的机会窗口？你采取了行动吗？',
    options: [
      { label: '多个·已行动', value: 90, icon: '✨' },
      { label: '1-2个·已有规划', value: 70, icon: '👍' },
      { label: '有感觉但未行动', value: 45, icon: '🤔' },
      { label: '不太确定', value: 22, icon: '😰' },
      { label: '完全没发现', value: 5, icon: '💀' },
    ],
  },

  // dim: 投射沉没成本 — variant A
  {
    id: 'opp_sunk_a',
    skill: 'opportunity',
    dimension: '投射沉没成本',
    text: '当你主动为潜在机会投入精力时，你脑海中是否反复盘算着"如果不给回报我就亏大了"的焦虑感？',
    options: [
      { label: '完全没有焦虑', value: 90, icon: '✨' },
      { label: '几乎没有', value: 70, icon: '👍' },
      { label: '有一些', value: 45, icon: '🤔' },
      { label: '较明显', value: 22, icon: '😰' },
      { label: '极度焦虑回报', value: 5, icon: '💀' },
    ],
  },

  // dim: 投射沉没成本 — variant B
  {
    id: 'opp_sunk_b',
    skill: 'opportunity',
    dimension: '投射沉没成本',
    text: '今天为某个机会付出时，你的心态是"只管耕耘"还是"必须要有回报"？',
    options: [
      { label: '只管耕耘·不计回报', value: 90, icon: '✨' },
      { label: '偏耕耘心态', value: 70, icon: '👍' },
      { label: '各半', value: 45, icon: '🤔' },
      { label: '偏回报焦虑', value: 22, icon: '😰' },
      { label: '必须先看到回报', value: 5, icon: '💀' },
    ],
  },

  // ========================================================
  // macroControl — 掌控感 (4题，单维度4变体)
  // ========================================================

  // dim: 时空秩序体感 — variant A
  {
    id: 'macro_order_a',
    skill: 'macroControl',
    dimension: '时空秩序体感',
    text: '此刻，你觉得生活是像"一条湍急的河流，你被裹挟着撞向岩石"，还是像"一盘你坐在高处俯瞰、每一步虽有挑战但皆在预料之中"的棋局？',
    options: [
      { label: '棋局感·全盘在握', value: 90, icon: '✨' },
      { label: '偏棋局', value: 70, icon: '👍' },
      { label: '混合', value: 45, icon: '🤔' },
      { label: '偏河流·身不由己', value: 22, icon: '😰' },
      { label: '完全湍流', value: 5, icon: '💀' },
    ],
  },

  // dim: 时空秩序体感 — variant B
  {
    id: 'macro_order_b',
    skill: 'macroControl',
    dimension: '时空秩序体感',
    text: '回顾今天，你感觉自己是生活的主人还是乘客？',
    options: [
      { label: '绝对主人·掌舵前行', value: 90, icon: '✨' },
      { label: '大多在驾驶位', value: 70, icon: '👍' },
      { label: '时而驾驶时而乘客', value: 45, icon: '🤔' },
      { label: '大多是被动乘客', value: 22, icon: '😰' },
      { label: '完全失控·随波逐流', value: 5, icon: '💀' },
    ],
  },

  // dim: 时空秩序体感 — variant C
  {
    id: 'macro_order_c',
    skill: 'macroControl',
    dimension: '时空秩序体感',
    text: '今天的时间分配，是由你主动设计的，还是被外部事件牵着走的？',
    options: [
      { label: '完全主动设计', value: 90, icon: '✨' },
      { label: '大体在规划内', value: 70, icon: '👍' },
      { label: '一半一半', value: 45, icon: '🤔' },
      { label: '多被外部牵着走', value: 22, icon: '😰' },
      { label: '完全被动应付', value: 5, icon: '💀' },
    ],
  },

  // dim: 时空秩序体感 — variant D
  {
    id: 'macro_order_d',
    skill: 'macroControl',
    dimension: '时空秩序体感',
    text: '闭上眼睛感受一下：你此刻对明天的掌控感如何？是有清晰蓝图还是茫然未知？',
    options: [
      { label: '清晰蓝图·胸有成竹', value: 90, icon: '✨' },
      { label: '大部分有计划', value: 70, icon: '👍' },
      { label: '有些头绪但不完整', value: 45, icon: '🤔' },
      { label: '模糊不安', value: 22, icon: '😰' },
      { label: '完全茫然·毫无头绪', value: 5, icon: '💀' },
    ],
  },
]

// ============================================================
// 工具函数
// ============================================================

/**
 * 从题库中随机抽取一题（按指定技能筛选）
 * @param skill 派生技能名称
 * @returns 随机题目，若无匹配则返回 null
 */
export function pickRandomQuestion(skill: DerivedSkill): QFilterQuestion | null {
  const pool = QUESTIONS.filter((q) => q.skill === skill)
  if (pool.length === 0) return null
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx]
}

/**
 * 根据答题反应时间返回置信度系数
 * 快速作答（<2s）被认为是直觉反应，置信度打折为 0.7
 * 正常作答则置信度为 1.0
 * @param responseTimeMs 用户作答耗时（毫秒）
 * @returns 置信度系数 [0.7, 1.0]
 */
export function getConfidence(responseTimeMs: number): number {
  return responseTimeMs < 2000 ? 0.7 : 1.0
}
