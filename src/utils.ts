// ============================================================
// Personal OS RPG — 五大打卡体系 v12
// ============================================================
// 每体系含多轮分支 (基本→条件→细化)，对齐真实生活场景
// 增量: ±1.0 clamp (store层)，原始 0.3-1.5
// ============================================================

import { type BaseAttrs } from './types'

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

export const CHECKINS: CheckinDef[] = [

  // ═══════════════════════════════════════════════════════════════
  // 1. 饮食 — 4问: 正餐→宏量→蔬菜→饮水
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
      if (a.meal === 'excellent') { b.health = 1.0; b.willpower = 0.3; b.abstinence = 0.2 }
      if (a.meal === 'good')      { b.health = 0.6; b.willpower = 0.1 }
      if (a.meal === 'skip')      { b.health = 0.1; b.willpower = -0.3 }
      if (a.meal === 'bad')       { b.willpower = -0.4 }
      if (a.macro === 'balanced')  { b.health = (b.health ?? 0) + 0.4; b.willpower = (b.willpower ?? 0) + 0.2 }
      if (a.macro === 'unhealthy') { b.health = (b.health ?? 0) - 0.2 }
      if (a.vegetables === 'plenty') { b.health = (b.health ?? 0) + 0.3 }
      if (a.vegetables === 'none')   { b.health = (b.health ?? 0) - 0.2 }
      if (a.water === 'over') { b.health = (b.health ?? 0) + 0.3; b.willpower = (b.willpower ?? 0) + 0.1 }
      if (a.water === 'bad')  { b.health = (b.health ?? 0) - 0.3 }
      return b
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. 健身 — 类型→强度→时长→训练质量/恢复（运动日6问+休息日3问）
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
      // ---- 运动分支 ----
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
      {
        id: 'structure',
        text: '训练是否有结构化安排？',
        options: [
          { label: '有明确计划·按部就班执行',   value: 'planned',   icon: '📋' },
          { label: '有大致方向但随意调整',       value: 'loose',     icon: '📝' },
          { label: '完全即兴·想到什么做什么',   value: 'random',    icon: '🎲' },
        ],
        dependsOn: { questionId: 'type', matches: ['strength', 'cardio', 'sports'] },
      },
      {
        id: 'warmup',
        text: '是否做了热身和拉伸？',
        options: [
          { label: '充分热身+训练后拉伸',   value: 'full',   icon: '🧘' },
          { label: '只做了简略热身',         value: 'partial', icon: '⚡' },
          { label: '没做·直接开练',         value: 'none',    icon: '⏭️' },
        ],
        dependsOn: { questionId: 'type', matches: ['strength', 'cardio', 'sports'] },
      },
      {
        id: 'feel',
        text: '训练后的身体感受？',
        options: [
          { label: '状态爆发·突破了自己',   value: 'peak',   icon: '🚀' },
          { label: '稳定发挥·在计划内',     value: 'solid',  icon: '✅' },
          { label: '有点费力·勉强完成',     value: 'drag',   icon: '😤' },
          { label: '感觉不对·提前结束',     value: 'bad',    icon: '❌' },
        ],
        dependsOn: { questionId: 'type', matches: ['strength', 'cardio', 'sports'] },
      },
      // ---- 休息分支 ----
      {
        id: 'restQuality',
        text: '今天的恢复质量？',
        options: [
          { label: '充足睡眠+无肌肉酸痛',   value: 'full',   icon: '😴' },
          { label: '基本恢复·略有酸痛',     value: 'ok',     icon: '👍' },
          { label: '仍明显酸痛·需要更多休息', value: 'sore', icon: '🩹' },
          { label: '熬夜/睡眠不足·恢复差',  value: 'bad',    icon: '💀' },
        ],
        dependsOn: { questionId: 'type', matches: ['rest'] },
      },
      {
        id: 'activeRecovery',
        text: '有做主动恢复吗？',
        options: [
          { label: '散步/拉伸/泡沫轴',   value: 'yes',    icon: '🚶' },
          { label: '完全没有·纯休息',    value: 'no',     icon: '🛋️' },
        ],
        dependsOn: { questionId: 'type', matches: ['rest'] },
      },
      {
        id: 'restNutrition',
        text: '休息日的饮食配合？',
        options: [
          { label: '保持高蛋白·控制热量',   value: 'good',    icon: '🥩' },
          { label: '正常吃·没特别注意',     value: 'normal',  icon: '🍚' },
          { label: '放纵了·高热量摄入',     value: 'bad',     icon: '🍕' },
        ],
        dependsOn: { questionId: 'type', matches: ['rest'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      // 运动日
      if (a.type !== 'rest' && a.type !== undefined) {
        if (a.type === 'strength') { b.strength = 0.8; b.health = 0.3; b.willpower = 0.4 }
        if (a.type === 'cardio')   { b.strength = 0.3; b.health = 0.8; b.willpower = 0.3 }
        if (a.type === 'sports')   { b.strength = 0.4; b.health = 0.5; b.willpower = 0.2 }
        if (a.intensity === 'hard')   { b.strength = (b.strength ?? 0) + 0.5; b.health = (b.health ?? 0) + 0.3; b.willpower = (b.willpower ?? 0) + 0.4 }
        if (a.intensity === 'medium') { b.strength = (b.strength ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
        if (a.duration === 'long')    { b.strength = (b.strength ?? 0) + 0.3 }
        if (a.duration === 'medium')  { b.strength = (b.strength ?? 0) + 0.1 }
        if (a.structure === 'planned') { b.willpower = (b.willpower ?? 0) + 0.3 }
        if (a.structure === 'random')  { b.willpower = (b.willpower ?? 0) - 0.1 }
        if (a.warmup === 'full')    { b.health = (b.health ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
        if (a.warmup === 'none')    { b.health = (b.health ?? 0) - 0.2 }
        if (a.feel === 'peak')      { b.willpower = (b.willpower ?? 0) + 0.2 }
        if (a.feel === 'bad')       { b.willpower = (b.willpower ?? 0) - 0.2 }
      }
      // 休息日
      if (a.type === 'rest') {
        b.health = 0.3
        if (a.restQuality === 'full')   { b.health = (b.health ?? 0) + 0.4; b.willpower = 0.2 }
        if (a.restQuality === 'sore')   { b.health = (b.health ?? 0) + 0.1 }
        if (a.restQuality === 'bad')    { b.health = (b.health ?? 0) - 0.3 }
        if (a.activeRecovery === 'yes') { b.health = (b.health ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
        if (a.restNutrition === 'good') { b.health = (b.health ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
        if (a.restNutrition === 'bad')  { b.health = (b.health ?? 0) - 0.2 }
      }
      return b
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. 社交 — 搭讪7问 或 非搭讪4问
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
      // ---- 搭讪分支 (7问) ----
      {
        id: 'venue', text: '搭讪的场地/压力等级？',
        options: [
          { label: '高压场景 (地铁/电梯/安静空间)', value: 'high',   icon: '🚇' },
          { label: '中压场景 (商场/超市)',          value: 'medium', icon: '🏬' },
          { label: '低压场景 (街头/公园/酒吧)',     value: 'low',    icon: '🌳' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'opener', text: '开场方式？',
        options: [
          { label: '直接开场 (表达来意)',         value: 'direct',      icon: '🎯' },
          { label: '情景开场 (当前场景切入)',     value: 'situational', icon: '💡' },
          { label: '间接开场 (第三方话题)',       value: 'indirect',    icon: '🔄' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'rating', text: '对方客观评分？(你的实际标准 0-10)',
        options: [
          { label: '8-10·非常吸引', value: 'high', icon: '🔥' },
          { label: '6-7·有吸引力',  value: 'mid',  icon: '😊' },
          { label: '4-5·一般',      value: 'low',  icon: '😐' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'result', text: '结果如何？',
        options: [
          { label: '收号·正向反馈',     value: 'number',   icon: '📱' },
          { label: '好反应但没收号',     value: 'good',     icon: '😊' },
          { label: '中性·正常收场',     value: 'neutral',  icon: '😐' },
          { label: '被拒·但她礼貌',     value: 'rejected', icon: '🚫' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'state', text: '你搭讪过程中的自我感觉？',
        options: [
          { label: '状态极好·自然松弛', value: '3', icon: '⭐' },
          { label: '基本正常',           value: '2', icon: '👍' },
          { label: '有点紧张但没崩',     value: '1', icon: '😞' },
          { label: '很差·僵硬或退缩',   value: '0', icon: '💀' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'feeling', text: '搭讪后的即时体感？',
        options: [
          { label: '无论结果·做了就痛快',               value: 'good',     icon: '✨' },
          { label: '还行·有一点点事后回想',             value: 'ok',       icon: '🤔' },
          { label: '不太满意·反复想哪句没说好',         value: 'ruminate', icon: '🔄' },
          { label: '后悔/自我否定',                      value: 'regret',   icon: '💔' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      // ---- 非搭讪社交分支 (4问) ----
      {
        id: 'engage', text: '你的投入度？',
        options: [
          { label: '主动引导·推动话题', value: 'active',  icon: '🎤' },
          { label: '正常参与·有来有往', value: 'normal',  icon: '👌' },
          { label: '比较被动·多在听',   value: 'passive', icon: '👀' },
        ],
        dependsOn: { questionId: 'type', matches: ['party', 'work', 'friends'] },
      },
      {
        id: 'scale', text: '这次社交的规模？',
        options: [
          { label: '1对1深度交流',     value: 'one',   icon: '👤' },
          { label: '小群 (2-5人)',     value: 'small', icon: '👥' },
          { label: '中群 (6-15人)',    value: 'mid',   icon: '👥👥' },
          { label: '大群/正式场合',    value: 'large', icon: '🏛️' },
        ],
        dependsOn: { questionId: 'type', matches: ['party', 'work', 'friends'] },
      },
      {
        id: 'depth', text: '今天社交交流的深度？',
        options: [
          { label: '触及价值观/人生话题',   value: 'deep',    icon: '🧠' },
          { label: '有实质内容·不是寒暄',   value: 'solid',   icon: '💬' },
          { label: '浅层聊天/寒暄为主',     value: 'surface', icon: '☕' },
          { label: '几乎无有效交流',         value: 'none',    icon: '😶' },
        ],
        dependsOn: { questionId: 'type', matches: ['party', 'work', 'friends'] },
      },
      {
        id: 'aftermath', text: '这次社交后的能量感？',
        options: [
          { label: '充满能量·期待下一次',   value: 'energized', icon: '⚡' },
          { label: '正常消耗·不算累',       value: 'neutral',   icon: '👍' },
          { label: '有点社交疲劳',           value: 'tired',     icon: '😴' },
          { label: '精疲力竭·需要独处恢复', value: 'drained',   icon: '🪫' },
        ],
        dependsOn: { questionId: 'type', matches: ['party', 'work', 'friends'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.type === 'none') { b.social = -0.1; return b }

      if (a.type === 'approach') {
        b.courage = 0.8
        if (a.venue === 'high')   { b.courage = (b.courage ?? 0) + 0.5; b.willpower = 0.4 }
        if (a.venue === 'medium') { b.courage = (b.courage ?? 0) + 0.2 }
        if (a.venue === 'low')    { b.courage = (b.courage ?? 0) + 0.1 }
        if (a.opener === 'direct')      { b.courage = (b.courage ?? 0) + 0.2 }
        if (a.opener === 'situational') { b.social = 0.2 }
        if (a.result === 'number')   { b.charm = 0.8; b.social = 0.6 }
        if (a.result === 'good')     { b.charm = 0.5; b.social = 0.4 }
        if (a.result === 'neutral')  { b.charm = 0.2; b.social = 0.2 }
        if (a.result === 'rejected') { b.charm = 0.1; b.social = 0.1; b.courage = (b.courage ?? 0) + 0.3; b.willpower = (b.willpower ?? 0) + 0.2 }
        if (a.state === '3') { b.charm = (b.charm ?? 0) + 0.3; b.social = (b.social ?? 0) + 0.2 }
        if (a.state === '0') { b.charm = (b.charm ?? 0) - 0.2; b.willpower = (b.willpower ?? 0) + 0.3 }
        if (a.feeling === 'good')     { b.willpower = (b.willpower ?? 0) + 0.1 }
        if (a.feeling === 'ruminate') { b.willpower = (b.willpower ?? 0) + 0.2 }
        if (a.feeling === 'regret')   { b.willpower = (b.willpower ?? 0) - 0.2 }
      } else {
        // party / work / friends
        if (a.engage === 'active')  { b.charm = 0.3;  b.social = 0.6 }
        if (a.engage === 'normal')  { b.charm = 0.1;  b.social = 0.3 }
        if (a.engage === 'passive') { b.social = 0.2 }
        if (a.scale === 'one')    { b.social = (b.social ?? 0) + 0.3; b.charm = (b.charm ?? 0) + 0.1 }
        if (a.scale === 'large')  { b.courage = 0.3; b.social = (b.social ?? 0) + 0.2 }
        if (a.depth === 'deep')    { b.social = (b.social ?? 0) + 0.4; b.charm = (b.charm ?? 0) + 0.2 }
        if (a.depth === 'surface') { b.social = (b.social ?? 0) - 0.1 }
        if (a.aftermath === 'energized') { b.charm = (b.charm ?? 0) + 0.2; b.social = (b.social ?? 0) + 0.2 }
        if (a.aftermath === 'drained')   { b.willpower = (b.willpower ?? 0) + 0.3 }
      }
      return b
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. 学习 — 时长→深度→内容域→留存→输出（5问，无学习则2问）
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
      {
        id: 'output',
        text: '今天学习有产出吗？',
        options: [
          { label: '写了笔记/代码/文章',       value: 'created',   icon: '✍️' },
          { label: '画了思维导图/做标注',      value: 'mapped',    icon: '🗺️' },
          { label: '纯输入·没有产出',          value: 'none',      icon: '👀' },
        ],
        dependsOn: { questionId: 'duration', matches: ['long', 'medium', 'short'] },
      },
      {
        id: 'focus',
        text: '学习时的专注度？',
        options: [
          { label: '深度专注·几乎无打断',   value: 'deep',    icon: '🎯' },
          { label: '偶尔走神但能拉回',       value: 'ok',      icon: '👍' },
          { label: '频繁走神·效率低',         value: 'low',     icon: '📱' },
        ],
        dependsOn: { questionId: 'duration', matches: ['long', 'medium', 'short'] },
      },
      {
        id: 'whyNot',
        text: '今天为什么没学？',
        options: [
          { label: '有正当理由·工作或事务繁忙', value: 'busy',    icon: '💼' },
          { label: '身体不适/需要休息',          value: 'sick',    icon: '🤒' },
          { label: '拖延/没动力',                value: 'lazy',    icon: '🦥' },
          { label: '忘了/没安排',                value: 'forgot',  icon: '🤷' },
        ],
        dependsOn: { questionId: 'duration', matches: ['none'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.duration === 'none') {
        if (a.whyNot === 'lazy')   b.willpower = -0.5
        if (a.whyNot === 'forgot') b.willpower = -0.3
        return b
      }
      if (a.duration === 'long')   { b.intellect = 0.8; b.willpower = 0.4 }
      if (a.duration === 'medium') { b.intellect = 0.5; b.willpower = 0.2 }
      if (a.duration === 'short')  { b.intellect = 0.2; b.willpower = 0.1 }
      if (a.depth === 'deep')    { b.intellect = (b.intellect ?? 0) + 0.4; b.willpower = (b.willpower ?? 0) + 0.3 }
      if (a.depth === 'shallow') { b.intellect = (b.intellect ?? 0) - 0.1 }
      if (a.domain === 'core')    { b.intellect = (b.intellect ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
      if (a.domain === 'general') { b.intellect = (b.intellect ?? 0) + 0.1 }
      if (a.retention === 'high') { b.intellect = (b.intellect ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.1 }
      if (a.retention === 'low')  { b.intellect = (b.intellect ?? 0) - 0.1 }
      if (a.output === 'created') { b.intellect = (b.intellect ?? 0) + 0.3; b.willpower = (b.willpower ?? 0) + 0.2 }
      if (a.output === 'mapped')  { b.intellect = (b.intellect ?? 0) + 0.2 }
      if (a.focus === 'deep')     { b.willpower = (b.willpower ?? 0) + 0.3 }
      if (a.focus === 'low')      { b.willpower = (b.willpower ?? 0) - 0.1 }
      return b
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. 戒色 — 状态→替代类型/触发场景→连胜天数→恢复行动
  //        替代成功4问 | 平稳2问 | 控制3问 | 破戒4问
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
      // ---- 替代成功分支 ----
      {
        id: 'altType',
        text: '替代行为类型？',
        options: [
          { label: '运动/健身',     value: 'exercise', icon: '🏃' },
          { label: '学习/阅读',     value: 'study',    icon: '📚' },
          { label: '社交/联系朋友', value: 'social',   icon: '👥' },
          { label: '冥想/呼吸',     value: 'meditate', icon: '🧘' },
          { label: '其他·但有效',   value: 'other',    icon: '✅' },
        ],
        dependsOn: { questionId: 'state', matches: ['alternative'] },
      },
      {
        id: 'altEase',
        text: '执行替代行为的难度？',
        options: [
          { label: '自然而然·几乎没有抵抗',   value: 'easy',    icon: '🌊' },
          { label: '有一定阻力但克服了',       value: 'moderate', icon: '💪' },
          { label: '很挣扎·几乎要放弃',       value: 'hard',    icon: '😤' },
        ],
        dependsOn: { questionId: 'state', matches: ['alternative'] },
      },
      {
        id: 'altEffect',
        text: '替代行为后的感觉？',
        options: [
          { label: '精力转化成功·充实感',     value: 'charged',  icon: '⚡' },
          { label: '还行·至少没破戒',         value: 'ok',       icon: '👍' },
          { label: '空虚感·虽然有替代但不满足', value: 'empty',  icon: '🌫️' },
        ],
        dependsOn: { questionId: 'state', matches: ['alternative'] },
      },
      // ---- 控制住分支 ----
      {
        id: 'ctrlMethod',
        text: '你用什么方法控制住的？',
        options: [
          { label: '物理阻断·离开环境/关设备', value: 'physical',  icon: '🚪' },
          { label: '认知干预·提醒自己成本收益', value: 'cognitive', icon: '🧠' },
          { label: '延迟满足·告诉自己等15分钟', value: 'delay',     icon: '⏳' },
          { label: '硬扛·纯意志力',             value: 'willpower', icon: '🔥' },
        ],
        dependsOn: { questionId: 'state', matches: ['controlled'] },
      },
      {
        id: 'ctrlAftermath',
        text: '控制住之后的状态？',
        options: [
          { label: '成就感·觉得自己变强了',   value: 'proud',   icon: '🏆' },
          { label: '平静·这件事已经过去了',   value: 'calm',    icon: '🧊' },
          { label: '耗竭感·虽然扛住了但很累', value: 'drained', icon: '🪫' },
        ],
        dependsOn: { questionId: 'state', matches: ['controlled'] },
      },
      // ---- 破戒分支 ----
      {
        id: 'trigger',
        text: '触发场景？',
        options: [
          { label: '深夜独处 (22:00-02:00)',  value: 'night',   icon: '🌙' },
          { label: '压力过大·寻求释放',       value: 'stress',  icon: '😰' },
          { label: '任务完成后的"奖励"心态',  value: 'relief',  icon: '😮' },
          { label: '无聊/空虚',               value: 'bored',   icon: '🥱' },
          { label: '其他',                     value: 'other',   icon: '❓' },
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
      {
        id: 'recovery',
        text: '破戒后你做了什么？',
        options: [
          { label: '立刻记录·分析触发点',       value: 'analyze',  icon: '📝' },
          { label: '运动/出门·物理重置状态',   value: 'reset',    icon: '🏃' },
          { label: '内疚了一会但继续生活',       value: 'moveon',   icon: '🚶' },
          { label: '陷入负面循环·自暴自弃',     value: 'spiral',   icon: '🌀' },
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
        if (a.altEase === 'easy')      { b.willpower = (b.willpower ?? 0) + 0.2; b.courage = (b.courage ?? 0) + 0.1 }
        if (a.altEase === 'hard')      { b.willpower = (b.willpower ?? 0) + 0.3 }
        if (a.altEffect === 'charged') { b.willpower = (b.willpower ?? 0) + 0.1 }
        if (a.altEffect === 'empty')   { b.willpower = (b.willpower ?? 0) - 0.2 }
      }
      if (a.state === 'steady')       { b.abstinence = 0.4; b.willpower = 0.2 }
      if (a.state === 'controlled') {
        b.abstinence = 0.3; b.willpower = 0.3; b.courage = 0.1
        if (a.ctrlMethod === 'physical')   { b.willpower = (b.willpower ?? 0) + 0.1 }
        if (a.ctrlMethod === 'willpower')  { b.willpower = (b.willpower ?? 0) + 0.2 }
        if (a.ctrlAftermath === 'proud')   { b.willpower = (b.willpower ?? 0) + 0.2; b.courage = (b.courage ?? 0) + 0.1 }
        if (a.ctrlAftermath === 'drained') { b.willpower = (b.willpower ?? 0) - 0.1 }
      }
      if (a.state === 'relapse') {
        let penalty = -0.8
        if (a.streak === 'week')  penalty = -1.2
        if (a.streak === 'days')  penalty = -1.0
        if (a.streak === 'short') penalty = -0.8
        if (a.streak === 'zero')  penalty = -0.5
        b.abstinence = penalty; b.willpower = -0.3; b.courage = -0.2
        if (a.recovery === 'analyze') { b.willpower = (b.willpower ?? 0) + 0.3 }
        if (a.recovery === 'reset')   { b.willpower = (b.willpower ?? 0) + 0.2 }
        if (a.recovery === 'moveon')  { b.willpower = (b.willpower ?? 0) + 0.1 }
      }
      return b
    },
  },
]
