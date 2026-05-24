# Roadmap

目标先做一个自己每天能用的标注工具：打开本地 ES 5m 数据，只看 RTH，每天一张图，先能给单根 K 线打标签；之后再完善标签体系、多 K/context 标注，以及图上的标注显示。

不追求产品化，不做上传向导，不做多用户，不做复杂管理后台。

---

## M0 — Foundation（已完成）

**目标：** Next.js 骨架 + SQLite 基建。

### 已完成
- [x] Next.js 16 + Tailwind v4 项目骨架
- [x] Top nav + 首页
- [x] SQLite (`better-sqlite3`) 单例
- [x] migration runner
- [x] 初始 schema
- [x] 初始 label dictionary seed
- [x] `data/` 本地数据目录规则

---

## M1 — RTH Chart（已完成）

**目标：** 直接读取 `data/samples/es_5m.csv`，只显示 ES RTH，每个交易日一张图。

### 已完成
- [x] `lib/import/csv-parse.ts`：解析本地 CSV，校验 OHLC
- [x] `lib/import/session-build.ts`：按 RTH 切 session，生成 `bar_number`
- [x] `lib/data/local-es.ts`：打开页面时自动同步本地 CSV 到 SQLite
- [x] `lib/repo/sessions.ts`、`lib/repo/bars.ts`：读取 session 和 bars
- [x] `/sessions`：列出 RTH sessions，日期降序
- [x] `/sessions/[sessionId]`：显示当天 RTH K 线图
- [x] 顶部 prev / next day 切换

---

## M2 — Bar Labels（下一步）

**目标：** 点一根 K 线，选择 `bar_quality` / `bar_role` 标签，保存到 `bar_labels`。此阶段不设计新标签，只把单根 bar 标注动作跑通。

### 范围
- 只标单根 bar
- 只使用 `LABEL_DICTIONARY.md` 里的 `bar_quality` / `bar_role`
- 每个 field 单选，可不填
- 允许 note
- 保存到 `bar_labels`

### 任务
- [ ] `lib/repo/dictionary.ts`：读取 active bar label 字典
- [ ] `lib/repo/labels.ts`：`bar_labels` CRUD
- [ ] `lib/actions/label.ts`：`upsertBarLabel`、`deleteBarLabel`
- [x] 图表点击选择 bar
- [x] 选中状态同步到 URL：`?bar=23`
- [ ] 右侧 `<BarLabelForm>`：展示 `bar_quality` / `bar_role` + note
- [ ] 保存后刷新页面数据
- [ ] 已标注 bar 在图表上显示一个简单 dot
- [ ] 键盘：`←/→` 切 bar，`Esc` 取消

### 不做
- 标签体系重构
- 临时固定标签
- 标签组管理
- segment labels
- context labels
- 多 K 范围选择
- 导出格式设计

### 验收
- 点击 bar 后右栏出现 `bar_quality` / `bar_role` 选择
- 点选标签后 SQLite 里查得到
- 刷新页面后已选标签仍然回填
- 已标注 bar 有视觉标记
- `←/→` 可以逐根切换

---

## M3 — Label Design

**目标：** 根据 `LABEL_DICTIONARY.md` 简洁但明确地定稿 Bar / Segment / Context 三类标签的字段、UI 分组、note 归属、颜色规则和数据格式，为 M4/M5 开发做准备。

### 设计内容
- [ ] Bar：确认 `bar_quality` / `bar_role` 的显示分组、顺序、颜色
- [ ] Segment：确认 `segment_kind`、`direction`、note 的 UI 和数据含义
- [ ] Context：确认 `market_context`、`trend_direction`、`current_location`、`current_event`、`trade_quality`、interpretation note 的 UI 和数据含义
- [ ] 明确每个 field 是单选、note，还是独立自由文本
- [ ] 明确 note 归属：field 级 note、bar 级 note、segment note、context interpretation
- [ ] 明确 M5 显示规则：bar dot / badge、segment band / line、context marker / summary
- [ ] 检查当前 SQLite schema 是否够用，不够再写 migration
- [ ] 更新 `LABEL_DICTIONARY.md`、`DATA_MODEL.md`、`UI_DESIGN.md`

### 不做
- 复杂字典管理页面
- JSON/JSONL 导出
- NLP / 自动标注
- 多用户数据权限

### 验收
- 标签字段、key、label、说明统一
- UI 如何显示每类标签说清楚
- note 归属和数据写入位置说清楚
- M4/M5 可以按文档直接开发，不再临时想字段和显示规则

---

## M4 — Segment & Context Labels

**目标：** 支持多 K 范围标注、segment label、context label。此阶段只负责标注数据的选择、保存、回填、修改和删除，不做复杂图上显示。

### 任务
- [ ] 图表支持拖动选择 bar range
- [ ] 单根 bar 支持 Bar / Context 两类表单
- [ ] 多根 range 支持 Segment 表单
- [ ] `lib/repo/labels.ts` 增加 segment/context CRUD
- [ ] `lib/actions/label.ts` 增加 segment/context actions
- [ ] 右侧 panel 根据选择类型切换：
  - 单 bar：Bar / Context
  - range：Segment
- [ ] 已有标注可回填、修改、删除

### 不做
- 图上复杂显示
- JSON/JSONL 导出

### 验收
- 拖动选择多根 K 线后能保存 segment label
- 单根 bar 能同时保存 bar labels 和 context labels
- 已有 segment/context 能回填、修改、删除
- 切换 bar 或 range 不丢已保存数据

---

## M5 — Label Visualization

**目标：** 把已标注内容清楚显示在图上，让复盘时一眼看出哪些 bar、segment、context 已标注。

### 任务
- [ ] bar label：bar 上方 dot / badge
- [ ] segment label：横向 band / line
- [ ] context label：bar 下方 marker 或侧栏摘要
- [ ] 处理重叠标注的显示优先级
- [ ] 选中 bar / range 时高亮对应标注
- [ ] hover 标注时显示 label summary

### 不做
- 新增标注数据类型
- JSON/JSONL 导出

### 验收
- 图上能看出哪些 bar 已标注
- 图上能看出 segment 覆盖范围
- context marker 不遮挡 K 线主体
- 选中和 hover 状态清楚

---

## V1 完成定义

M1–M5 完成后就是 V1：

> 打开本地 ES 5m RTH 数据，标注单根 bar、segment、context，并在图上清楚看到标注结果。

---

## 未来（先不做）

- ETH / DAY / RTH 视图切换
- 上传任意 CSV
- 字典编辑 UI
- JSON/JSONL 导出
- CSV zip
- 回放模式
- 相似 case 检索
- NLP / YouTube transcript 半自动标注
- 模型训练 dashboard

---

## 明确不做

- 多用户、登录、远程部署
- 多 instrument UI
- 移动端
- 自动交易、信号推送
- 任何金融建议功能
