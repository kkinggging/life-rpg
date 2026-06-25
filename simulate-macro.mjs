// ============================================================
// v13 宏观仿真 — 技术验证 + 现实合理性分析
// Run: node simulate-macro.mjs
// ============================================================

const BASE_ATTRS = ['charm','strength','intellect','social','willpower','health','courage','abstinence']
const DERIVED = ['mastery','flow','behavioralCues','professional','opportunity','macroControl']
const ATTR_NAMES = { charm:'魅力', strength:'强壮', intellect:'思维', social:'社交能力', willpower:'坚定', health:'健康', courage:'勇气', abstinence:'禁欲' }
const SKILL_NAMES = { mastery:'熟练度', flow:'流动感', behavioralCues:'强行为线索', professional:'工作业务能力', opportunity:'机会捕捉能力', macroControl:'掌控感' }

function tierMultiplier(val) {
  if (val <= 60) return 1.0; if (val <= 80) return 0.6; if (val <= 95) return 0.25; return 0.1
}
function clamp(v) { return Math.max(-1.0, Math.min(1.0, v)) }
function round(v, d=1) { return Number(v.toFixed(d)) }
function r2(v) { return Number(v.toFixed(2)) }

// ---- SKILL_DEFS ----
const SKILL_DEFS = [
  { id:'mastery', tier:1, inputs:[{s:'intellect',w:4},{s:'social',w:3},{s:'health',w:2},{s:'charm',w:1}] },
  { id:'flow', tier:1, inputs:[{s:'charm',w:4},{s:'intellect',w:3},{s:'social',w:2},{s:'courage',w:1}] },
  { id:'behavioralCues', tier:1, inputs:[{s:'charm',w:3},{s:'courage',w:3},{s:'willpower',w:2},{s:'social',w:1},{s:'intellect',w:1}] },
  { id:'opportunity', tier:1, inputs:[{s:'intellect',w:5},{s:'charm',w:3},{s:'social',w:2}] },
  { id:'professional', tier:2, inputs:[{s:'mastery',w:4},{s:'flow',w:4},{s:'intellect',w:2}] },
  { id:'macroControl', tier:3, inputs:[{s:'abstinence',w:6},{s:'opportunity',w:1},{s:'behavioralCues',w:1},{s:'flow',w:1},{s:'mastery',w:1}] },
]

const CONVERGENCE_DAMPING = 0.30
const DEFAULT_Q_RATIO = 0.5

function calcGamma(K) { return 0.5 + 1/(1 + Math.exp(-(K-50)/10)) }
function calcLambda(S) { return 1 - Math.pow(S/100, 2) }

function getNextThreshold(val) {
  for (const b of [21, 41, 61, 81, 101]) if (val < b) return b
  return 101
}

// ---- 7:3 engine (matches math.ts v13) ----
function calcAllDerivedV13(base, derived, pools, qFilterScores, lockedUntilMap) {
  const values = { ...base, ...derived }
  const gamma = calcGamma(derived.macroControl ?? 25)
  const today = lockedUntilMap._today || '9999-99-99'
  const skills = {}
  const newPools = []

  for (const def of [...SKILL_DEFS].sort((a,b) => a.tier - b.tier)) {
    const sid = def.id
    const lockUntil = lockedUntilMap[sid]
    if (lockUntil && lockUntil > today) {
      const oldP = pools.find(p => p.skill === sid)
      skills[sid] = values[sid] ?? 0
      newPools.push({ skill: sid, accumulated: oldP?.accumulated ?? 0, threshold: getNextThreshold(values[sid]??0), lockedUntil: lockUntil })
      continue
    }
    let num = 0, den = 0
    for (const {s, w} of def.inputs) { num += (values[s]??0) * w; den += w }
    const weightedBase = den > 0 ? num / den : 0
    const qScore = qFilterScores[sid]
    const qEff = qScore !== undefined ? qScore : weightedBase * DEFAULT_Q_RATIO
    const contribution = 0.7 * weightedBase + 0.3 * qEff
    const current = values[sid] ?? 0
    const gap = contribution - current
    const delta = gap * CONVERGENCE_DAMPING * gamma * calcLambda(current)
    const newVal = Math.max(0, Math.min(100, Math.round((current + delta) * 10) / 10))
    skills[sid] = newVal
    values[sid] = newVal
    const oldP = pools.find(p => p.skill === sid)
    newPools.push({ skill: sid, accumulated: (oldP?.accumulated ?? 0) + Math.abs(delta), threshold: getNextThreshold(current), lockedUntil: oldP?.lockedUntil ?? null })
  }
  return { skills, pools: newPools }
}

// ---- Checkin deltas (copied from utils.ts) ----
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
    const multi = tierMultiplier(attr[k]??0)
    attr[k] = Math.max(0, Math.min(100, Math.round((attr[k] + cv * multi) * 10) / 10))
  }
}

// ============================================================
// Experimental Framework
// ============================================================

function runScenario(config) {
  const { name, base, derived, schedule, days, qfEvery, qfHighEvery, qfLockEvery } = config
  const attr = { ...base }
  let der = { ...derived }
  let pools = []
  const lockMap = { _today: '2026-06-26' }
  const history = []

  for (let d = 0; d < days; d++) {
    const today = new Date('2026-06-26')
    today.setDate(today.getDate() + d)
    lockMap._today = today.toISOString().split('T')[0]

    // Apply schedule
    for (const [sys, ans] of schedule) applyCheckin(attr, sys, ans)

    // QFilter simulation
    const qfScores = {}
    if (qfEvery && d > 0 && d % qfEvery === 0) {
      const skillIdx = d % DERIVED.length
      qfScores[DERIVED[skillIdx]] = 85
    }
    if (qfHighEvery && d > 0 && d % qfHighEvery === 0) {
      qfScores.mastery = 90
    }
    if (qfLockEvery && d > 0 && d % qfLockEvery === 0) {
      const lockD = new Date(today)
      lockD.setDate(lockD.getDate() + 14)
      lockMap.mastery = lockD.toISOString().split('T')[0]
      const mp = pools.find(p => p.skill === 'mastery')
      if (mp) mp.accumulated *= 0.7
    }

    // Clear expired locks
    for (const [k, v] of Object.entries(lockMap)) {
      if (k === '_today') continue
      if (v <= lockMap._today) delete lockMap[k]
    }

    const r = calcAllDerivedV13(attr, der, pools, qfScores, lockMap)
    der = r.skills
    pools = r.pools

    if (d % Math.max(1, Math.floor(days/10)) === 0) {
      history.push({ day: d, base: { ...attr }, derived: { ...der }, pools: [...pools] })
    }
  }
  history.push({ day: days, base: { ...attr }, derived: { ...der }, pools: [...pools] })

  return { name, attr, derived: der, pools, history }
}

const INIT_BASE = { charm: 25, strength: 25, intellect: 35, social: 25, willpower: 25, health: 25, courage: 25, abstinence: 20 }
const INIT_DER = { mastery: 25, flow: 25, behavioralCues: 25, professional: 25, opportunity: 25, macroControl: 25 }

const scenarios = [
  {
    name: '1A: 极简生活 (仅饮食+健身, 30天)', base: INIT_BASE, derived: INIT_DER,
    schedule: [
      ['diet', { meal:'good', macro:'balanced', vegetables:'some', water:'good' }],
      ['fitness', { type:'strength', intensity:'medium', duration:'medium', structure:'loose', warmup:'partial', feel:'solid' }],
    ], days: 30,
  },
  {
    name: '1B: 极简生活 (仅饮食+健身, 180天)', base: INIT_BASE, derived: INIT_DER,
    schedule: [
      ['diet', { meal:'good', macro:'balanced', vegetables:'some', water:'good' }],
      ['fitness', { type:'strength', intensity:'medium', duration:'medium', structure:'loose', warmup:'partial', feel:'solid' }],
    ], days: 180,
  },
  {
    name: '2A: 全体系·中等质量 (5次/天, 90天)', base: INIT_BASE, derived: INIT_DER,
    schedule: [
      ['diet', { meal:'good', macro:'balanced', vegetables:'some', water:'good' }],
      ['fitness', { type:'strength', intensity:'medium', duration:'medium', structure:'loose', warmup:'partial', feel:'solid' }],
      ['social', { type:'friends', engage:'normal', scale:'small', depth:'solid', aftermath:'neutral' }],
      ['learning', { duration:'medium', depth:'system', domain:'core', retention:'medium', output:'none', focus:'ok' }],
      ['abstinence', { state:'steady' }],
    ], days: 90,
  },
  {
    name: '2B: 全体系·高质量 (5次/天, 90天)', base: INIT_BASE, derived: INIT_DER,
    schedule: [
      ['diet', { meal:'excellent', macro:'balanced', vegetables:'plenty', water:'over' }],
      ['fitness', { type:'strength', intensity:'hard', duration:'long', structure:'planned', warmup:'full', feel:'peak' }],
      ['social', { type:'approach', venue:'medium', opener:'direct', rating:'mid', result:'good', state:'3', feeling:'good' }],
      ['learning', { duration:'long', depth:'deep', domain:'core', retention:'high', output:'created', focus:'deep' }],
      ['abstinence', { state:'alternative', altType:'exercise', altEase:'easy', altEffect:'charged' }],
    ], days: 90,
  },
  {
    name: '2C: 全体系·低质量 (5次/天, 90天)', base: INIT_BASE, derived: INIT_DER,
    schedule: [
      ['diet', { meal:'skip', macro:'unhealthy', vegetables:'none', water:'low' }],
      ['fitness', { type:'rest', restQuality:'bad', activeRecovery:'no', restNutrition:'bad' }],
      ['social', { type:'none' }],
      ['learning', { duration:'none', whyNot:'lazy' }],
      ['abstinence', { state:'relapse', streak:'short', recovery:'spiral' }],
    ], days: 90,
  },
  {
    name: '3A: 波动生活·好周坏周 (180天)', base: INIT_BASE, derived: INIT_DER,
    schedule: [], days: 180, // dynamic below
  },
  {
    name: '3B: 波动+QFilter (180天·每8天高质量QFilter)', base: INIT_BASE, derived: INIT_DER,
    schedule: [], days: 180, qfEvery: 8, qfLockEvery: 24,
  },
  {
    name: '4A: 长期完美·1年 (365天)', base: INIT_BASE, derived: INIT_DER,
    schedule: [
      ['diet', { meal:'excellent', macro:'balanced', vegetables:'plenty', water:'over' }],
      ['fitness', { type:'strength', intensity:'hard', duration:'long', structure:'planned', warmup:'full', feel:'peak' }],
      ['social', { type:'approach', venue:'medium', opener:'direct', rating:'mid', result:'number', state:'3', feeling:'good' }],
      ['learning', { duration:'long', depth:'deep', domain:'core', retention:'high', output:'created', focus:'deep' }],
      ['abstinence', { state:'alternative', altType:'exercise', altEase:'easy', altEffect:'charged' }],
    ], days: 365, qfHighEvery: 10,
  },
  {
    name: '4B: 长期混合·1年 (365天·中+QFilter)', base: INIT_BASE, derived: INIT_DER,
    schedule: [
      ['diet', { meal:'good', macro:'balanced', vegetables:'some', water:'good' }],
      ['fitness', { type:'strength', intensity:'medium', duration:'medium', structure:'planned', warmup:'partial', feel:'solid' }],
      ['social', { type:'friends', engage:'active', scale:'small', depth:'solid', aftermath:'neutral' }],
      ['learning', { duration:'medium', depth:'system', domain:'core', retention:'medium', output:'mapped', focus:'ok' }],
      ['abstinence', { state:'steady' }],
    ], days: 365, qfEvery: 15,
  },
]

// Dynamic schedule for 3A/3B
const goodWeek = [
  ['diet', { meal:'excellent', macro:'balanced', vegetables:'plenty', water:'over' }],
  ['fitness', { type:'strength', intensity:'hard', duration:'long', structure:'planned', warmup:'full', feel:'peak' }],
  ['social', { type:'approach', venue:'medium', opener:'direct', rating:'mid', result:'good', state:'2', feeling:'good' }],
  ['learning', { duration:'long', depth:'deep', domain:'core', retention:'high', output:'created', focus:'deep' }],
  ['abstinence', { state:'alternative', altType:'study', altEase:'easy', altEffect:'charged' }],
]
const badWeek = [
  ['diet', { meal:'skip', macro:'unhealthy', vegetables:'none', water:'low' }],
  ['fitness', { type:'rest', restQuality:'bad', activeRecovery:'no', restNutrition:'bad' }],
  ['social', { type:'none' }],
  ['learning', { duration:'none', whyNot:'lazy' }],
  ['abstinence', { state:'relapse', trigger:'night', streak:'days', recovery:'moveon' }],
]
for (const sc of scenarios) {
  if (sc.name.includes('3A')) {
    for (let d = 0; d < sc.days; d++) {
      const week = Math.floor(d / 7)
      sc.schedule.push(...(week % 2 === 0 ? goodWeek : badWeek))
    }
  }
  if (sc.name.includes('3B')) {
    for (let d = 0; d < sc.days; d++) {
      const week = Math.floor(d / 7)
      sc.schedule.push(...(week % 2 === 0 ? goodWeek : badWeek))
    }
  }
}

console.log('══════════════════════════════════════════════')
console.log('  v13 宏观仿真 — 技术全功能 + 现实合理性')
console.log('══════════════════════════════════════════════\n')

// ============================================================
// Phase 1: Technical verification
// ============================================================
console.log('─── 第一阶段：技术实现验证 ───\n')

const allResults = []
for (const sc of scenarios) {
  const r = runScenario(sc)
  allResults.push(r)

  if (sc.days <= 90) {
    const end = r.attr
    console.log(`【${sc.name}】`)
    for (const k of BASE_ATTRS) {
      console.log(`  ${ATTR_NAMES[k]} ${r2(sc.base[k])}→${r2(end[k])} (+${r2(end[k]-sc.base[k])})`)
    }
    console.log(`  衍生: ${DERIVED.map(k => `${SKILL_NAMES[k]}${r2(r.derived[k])}`).join(' ')}`)
    const gamma = calcGamma(r.derived.macroControl)
    console.log(`  γ掌控=${r2(gamma)}  pools:${r.pools.map(p=>`${p.skill.slice(0,3)}:${r2(p.accumulated)}${p.lockedUntil?'🔒':''}`).join(' ')}`)
    console.log()
  }
}

// ============================================================
// Phase 2: Milestone crossing analysis
// ============================================================
console.log('─── 第二阶段：里程碑跨越分析 ───\n')

const milestones = [41, 60, 80, 95]
const milestoneLabels = ['阶梯2(日常爱好者)', '阶梯3(专项践行者)', '阶梯4(精英掌控层)', '阶梯5(绝对主宰层)']

// Track milestone crosses for each long-term scenario
const longScenarios = allResults.filter(r => r.name.includes('3') || r.name.includes('4'))

for (const sc of longScenarios) {
  console.log(`【${sc.name}】`)
  // Find first day each attribute crossed each milestone
  for (const k of BASE_ATTRS) {
    const crosses = []
    const startVal = sc.name.includes('1A') ? INIT_BASE[k] : INIT_BASE[k]
    const endVal = sc.attr[k]
    if (endVal - startVal < 20) continue
    for (const m of milestones) {
      if (endVal >= m) {
        // Estimate days to m (linear interpolation of last seen value)
        const lastPoint = sc.history[sc.history.length - 1]
        for (const h of sc.history) {
          if (h.base[k] >= m) {
            crosses.push(`${m}@${h.day}d`)
            break
          }
        }
      }
    }
    if (crosses.length > 0) console.log(`  ${ATTR_NAMES[k]} ${r2(startVal)}→${r2(endVal)}: ${crosses.join(' ')}`)
  }
  console.log()
}

// ============================================================
// Phase 3: Growth balance analysis
// ============================================================
console.log('─── 第三阶段：增长均衡性分析 ───\n')

const all90d = allResults.filter(r => r.name.includes('90天') || r.name.includes('2'))
console.log('90天横向对比 (各属性增长):')
console.log('  场景'.padEnd(30) + BASE_ATTRS.map(k => ATTR_NAMES[k].padStart(6)).join(''))

for (const sc of all90d) {
  const label = sc.name.replace(/.*\((.*)\)/,'$1').padEnd(30)
  const gains = BASE_ATTRS.map(k => {
    const g = r2(sc.attr[k] - INIT_BASE[k], 1)
    return String(g).padStart(6)
  }).join('')
  console.log(`  ${label}${gains}`)
}

// ============================================================
// Phase 4: QFilter effectiveness
// ============================================================
console.log('\n─── 第四阶段：QFilter 效应分析 ───\n')

const qfScenarios = [
  allResults.find(r => r.name.includes('3A')), // no QFilter
  allResults.find(r => r.name.includes('3B')), // with QFilter
]
if (qfScenarios.every(Boolean)) {
  const [noQf, qf] = qfScenarios
  console.log('有/无QFilter的180天对比:')
  for (const k of DERIVED) {
    const vNo = r2(noQf.derived[k], 1)
    const vQf = r2(qf.derived[k], 1)
    const diff = r2(vQf - vNo, 1)
    console.log(`  ${SKILL_NAMES[k].padEnd(10)} 无Q:${vNo} 有Q:${vQf} Δ:${diff > 0 ? '+' + diff : diff}`)
  }
  const mPoolNo = noQf.pools.find(p => p.skill === 'mastery')
  const mPoolQf = qf.pools.find(p => p.skill === 'mastery')
  console.log(`  mastery缓冲池 无Q累计:${r2(mPoolNo?.accumulated??0,1)} 有Q累计:${r2(mPoolQf?.accumulated??0,1)}`)
}

// ============================================================
// Phase 5: Long-term realism
// ============================================================
console.log('\n─── 第五阶段：长期现实对标 ───\n')

const long = allResults.find(r => r.name.includes('4B')) // 1 year mixed
if (long) {
  const end = long.attr
  const der = long.derived
  const gamma = calcGamma(der.macroControl)

  console.log(`【1年混合生活 (中质量+每15天QFilter)】`)
  console.log(`  基础属性:`)
  for (const k of BASE_ATTRS) {
    const v = Math.round(end[k])
    const tier = v <= 20 ? 1 : v <= 40 ? 2 : v <= 60 ? 3 : v <= 80 ? 4 : 5
    console.log(`    ${ATTR_NAMES[k]} ${INIT_BASE[k]}→${v} (阶梯${tier})`)
  }
  console.log(`  衍生技能: ${DERIVED.map(k=>`${SKILL_NAMES[k]}${Math.round(der[k])}`).join(' ')}`)
  console.log(`  γ(掌控)=${r2(gamma)}`)

  const perf = allResults.find(r => r.name.includes('4A'))
  if (perf) {
    console.log(`\n【1年完美生活 (高质量+每10天QFilter)】`)
    for (const k of BASE_ATTRS) {
      const v = Math.round(perf.attr[k])
      const tier = v <= 20 ? 1 : v <= 40 ? 2 : v <= 60 ? 3 : v <= 80 ? 4 : 5
      console.log(`    ${ATTR_NAMES[k]} ${INIT_BASE[k]}→${v} (阶梯${tier})`)
    }
    const pder = perf.derived
    console.log(`  衍生技能: ${DERIVED.map(k=>`${SKILL_NAMES[k]}${Math.round(pder[k])}`).join(' ')}`)
    const pgamma = calcGamma(pder.macroControl)
    console.log(`  γ(掌控)=${r2(pgamma)}`)
  }
}

// ============================================================
// Phase 6: Edge cases
// ============================================================
console.log('\n─── 第六阶段：边界与安全性 ──\n')

// Test: Never goes below 0
const zeroTest = { ...INIT_BASE }
for (let i = 0; i < 100; i++) {
  applyCheckin(zeroTest, 'diet', { meal:'bad', macro:'unhealthy', vegetables:'none', water:'bad' })
  applyCheckin(zeroTest, 'abstinence', { state:'relapse', streak:'week', recovery:'spiral' })
}
const allAboveZero = Object.values(zeroTest).every(v => v >= 0)
const lowest = Math.min(...Object.values(zeroTest))
console.log(`地板保护: 100天全负面打卡, 最低值=${r2(lowest)}, 全≥0=${allAboveZero}`)

// Test: tiers kick in at boundaries
const tierTest = [60, 61, 80, 81, 95, 96]
console.log('分段倍率测试:')
for (const v of tierTest) {
  console.log(`  tierMultiplier(${v})=${tierMultiplier(v)} (≤60→1.0, ≤80→0.6, ≤95→0.25, >95→0.1)`)
}

// Test: gamma curve
console.log('\ngamma(K) Sigmoid 测试:')
for (const k of [0, 25, 50, 75, 100]) {
  console.log(`  gamma(${k}) = ${r2(calcGamma(k))}`)
}

// Test: lambda curve
console.log('\nlambda(S) 饱和度测试:')
for (const s of [0, 30, 50, 80, 95, 99]) {
  console.log(`  lambda(${s}) = ${r2(calcLambda(s))}`)
}

// Test: calendar day matching
console.log('\n日历天数匹配检验:')
const oneYear = 365
const recoverDays = allResults.find(r => r.name.includes('4B'))
const rec60 = BASE_ATTRS.filter(k => recoverDays?.attr[k] >= 60).length
const rec80 = BASE_ATTRS.filter(k => recoverDays?.attr[k] >= 80).length
console.log(`  1年混合生活: ${rec60}/8属性≥60, ${rec80}/8属性≥80`)

const perf60 = allResults.find(r => r.name.includes('4A'))
const p60 = BASE_ATTRS.filter(k => perf60?.attr[k] >= 60).length
const p80 = BASE_ATTRS.filter(k => perf60?.attr[k] >= 80).length
const p95 = BASE_ATTRS.filter(k => perf60?.attr[k] >= 95).length
console.log(`  1年完美生活: ${p60}/8属性≥60, ${p80}/8属性≥80, ${p95}/8属性≥95`)

console.log('\n══════════════════════════════════════════════')
console.log('  仿真完成')
console.log('══════════════════════════════════════════════')
