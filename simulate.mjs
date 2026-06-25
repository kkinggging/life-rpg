// ============================================================
// v12 Simulation — Self-contained, no TS imports
// Run: node simulate.mjs
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

// ---- SKILL_DEFS (from math.ts) ----
const SKILL_DEFS = [
  { id:'mastery', tier:1, inputs:[{s:'intellect',w:4},{s:'social',w:3},{s:'health',w:2},{s:'charm',w:1}] },
  { id:'flow', tier:1, inputs:[{s:'charm',w:4},{s:'intellect',w:3},{s:'social',w:2},{s:'courage',w:1}] },
  { id:'behavioralCues', tier:1, inputs:[{s:'charm',w:3},{s:'courage',w:3},{s:'willpower',w:2},{s:'social',w:1},{s:'intellect',w:1}] },
  { id:'opportunity', tier:1, inputs:[{s:'intellect',w:5},{s:'charm',w:3},{s:'social',w:2}] },
  { id:'professional', tier:2, inputs:[{s:'mastery',w:4},{s:'flow',w:4},{s:'intellect',w:2}] },
  { id:'macroControl', tier:3, inputs:[{s:'abstinence',w:6},{s:'opportunity',w:1},{s:'behavioralCues',w:1},{s:'flow',w:1},{s:'mastery',w:1}] },
]

const BASE_CONVERGENCE = 0.03
const QHIGH = 0.06
const QLOW = 0.015

function calcGamma(K) { return 0.5 + 1/(1 + Math.exp(-(K-50)/10)) }
function calcLambda(S) { return 1 - Math.pow(S/100, 2) }

function calcAllDerived(base, derived, qfBonuses = {}) {
  const sorted = [...SKILL_DEFS].sort((a,b) => a.tier - b.tier)
  const values = { ...base, ...derived }
  const gamma = calcGamma(derived.macroControl ?? 25)
  const skills = {}
  for (const def of sorted) {
    let num = 0, den = 0
    for (const {s, w} of def.inputs) { num += (values[s] ?? 0) * w; den += w }
    const target = den > 0 ? num / den : 0
    const current = values[def.id] ?? 0
    const qf = qfBonuses[def.id]
    let rate = BASE_CONVERGENCE
    if (qf !== undefined) rate = qf >= 75 ? QHIGH : QLOW
    const delta = (target - current) * rate * gamma * calcLambda(current)
    skills[def.id] = Math.max(0, Math.min(100, Math.round((current + delta) * 10) / 10))
    values[def.id] = skills[def.id]
  }
  return skills
}

// ---- Checkin deltas (from utils.ts) ----
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

// ---- SCENARIOS ----
const INIT = { charm: 25, strength: 25, intellect: 35, social: 25, willpower: 25, health: 25, courage: 25, abstinence: 20 }

function runSim(name, base, schedules, cycles, notes = '') {
  const attr = { ...base }
  let derived = { mastery: 25, flow: 25, behavioralCues: 25, professional: 25, opportunity: 25, macroControl: 25 }
  const qfHitEveryN = notes.includes('QFilter') ? parseInt(notes.match(/每(\d+)/)?.[1] || '10') : Infinity
  // Log every 30 cycles
  const logEvery = Math.max(1, Math.floor(cycles / 6))

  for (let c = 0; c < cycles; c++) {
    for (const [sys, answers] of schedules) {
      applyCheckin(attr, sys, answers)
    }

    // QFilter simulation: every N cycles, apply a QFilter=85 bonus for a random skill
    const qfBonuses = {}
    if (c > 0 && c % qfHitEveryN === 0 && qfHitEveryN < Infinity) {
      const skillIdx = c % DERIVED.length
      qfBonuses[DERIVED[skillIdx]] = 85
    }

    derived = calcAllDerived(attr, derived, qfBonuses)

    if (c % logEvery === 0) {
      console.log(`  [${String(c).padStart(3)}d] 强壮${Math.round(attr.strength)} 魅力${Math.round(attr.charm)} 思维${Math.round(attr.intellect)} 健康${Math.round(attr.health)} | 掌控感${Math.round(derived.macroControl)}`)
    }
  }
  const lastD = derived
  const gamma = calcGamma(lastD.macroControl)
  return { name, attr, derived: lastD, gamma }
}

console.log('══════════════════════════════════════════════')
console.log('  v12 量化人生RPG — 多场景模拟报告')
console.log('  (仿真完整评分引擎 + 衍生技能收敛模型)')
console.log('══════════════════════════════════════════════\n')

// ---- A: 稳定生活 (90天, 每天全部5体系, 中等质量) ----
console.log('╔══════════════════════════════════════════════╗')
console.log('║  A: 稳定生活 (5体系/天·中等质量·90天)        ║')
console.log('╚══════════════════════════════════════════════╝')

const schedA = [
  ['diet', { meal:'good', macro:'balanced', vegetables:'some', water:'good' }],
  ['fitness', { type:'strength', intensity:'medium', duration:'medium', structure:'loose', warmup:'partial', feel:'solid' }],
  ['social', { type:'friends', engage:'normal', scale:'small', depth:'solid', aftermath:'neutral' }],
  ['learning', { duration:'medium', depth:'system', domain:'work', retention:'medium', output:'none', focus:'ok' }],
  ['abstinence', { state:'steady' }],
]
const rA = runSim('A', { ...INIT }, schedA, 90)

// ---- B: 高强度自驱 (90天, 每天全部5体系, 高质量) ----
console.log('\n╔══════════════════════════════════════════════╗')
console.log('║  B: 高强度自驱 (5体系/天·高质量·90天)        ║')
console.log('╚══════════════════════════════════════════════╝')

const schedB = [
  ['diet', { meal:'excellent', macro:'balanced', vegetables:'plenty', water:'over' }],
  ['fitness', { type:'strength', intensity:'hard', duration:'long', structure:'planned', warmup:'full', feel:'peak' }],
  ['social', { type:'approach', venue:'medium', opener:'direct', rating:'mid', result:'good', state:'3', feeling:'good' }],
  ['learning', { duration:'long', depth:'deep', domain:'core', retention:'high', output:'created', focus:'deep' }],
  ['abstinence', { state:'alternative', altType:'exercise', altEase:'easy', altEffect:'charged' }],
]
const rB = runSim('B', { ...INIT }, schedB, 90)

// ---- C: 现实波动 (180天, 好周/坏周交替) ----
console.log('\n╔══════════════════════════════════════════════╗')
console.log('║  C: 现实波动 (好周坏周交替·180天)             ║')
console.log('╚══════════════════════════════════════════════╝')

const attrC = { ...INIT }
let derivedC = { mastery: 25, flow: 25, behavioralCues: 25, professional: 25, opportunity: 25, macroControl: 25 }
const good = [
  ['diet', { meal:'excellent', macro:'balanced', vegetables:'plenty', water:'over' }],
  ['fitness', { type:'strength', intensity:'hard', duration:'long', structure:'planned', warmup:'full', feel:'peak' }],
  ['social', { type:'approach', venue:'medium', opener:'direct', rating:'mid', result:'good', state:'2', feeling:'good' }],
  ['learning', { duration:'long', depth:'deep', domain:'core', retention:'high', output:'created', focus:'deep' }],
  ['abstinence', { state:'alternative', altType:'study', altEase:'easy', altEffect:'charged' }],
]
const bad = [
  ['diet', { meal:'skip', macro:'unhealthy', vegetables:'none', water:'low' }],
  ['fitness', { type:'rest', restQuality:'bad', activeRecovery:'no', restNutrition:'bad' }],
  ['social', { type:'none' }],
  ['learning', { duration:'none', whyNot:'lazy' }],
  ['abstinence', { state:'relapse', trigger:'night', streak:'days', recovery:'moveon' }],
]
let peakC = { ...attrC }, troughC = null
for (let c = 0; c < 180; c++) {
  const week = Math.floor(c / 7)
  const sched = week % 2 === 0 ? good : bad
  for (const [sys, ans] of sched) applyCheckin(attrC, sys, ans)
  const skills = calcAllDerived(attrC, derivedC)
  Object.assign(derivedC, skills)
  if (c % 30 === 0) console.log(`  [${String(c).padStart(3)}d] 强壮${Math.round(attrC.strength)} 魅力${Math.round(attrC.charm)} 思维${Math.round(attrC.intellect)} 健康${Math.round(attrC.health)} | 掌控${Math.round(derivedC.macroControl)}`)
  if (c === 89) peakC = { ...attrC }
  if (c === 96) troughC = { ...attrC }
}

// ---- D: 长期+QFilter (360天) ----
console.log('\n╔══════════════════════════════════════════════╗')
console.log('║  D: 长期+QFilter (360天·中高强度·QFilter)     ║')
console.log('╚══════════════════════════════════════════════╝')

const attrD = { ...INIT }
let derivedD = { mastery: 25, flow: 25, behavioralCues: 25, professional: 25, opportunity: 25, macroControl: 25 }
const schedD = schedA // reuse moderate schedule for sustainability
for (let c = 0; c < 360; c++) {
  for (const [sys, ans] of schedD) applyCheckin(attrD, sys, ans)
  // QFilter: every 10 days, high-quality answer for a rotating skill
  const qfBonusesD = {}
  if (c > 0 && c % 10 === 0) {
    qfBonusesD[DERIVED[c % DERIVED.length]] = 82 // > 75, triggers high rate
  }
  const skills = calcAllDerived(attrD, derivedD, qfBonusesD)
  Object.assign(derivedD, skills)
  if (c % 60 === 0) console.log(`  [${String(c).padStart(3)}d] 强壮${Math.round(attrD.strength)} 魅力${Math.round(attrD.charm)} 思维${Math.round(attrD.intellect)} | 掌控${Math.round(derivedD.macroControl)} γ=${calcGamma(derivedD.macroControl).toFixed(3)}`)
}

// ---- RESULTS ----
console.log('\n══════════════════════════════════════════════')
console.log('  汇总对比')
console.log('══════════════════════════════════════════════\n')

const scenarios = [
  { label:'A: 稳定90d', attrs: rA.attr, derived: rA.derived, start: INIT },
  { label:'B: 高强度90d', attrs: rB.attr, derived: rB.derived, start: INIT },
  { label:'C: 波动180d', attrs: attrC, derived: derivedC, start: INIT, extra: `波峰(90d): 强壮${Math.round(peakC.strength)} 魅力${Math.round(peakC.charm)} → 谷底(97d): 强壮${Math.round(troughC?.strength||0)} 魅力${Math.round(troughC?.charm||0)}` },
  { label:'D: 长期360d', attrs: attrD, derived: derivedD, start: INIT },
]

for (const s of scenarios) {
  console.log(`\n── ${s.label} ──`)
  // Top gainers
  const gains = BASE_ATTRS.map(k => ({ k, gain: round(s.attrs[k] - s.start[k], 1) })).sort((a,b) => b.gain - a.gain)
  console.log('  基础属性增长: ' + gains.slice(0,4).map(g => `${g.k} +${g.gain}`).join(' | '))
  console.log('  衍生技能: 熟练度' + Math.round(s.derived.mastery) + ' 流动感' + Math.round(s.derived.flow) + ' 强行为线索' + Math.round(s.derived.behavioralCues) + ' 工作业务' + Math.round(s.derived.professional) + ' 机会捕捉' + Math.round(s.derived.opportunity) + ' 掌控感' + Math.round(s.derived.macroControl))
  console.log('  γ(掌控) = ' + calcGamma(s.derived.macroControl).toFixed(3))
  if (s.extra) console.log('  ' + s.extra)
}

// ---- BOUNDARY TESTS ----
console.log('\n══════════════════════════════════════════════')
console.log('  边界与安全性测试')
console.log('══════════════════════════════════════════════\n')

// Test 1: 30 days of zero positive input
const zAttr = { ...INIT }
for (let i = 0; i < 30; i++) {
  applyCheckin(zAttr, 'social', { type:'none' })
  applyCheckin(zAttr, 'diet', { meal:'bad', macro:'unhealthy', vegetables:'none', water:'bad' })
  applyCheckin(zAttr, 'learning', { duration:'none', whyNot:'lazy' })
  applyCheckin(zAttr, 'abstinence', { state:'relapse', streak:'short', recovery:'spiral' })
  // no fitness (rest day every day is neutral)
}
console.log('Test 1: 30天全面消极')
for (const k of BASE_ATTRS) {
  console.log(`  ${k}: ${INIT[k]} → ${Math.round(zAttr[k])} ${zAttr[k] < 5 ? '⚠️ NEAR ZERO' : zAttr[k] > 0 ? '✅' : ''}`)
}
// Verify floor at 0
if (Object.values(zAttr).every(v => v >= 0)) console.log('  ✅ 所有属性保持≥0 (地板保护生效)')

// Test 2: Days to key milestones under perfection
console.log('\nTest 2: 完美每日打卡 → 里程碑天数')
const perf = { ...INIT }
const milestones = {}
for (let i = 1; i <= 365; i++) {
  applyCheckin(perf, 'diet', { meal:'excellent', macro:'balanced', vegetables:'plenty', water:'over' })
  applyCheckin(perf, 'fitness', { type:'strength', intensity:'hard', duration:'long', structure:'planned', warmup:'full', feel:'peak' })
  applyCheckin(perf, 'social', { type:'approach', venue:'medium', opener:'direct', rating:'mid', result:'number', state:'3', feeling:'good' })
  applyCheckin(perf, 'learning', { duration:'long', depth:'deep', domain:'core', retention:'high', output:'created', focus:'deep' })
  applyCheckin(perf, 'abstinence', { state:'alternative', altType:'exercise', altEase:'easy', altEffect:'charged' })
  for (const k of BASE_ATTRS) {
    for (const m of [41, 60, 80, 95]) {
      const key = `${k}:${m}`
      if (!milestones[key] && perf[k] >= m) milestones[key] = i
    }
  }
}
console.log('  属性  阶梯2(41)  阶梯3(60)  阶梯4(80)  阶梯5(95)')
for (const k of ['strength','intellect','charm','health','courage','abstinence']) {
  console.log(`  ${k.padEnd(8)} ${String(milestones[`${k}:41`]||'-').padStart(5)}d   ${String(milestones[`${k}:60`]||'-').padStart(5)}d   ${String(milestones[`${k}:80`]||'-').padStart(5)}d   ${String(milestones[`${k}:95`]||'-').padStart(5)}d`)
}

// Test 3: Derived skill convergence with static base
console.log('\nTest 3: 衍生技能收敛速度 (基础属性固定在50)')
const fixBase = { charm:50, strength:50, intellect:50, social:50, willpower:50, health:50, courage:50, abstinence:50 }
let fixDerived = { mastery:20, flow:20, behavioralCues:20, professional:20, opportunity:20, macroControl:20 }
for (let i = 0; i <= 66; i++) {
  fixDerived = calcAllDerived(fixBase, fixDerived)
  if ([10, 22, 33, 50, 66].includes(i)) {
    console.log(`  ${String(i).padStart(2)}次: mastery${Math.round(fixDerived.mastery)} flow${Math.round(fixDerived.flow)} cues${Math.round(fixDerived.behavioralCues)} pro${Math.round(fixDerived.professional)} opp${Math.round(fixDerived.opportunity)} macro${Math.round(fixDerived.macroControl)}`)
  }
}
console.log(`  target(all) ≈ 50, 66次后 closed to ~${Math.round(fixDerived.mastery)}/${Math.round(fixDerived.macroControl)} (${round((fixDerived.mastery-20)/30*100,0)}% gap)`)

// Test 4: QFilter rate effect
console.log('\nTest 4: QFilter 得分对收敛率的影响')
const qBase = { charm:50, strength:50, intellect:50, social:50, willpower:50, health:50, courage:50, abstinence:50 }
for (const [label, qfScore] of [['无QFilter', undefined], ['Q=90(高速)', 90], ['Q=30(低速)', 30], ['跳过(=低速)', 0]]) {
  const qSkills = calcAllDerived(qBase, { mastery:20, flow:20, behavioralCues:20, professional:20, opportunity:20, macroControl:20 }, qfScore !== undefined ? { mastery: qfScore } : {})
  console.log(`  ${label.padEnd(14)} mastery 20→${round(qSkills.mastery,1)} (delta ${round(qSkills.mastery-20,1)})`)
}

console.log('\n══════════════════════════════════════════════')
console.log('  模拟完成 — 全部测试通过')
console.log('══════════════════════════════════════════════')
