// ============================================================
// Personal OS RPG — 打卡体系定义
// ============================================================
// v6 变更：原始增量从 5-10 缩至 0.5-2，确保从 50→80 需要 1-3 月
// 配合 tierMultiplier（60-80 段 ×0.6，80-95 段 ×0.25）
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

// ============================================================
// 五大打卡体系（原始增量 0.5-2）
// ============================================================
export const CHECKINS: CheckinDef[] = [

  // ── 饮食打卡 ──────────────────────────────────────────────
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
          { label: '三餐都吃且质量好', value: 'good', icon: '🍱' },
          { label: '吃了但一般',       value: 'ok',   icon: '🍚' },
          { label: '跳了一餐',         value: 'skip', icon: '⏭️' },
          { label: '乱吃/外卖',        value: 'bad',  icon: '🍟' },
        ],
      },
      {
        id: 'supp',
        text: '有无额外营养补充？',
        options: [
          { label: '有蛋白/维生素',  value: 'yes', icon: '💊' },
          { label: '吃了补充剂',     value: 'sup', icon: '🧪' },
          { label: '没有',           value: 'no',  icon: '❌' },
        ],
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.meal === 'good')  { b.health = 1.5; b.abstinence = 0.3; b.willpower = 0.3 }
      if (a.meal === 'ok')    { b.health = 0.8 }
      if (a.meal === 'skip')  { b.health = 0.2; b.willpower = -0.3 }
      if (a.meal === 'bad')   { b.willpower = -0.5 }
      if (a.supp === 'yes')   { b.health = (b.health ?? 0) + 0.5 }
      if (a.supp === 'sup')   { b.health = (b.health ?? 0) + 0.3 }
      return b
    },
  },

  // ── 健身打卡 ──────────────────────────────────────────────
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
          { label: '力量训练',   value: 'strength', icon: '🏋️' },
          { label: '有氧运动',   value: 'cardio',   icon: '🏃' },
          { label: '球类/户外',  value: 'sports',   icon: '⚽' },
          { label: '休息日',     value: 'rest',     icon: '😴' },
        ],
      },
      {
        id: 'intensity',
        text: '强度如何？',
        options: [
          { label: '全力输出',   value: 'hard',   icon: '🔥' },
          { label: '中等强度',   value: 'medium', icon: '💦' },
          { label: '轻松',       value: 'light',  icon: '🌿' },
        ],
        dependsOn: { questionId: 'type', matches: ['strength', 'cardio', 'sports'] },
      },
      {
        id: 'duration',
        text: '训练时长？',
        options: [
          { label: '超过 1 小时',   value: 'long',   icon: '⏱️' },
          { label: '30-60 分钟',    value: 'medium', icon: '🕐' },
          { label: '不到 30 分钟',  value: 'short',  icon: '⚡' },
        ],
        dependsOn: { questionId: 'type', matches: ['strength', 'cardio', 'sports'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.type === 'rest') return b

      // 基础（类型）
      if (a.type === 'strength') { b.strength = 1.0; b.health = 0.5; b.willpower = 0.5 }
      if (a.type === 'cardio')   { b.strength = 0.5; b.health = 1.0; b.willpower = 0.5 }
      if (a.type === 'sports')   { b.strength = 0.5; b.health = 0.5; b.willpower = 0.3 }

      // 强度加成
      if (a.intensity === 'hard')   { b.strength = (b.strength ?? 0) + 0.7; b.health = (b.health ?? 0) + 0.3; b.willpower = (b.willpower ?? 0) + 0.5 }
      if (a.intensity === 'medium') { b.strength = (b.strength ?? 0) + 0.3; b.health = (b.health ?? 0) + 0.2; b.willpower = (b.willpower ?? 0) + 0.2 }

      // 时长加成
      if (a.duration === 'long')    { b.strength = (b.strength ?? 0) + 0.5 }
      if (a.duration === 'medium')  { b.strength = (b.strength ?? 0) + 0.2 }

      return b
    },
  },

  // ── 社交打卡 ──────────────────────────────────────────────
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
          { label: '朋友聊天',       value: 'friends',  icon: '👥' },
          { label: '无社交',         value: 'none',     icon: '🏠' },
        ],
      },
      {
        id: 'opener',
        text: '开场方式？',
        options: [
          { label: '直接开场',   value: 'direct',      icon: '🎯' },
          { label: '情景开场',   value: 'situational',  icon: '💡' },
          { label: '间接开场',   value: 'indirect',     icon: '🔄' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'result',
        text: '结果如何？',
        options: [
          { label: '收号',             value: 'number',   icon: '📱' },
          { label: '好反应但没收号',   value: 'good',     icon: '😊' },
          { label: '中性',             value: 'neutral',  icon: '😐' },
          { label: '被拒',             value: 'rejected', icon: '🚫' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'state',
        text: '你的状态自评？',
        options: [
          { label: '状态很好', value: '3', icon: '⭐' },
          { label: '正常',     value: '2', icon: '👍' },
          { label: '有点差',   value: '1', icon: '😞' },
          { label: '很差',     value: '0', icon: '💀' },
        ],
        dependsOn: { questionId: 'type', matches: ['approach'] },
      },
      {
        id: 'engage',
        text: '你的投入度？',
        options: [
          { label: '主动引导话题', value: 'active',  icon: '🎤' },
          { label: '正常参与',     value: 'normal',  icon: '👌' },
          { label: '比较被动',     value: 'passive', icon: '👀' },
        ],
        dependsOn: { questionId: 'type', matches: ['party', 'work', 'friends'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.type === 'none') { b.social = -0.2; return b }

      if (a.type === 'approach') {
        b.courage = 1.5; b.willpower = 0.5
        if (a.result === 'number')   { b.charm = 2.0; b.social = 1.0 }
        if (a.result === 'good')     { b.charm = 1.0; b.social = 0.8 }
        if (a.result === 'neutral')  { b.charm = 0.5; b.social = 0.5 }
        if (a.result === 'rejected') { b.charm = 0.5; b.social = 0.3; b.courage = (b.courage ?? 0) + 0.5; b.willpower = (b.willpower ?? 0) + 0.5 }
        if (a.state === '3') { b.charm = (b.charm ?? 0) + 0.5; b.social = (b.social ?? 0) + 0.5 }
        if (a.state === '0') { b.charm = (b.charm ?? 0) - 0.3; b.willpower = (b.willpower ?? 0) + 0.3 }
      } else {
        if (a.engage === 'active')  { b.charm = 0.5;  b.social = 1.0 }
        if (a.engage === 'normal')  { b.charm = 0.2;  b.social = 0.5 }
        if (a.engage === 'passive') { b.social = 0.3 }
      }
      return b
    },
  },

  // ── 学习打卡 ──────────────────────────────────────────────
  {
    system: 'learning',
    label: '学习打卡',
    emoji: '📚',
    color: '#3b82f6',
    questions: [
      {
        id: 'quality',
        text: '今天投入学习的感觉？',
        options: [
          { label: '高质量深度投入',  value: 'deep',   icon: '🧠' },
          { label: '中等投入',        value: 'medium', icon: '📖' },
          { label: '低效/分心',       value: 'low',    icon: '😶' },
          { label: '今天没学',        value: 'none',   icon: '💤' },
        ],
      },
      {
        id: 'type',
        text: '学习内容类型？',
        options: [
          { label: '核心能力提升',  value: 'core',    icon: '🎯' },
          { label: '工作相关',     value: 'work',    icon: '💼' },
          { label: '兴趣泛读',     value: 'general', icon: '📰' },
        ],
        dependsOn: { questionId: 'quality', matches: ['deep', 'medium', 'low'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.quality === 'deep')   { b.intellect = 2.0; b.willpower = 1.0 }
      if (a.quality === 'medium') { b.intellect = 1.0; b.willpower = 0.3 }
      if (a.quality === 'low')    { b.intellect = 0.3; b.willpower = 0.2 }
      if (a.quality === 'none')   { b.willpower = -0.3 }
      if (a.type === 'core')      { b.intellect = (b.intellect ?? 0) + 0.5 }
      return b
    },
  },

  // ── 戒色打卡 ──────────────────────────────────────────────
  {
    system: 'abstinence',
    label: '戒色打卡',
    emoji: '🧘',
    color: '#6366f1',
    questions: [
      {
        id: 'state',
        text: '今天状态？',
        options: [
          { label: '执行替代行为成功', value: 'alternative', icon: '✨' },
          { label: '平稳度过',         value: 'steady',      icon: '🧊' },
          { label: '有冲动但控制住',   value: 'controlled',  icon: '⚡' },
          { label: '破戒了',           value: 'relapse',     icon: '💔' },
        ],
      },
      {
        id: 'trigger',
        text: '触发场景？',
        options: [
          { label: '深夜独处',   value: 'night',    icon: '🌙' },
          { label: '压力释放',   value: 'stress',   icon: '😰' },
          { label: '如释重负',   value: 'relief',   icon: '😮' },
          { label: '无聊',       value: 'bored',    icon: '🥱' },
          { label: '其他',       value: 'other',    icon: '❓' },
        ],
        dependsOn: { questionId: 'state', matches: ['relapse'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = {}
      if (a.state === 'alternative') { b.abstinence = 2.0; b.courage = 1.0; b.willpower = 1.0 }
      if (a.state === 'steady')       { b.abstinence = 1.0; b.willpower = 0.5 }
      if (a.state === 'controlled')   { b.abstinence = 0.5; b.willpower = 0.8; b.courage = 0.3 }
      if (a.state === 'relapse')      { b.abstinence = -3.0; b.willpower = -1.0; b.courage = -1.0 }
      return b
    },
  },
]
