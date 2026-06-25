# v12 缺失功能深度分析与改进方案

> 生成日期: 2026-06-26  
> 基于: generate.md / tech-spec.md / v12 源码  
> 目的: 逐项回溯原始需求, 分析当前实现差距, 给出明确改进路径

---

## 零、总览

| # | 缺失项 | 严重度 | 根因 | 改进方向 |
|---|--------|--------|------|---------|
| 1 | 7:3 公式 → 收敛模型 | ⚠️ 架构偏差 | v6 写 math.ts 时选了更简单的模型 | 恢复 7:3 公式, 收敛模型作为第二阶段补充 |
| 2 | QFilter 缓冲池触发 | ❌ 缺失 | store.tsx 直接用了 20% 平摊概率 | 实现 bufferPool → 80%阈值 → 40%条件触发 |
| 3 | QFilter 释放/锁定 | ❌ 缺失 | 收敛模型下没有"释放"的概念 | 与#1联动: 7:3 公式天然需要此机制 |
| 4 | 百分位校准 | ❌ 缺失 | Calibration.tsx 存在但从未被调用(首次启动判定条件有 bug) | 修复首次启动判定 + 接入校准流程 |
| 5 | 14天黑盒 | ⏸ Phase2 | spec 自身推迟 | 先设计数据结构, 后续接入 |
| 6 | 季度方差+盲测 | ⏸ Phase3 | spec 自身推迟 | 同上 |

---

## 一、7:3 双引擎公式 → 收敛模型（架构偏差分析）

### 1.1 原始需求 (generate.md L9-44, tech-spec §4.2)

```
generate.md L15:
  ΔS_j = [0.7 · B̄_j + 0.3 · Q_filter] · γ(K) · λ(S_j)

generate.md L40-44 (过渡筛选机制):
  打卡 → 暂存缓冲区 → 累积达晋级阈值80% → 40%概率弹窗提问
  → Q_filter ≥ 75 → 缓冲区100%释放
  → Q_filter < 75 → 缓冲区留存70%+锁定
```

**原始模型的核心设计意图（generate.md L261）：**

> "本身分数增加代表实际增加量占大比重7，主观想法占3"  
> "运动员会了技巧但是还是需要主观去接触思考理论层面的整合才能质变"

关键点：**7:3 是一个直接贡献比例**，不是速率调节系数。B̄_j（基础打卡的加权分数）直接贡献 70%，Q_filter（心理体感提问）直接贡献 30%。

### 1.2 当前实现 (math.ts v6-v12)

```javascript
// math.ts 当前实现
const target = calcWeightedBase(def.inputs, state, values)  // B̄_j
const current = state.derivedSkills[sid] ?? 0
const gap = target - current
const delta = gap * rate * gamma * lambda
// rate = 0.03 (default) / 0.06 (Q≥75) / 0.015 (Q<75)
```

当前模型把 QFilter 变成了**速率调节器**而非**直接贡献者**。同时引入了"目标跟踪"概念——衍生技能向 target 缓慢收敛。

### 1.3 两个模型的本质差异

| 维度 | spec 7:3 公式 | v12 收敛模型 |
|------|-------------|------------|
| B̄_j 的角色 | 70% 直接贡献 | 作为 target，技能向其靠拢 |
| QFilter 的角色 | 30% 直接贡献 | 调节收敛速率 |
| 增长模式 | 每周期独立增量 | 持续向 target 收敛 |
| 缓冲池的意义 | 暂存→达到条件→释放→清空 | 不存在（速率模型不需要缓冲池） |
| 锁定机制的意义 | 低分锁定阻止下次增长 | 不存在 |
| γ(K) 的作用 | 放大/缩小总增量 | 同 |
| λ(S) 的作用 | 饱和度限速 | 同 |

### 1.4 为什么当初改了

v5→v6 时 math.ts 被重写，注释写的是"衍生技能不再直接等于加权平均，改用目标跟踪收敛模型...模拟'现实整合滞后于基础能力'"。

动机正确（需要滞后），但方法是把"婴儿和洗澡水一起倒了"——丢弃了 7:3 的直接贡献语义，同时丢弃了缓冲池/释放/锁定的整套过渡筛选机制。

### 1.5 改进方案：融合而非替换

**不推翻收敛模型**（它解决了"滞后"问题），但把 7:3 公式叠加进收敛框架中：

```
新模型（融合方案）:

Step 1: 计算加权基础分 B̄_j（同现在）
Step 2: 检查缓冲池 → 决定 QFilter 是否触发 → 得分 Q
Step 3: 计算 ΔS_j:
  - 无 QFilter 触发:  ΔS_j = 0.85 · B̄_j · γ(K) · λ(S_j)
    （理由: Q_filter = B̄_j × 0.5 代入 7:3 → 0.7+0.3×0.5=0.85）
  - QFilter ≥ 75:     ΔS_j = 1.00 · B̄_j · γ(K) · λ(S_j)
    （理由: 100% 释放 → Q = B̄_j → 0.7+0.3×1.0=1.00）
  - QFilter < 75:      ΔS_j = 0.70 · (B̄_j) · γ(K) · λ(S_j)
    （理由: 70% 留存 → 实际贡献为 70% × 平衡值）
  - 缓冲池锁定:        ΔS_j = 0（触发但低分 → 70% 留存 + 锁定）
  - 收敛速率:          ΔS_j 不直接加，而是 (B̄_j - S_j_current) × 修正系数
                     修正系数 = ΔS_j / B̄_j （即上述 0.85/1.00/0.70）
```

**关键改变：** B̄_j 重新作为直接贡献者（恢复 7:3 语义），但引入**收敛阻尼因子**让技能不跳跃到 target，而是每次移动 target 距离的 0.7-1.0×，配合 γ(K)·λ(S_j) 限速。

---

## 二、QFilter 缓冲池触发机制

### 2.1 原始需求 (generate.md L42-43, tech-spec §5.1-5.2)

```
generate.md L42-43:
  分值转化缓冲池：日常打卡产生的数值首先进入"暂存缓冲区"。
  随机触发概率：当缓冲区数值累积达到晋级阈值的 80% 时，系统在日常打卡流程中以 40% 的概率随机弹窗投喂"动态体感提问"。

tech-spec §5.2:
  触发条件:
  - 缓冲区当前累积值 ≥ 晋级阈值（下一里程碑边界）的 80%
  - 触发概率：40%
  - 未触发时：Q_filter 默认计为基础分 B̄_j 的 50%
```

关键点：
- **缓冲池是累积的**——每次打卡的衍生技能增量不是直接加到技能上，而是先进缓冲区
- **阈值是里程碑边界的 80%**——不是固定的，而是随技能当前值动态变化
- **40% 是条件概率**——先满足累积条件，再 40% 概率投喂问题

### 2.2 当前实现

```javascript
// store.tsx L229-248 当前实现
if (Math.random() < 0.20) {  // 平摊20%，无累积条件
  const targetSkill = skillMap[systemId] ?? 'mastery'
  const q = pickRandomQuestion(targetSkill)
  // ...直接触发
}
```

问题：
1. **无条件触发**——不管缓冲区有没有积累都触发
2. **20% 平摊概率**——spec 是"累积≥80%阈值后 40% 条件概率"
3. **不读缓冲池**——`bufferPoolCheck()` 和 `calcAllDerivedSkills` 返回的 `pools` 数组完全被忽略
4. **不与里程碑联动**——阈值永远不变

### 2.3 改进方案

```javascript
// 改进后的 QFilter 触发逻辑

// 在 addCheckin 中:
// 1. 计算本轮增量（先不 dispatch）
const deltaContrib = calcDerivedDelta(weightedBase, null, gamma, lambda) // 用 7:3 公式

// 2. 更新缓冲池
const updatedPools = state.bufferPools.map(pool => {
  if (pool.lockedUntil && pool.lockedUntil > todayISO()) return pool // 锁定中，不累积
  return { ...pool, accumulated: pool.accumulated + deltaContrib }
})

// 3. 检查触发条件
let qfilterSkill = null
for (const pool of updatedPools) {
  if (pool.accumulated >= pool.threshold * 0.8 && Math.random() < 0.40) {
    qfilterSkill = pool.skill
    break
  }
}

// 4. 触发 → 延迟 dispatch；未触发 → 直接用 0.85× 系数 dispatch
```

**关键改进：**
- `bufferPool.accumulated` 从累积量改为**本轮增量贡献值**
- 阈值 `pool.threshold` 动态计算：下一个里程碑边界（41/61/81/101）× 0.8
- 锁定状态：`pool.lockedUntil` 记录锁定到期日，到期前不累积新值
- 未触发时：按 0.85×B̄_j 直接结算（Q_filter = B̄_j×0.5 缺省代入 7:3）

---

## 三、QFilter 释放/锁定规则

### 3.1 原始需求 (generate.md L44, tech-spec §5.3)

```
generate.md L44:
  若主观回答契合高阶状态（Q_filter ≥ 75），缓冲区数值以 100% 效率全额释放至实际技能点；
  若回答判定为低阶状态（内耗或虚假繁荣），缓冲区数值留存 70% 并进入锁定状态，等待下一周期重新激活。

tech-spec §5.3 表格:
  ≥75: 100% 释放 | <75: 70% 留存+锁定 | 未触发: Q_filter=B̄_j×0.5 代入
```

**锁定机制的设计合理性（generate.md 未明说但隐含）：**
- 低分意味着用户体感与数值不符 → 强制等待一周期，防止"做了但没内化"的虚假增长
- 锁定是**暂时的**——下一个周期解锁后可以重新触发
- 70% 留存意味着"你至少得到了部分成长，但不是全部"

### 3.2 当前实现

```javascript
// store.tsx answerQFilter 当前实现
const stashed = pendingCheckinRef.current
if (stashed) {
  const qFilterBonuses = {}
  qFilterBonuses[stashed.triggeredSkill] = isSkip ? 0 : answer
  dispatch({ type: 'CHECKIN', record: stashed.record, baseAttrDelta: stashed.baseAttrDelta, qFilterBonuses })
}
```

当前只把 QFilter 得分作为 `qFilterBonuses` 传给 `calcAllDerivedSkills`，影响收敛率。**没有释放/锁定的概念**——因为收敛模型不需要。

### 3.3 改进方案

恢复 7:3 公式后，释放/锁定自然回归：

```javascript
// answerQFilter 改进版
if (stashed) {
  const score = answer * (confidence < 1.0 ? 0.7 : 1.0)  // 反作弊
  
  if (score >= 75) {
    // 100% 释放：清空缓冲池，全额应用
    const qFilterBonuses = { [stashed.triggeredSkill]: score }
    dispatch({ type: 'CHECKIN', ...stashed, qFilterBonuses: qFilterBonuses, releaseMode: 'full' })
  } else {
    // 70% 留存 + 锁定14天
    const qFilterBonuses = { [stashed.triggeredSkill]: score }
    dispatch({ 
      type: 'CHECKIN', ...stashed, qFilterBonuses: qFilterBonuses, releaseMode: 'partial',
      lockSkill: stashed.triggeredSkill,
      lockUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
    })
  }
}
```

Reducer 中新增 `LOCK_POOL` action：
```javascript
case 'LOCK_POOL': {
  return {
    ...s,
    bufferPools: s.bufferPools.map(p => 
      p.skill === a.skill ? { ...p, lockedUntil: a.lockedUntil, accumulated: p.accumulated * 0.7 } : p
    )
  }
}
```

---

## 四、百分位校准

### 4.1 原始需求 (tech-spec §2.4)

```
tech-spec L105-132:
  首次启动时，系统引导用户通过 8 道百分位问题校准初始属性
  问题范式: "在你认识的目标人群中，你在[属性]上处于什么位置？(0%=最弱, 50%=平均, 99%=最强)"
  映射公式: InitialValue(p) = 5 + (p/100) × 90
  设计理由: 百分位法好于绝对自评——"比70%的人强"比"魅力值43"更有体感区分度
```

### 4.2 当前实现

`Calibration.tsx` 组件**存在**（465行代码），包含 8 道百分位滑块和正确的映射公式。但**从未被调用**。

根因在 `App.tsx` 的首次启动判定：

```typescript
// App.tsx L53-61 当前
useEffect(() => {
  const allDefault = (Object.keys(DEFAULT_BASE_ATTRS) as BaseAttr[]).every(
    (key) => state.baseAttrs[key] === DEFAULT_BASE_ATTRS[key],
  )
  const noRecords = !state.checkinRecords || state.checkinRecords.length === 0
  if (allDefault && noRecords) {
    setShowCalibration(true)
  }
}, [checking])
```

**问题：** `loadState()` (store.tsx L67-83) 每次启动都调用 `calcAllDerivedSkills` 重算衍生技能，导致 `state.derivedSkills` 不再是 `DEFAULT_DERIVED_SKILLS`。而 `allDefault` 只检查 `baseAttrs`，逻辑本身正确。但 `loadState` 中 `parsed.derivedSkills` 存在时直接返回，不会被 DEFAULT 覆盖。

**实际 bug：** 首次使用且 localStorage 为空时，`loadState` 返回 `INITIAL_STATE`，其中 `baseAttrs` 全部是 `INITIAL_BASE_ATTRS`（与 `DEFAULT_BASE_ATTRS` 相同）。所以 `allDefault` 应该为 true。

让我再检查：`DEFAULT_BASE_ATTRS` (types.ts L327-336) vs `INITIAL_BASE_ATTRS` (store.tsx L44-53)：

```
types.ts DEFAULT:  charm:25, strength:25, intellect:35, social:25, willpower:25, health:25, courage:25, abstinence:20
store.tsx INITIAL: charm:25, strength:25, intellect:35, social:25, willpower:25, health:25, courage:25, abstinence:20
```
**完全一致。** 所以首次启动 `allDefault && noRecords` 应该为 true。

那为什么没看到校准？可能的原因：PWA 缓存了旧版 App.tsx（v10 之前的版本已经校准逻辑了但可能有 bug）。或者用户在 v8/v9 时已经存了数据到 localStorage，导致 `checkinRecords.length > 0`。

### 4.3 改进方案

**不需要重写 Calibration.tsx**（代码是正确的）。需要做的是：

1. **调试首次启动判定**——在 App.tsx 加一个更鲁棒的判定：

```typescript
// 改进: 用单独的 flag 标记是否已完成校准
const hasCalibrated = localStorage.getItem('life-rpg-calibrated')
if (!hasCalibrated) {
  setShowCalibration(true)
}

// 校准完成后:
const handleCalibrationComplete = (values) => {
  // ...写入 state
  localStorage.setItem('life-rpg-calibrated', 'true')
  setShowCalibration(false)
}
```

2. **加一个"重新校准"按钮**——Dashboard 或 History 页面加入口，让用户可以重新校准（会重置基础属性但保留打卡记录）。

3. **校准结果验证**——所有 8 个滑块都必须在 5-95 之间（避免极端值），提供了合理的初始分布后，`calcAllDerivedSkills` 会自动计算对应的衍生技能初始值。

---

## 五、14 天黑盒校准

### 5.1 原始需求 (generate.md L222-237, tech-spec §8)

这是 generate.md 和 tech-spec 中最详细的反修仙机制：

```
generate.md L222-237:
  [分值触发临界点] → [开启14天黑盒观察期] → [暗中追踪客观打卡关联数据]
    ├─ 14天内触发表层红线 → 判定"主观虚假繁荣" → 激活 0.85 衰减阻尼
    └─ 14天内表现完美 → 正式解除限制，解锁下一里程碑

  跨维度校验实例:
  - 强行为线索晋级: 社交打卡出现过"激烈争执且自评极低"或"禁欲天数清零" → 0.85衰减
  - 机会捕捉能力晋级: 弹出硬核填报框"过去2周内是否开启了合同/金钱/核心人际承诺项目？" → 否→无法突破
```

### 5.2 当前状态

`types.ts` 中有 `BlackBox` 类型定义，`store.tsx` 中有 `BLACKBOX_CHECK` action。但**从未被调用或触发**。完全没有黑盒检测逻辑。

### 5.3 改进方案（Phase 2 实现）

```
数据结构:
  BlackBox {
    skill: DerivedSkill
    boundary: number         // 触发的里程碑边界值
    startDate: string
    endDate: string          // startDate + 14天
    flags: string[]          // "社交崩盘" / "禁欲清零" / ...
    triggeredBy: string      // 哪个打卡触发了晋级
    verdict: 'observing' | 'unlocked' | 'attenuated'
  }

实现步骤:
  1. 每次衍生技能结算后，检查 S_j 是否跨过了里程碑边界
  2. 跨过了 → 创建 BlackBox，verdict='observing'，startDate=today
  3. 接下来 14 天，每次打卡时检查标志位：
     - 强行为线索 + 社交能力打卡出现 state='0' → flags.push('社交崩盘')
     - 强行为线索 + 禁欲打卡出现 state='relapse' → flags.push('禁欲清零')
     - 机会捕捉能力 → 弹出填报框
  4. 14 天后 → verdict='unlocked' (无 flag) 或 'attenuated' (有 flag)
  5. attenuated → S_j = S_j × 0.85
```

---

## 六、季度方差 + 30 天盲测

### 6.1 原始需求 (generate.md L240-242, tech-spec §9)

```
generate.md L240-242:
  季度"方差差值检验"：如果用户在"工作业务能力"上自评为精英，
  但日常"思维能力"与"熟练度"的方差波动超过25% → 系统收紧Sigmoid斜率 +15%

  30天盲测：清晨无指标盲打当天状态分，与公式分误差 ±5%以内
  → 度量尺已植入潜意识，达成数字化外骨骼

tech-spec §9.1-9.2:
  漂移度 = σ(日常基础打卡)/B̄
  若 S_j ≥ 61 且基础维度方差 > 25% → 收紧 γ(K) Sigmoid 斜率
```

### 6.2 改进方案（Phase 3 实现）

这两个机制都需要**大量用户数据**（至少 30 天~90 天）才有意义。它们在 MVP 阶段不应该实现。但数据结构应该提前准备好，确保将来接入时不需要 migration。

当前 `types.ts` 已预留：
- `AppState.daysSinceFirstUse`（但从未递增）
- `AppState.blindTestResults`（类型已定义，数组为空）
- `BlindTestResult` 接口已定义

需要做的（Phase 3）：
1. 每次打开 App 时 `INCREMENT_DAY`（已有 action，未 dispatch）
2. 第 31 天触发盲测弹窗
3. 第 91 天运行方差检验
4. 季度末运行里程碑重校验

---

## 七、改进优先级与排期

### v13（本次迭代·核心修复）

| 序号 | 改进项 | 文件 | 工作量 |
|------|--------|------|--------|
| 1 | **恢复 7:3 公式** | math.ts | 重写 calcAllDerivedSkills |
| 2 | **实现缓冲池累积** | store.tsx | 新增 bufferPool 累积逻辑 |
| 3 | **实现释放/锁定** | store.tsx | 新增 LOCK_POOL action |
| 4 | **修复首次校准判定** | App.tsx | 改用独立 flag |
| 5 | **QFilter 从速率→贡献** | store.tsx | answerQFilter 改为写入 Q_filter 得分 |

### v14（功能补全）

| 序号 | 改进项 | 文件 | 工作量 |
|------|--------|------|--------|
| 6 | **14天黑盒** | store.tsx + math.ts | 新增 blackbox 检测 |
| 7 | **daysSinceFirstUse 递增** | App.tsx | dispatch INCREMENT_DAY |

### v15+（长期自修正）

| 序号 | 改进项 | 
|------|--------|
| 8 | 季度方差检验 |
| 9 | 30天盲测 |
| 10 | 里程碑标签动态重校验 |

---

## 八、是否需要恢复 7:3 公式（结论）

**需要。** generate.md L261 明确写了 "本身分数增加代表实际增加量占大比重7，主观想法占3"，这是一个经过深思熟虑的数字。收敛模型实现的是"滞后"（同样重要），但 7:3 的**直接贡献语义**和缓冲池/释放/锁定的**过渡筛选机制**是不可替代的设计。

融合方案（§一·1.5）保留了收敛模型的优点（技能不跳跃），同时恢复 7:3 的核心语义和整套 QFilter 过渡机制。这是最小化推翻、最大化合规的路径。
