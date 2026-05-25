# 版本概况
V1 — Manual Labeling Framework
能看图、选 bar、标注 bar / segment / context、图上显示。

V2 — 标签系统
标签编辑 UI、tag 管理、tag → field mapping、标签设计工作流。
Outcome Labels加入事后结果标签，为预测和案例统计做准备。

V3 — Auto Labeling
数值规则自动标签。
NLP 从字幕/复盘文本半自动打标签。

V4 — Learning / Prediction Assistant
相似案例检索、后续 outcome 统计、实时/历史 bar-by-bar 解说。
- 最终目标：Al Brooks 每日复盘风格解说 Bar 23 is a strong bull breakout bar. Bulls want follow-through; bears may sell above if the breakout fails.

# V2目标
1. tag/field编辑UI
新增 tag
修改 tag display name
停用 tag
调整 tag 分组
调整 tag 排序
修改 tag → field 映射
标记 tag 是否 active
2. tag → field 映射正式落地
strong_bull_close
映射
bar.direction = bull
bar.body_strength = strong
bar.close_position = near_high
3. 标签详情，也要有个页面
每个标签应该包含source
manual
auto_numeric
nlp
imported_albrooks
model_suggested
其它字段例如：tag_key
display_name
category: bar / segment / context / outcome
group_name
description
example
field_mapping_json
active
sort_order
created_by
source

4. 标签使用统计
哪些标签太常用，可能需要拆分；
哪些标签几乎不用，可能没必要；
哪些标签定义太模糊；
哪些分组过大；
哪些标签重复表达同一个意思。
5. 标注体验优化：搜索，折叠，最近，常用...
6. 轻量Annotation Layer：已打标的在图上显示的优化，例如TR框，trend划线，double top划线，entry bar画箭头


# 不做
不做实时数据接入
不做自动预测
不做完整 NLP 自动标注
不做模型训练
不做通用自由画线工具
不做像 TradingView 一样的完整绘图系统

# V2 完成后：
我可以在本地 ES 5m 图上高效打标签、维护标签体系，并且把关键价格行为结构以更直观的方式显示在图上，例如 TR 框、trend 线、double top 线。
这时系统已经不只是“标签记录器”，而是一个真正可用的价格行为标注系统。

# 任务分解

## M0 — V2 Scope Lock / 现状校准

**目标：** 明确 V2 只做标签系统、Outcome、统计和轻量图上表达，不碰 V3/V4 的自动化和预测。

### 任务
- [x] 对齐现有 V1 数据：确认 `bar_tags` / `segment_tags` / `context_tags` 和 `label_dictionary` 已稳定可用
- [x] 检查现有 seed dictionary 和 `LABEL_DICTIONARY.md` 是否一致
- [x] 决定 V2 字段命名：
  - [x] `source` 是否叫 `source`，枚举值是否固定为 `manual` / `auto_numeric` / `nlp` / `imported_albrooks` / `model_suggested`
  - [x] `active` 是否继续沿用数据库里的 `is_active`
  - [x] `display_name` 是否对应现在的 `label`
- [x] 定义 V2 不迁移历史标注数据的边界：只扩展字典和新增 outcome，不改已有 bar/segment/context tag 语义

### 验收
- V2 的表结构、字段名、页面范围在文档中定稿
- 后续 migration 可以一次写完，不需要边做边反复改 schema

---

## M1 — Tag Dictionary Schema v2

**目标：** 把 `label_dictionary` 从 V1 的 seed 表升级成可编辑、可追踪来源、可承载 field mapping 的正式标签字典。

### 数据模型
- [x] 给 `label_dictionary` 增加或确认以下字段：
  - [x] `tag_key` / `key`
  - [x] `display_name` / `label`
  - [x] `category`
  - [x] `group_name`
  - [x] `description`
  - [x] `example`
  - [x] `field_mapping_json`
  - [x] `is_active`
  - [x] `sort_order`
  - [x] `created_by`
  - [x] `source`
  - [x] `created_at`
  - [x] `updated_at`
- [x] 写 migration `003_dictionary_v2.sql`
- [x] 把现有 seed dictionary 补齐 `field_mapping_json`、`source = manual`、`created_by = local`
- [x] 增加字段约束：
  - [x] `category` 限制为 `bar` / `segment` / `context` / `outcome`
  - [x] `source` 限制为约定枚举
  - [x] `field_mapping_json` 必须是合法 JSON 或空
- [x] 更新 `DATA_MODEL.md` 的 `label_dictionary` 章节
- [x] 更新 `LABEL_DICTIONARY.md`：把 Tag→Field 映射改成机器可落地的 JSON 示例

### Repo / Action
- [x] `lib/repo/dictionary.ts` 支持读取全部 tag，不只 active tag
- [x] 增加 tag CRUD：
  - [x] create tag
  - [x] update display name / description / example / mapping / group / sort order
  - [x] deactivate / reactivate tag
  - [x] rename tag key，并同步 `bar_tags` / `segment_tags` / `context_tags` / `outcome_tags`
- [x] 增加 field mapping JSON 校验 helper

### 验收
- 旧标注仍能正常显示
- 字典记录包含来源和 field mapping
- 停用 tag 不再出现在标注面板里，但历史标注仍然可读

---

## M2 — Tag Management UI

**目标：** 做一个可日常维护标签体系的 UI，不再靠改 seed 文件管理 tag。

### 页面
- [x] 新增 `/tags`
- [x] 新增 `/tags/[tagKey]`

### `/tags` 列表
- [ ] 按 `category` 分 tab：Bar / Segment / Context / Outcome
- [ ] 按 `group_name` 分组展示
- [x] 显示 tag key、display name、source、active 状态、使用次数、sort order
- [x] 支持搜索 tag key / display name / description
- [x] 支持筛选：
  - [x] active / inactive
  - [x] category
  - [ ] group
  - [x] source
- [ ] 支持组内排序调整
- [x] 支持快速停用 / 恢复
- [x] 支持新增 tag

### `/tags/[tagKey]` 详情
- [x] 展示 tag 基本信息
- [x] 可编辑 display name
- [x] 可编辑 category / group_name
- [x] 可编辑 description / example
- [x] 可编辑 `field_mapping_json`
- [x] 可编辑 source
- [ ] 展示使用统计：
  - [x] 当前 category 使用次数
  - [ ] bar 使用次数
  - [ ] segment 使用次数
  - [ ] context 使用次数
  - [ ] outcome 使用次数
  - [ ] 最近使用的 session / bar
- [x] 展示危险操作：
  - [x] rename key
  - [x] deactivate

### 交互原则
- [x] tag key 创建后默认不鼓励修改
- [x] deactivate 优先于 delete
- [ ] rename key 必须显示影响范围和确认
- [x] 保存 mapping 前先做 JSON 校验

### 验收
- [x] 可以不改代码新增一个 tag，并立刻在标注面板可用
- [x] 可以停用 tag，历史标注仍显示但不能继续新增
- [x] 可以查看某个 tag 为什么存在、怎么映射、用了多少次

---

## M3 — Outcome Labels

**目标：** 加入事后结果标签，为后续统计、相似案例和预测打基础。Outcome 是回看标签，不影响实时标注主流程。

### 设计
- [x] 明确 outcome 挂载对象：
  - [x] V2 默认挂在 segment range 上
  - [x] 可选 anchor bar：确认 outcome 的那根 bar
  - [x] 可选 related context bar：当时判断发生的位置
- [x] 定义第一版 outcome tags：
  - [x] succeeded
  - [x] failed
  - [x] continued
  - [x] reversed
  - [x] evolved_into_range
  - [x] evolved_into_channel
  - [x] unclear
- [x] 定义 outcome 的 source 默认为 `manual`
- [x] 更新 `LABEL_DICTIONARY.md` 的 Outcome 章节，从占位变为正式 V2 scope

### 数据模型
- [x] 新增 `outcome_tags`
  - [x] `id`
  - [x] `session_id`
  - [x] `start_bar_id`
  - [x] `end_bar_id`
  - [x] `confirm_bar_id`
  - [x] `related_context_bar_id`
  - [x] `tag_key`
  - [x] `note`
  - [x] `source`
  - [x] `created_at`
  - [x] `updated_at`
- [x] 增加索引：
  - [x] by session
  - [x] by range
  - [x] by confirm bar
  - [x] by tag key
- [x] 写 migration `004_outcome_tags.sql`
- [x] 更新 `DATA_MODEL.md`

### Repo / Action
- [x] `lib/repo/labels.ts` 增加 outcome CRUD
- [x] `lib/actions/label.ts` 增加 outcome actions
- [x] session 加载时返回 outcome tags

### UI
- [x] range 选择时允许切换 Segment / Outcome
- [x] outcome 表单默认显示在“当天结束后回看”的区域
- [x] 选择 outcome 时可指定 confirm bar
- [x] 已有 outcome 可回填、修改、删除
- [x] 图上显示 outcome marker，但优先级低于当前选择高亮

### 验收
- [x] 能给一段 breakout / range / leg 补打 outcome
- [x] 刷新后 outcome 保留
- [x] outcome 可以用于统计同类 setup 的后续结果

---

## M4 — Tag Usage Statistics

**目标：** 让标签体系可以被复盘和修剪：哪些太泛、哪些太少、哪些重复、哪些分组过大。

### 数据查询
- [x] 统计每个 tag 的总使用次数
- [x] 按 category / group 统计使用次数
- [x] 按最近 N 个 session 统计使用趋势
- [x] 统计 inactive tag 的历史引用
- [x] 统计可能重复的 tag：
  - [ ] display name 相近
  - [x] field mapping 相同
  - [ ] 同组下 key 相似
- [x] 统计过大的 group：
  - [x] tag 数过多
  - [ ] 使用集中在少数 tag
- [x] 统计几乎不用的 tag

### UI
- [x] `/tags` 增加 stats view
- [x] Tag 详情页显示 usage trend
- [x] 分组页显示“建议整理”列表：
  - [x] too common
  - [x] rarely used
  - [x] duplicate mapping
  - [x] inactive but referenced
  - [x] group too large

### 验收
- [x] 能回答“哪些标签太常用，可能需要拆分”
- [x] 能回答“哪些标签几乎不用，可能可以停用”
- [x] 能发现 field mapping 重复的 tag

---

## M5 — Annotation UX Upgrade

**目标：** 提高日常打标速度：搜索、折叠、最近、常用，让标签数量增加后仍然好用。

### 右侧标注面板
- [x] tag 搜索
- [ ] 最近使用 tags
- [x] 当前 session 常用 tags
- [ ] 全局常用 tags
- [x] group 折叠状态持久化
- [ ] active / inactive 的历史显示区分
- [x] tag tooltip 显示 description / example
- [ ] tag 详情入口

### 快速操作
- [ ] 对当前 bar/range 快速复制上一根 bar 的 context tags
- [ ] 对选中 range 快速复制上一个相同 range 类型的 segment tag
- [ ] 清空当前选择的某类 tag
- [ ] note 编辑更明确：每个 tag 的 note 与整体 note 不混淆

### 验收
- [x] tag 数量变多后仍能快速找到目标 tag
- [x] 常用工作流不需要频繁滚动
- 历史 inactive tag 不影响继续标注

---

## M6 — Lightweight Annotation Layer

**目标：** 在图上更直观地表达关键价格行为结构，但不做通用 TradingView 绘图系统。

### 显示类型
- [ ] Trading Range 框
- [ ] trend / channel 线
- [ ] double top / double bottom 线
- [ ] entry bar 箭头
- [ ] breakout / failed breakout marker
- [ ] outcome marker

### 数据来源
- [ ] 优先从 existing tags 派生显示：
  - [ ] `trading_range` → range box
  - [ ] `bull_channel` / `bear_channel` → channel line
  - [ ] `double_top` / `double_bottom` → horizontal line
  - [ ] `entry_bar` → arrow
  - [ ] outcome tags → result marker
- [ ] 不新增自由画线数据模型，除非 tag 派生不够用

### 交互
- [ ] 支持显示/隐藏 annotation layer
- [ ] hover annotation 显示 tag summary
- [ ] 点击 annotation 选中对应 bar/range
- [ ] 当前选择相关 annotation 高亮，其它淡化
- [ ] 避免遮挡 K 线主体和价格轴

### 验收
- TR 框、trend 线、double top 线能根据 segment tags 自动显示
- entry bar 和 outcome 在图上可读
- 标注层可以关闭，避免图上过载

---

## M7 — V2 Polish / Regression

**目标：** 收尾，确保 V1 主流程没有被 V2 字典系统破坏。

### 回归
- [ ] `/sessions` 正常加载
- [ ] `/sessions/[sessionId]` 正常显示 K 线
- [ ] bar tag 保存、回填、删除正常
- [ ] segment tag 保存、回填、删除正常
- [ ] context tag 保存、回填、删除正常
- [ ] inactive tag 历史显示正常
- [ ] tag rename 后历史引用正常
- [ ] outcome tag 保存、回填、删除正常

### 文档
- [ ] 更新 `DATA_MODEL.md`
- [ ] 更新 `LABEL_DICTIONARY.md`
- [ ] 更新 `UI_DESIGN.md`
- [ ] 更新 `PROJECT_DESIGN.md` / `ARCHITECTURE.md` 中与标签系统相关的描述
- [ ] 在 `ROADMAP_v2.md` 勾选实际完成项

### 验收
- V2 完成后，可以在本地 ES 5m 图上维护标签体系、继续高效标注，并看到关键结构的轻量图上表达
- Outcome 标签可用于后续统计和相似案例分析
- V3 自动标签可以在此基础上只新增 source / confidence / numeric rule，不需要重做 V2

---

# 建议实施顺序

1. M0：先锁定字段名和范围
2. M1：先做 schema，因为后面的 UI 都依赖它
3. M2：做 tag 管理 UI
4. M3：做 Outcome
5. M4：做统计
6. M5：优化标注体验
7. M6：做轻量图上显示
8. M7：回归和文档收尾

# V2 最小可交付版本

如果想先做一个小闭环，建议只做：

- [ ] M1 Tag Dictionary Schema v2
- [ ] M2 Tag Management UI 的新增 / 修改 / 停用 / 详情
- [ ] M3 Outcome Labels 的基础保存和回填

这三块完成后，V2 的核心价值已经成立：标签体系可以维护，Outcome 可以记录，后面统计和显示优化可以逐步加。
