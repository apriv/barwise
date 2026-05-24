# Roadmap

目标先做一个自己每天能用的标注工具：打开本地 ES 5m 数据，只看 RTH，每天一张图，先能给单根 K 线打简单标签；之后再完善标签体系、多 K 标注和导出格式。

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

## M2 — Simple Bar Labels（下一步）

**目标：** 点一根 K 线，选择一个或几个简单标签，保存。此阶段不追求最终标签体系，先把标注动作跑通。

### 范围
- 只标单根 bar
- 只做简单标签，不做标签组设计
- 标签可以先用少量固定选项或字典里的 `bar_quality` / `bar_role`
- 允许 note
- 保存到 `bar_labels`

### 任务
- [ ] `lib/repo/dictionary.ts`：读取 active bar label 字典
- [ ] `lib/repo/labels.ts`：`bar_labels` CRUD
- [ ] `lib/actions/label.ts`：`upsertBarLabel`、`deleteBarLabel`
- [ ] 图表点击选择 bar
- [ ] 选中状态同步到 URL：`?bar=23`
- [ ] 右侧简单 `<BarLabelForm>`：展示可选标签 + note
- [ ] 保存后刷新页面数据
- [ ] 已标注 bar 在图表上显示一个简单 dot
- [ ] 键盘：`←/→` 切 bar，`Esc` 取消

### 不做
- 标签体系重构
- 标签组管理
- segment labels
- context labels
- 多 K 范围选择
- 导出格式设计

### 验收
- 点击 bar 后右栏出现简单标签选择
- 点选标签后 SQLite 里查得到
- 刷新页面后已选标签仍然回填
- 已标注 bar 有视觉标记
- `←/→` 可以逐根切换

---

## M3 — Label & Data Format Design

**目标：** 根据 `LABEL_DICTIONARY.md` 正式完善标签设计、标签组、数据格式和导出契约。M3 主要是设计和少量数据层调整，为 M4 的完整标注做准备。

### 设计内容
- [ ] 明确 Bar Label 的字段、显示分组、颜色和快捷顺序
- [ ] 明确 Segment Label 的字段：`segment_kind`、`direction`、note
- [ ] 明确 Context Label 的字段：`market_context`、`trend_direction`、`current_location`、`current_event`、`trade_quality`、interpretation note
- [ ] 明确每种标签在 UI 中是单选、多选还是自由文本
- [ ] 明确标签颜色规则：bar dot、segment band、context marker
- [ ] 明确 JSONL 导出 schema
- [ ] 明确 CSV/备份是否需要做，若不做则写入未来列表
- [ ] 检查当前 SQLite schema 是否够用，不够再写 migration
- [ ] 更新 `LABEL_DICTIONARY.md`、`DATA_MODEL.md`、`IMPORT_EXPORT.md`、`UI_DESIGN.md`

### 不做
- 复杂字典管理页面
- NLP / 自动标注
- 多用户数据权限

### 验收
- 标签字段、key、label、说明统一
- UI 如何显示每类标签说清楚
- 导出 JSONL 能表达 bar / segment / context
- M4 可以按文档直接开发，不再临时想字段

---

## M4 — Segment & Context Labels

**目标：** 支持多 K 范围标注、segment label、context label，并把标注结果清楚显示在图上。

### 任务
- [ ] 图表支持拖动选择 bar range
- [ ] 单根 bar 支持 Bar / Context 两类表单
- [ ] 多根 range 支持 Segment 表单
- [ ] `lib/repo/labels.ts` 增加 segment/context CRUD
- [ ] `lib/actions/label.ts` 增加 segment/context actions
- [ ] 图上显示：
  - bar labels：bar 上方 dot / badge
  - segment labels：横向 band / line
  - context labels：bar 下方 marker 或侧栏摘要
- [ ] 右侧 panel 根据选择类型切换：
  - 单 bar：Bar / Context
  - range：Segment
- [ ] 已有标注可回填、修改、删除
- [ ] JSONL 导出包含 bar / segment / context

### 验收
- 拖动选择多根 K 线后能保存 segment label
- 单根 bar 能同时保存 bar labels 和 context labels
- 图上能看出哪些 bar / segment 已标注
- 导出的 JSONL 能表达完整标注

---

## V1 完成定义

M1–M4 完成后就是 V1：

> 打开本地 ES 5m RTH 数据，标注单根 bar、segment、context，并导出 JSONL。

---

## 未来（先不做）

- ETH / DAY / RTH 视图切换
- 上传任意 CSV
- 字典编辑 UI
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
