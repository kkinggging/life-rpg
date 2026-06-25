// ============================================================
// Personal OS RPG — 工具函数 & 打卡定义
// ============================================================
import { BaseAttr, BASE_ATTRS, type BaseAttrs } from './types'
import { pickRandomQuestion } from './qfilter'

// --- ID ---
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// --- 日期 ---
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/** 本周一 00:00 → 本周日 23:59 */
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

// --- 问题定义 ---
export interface Question {
  id: string
  text: string
  options: { label: string; value: string; icon: string }[]
  /** 仅当 dependsOn.questionId 的答案在 matches 中时才显示 */
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
// 五大打卡体系
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
      const b: Partial<BaseAttrs> = { health: 0, abstinence: 0, willpower: 0 }
      if (a.meal === 'good')  { b.health = 5;  b.abstinence = 1            }
      if (a.meal === 'ok')    { b.health = 3                               }
      if (a.meal === 'skip')  { b.health = 1;  b.willpower = -1            }
      if (a.meal === 'bad')   { b.health = 0;  b.willpower = -1            }
      if (a.supp === 'yes')   { b.health! += 3                             }
      if (a.supp === 'sup')   { b.health! += 2                             }
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
      const b: Partial<BaseAttrs> = { strength: 0, health: 0, willpower: 0 }
      if (a.type === 'rest') return b

      // 类型基础
      if (a.type === 'strength') { b.strength = 6; b.health = 2; b.willpower = 2 }
      if (a.type === 'cardio')   { b.strength = 4; b.health = 3; b.willpower = 2 }
      if (a.type === 'sports')   { b.strength = 4; b.health = 2; b.willpower = 1 }

      // 强度加成
      if (a.intensity === 'hard')   { b.strength! += 2; b.health! += 2; b.willpower! += 2 }
      if (a.intensity === 'medium') { b.strength! += 1; b.health! += 1; b.willpower! += 1 }

      // 时长加成
      if (a.duration === 'long')   { b.strength! += 2 }
      if (a.duration === 'medium') { b.strength! += 1 }

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
      // --- 搭讪专属 ---
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
      // --- 非搭讪社交 ---
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
      const b: Partial<BaseAttrs> = { charm: 0, social: 0, courage: 0, willpower: 0 }
      if (a.type === 'none') { b.social = -1; b.willpower = -1; return b }

      if (a.type === 'approach') {
        b.courage = 3
        b.willpower = 1
        if (a.result === 'number')   { b.charm = 8; b.social = 5                    }
        if (a.result === 'good')     { b.charm = 5; b.social = 4                    }
        if (a.result === 'neutral')  { b.charm = 2; b.social = 2                    }
        if (a.result === 'rejected') { b.charm = 3; b.social = 1; b.courage! += 2   }
        if (a.state === '3') { b.charm! += 2; b.social! += 1 }
        if (a.state === '1') { b.charm! -= 1                 }
        if (a.state === '0') { b.charm! -= 2; b.courage! += 1 }
      } else {
        if (a.engage === 'active')  { b.charm = 3; b.social = 4 }
        if (a.engage === 'normal')  { b.charm = 1; b.social = 2 }
        if (a.engage === 'passive') { b.social = 1              }
      }
      return b
    },
  },

  // ── 学习打卡 ──────────────────────────────────────────────
  {
    system: 'learning',
    label: '学习打卡',
    emoji: '🧠',
    color: '#3b82f6',
    questions: [
      {
        id: 'quality',
        text: '今天投入学习的感觉？',
        options: [
          { label: '高质量深度学习', value: 'deep',    icon: '✨' },
          { label: '中等投入',       value: 'medium',  icon: '📖' },
          { label: '低效/走神',      value: 'shallow', icon: '🥱' },
          { label: '没学',           value: 'none',    icon: '💤' },
        ],
      },
      {
        id: 'type',
        text: '学习内容类型？',
        options: [
          { label: '核心能力提升',   value: 'core',    icon: '🎯' },
          { label: '工作相关',       value: 'work',    icon: '💼' },
          { label: '泛阅读/资讯',    value: 'reading', icon: '📰' },
          { label: '无效摄入',       value: 'useless', icon: '🗑️' },
        ],
        dependsOn: { questionId: 'quality', matches: ['deep', 'medium', 'shallow'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = { intellect: 0, willpower: 0 }
      if (a.quality === 'none') { b.willpower = -1; return b }

      // 质量基础
      if (a.quality === 'deep')    { b.intellect = 5; b.willpower = 3 }
      if (a.quality === 'medium')  { b.intellect = 3; b.willpower = 2 }
      if (a.quality === 'shallow') { b.intellect = 2; b.willpower = 1 }

      // 内容类型加成
      if (a.type === 'core')    { b.intellect! += 3 }
      if (a.type === 'work')    { b.intellect! += 2 }
      if (a.type === 'reading') { b.intellect! += 1 }

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
          { label: '成功执行替代行为',   value: 'replaced', icon: '🏆' },
          { label: '平稳度过',           value: 'calm',     icon: '😌' },
          { label: '有冲动但控制住了',   value: 'resisted', icon: '💪' },
          { label: '破戒了',             value: 'relapsed', icon: '💔' },
        ],
      },
      {
        id: 'trigger',
        text: '触发场景？',
        options: [
          { label: '深夜独处',   value: 'late_night', icon: '🌙' },
          { label: '压力释放',   value: 'stress',     icon: '😫' },
          { label: '如释重负',   value: 'relief',     icon: '😮‍💨' },
          { label: '无聊',       value: 'boredom',    icon: '🥱' },
          { label: '其他',       value: 'other',      icon: '❓' },
        ],
        dependsOn: { questionId: 'state', matches: ['relapsed'] },
      },
    ],
    calcBonus(a) {
      const b: Partial<BaseAttrs> = { abstinence: 0, courage: 0, willpower: 0 }
      if (a.state === 'replaced')  { b.abstinence = 5;  b.courage = 2;  b.willpower = 4  }
      if (a.state === 'calm')      { b.abstinence = 3;  b.courage = 1;  b.willpower = 2  }
      if (a.state === 'resisted')  { b.abstinence = 1;  b.courage = 2;  b.willpower = 3  }
      if (a.state === 'relapsed')  { b.abstinence = -8; b.courage = -2; b.willpower = -3 }
      return b
    },
  },

]
