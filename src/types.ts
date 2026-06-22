// ============================================================
// 量化人生RPG — 类型定义
// ============================================================

/** 六项核心属性 */
export interface Attributes {
  charm: number      // 魅力值 — 搭讪、社交场合的吸引力
  strength: number   // 力量值 — 健身训练带来的体能
  intellect: number  // 智力值 — 学习和深度思考的积累
  social: number     // 社交值 — 社交能力和人际关系
  willpower: number  // 意志力 — 自律和执行力
  nutrition: number  // 营养值 — 饮食质量和营养摄入
}

/** 打卡体系类型 */
export type CheckinSystem = 'diet' | 'fitness' | 'social'

/** 单次打卡记录 */
export interface CheckinRecord {
  id: string
  date: string       // ISO date YYYY-MM-DD
  system: CheckinSystem
  answers: Record<string, string>
  attributeChanges: Partial<Attributes>
}

/** 全局状态 */
export interface AppState {
  attributes: Attributes
  records: CheckinRecord[]
  lastBackup: string | null
}

// --- 初始属性 ---
export const DEFAULT_ATTRIBUTES: Attributes = {
  charm: 10,
  strength: 10,
  intellect: 30,
  social: 10,
  willpower: 15,
  nutrition: 15,
}

// --- 属性元数据 ---
export const ATTR_META: Record<keyof Attributes, {
  label: string
  emoji: string
  color: string
  desc: string
}> = {
  charm:      { label: '魅力值', emoji: '✨', color: '#f59e0b', desc: '搭讪与社交吸引力' },
  strength:   { label: '力量值', emoji: '💪', color: '#ef4444', desc: '健身带来的体能' },
  intellect:  { label: '智力值', emoji: '🧠', color: '#3b82f6', desc: '学习与深度思考' },
  social:     { label: '社交值', emoji: '🤝', color: '#10b981', desc: '人际关系与社交力' },
  willpower:  { label: '意志力', emoji: '🔥', color: '#8b5cf6', desc: '自律与执行力' },
  nutrition:  { label: '营养值', emoji: '🥗', color: '#f97316', desc: '饮食质量' },
}

// --- 分段阈值 ---
// 0-60:  线性 1.0x
// 60-80: 减速 0.6x
// 80-95: 大幅减速 0.25x
// 95-100: 极慢 0.1x
export function tierMultiplier(val: number): number {
  if (val < 60) return 1.0
  if (val < 80) return 0.6
  if (val < 95) return 0.25
  return 0.1
}

export function tierLabel(val: number): string {
  if (val >= 95) return '大师'
  if (val >= 80) return '高手'
  if (val >= 60) return '进阶'
  return ''
}
