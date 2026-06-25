# 个人 OS (life-rpg) — 软件结构与版本变更日志

> 最后更新: 2026-06-26 · 当前版本: v8  
> 对照规范: `../tech-spec.md` `../generate.md`

---

## 一、文件结构与职责

```
life/rpg-mvp/
├── index.html              PWA 入口·版本标记·离线样式兜底
├── vite.config.ts           构建配置·PWA manifest·缓存策略
├── package.json             依赖列表
├── tsconfig.json            TypeScript 配置
├── tailwind.config.js       Tailwind 主题
├── postcss.config.js        PostCSS 插件
├── STRUCTURE.md             本文件
├── public/icon.svg          App 图标
├── docs/                    构建产物 (GitHub Pages 部署)
└── src/
    ├── main.tsx             React 入口 (无 StoreProvider — v7 已移除冗余外层)
    ├── App.tsx              根组件·版本检测·校准入口·tab 路由
    ├── vite-env.d.ts        Vite 类型声明
    │
    ├── types.ts             所有类型·常量·里程碑矩阵·工具函数
    ├── math.ts              核心数学引擎 (收敛模型·γ阻尼·λ限速·加权)
    ├── milestones.ts        里程碑辅助 (冗余·计划删除)
    ├── qfilter.ts           QFilter 题库 (24题) + pickRandomQuestion + getConfidence
    ├── utils.ts             打卡体系定义 (5个) + CheckinFlow 的问题定义
    ├── store.tsx            全局状态 (Reducer + Context + addCheckin + answerQFilter)
    ├── index.css            Tailwind + 动画 + 安全区 + 滑块样式
    │
    ├── pages/
    │   ├── Dashboard.tsx    仪表板 (属性面板·技能面板·打卡入口·导出)
    │   ├── Checkin.tsx      打卡页 (选体系→答题→完成→QFilter)
    │   └── History.tsx      历史页 (周网格·属性排序·里程碑总览)
    │
    └── components/
        ├── AttributeBar.tsx 单条属性/技能进度条
        ├── BottomNav.tsx    底部导航 (属性·打卡·历史)
        ├── Calibration.tsx  首次校准 (8道百分位滑块)
        ├── CheckinFlow.tsx  答题流 (步骤进度·选项·防多击)
        ├── ExportImport.tsx 导出/导入/里程碑总览
        └── QFilterPanel.tsx QFilter 提问弹窗 (接收 pending 数据)
```

---

## 二、数据流

```
用户打开 App
  → App.tsx: checkVersionAndUpdate() → 清理旧 SW 缓存
  → 首次使用? → Calibration.tsx: 8 道百分位滑块 → importJSON → store.IMPORT
  → Dashboard.tsx: 调用 useStore() → state.baseAttrs + state.derivedSkills

用户打卡:
  → Checkin.tsx: 选体系 → CheckinFlow: 逐题回答
  → store.addCheckin(systemId, answers)
     1. calcBonus(answers) → rawDelta
     2. clamp(rawDelta, -1.0, 1.0) → baseAttrDelta
     3. 预计算 previewDerived (无 QFilter，仅用于 UI 即时反馈)
     4. 20% 概率 → 选目标衍生技能 → pickRandomQuestion(skill)
     5. QFilter 触发? → 延迟 dispatch，暂存到 pendingCheckinRef
        QFilter 未触发? → 直接 dispatch CHECKIN (rate=0.03)
     6. 返回 { bonus, previousDerived, newDerived, qfilterPending }

  → Checkin.tsx: 显示完成页
    · 基础属性变化: bonus 列表
    · 衍生技能变化: prev→now 列表
    · qfilterPending != null → 500ms 后弹出 QFilterPanel

用户回答 QFilter:
  → QFilterPanel: 选答案 → handleQFilterAnswer(answer, responseTime)
  → store.answerQFilter(pending, answer, rt)
     1. answer ≥ 0: 创建 QFilterRecord (低信度×0.7)
     2. 从 pendingCheckinRef 取出暂存的 checkin 数据
     3. 单次 dispatch CHECKIN, qFilterBonuses[pending.skill] = answer
        (≥75 → rate=0.06; <75 → rate=0.015)

Reducer CHECKIN:
  → 基础属性: attrs[key] += delta × tierMultiplier(attrs[key])
  → calcAllDerivedSkills(intermediate, qFilterBonuses)
  → 衍生技能向 target 收敛
  → 更新 bufferPools (记录移动量)

Reducer IMPORT / loadState:
  → 始终调用 calcAllDerivedSkills 从 baseAttrs 重算 derivedSkills
```

---

## 三、当前关键参数

| 参数 | 值 | 位置 |
|------|----|------|
| 收敛率 (无 QFilter) | 0.03 | math.ts:95 |
| 收敛率 (QFilter ≥75) | 0.06 | math.ts:96 |
| 收敛率 (QFilter <75) | 0.015 | math.ts:97 |
| QFilter 触发率 | 20% | store.tsx:235 |
| 基础增量上限 | ±1.0 | store.tsx:215 |
| 分段倍率 0-60 | 1.0 | types.ts |
| 分段倍率 60-80 | 0.6 | types.ts |
| 分段倍率 80-95 | 0.25 | types.ts |
| 分段倍率 95-100 | 0.1 | types.ts |

---

## 四、已知问题与待修复

| # | 问题 | 影响范围 | 状态 |
|---|------|---------|------|
| 1 | 打卡问题缺乏深层分支 (搭讪无场景/压力分级、饮食无科学结构参考) | utils.ts | ❌ 待修 |
| 2 | QFilter 题库只有 24 题且与打卡体系无联动、缺乏社交/搭讪专项提问 | qfilter.ts | ❌ 待修 |
| 3 | 学习/戒色打卡只有 2 层问题 | utils.ts | ❌ 待修 |
| 4 | Dashbaord gamma 显示已修复为动态 (v7) | Dashboard.tsx | ✅ |
| 5 | milestones.ts 与 types.ts 里程碑矩阵重复 | 代码质量 | ⚠️ 计划删除 |
| 6 | 14 天黑盒校准、季度方差检验、30 天盲测 — tech-spec 第 8/9 章全部未实现 | store.tsx | ❌ Phase 2 |

---

## 五、版本变更日志

### v12 (2026-06-26)
- **新**: SCORING.md — 全量评分文档（5体系×所有问题+30题QFilter+加分逻辑+宏观增长时间线）

### v12 (2026-06-26)
- **扩**: 健身从3问→运动日6问(类型/强度/时长/结构化/热身/体感)+休息日3问(恢复质量/主动恢复/饮食)
- **扩**: 社交非搭讪从1问→4问(投入度/规模/深度/能量后感)
- **扩**: 学习从4问→学日6问(时长/深度/内容域/留存/产出/专注)+不学日1问(原因)
- **扩**: 戒色从4问→替代成功4问(类型/难度/效果) 平穂2问 控制3问(方法/后果) 破戒4问(触发/连荗/恢复)

### v11 (2026-06-26)
- **修**: `CheckinFlow` dependsOn 早终止bug — 从静态 visible 改为投影式路径计算

### v10 (2026-06-26)
- **修**: iOS SW 缓存锁定 — globPatterns 从全量JS→仅 icon, JS/CSS 全走 NetworkFirst

### v9 (2026-06-26)
- **扩**: 饮食增4层Q (正餐→宏量营养→蔬菜→饮水) 参照科学饮食结构
- **扩**: 社交增7层Q (类型→场地压力→开场→评分→结果→状态→体感)
- **扩**: 学习增4层Q (时长→深度→内容域→留存)
- **扩**: 戒色增4层Q (状态→替代类型/触发场景→连胜天数)
- **扩**: QFilter 新增6题社交专项 (搭讪后体感/流畅度/场景压力/眼神/被拒/主动性)
- **新**: STRUCTURE.md 软件结构文档

### v8 (2026-06-26)
- **修**: QFilter 从不可能触发的缓冲池模型 → 20% 随机触发
- **修**: 收敛率 0.10→0.03，基础增量上限 ±2.0→±1.0
- **修**: QFilter 与打卡体系联动 (diet→mastery, social→behavioralCues, etc.)

### v7 (2026-06-25) — QA 审计修复
- **修**: History 页 `state.records`→`state.checkinRecords`
- **修**: 双重 StoreProvider (main.tsx 外层移除)
- **修**: QFilter 双重派发 (延迟到回答后单次 dispatch)
- **修**: ATTR_META 标签: 力量→强壮, 智力→思维, 社交→社交能力, 意志力→坚定
- **修**: tierMultiplier 边界 off-by-one (`<`→`<=`)
- **修**: Dashboard 掌控感阻尼硬编码 → 动态 calcGamma()
- **修**: QFilter 跳过速率 (哨兵 -1 触发 0.05)
- **修**: CheckinSystem 类型精确化
- **修**: qfilter.ts 注释中的技能名修正
- **修**: 增量钳从 ±2.0 收紧

### v6 (2026-06-26 凌晨)
- **重写**: 数学引擎从"直接加权平均" → "目标跟踪收敛模型"
- **重写**: 打卡增量从 5-10 → 0.5-2.0
- **重写**: QFilter 集成 (Checkin.tsx + QFilterPanel + store)

### v5 (2026-06-26 凌晨)
- **修**: 衍生技能从写死 20/25 → 从基础属性计算初始值

### v4 (2026-06-25)
- **修**: iOS PWA 更新检测 (NetworkFirst HTML + version check)

### v0.2 (2026-06-25)
- **新**: 8 基础属性 + 6 衍生技能
- **新**: 7:3 双引擎转化模型
- **新**: QFilter 题库 (24 题)
- **新**: 里程碑矩阵 (14 指标×5 阶梯)
- **新**: 百分位校准 (8 道滑块)

### v0.1 (2026-06-23)
- **新**: MVP — 属性面板 + 3 打卡体系 + 历史 + 备份
