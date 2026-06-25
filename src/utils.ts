// ============================================================
// Personal OS RPG — 打卡体系定义 v8.1
// ============================================================
// 社交/搭讪: 场地压力 + 客观评分 + 体感自评 (多维分支)
// 饮食: 宏量营养素结构 + 参照科学饮食框架
// 健身: 类型→强度→时长 (已有)
// 学习: 时长→深度→产出类型 (深化)
// 戒色: 状态→替代类型/触发场景→距上次天数 (深化)
// 增量: ±1.0 clamp (store层)，原始增量 0.3-1.5
// ============================================================

import { type BaseAttrs } from './types'

// --- ID / 日期 ---
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
export function thisWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(now.getFullYear(), now.getMonth(), diff)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { start: mon, end: sun }
}

// --- 问题类型 ---
export interface Question {
  id: string
  text: string
  options: { label: string; value: string; icon: string }[]
  dependsOn?: { questionId: string; matches: string[] }
}

export interface CheckinDef {
  system: string
  label: string
  emoji: string
  color: string
  questions: Question[]
  calcBonus: (a: Record<string, string>) => Partial<BaseAttrs>
}

// ====================================================================
// 五大打卡体系
// 增量原则: 单次 0.3-1.5，配合分段倍率实现数月级成长
// ====================================================================
export const CHECKINS: CheckinDef[] = [

  // ═══════════════════════════════════════════════════════════════
  // 1. 饮食打卡 — 参照科学饮食结构
  // ═══════════════════════════════════════════════════════════════
  {
    system: 'diet',
    label: '饮食打卡',
    emoji: '🥗',
    color: '#f97316',
    questions: [
      {
        id: 'meal',
        text: '今天正餐情况？',
        options: [
          { label: '三餐齐全·荤素搭配·主食适量', value: 'excellent', icon: '🍱' },
          { label: '三餐基本正常·略有将就',       value: 'good',     icon: '🍚' },
          { label: '跳了一餐或两餐',               value: 'skip',     icon: '⏭️' },
          { label: '外卖/加工食品为主',            value: 'bad',      icon: '🍟' },
        ],
      },
      {
        id: 'macro',
        text: '今天的宏量营养素配比？',
        options: [
          { label: '蛋白质充足·碳水适中·脂肪可控', value: 'balanced',  icon: '🥩' },
          { label: '碳水偏多·蛋白一般',            value: 'carby',     icon: '🍜' },
          { label: '高油高糖·没注意',              value: 'unhealthy', icon: '🍩' },
          { label: '没概念/不关注',                 value: 'unknown',   icon: '❓' },
        ],
      },
      {
        id: 'vegetables',
        text: '今天蔬菜/纤维摄入？',
        options: [
          { label: '每餐都有蔬菜·种类多样', value: 'plenty', icon: '🥬' },
          { label: '有一餐有·量一般',       value: 'some',  icon: '🥒' },
          { label: '几乎没吃蔬菜',           value: 'none',  icon: '🍔' },
        ],
      },
      {
        id: 'water',
        text: '今天饮水量 (含汤/茶/水)？',
        options: [
          { label: '明显超过 2L',    value: 'over', icon: '💧' },
          { label: '1.5-2L 左右',   value: 'good', icon: '🚰' },
          { label: '1L 左右',       value: 'low',  icon: '🥤' },
          { label: '500ml 以下',    value: 'bad',  icon: '🏜️' },
        ],
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      // 正餐
      if (a.meal === 'excellent') { b.health = 1.0; b.willpower = 0.3; b.abstinence = 0.2 }
      if (a.meal === 'good')      { b.health = 0.6; b.willpower = 0.1 }
      if (a.meal === 'skip')      { b.health = 0.1; b.willpower = -0.3 }
      if (a.meal === 'bad')       { b.willpower = -0.4 }
      // 宏量营养
      if (a.macro === 'balanced')  { b.health = (b.health ?? 0) + 0.4; b.willpower = (b.willpower ?? 0) + 0.2 }
      if (a.macro === 'unhealthy') { b.health = (b.health ?? 0) - 0.2 }
      // 蔬菜
      if (a.vegetables === 'plenty') { b.health = (b.health ?? 0) + 0.3 }
      if (a.vegetables === 'none')   { b.health = (b.health ?? 0) - 0.2 }
      // 水
      if (a.water === 'over') { b.health = (b.health ?? 0) + 0.3; b.willpower = (b.willpower ?? 0) + 0.1 }
      if (a.water === 'bad')  { b.health = (b.health ?? 0) - 0.3 }
      return b
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. 健身打卡
  // ═══════════════════════════════════════════════════════════════
  {
    system: 'fitness',
    label: '健身打卡',
    emoji: '💪',
    color: '#ef4444',
    questions: [
      {
        id: 'type',
        text: '今天运动了吗？',
        options: [
          { label: '力量训练 (器械/自重/负重)', value: 'strength', icon: '🏋️' },
          { label: '有氧运动 (跑步/游泳/骑行)', value: 'cardio',   icon: '🏃' },
          { label: '球类/户外/综合',            value: 'sports',   icon: '⚽' },
          { label: '休息/恢复日',                value: 'rest',     icon: '😴' },
        ],
      },
      {
        id: 'intensity',
        text: '强度水平？',
        options: [
          { label: '全力输出·力竭或接近力竭', value: 'hard',   icon: '🔥' },
          { label: '中等强度·出汗但有余力',   value: 'medium', icon: '💦' },
          { label: '轻松·保持活动量',         value: 'light',  icon: '🌿' },
        ],
        dependsOn: { questionId: 'type', matches: ['strength', 'cardio', 'sports'] },
      },
      {
        id: 'duration',
        text: '训练时长？',
        options: [
          { label: '超过1小时',     value: 'long',   icon: '⏱️' },
          { label: '45-60分钟',     value: 'medium', icon: '🕐' },
          { label: '不到30分钟',    value: 'short',  icon: '⚡' },
        ],
        dependsOn: { questionId: 'type', matches: ['strength', 'cardio', 'sports'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.type === 'rest') return b
      if (a.type === 'strength') { b.strength = 0.8; b.health = 0.3; b.willpower = 0.4 }
      if (a.type === 'cardio')   { b.strength = 0.3; b.health = 0.8; b.willpower = 0.3 }
      if (a.type === 'sports')   { b.strength = 0.4; b.health = 0.5; b.willpower = 0.2 }
      if (a.intensity === 'hard')   { b.strength = (b.strength ?? 0) + 0.5; b.health = (b.health ?? 0) + 0.3; b.willpower = (b.willpower ?? 0) + 0.4 }
      if (a.intensity === 'medium') { b.strength = (b.strength ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
      if (a.duration === 'long')    { b.strength = (b.strength ?? 0) + 0.3 }
      if (a.duration === 'medium')  { b.strength = (b.strength ?? 0) + 0.1 }
      return b
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. 社交打卡 — 搭讪深层分支
  // ═══════════════════════════════════════════════════════════════
  {
    system: 'social',
    label: '社交打卡',
    emoji: '🤝',
    color: '#10b981',
    questions: [
      {
        id: 'type',
        text: '今天社交类型？',
        options: [
          { label: '搭讪',           value: 'approach', icon: '💬' },
          { label: '聚会/社交活动',  value: 'party',    icon: '🎉' },
          { label: '工作交流',       value: 'work',     icon: '💼' },
          { label: '朋友/熟人聊天',  value: 'friends',  icon: '👥' },
          { label: '无社交',         value: 'none',     icon: '🏠' },
        ],
      },
      // ---- 搭讪分支 ----
      {
        id: 'venue',
        text: '搭讪的场地/压力等级？',
        options: [
          { label: '高压场景 (地铁/电梯/安静书店)',  value: 'high',    icon: '🚇' },
          { label: '中压场景 (商场/超市)',           value: 'medium',  icon: '🏬' },
          { label: '低压场景 (街头/公园/酒吧)',      value: 'low',     icon: '🌳' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'opener',
        text: '开场方式？',
        options: [
          { label: '直接开场 (表达来意)', value: 'direct',      icon: '🎯' },
          { label: '情景开场 (当前场景切入)', value: 'situational', icon: '💡' },
          { label: '间接开场 (第三方话题)', value: 'indirect',   icon: '🔄' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'rating',
        text: '对方客观评分？(你的实际标准 0-10)',
        options: [
          { label: '8-10·非常吸引', value: 'high', icon: '🔥' },
          { label: '6-7·有吸引力',   value: 'mid',  icon: '😊' },
          { label: '4-5·一般',       value: 'low',  icon: '😐' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'result',
        text: '结果如何？',
        options: [
          { label: '收号·正向反馈',     value: 'number',   icon: '📱' },
          { label: '好反应但没收号',     value: 'good',     icon: '😊' },
          { label: '中性·正常收场',     value: 'neutral',  icon: '😐' },
          { label: '被拒·但她礼貌',     value: 'rejected', icon: '🚫' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'state',
        text: '你搭讪过程中的自我感觉？',
        options: [
          { label: '状态极好·自然松弛', value: '3', icon: '⭐' },
          { label: '基本正常',           value: '2', icon: '👍' },
          { label: '有点紧张但没崩',     value: '1', icon: '😞' },
          { label: '很差·僵硬或退缩',   value: '0', icon: '💀' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'feeling',
        text: '搭讪后的即时体感？',
        options: [
          { label: '无论结果·做了就痛快',               value: 'good',      icon: '✨' },
          { label: '还行·有一点点事后回想',             value: 'ok',        icon: '🤔' },
          { label: '不太满意·反复在想哪句话没说好',     value: 'ruminate',  icon: '🔄' },
          { label: '后悔/自我否定',                      value: 'regret',    icon: '💔' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      // ---- 非搭讪社交 ----
      {
        id: 'engage',
        text: '你的投入度？',
        options: [
          { label: '主动引导·推动话题', value: 'active',  icon: '🎤' },
          { label: '正常参与·有来有往', value: 'normal',  icon: '👌' },
          { label: '比较被动·多在听',   value: 'passive', icon: '👀' },
        ],
        dependsOn: { questionId: 'type', matches: ['party', 'work', 'friends'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.type === 'none') { b.social = -0.1; return b }

      if (a.type === 'approach') {
        // 核心: 勇气基础分 + 场地难度加成
        b.courage = 0.8
        if (a.venue === 'high')   { b.courage = (b.courage ?? 0) + 0.5; b.willpower = 0.4 }
        if (a.venue === 'medium') { b.courage = (b.courage ?? 0) + 0.2 }
        if (a.venue === 'low')    { b.courage = (b.courage ?? 0) + 0.1 }

        // 开场方式 (直接开场被认为最难)
        if (a.opener === 'direct')      { b.courage = (b.courage ?? 0) + 0.2 }
        if (a.opener === 'situational') { b.social = 0.2 }

        // 结果
        if (a.result === 'number')   { b.charm = 0.8; b.social = 0.6 }
        if (a.result === 'good')     { b.charm = 0.5; b.social = 0.4 }
        if (a.result === 'neutral')  { b.charm = 0.2; b.social = 0.2 }
        if (a.result === 'rejected') { b.charm = 0.1; b.social = 0.1; b.courage = (b.courage ?? 0) + 0.3; b.willpower = (b.willpower ?? 0) + 0.2 }

        // 状态白评
        if (a.state === '3') { b.charm = (b.charm ?? 0) + 0.3; b.social = (b.social ?? 0) + 0.2 }
        if (a.state === '0') { b.charm = (b.charm ?? 0) - 0.2; b.willpower = (b.willpower ?? 0) + 0.3 }

        // 搭讪后体感
        if (a.feeling === 'good')     { b.charm = (b.charm ?? 0) + 0.1; b.willpower = (b.willpower ?? 0) + 0.1 }
        if (a.feeling === 'ruminate') { b.willpower = (b.willpower ?? 0) + 0.2 }
        if (a.feeling === 'regret')   { b.willpower = (b.willpower ?? 0) - 0.2 }
      } else {
        if (a.engage === 'active')  { b.charm = 0.3;  b.social = 0.6 }
        if (a.engage === 'normal')  { b.charm = 0.1;  b.social = 0.3 }
        if (a.engage === 'passive') { b.social = 0.2 }
      }
      return b
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. 学习打卡 — 深化 (时长→深度→内容类型)
  // ═══════════════════════════════════════════════════════════════
  {
    system: 'learning',
    label: '学习打卡',
    emoji: '📚',
    color: '#3b82f6',
    questions: [
      {
        id: 'duration',
        text: '今天有效的学习/深度阅读时长？',
        options: [
          { label: '超过2小时',     value: 'long',   icon: '⏱️' },
          { label: '1-2小时',       value: 'medium', icon: '📖' },
          { label: '不到1小时',     value: 'short',  icon: '⏳' },
          { label: '今天没学',      value: 'none',   icon: '💤' },
        ],
      },
      {
        id: 'depth',
        text: '学习的深度层次？',
        options: [
          { label: '深度钻研·输出笔记或代码', value: 'deep',    icon: '🧠' },
          { label: '系统学习·跟着教材/课程走', value: 'system',  icon: '📝' },
          { label: '碎片浏览·看了但没内化',   value: 'shallow', icon: '📱' },
        ],
        dependsOn: { questionId: 'duration', matches: ['long', 'medium', 'short'] },
      },
      {
        id: 'domain',
        text: '学习内容属于？',
        options: [
          { label: '核心能力提升 (专业/编程/理论)',  value: 'core',    icon: '🎯' },
          { label: '工作相关技能',                   value: 'work',    icon: '💼' },
          { label: '人文/兴趣拓展',                  value: 'general', icon: '📰' },
        ],
        dependsOn: { questionId: 'duration', matches: ['long', 'medium', 'short'] },
      },
      {
        id: 'retention',
        text: '学完后的留存感？',
        options: [
          { label: '能复述/能教别人',       value: 'high',   icon: '🎓' },
          { label: '能回忆起主要框架',     value: 'medium', icon: '👍' },
          { label: '有点模糊·看了就忘',   value: 'low',    icon: '🌫️' },
        ],
        dependsOn: { questionId: 'duration', matches: ['long', 'medium', 'short'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.duration === 'none') { b.willpower = -0.3; return b }

      // 时长
      if (a.duration === 'long')   { b.intellect = 0.8; b.willpower = 0.4 }
      if (a.duration === 'medium') { b.intellect = 0.5; b.willpower = 0.2 }
      if (a.duration === 'short')  { b.intellect = 0.2; b.willpower = 0.1 }

      // 深度
      if (a.depth === 'deep')    { b.intellect = (b.intellect ?? 0) + 0.4; b.willpower = (b.willpower ?? 0) + 0.3 }
      if (a.depth === 'shallow') { b.intellect = (b.intellect ?? 0) - 0.1 }

      // 内容类型
      if (a.domain === 'core') { b.intellect = (b.intellect ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
      if (a.domain === 'general') { b.intellect = (b.intellect ?? 0) + 0.1 }

      // 留存感
      if (a.retention === 'high')   { b.intellect = (b.intellect ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
      if (a.retention === 'low')    { b.intellect = (b.intellect ?? 0) - 0.1 }

      return b
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. 戒色打卡 — 深化 (状态→替代类型/触发场景→距上次天数)
  // ═══════════════════════════════════════════════════════════════
  {
    system: 'abstinence',
    label: '戒色打卡',
    emoji: '🧘',
    color: '#6366f1',
    questions: [
      {
        id: 'state',
        text: '今天戒色状态？',
        options: [
          { label: '替代行为成功·主动转移精力', value: 'alternative', icon: '✨' },
          { label: '平稳度过·无冲动',             value: 'steady',      icon: '🧊' },
          { label: '有冲动但控制住了',             value: 'controlled',  icon: '⚡' },
          { label: '破戒了',                       value: 'relapse',     icon: '💔' },
        ],
      },
      {
        id: 'altType',
        text: '替代行为类型？',
        options: [
          { label: '运动/健身',           value: 'exercise',  icon: '🏃' },
          { label: '学习/阅读',           value: 'study',     icon: '📚' },
          { label: '社交/联系朋友',       value: 'social',    icon: '👥' },
          { label: '冥想/呼吸',           value: 'meditate',  icon: '🧘' },
          { label: '其他·但有效',         value: 'other',     icon: '✅' },
        ],
        dependsOn: { questionId: 'state', matches: ['alternative'] },
      },
      {
        id: 'trigger',
        text: '触发场景？',
        options: [
          { label: '深夜独处 (22:00-02:00)',  value: 'night',    icon: '🌙' },
          { label: '压力过大·寻求释放',       value: 'stress',   icon: '😰' },
          { label: '任务完成后的"奖励"心态',  value: 'relief',   icon: '😮' },
          { label: '无聊/空虚',               value: 'bored',    icon: '🥱' },
          { label: '其他',                     value: 'other',    icon: '❓' },
        ],
        dependsOn: { questionId: 'state', matches: ['relapse'] },
      },
      {
        id: 'streak',
        text: '距上次破戒的天数？',
        options: [
          { label: '7天以上',   value: 'week',  icon: '📅' },
          { label: '3-6天',     value: 'days',  icon: '📆' },
          { label: '1-2天',     value: 'short', icon: '⏳' },
          { label: '今天首破',  value: 'zero',  icon: '🔄' },
        ],
        dependsOn: { questionId: 'state', matches: ['relapse'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.state === 'alternative') {
        b.abstinence = 0.8; b.courage = 0.3; b.willpower = 0.5
        if (a.altType === 'exercise')  { b.strength = 0.1; b.health = 0.2 }
        if (a.altType === 'study')     { b.intellect = 0.1 }
        if (a.altType === 'social')    { b.social = 0.1 }
        if (a.altType === 'meditate')  { b.willpower = (b.willpower ?? 0) + 0.2 }
      }
      if (a.state === 'steady')       { b.abstinence = 0.4; b.willpower = 0.2 }
      if (a.state === 'controlled')   { b.abstinence = 0.3; b.willpower = 0.3; b.courage = 0.1 }
      if (a.state === 'relapse') {
        // 破戒惩罚随连胜天数变化: 天数越长破戒越重
        let penalty = -0.8
        if (a.streak === 'week')  penalty = -1.2
        if (a.streak === 'days')  penalty = -1.0
        if (a.streak === 'short') penalty = -0.8
        if (a.streak === 'zero')  penalty = -0.5
        b.abstinence = penalty; b.willpower = -0.3; b.courage = -0.2
      }
      return b
    },
  },
]
