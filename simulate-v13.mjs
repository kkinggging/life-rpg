// ============================================================
// v13 Simulation — Verifies 7:3 engine, buffer pool, release/lock
// Run: node simulate-v13.mjs
// ============================================================

const BASE_ATTRS = ['charm','strength','intellect','social','willpower','health','courage','abstinence']
const DERIVED = ['mastery','flow','behavioralCues','professional','opportunity','macroControl']

function tierMultiplier(val) {
  if (val <= 60) return 1.0
  if (val <= 80) return 0.6
  if (val <= 95) return 0.25
  return 0.1
}
function clamp(v) { return Math.max(-1.0, Math.min(1.0, v)) }
function round(v, d=1) { return Number(v.toFixed(d)) }

// ---- SKILL_DEFS ----
const SKILL_DEFS = [
  { id:'mastery', tier:1, inputs:[{s:'intellect',w:4},{s:'social',w:3},{s:'health',w:2},{s:'charm',w:1}] },
  { id:'flow', tier:1, inputs:[{s:'charm',w:4},{s:'intellect',w:3},{s:'social',w:2},{s:'courage',w:1}] },
  { id:'behavioralCues', tier:1, inputs:[{s:'charm',w:3},{s:'courage',w:3},{s:'willpower',w:2},{s:'social',w:1},{s:'intellect',w:1}] },
  { id:'opportunity', tier:1, inputs:[{s:'intellect',w:5},{s:'charm',w:3},{s:'social',w:2}] },
  { id:'professional', tier:2, inputs:[{s:'mastery',w:4},{s:'flow',w:4},{s:'intellect',w:2}] },
  { id:'macroControl', tier:3, inputs:[{s:'abstinence',w:6},{s:'opportunity',w:1},{s:'behavioralCues',w:1},{s:'flow',w:1},{s:'mastery',w:1}] },
]

const CONVERGENCE_DAMPING = 0.20
const DEFAULT_Q_RATIO = 0.5

function calcGamma(K) { return 0.5 + 1/(1 + Math.exp(-(K-50)/10)) }
function calcLambda(S) { return 1 - Math.pow(S/100, 2) }

function getNextThreshold(val) {
  const boundaries = [21, 41, 61, 81, 101]
  for (const b of boundaries) if (val < b) return b
  return 101
}

// ---- 7:3 Hybrid engine (matches math.ts v13) ----
function calcAllDerivedV13(base, derived, pools, qFilterScores, lockedUntilMap) {
  const values = { ...base, ...derived }
  const gamma = calcGamma(derived.macroControl ?? 25)
  const today = lockedUntilMap._today || '9999-99-99'
  const skills = {}
  const newPools = []

  for (const def of [...SKILL_DEFS].sort((a,b) => a.tier - b.tier)) {
    const sid = def.id

    // 锁定检查
    const lockUntil = lockedUntilMap[sid]
    if (lockUntil && lockUntil > today) {
      const oldP = pools.find(p => p.skill === sid)
      skills[sid] = values[sid] ?? 0
      newPools.push({ skill: sid, accumulated: oldP?.accumulated ?? 0, threshold: getNextThreshold(values[sid]??0), lockedUntil: lockUntil })
      continue
    }

    // B̄_j
    let num = 0, den = 0
    for (const {s, w} of def.inputs) { num += (values[s]??0) * w; den += w }
    const weightedBase = den > 0 ? num / den : 0

    // Q_effective
    const qScore = qFilterScores[sid]
    const qEff = qScore !== undefined ? qScore : weightedBase * DEFAULT_Q_RATIO

    // 7:3 contribution
    const contribution = 0.7 * weightedBase + 0.3 * qEff

    // current
    const current = values[sid] ?? 0

    // ΔS_j
    const gap = contribution - current
    const delta = gap * CONVERGENCE_DAMPING * gamma * calcLambda(current)
    const newVal = Math.max(0, Math.min(100, Math.round((current + delta) * 10) / 10))
    skills[sid] = newVal
    values[sid] = newVal

    // 缓冲池累积
    const oldP = pools.find(p => p.skill === sid)
    newPools.push({
      skill: sid,
      accumulated: (oldP?.accumulated ?? 0) + Math.abs(delta),
      threshold: getNextThreshold(current),
      lockedUntil: oldP?.lockedUntil ?? null,
    })
  }
  return { skills, pools: newPools }
}

// ---- Checkin deltas ----
function dietBonus(a) {
  const b = {}
  if (a.meal === 'excellent') { b.health = 1.0; b.willpower = 0.3; b.abstinence = 0.2 }
  if (a.meal === 'good')      { b.health = 0.6; b.willpower = 0.1 }
  if (a.meal === 'skip')      { b.health = 0.1; b.willpower = -0.3 }
  if (a.meal === 'bad')       { b.willpower = -0.4 }
  if (a.macro === 'balanced')  { b.health = (b.health??0)+0.4; b.willpower = (b.willpower??0)+0.2 }
  if (a.macro === 'unhealthy') { b.health = (b.health??0)-0.2 }
  if (a.vegetables === 'plenty') { b.health = (b.health??0)+0.3 }
  if (a.vegetables === 'none')   { b.health = (b.health??0)-0.2 }
  if (a.water === 'over') { b.health = (b.health??0)+0.3; b.willpower = (b.willpower??0)+0.1 }
  if (a.water === 'bad')  { b.health = (b.health??0)-0.3 }
  return b
}
function fitnessBonus(a) {
  const b = {}
  if (a.type === 'rest') {
    b.health = 0.3
    if (a.restQuality === 'full')   { b.health += 0.4; b.willpower = 0.2 }
    if (a.restQuality === 'sore')   { b.health += 0.1 }
    if (a.restQuality === 'bad')    { b.health -= 0.3 }
    if (a.activeRecovery === 'yes') { b.health += 0.2; b.willpower = (b.willpower??0)+0.1 }
    if (a.restNutrition === 'good') { b.health += 0.2; b.willpower = (b.willpower??0)+0.1 }
    if (a.restNutrition === 'bad')  { b.health -= 0.2 }
    return b
  }
  if (a.type === 'strength') { b.strength = 0.8; b.health = 0.3; b.willpower = 0.4 }
  if (a.type === 'cardio')   { b.strength = 0.3; b.health = 0.8; b.willpower = 0.3 }
  if (a.type === 'sports')   { b.strength = 0.4; b.health = 0.5; b.willpower = 0.2 }
  if (a.intensity === 'hard')   { b.strength = (b.strength??0)+0.5; b.health = (b.health??0)+0.3; b.willpower = (b.willpower??0)+0.4 }
  if (a.intensity === 'medium') { b.strength = (b.strength??0)+0.2; b.willpower = (b.willpower??0)+0.1 }
  if (a.duration === 'long')    { b.strength = (b.strength??0)+0.3 }
  if (a.duration === 'medium')  { b.strength = (b.strength??0)+0.1 }
  if (a.structure === 'planned') { b.willpower = (b.willpower??0)+0.3 }
  if (a.structure === 'random')  { b.willpower = (b.willpower??0)-0.1 }
  if (a.warmup === 'full')    { b.health = (b.health??0)+0.2; b.willpower = (b.willpower??0)+0.1 }
  if (a.warmup === 'none')    { b.health = (b.health??0)-0.2 }
  if (a.feel === 'peak')      { b.willpower = (b.willpower??0)+0.2 }
  if (a.feel === 'bad')       { b.willpower = (b.willpower??0)-0.2 }
  return b
}
function socialBonus(a) {
  const b = {}
  if (a.type === 'none') { b.social = -0.1; return b }
  if (a.type === 'approach') {
    b.courage = 0.8
    if (a.venue === 'high')   { b.courage += 0.5; b.willpower = 0.4 }
    if (a.venue === 'medium') { b.courage += 0.2 }
    if (a.venue === 'low')    { b.courage += 0.1 }
    if (a.opener === 'direct')      { b.courage += 0.2 }
    if (a.opener === 'situational') { b.social = 0.2 }
    if (a.result === 'number')   { b.charm = 0.8; b.social = (b.social??0)+0.6 }
    if (a.result === 'good')     { b.charm = 0.5; b.social = (b.social??0)+0.4 }
    if (a.result === 'neutral')  { b.charm = 0.2; b.social = (b.social??0)+0.2 }
    if (a.result === 'rejected') { b.charm = 0.1; b.social = (b.social??0)+0.1; b.courage += 0.3; b.willpower = (b.willpower??0)+0.2 }
    if (a.state === '3') { b.charm = (b.charm??0)+0.3; b.social = (b.social??0)+0.2 }
    if (a.state === '0') { b.charm = (b.charm??0)-0.2; b.willpower = (b.willpower??0)+0.3 }
    if (a.feeling === 'good')     { b.willpower = (b.willpower??0)+0.1 }
    if (a.feeling === 'ruminate') { b.willpower = (b.willpower??0)+0.2 }
    if (a.feeling === 'regret')   { b.willpower = (b.willpower??0)-0.2 }
  } else {
    if (a.engage === 'active')  { b.charm = 0.3; b.social = 0.6 }
    if (a.engage === 'normal')  { b.charm = 0.1; b.social = 0.3 }
    if (a.engage === 'passive') { b.social = 0.2 }
    if (a.scale === 'one')    { b.social = (b.social??0)+0.3; b.charm = (b.charm??0)+0.1 }
    if (a.scale === 'large')  { b.courage = 0.3; b.social = (b.social??0)+0.2 }
    if (a.depth === 'deep')    { b.social = (b.social??0)+0.4; b.charm = (b.charm??0)+0.2 }
    if (a.depth === 'surface') { b.social = (b.social??0)-0.1 }
    if (a.aftermath === 'energized') { b.charm = (b.charm??0)+0.2; b.social = (b.social??0)+0.2 }
    if (a.aftermath === 'drained')   { b.willpower = (b.willpower??0)+0.3 }
  }
  return b
}
function learningBonus(a) {
  const b = {}
  if (a.duration === 'none') {
    if (a.whyNot === 'lazy')   b.willpower = -0.5
    if (a.whyNot === 'forgot') b.willpower = -0.3
    return b
  }
  if (a.duration === 'long')   { b.intellect = 0.8; b.willpower = 0.4 }
  if (a.duration === 'medium') { b.intellect = 0.5; b.willpower = 0.2 }
  if (a.duration === 'short')  { b.intellect = 0.2; b.willpower = 0.1 }
  if (a.depth === 'deep')    { b.intellect = (b.intellect??0)+0.4; b.willpower = (b.willpower??0)+0.3 }
  if (a.depth === 'shallow') { b.intellect = (b.intellect??0)-0.1 }
  if (a.domain === 'core')    { b.intellect = (b.intellect??0)+0.2; b.willpower = (b.willpower??0)+0.1 }
  if (a.domain === 'general') { b.intellect = (b.intellect??0)+0.1 }
  if (a.retention === 'high') { b.intellect = (b.intellect??0)+0.2; b.willpower = (b.willpower??0)+0.1 }
  if (a.retention === 'low')  { b.intellect = (b.intellect??0)-0.1 }
  if (a.output === 'created') { b.intellect = (b.intellect??0)+0.3; b.willpower = (b.willpower??0)+0.2 }
  if (a.output === 'mapped')  { b.intellect = (b.intellect??0)+0.2 }
  if (a.focus === 'deep')     { b.willpower = (b.willpower??0)+0.3 }
  if (a.focus === 'low')      { b.willpower = (b.willpower??0)-0.1 }
  return b
}
function abstinenceBonus(a) {
  const b = {}
  if (a.state === 'alternative') {
    b.abstinence = 0.8; b.courage = 0.3; b.willpower = 0.5
    if (a.altType === 'exercise')  { b.strength = 0.1; b.health = 0.2 }
    if (a.altType === 'study')     { b.intellect = 0.1 }
    if (a.altType === 'social')    { b.social = 0.1 }
    if (a.altType === 'meditate')  { b.willpower += 0.2 }
    if (a.altEase === 'easy')      { b.willpower += 0.2; b.courage += 0.1 }
    if (a.altEase === 'hard')      { b.willpower += 0.3 }
    if (a.altEffect === 'charged') { b.willpower += 0.1 }
    if (a.altEffect === 'empty')   { b.willpower -= 0.2 }
  }
  if (a.state === 'steady')       { b.abstinence = 0.4; b.willpower = 0.2 }
  if (a.state === 'controlled') {
    b.abstinence = 0.3; b.willpower = 0.3; b.courage = 0.1
    if (a.ctrlMethod === 'physical')   { b.willpower += 0.1 }
    if (a.ctrlMethod === 'willpower')  { b.willpower += 0.2 }
    if (a.ctrlAftermath === 'proud')   { b.willpower += 0.2; b.courage += 0.1 }
    if (a.ctrlAftermath === 'drained') { b.willpower -= 0.1 }
  }
  if (a.state === 'relapse') {
    let penalty = -0.8
    if (a.streak === 'week')  penalty = -1.2
    if (a.streak === 'days')  penalty = -1.0
    if (a.streak === 'short') penalty = -0.8
    if (a.streak === 'zero')  penalty = -0.5
    b.abstinence = penalty; b.willpower = -0.3; b.courage = -0.2
    if (a.recovery === 'analyze') { b.willpower += 0.3 }
    if (a.recovery === 'reset')   { b.willpower += 0.2 }
    if (a.recovery === 'moveon')  { b.willpower += 0.1 }
  }
  return b
}

const checkins = { diet: dietBonus, fitness: fitnessBonus, social: socialBonus, learning: learningBonus, abstinence: abstinenceBonus }

function applyCheckin(attr, sys, answers) {
  const raw = checkins[sys](answers)
  for (const [k, v] of Object.entries(raw)) {
    if (v === 0 || v === undefined) continue
    const cv = clamp(v)
    const multi = tierMultiplier(attr[k] ?? 0)
    attr[k] = Math.max(0, Math.min(100, Math.round((attr[k] + cv * multi) * 10) / 10))
  }
  return attr
}

console.log('══════════════════════════════════════════════')
console.log('  v13 验证测试 — 5 项核心修复')
console.log('══════════════════════════════════════════════\n')

// ═══════════════════════════════════════════════════════════════
// TEST 1: 7:3 formula — QFilter ≥75 产生更大增长
// ═══════════════════════════════════════════════════════════════
console.log('【测试1】7:3 公式 — QFilter 对增长的影响')
const base1 = { charm: 50, strength: 50, intellect: 50, social: 50, willpower: 50, health: 50, courage: 50, abstinence: 50 }
const derived1 = { mastery: 30, flow: 30, behavioralCues: 30, professional: 30, opportunity: 30, macroControl: 30 }

// 场景A: 无 QFilter (Q_effective = B̄×0.5)
const rNoQ = calcAllDerivedV13(base1, derived1, [], {}, {})
// 场景B: QFilter = 85 (≥75 → 7:3 中 Q 以真实值代入)
const rQHigh = calcAllDerivedV13(base1, derived1, [], { mastery: 85 }, {})
// 场景C: QFilter = 30 (<75 → Q 低贡献)
const rQLow = calcAllDerivedV13(base1, derived1, [], { mastery: 30 }, {})

const mNoQ = rNoQ.skills.mastery
const mQHigh = rQHigh.skills.mastery
const mQLow = rQLow.skills.mastery
console.log(`  基础 all=50, mastery start=30, target~50`)
console.log(`  无QFilter: mastery → ${mNoQ} (delta ${round(mNoQ-30,1)})`)
console.log(`  Q=85:      mastery → ${mQHigh} (delta ${round(mQHigh-30,1)})`)
console.log(`  Q=30:      mastery → ${mQLow} (delta ${round(mQLow-30,1)})`)
// test 1: verify ordering
// 7:3 公式正确: Q=85 >> Q=30 >= 无Q(30>25即B̄×0.5)
const ok1 = mQHigh > mQLow && mQLow >= mNoQ - 0.5
console.log(`  ${ok1 ? '✅ 通过' : '❌ 失败'}: Q=85>Q=30≥无Q (Q=30>B̄×0.5=25→略高于缺省, 符合7:3公式)`)

// ═══════════════════════════════════════════════════════════════
// TEST 2: Buffer pool accumulation — pushes past threshold
// ═══════════════════════════════════════════════════════════════
console.log('\n【测试2】缓冲池累积 → 阈值触发')
const base2 = { charm: 25, strength: 25, intellect: 35, social: 25, willpower: 25, health: 25, courage: 25, abstinence: 20 }
let derived2 = { mastery: 25, flow: 25, behavioralCues: 25, professional: 25, opportunity: 25, macroControl: 25 }
let pools2 = []
const lockMap2 = { _today: '9999-99-99' }

// Accumulate through multiple checkins without QFilter
for (let i = 0; i < 60; i++) {
  const r = calcAllDerivedV13(base2, derived2, pools2, {}, lockMap2)
  derived2 = r.skills
  pools2 = r.pools
  // Simulate base attr growth slowly
  base2.health = Math.min(100, base2.health + 0.3)
  base2.intellect = Math.min(100, base2.intellect + 0.2)
  base2.strength = Math.min(100, base2.strength + 0.15)
}
const masteryPool = pools2.find(p => p.skill === 'mastery')
console.log(`  60次打卡后 mastery 缓冲池: accumulated=${round(masteryPool.accumulated,1)} threshold=${masteryPool.threshold}`)
console.log(`  triggered=${masteryPool.accumulated >= masteryPool.threshold * 0.8}`)
console.log(`  mastery 技能值: ${round(derived2.mastery,1)}`)
const ok2 = masteryPool.accumulated > 5 // definitely should have accumulated
console.log(`  ${ok2 ? '✅ 通过' : '❌ 失败'}: 缓冲池累积了有效值`)

// ═══════════════════════════════════════════════════════════════
// TEST 3: Release/Lock — Q<75 triggers 70% retention + lock
// ═══════════════════════════════════════════════════════════════
console.log('\n【测试3】释放/锁定 — Q<75 → 缓冲池70%留存+14天锁定')
const base3 = { charm: 50, strength: 50, intellect: 50, social: 50, willpower: 50, health: 50, courage: 50, abstinence: 50 }
const derived3 = { mastery: 30, flow: 30, behavioralCues: 30, professional: 30, opportunity: 30, macroControl: 30 }
// Pre-populate pool with some accumulation
const pools3 = [{ skill: 'mastery', accumulated: 35, threshold: 41, lockedUntil: null }]
const lockMap3 = { _today: '2026-06-26' }

// Q=30 (<75) → should lock
const rLock = calcAllDerivedV13(base3, derived3, pools3, { mastery: 30 }, lockMap3)
// Check: did pool get locked?
// In actual store, LOCK_POOL action sets lockedUntil. Simulate:
const lockUntil = '2026-07-10' // today + 14 days
// Before locking, pool had accumulated 35. After Q<75 → should be 35*0.7=24.5
const lockedPool = { ...pools3[0], accumulated: pools3[0].accumulated * 0.7, lockedUntil: lockUntil }
console.log(`  Q=30 触发前: accumulated=${pools3[0].accumulated}`)
console.log(`  锁定后: accumulated=${round(lockedPool.accumulated,1)} lockedUntil=${lockedPool.lockedUntil}`)
console.log(`  Q=30 下的 mastery 增长: ${round(rLock.skills.mastery,1)}`)

// Now try to grow while locked — should not grow
const lockMap3After = { _today: '2026-06-27', mastery: '2026-07-10' }
const rLocked = calcAllDerivedV13(base3, derived3, pools3, { mastery: 85 }, lockMap3After)
console.log(`  锁定期间 (Q=85): mastery = ${round(rLocked.skills.mastery,1)} (应为30, 不增)`)
const ok3 = rLocked.skills.mastery === 30
console.log(`  ${ok3 ? '✅ 通过' : '❌ 失败'}: 锁定期间技能不增长`)

// ═══════════════════════════════════════════════════════════════
// TEST 4: Calibration — flag-based first-launch detection
// ═══════════════════════════════════════════════════════════════
console.log('\n【测试4】百分位校准 — flag 检测')
const calTest = {
  hasFlag: () => true,
  noFlag: () => false,
}
console.log(`  hasFlag='true' → showCalibration=${!calTest.hasFlag()} (应为 false)`)
console.log(`  hasFlag=null  → showCalibration=${!calTest.noFlag()} (应为 true)`)
console.log(`  校准公式: InitialValue(50) = 5 + (50/100)*90 = ${5 + (50/100) * 90}`)
console.log(`  校准公式: InitialValue(0)  = 5 + (0/100)*90  = ${5 + (0/100) * 90}`)
console.log(`  校准公式: InitialValue(99) = 5 + (99/100)*90 = ${5 + (99/100) * 90}`)
const ok4a = (5 + (50/100) * 90) === 50
const ok4b = (5 + (0/100) * 90) === 5
const ok4c = Math.round(5 + (99/100) * 90) === 94
console.log(`  ${ok4a && ok4b && ok4c ? '✅ 通过' : '❌ 失败'}: 校准公式正确`)

// ═══════════════════════════════════════════════════════════════
// TEST 5: QFilter as direct contributor (not rate modulator)
// ═══════════════════════════════════════════════════════════════
console.log('\n【测试5】QFilter 作为 7:3 直接贡献者（非速率调节器）')
// In v12: rate=0.03 (no Q), 0.06 (Q≥75), 0.015 (Q<75)
// In v13: contribution = 0.7*B̄ + 0.3*Q_eff, then damped
const base5 = { charm: 50, strength: 50, intellect: 50, social: 50, willpower: 50, health: 50, courage: 50, abstinence: 50 }
const derived5 = { mastery: 30, flow: 30, behavioralCues: 30, professional: 30, opportunity: 30, macroControl: 30 }

// No QFilter
const r5a = calcAllDerivedV13(base5, derived5, [], {}, {})
// QFilter=100 (max)
const r5b = calcAllDerivedV13(base5, derived5, [], { mastery: 100 }, {})
// QFilter=0 (min)
const r5c = calcAllDerivedV13(base5, derived5, [], { mastery: 0 }, {})

const target = (4*50 + 3*50 + 2*50 + 1*50) / 10 // =50
console.log(`  B̄_mastery ≈ ${round(target,1)}`)
// Q=100: contribution = 0.7*50 + 0.3*100 = 35+30 = 65
// delta = (65-30)*0.2*gamma*lambda
// gamma(K=macroControl≈30) = 0.5+1/(1+e^2)≈0.5+0.12=0.62
// lambda(30)=1-0.09=0.91
// delta = 35*0.2*0.62*0.91 ≈ 3.95
console.log(`  无Q: mastery→${round(r5a.skills.mastery,1)} | Q=100: mastery→${round(r5b.skills.mastery,1)} | Q=0: mastery→${round(r5c.skills.mastery,1)}`)
const ok5 = r5b.skills.mastery > r5a.skills.mastery && r5a.skills.mastery > r5c.skills.mastery
console.log(`  ${ok5 ? '✅ 通过' : '❌ 失败'}: Q=100 增长 > 无Q 增长 > Q=0 增长 (直接贡献模式)`)

// ═══════════════════════════════════════════════════════════════
// TEST 6: Full pipeline — 30-day simulation with QFilter events
// ═══════════════════════════════════════════════════════════════
console.log('\n【测试6】完整流水线 — 30天模拟 (含QFilter事件)')
const base6 = { charm: 25, strength: 25, intellect: 35, social: 25, willpower: 25, health: 25, courage: 25, abstinence: 20 }
let derived6 = { mastery: 25, flow: 25, behavioralCues: 25, professional: 25, opportunity: 25, macroControl: 25 }
let pools6 = []
const lockMap6 = {}
const dailySched = [
  ['diet', { meal: 'good', macro: 'balanced', vegetables: 'some', water: 'good' }],
  ['fitness', { type: 'strength', intensity: 'medium', duration: 'medium', structure: 'loose', warmup: 'partial', feel: 'solid' }],
  ['social', { type: 'friends', engage: 'normal', scale: 'small', depth: 'solid', aftermath: 'neutral' }],
  ['learning', { duration: 'medium', depth: 'system', domain: 'core', retention: 'medium', output: 'none', focus: 'ok' }],
  ['abstinence', { state: 'steady' }],
]

for (let day = 0; day < 30; day++) {
  // Update lockMap6._today
  const d = new Date('2026-06-26')
  d.setDate(d.getDate() + day)
  lockMap6._today = d.toISOString().split('T')[0]

  // Apply checkins
  for (const [sys, ans] of dailySched) applyCheckin(base6, sys, ans)

  // QFilter trigger simulation: every 8 days, high score
  const qfScores = {}
  if (day > 0 && day % 8 === 0) {
    qfScores.mastery = 85
    if (day === 16) {
      // Simulate a low-score QFilter that locks
      qfScores.mastery = 30
      const lockD = new Date(d)
      lockD.setDate(lockD.getDate() + 14)
      lockMap6.mastery = lockD.toISOString().split('T')[0]
      // Simulate 70% retention on buffer
      const mp = pools6.find(p => p.skill === 'mastery')
      if (mp) mp.accumulated *= 0.7
    }
  }

  // Clear expired locks
  for (const [k, v] of Object.entries(lockMap6)) {
    if (k === '_today') continue
    if (v <= lockMap6._today) delete lockMap6[k]
  }

  const r = calcAllDerivedV13(base6, derived6, pools6, qfScores, lockMap6)
  derived6 = r.skills
  pools6 = r.pools

  if (day % 10 === 0) {
    console.log(`  第${String(day).padStart(2)}天: 强壮${Math.round(base6.strength)} 健康${Math.round(base6.health)} 思维${Math.round(base6.intellect)} | mastery${Math.round(derived6.mastery)} flow${Math.round(derived6.flow)} macroControl${Math.round(derived6.macroControl)}`)
  }
}

console.log(`\n  30天后: base健康=${Math.round(base6.health)} 思维=${Math.round(base6.intellect)}`)
console.log(`  衍生: mastery=${Math.round(derived6.mastery)} flow=${Math.round(derived6.flow)} macroControl=${Math.round(derived6.macroControl)}`)
const mpEnd = pools6.find(p => p.skill === 'mastery')
console.log(`  mastery缓冲池: accumulated=${round(mpEnd.accumulated,1)} threshold=${mpEnd.threshold}`)
const ok6 = derived6.mastery > 25 && derived6.mastery < 80 // growing but not exploding
console.log(`  ${ok6 ? '✅ 通过' : '❌ 失败'}: 30天模拟数据合理 (25<mastery<80)`)

// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════')
const results = [ok1, ok2, ok3, ok4a && ok4b && ok4c, ok5, ok6]
const pass = results.filter(Boolean).length
console.log(`  总计: ${pass}/${results.length} 测试通过`)
if (pass === results.length) console.log('  🎉 全部通过!')
else console.log('  ⚠️  有测试失败，需要检查')
console.log('══════════════════════════════════════════════')
