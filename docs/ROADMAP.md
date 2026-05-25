# Roadmap

目标先做一个自己每天能用的标注工具：打开本地 ES 5m 数据，只看 RTH，每天一张图，先能给单根 K 线打标签；之后再完善标签体系（Bar / Segment / Context 三类，Outcome 推迟到未来）、多 K/context 标注，以及图上的标注显示。

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

## M2 — Bar Labels（已完成）

**目标：** 点一根 K 线，选择 `bar_quality` / `bar_role` 标签，保存到 `bar_labels`。此阶段不设计新标签，只把单根 bar 标注动作跑通。

### 范围
- 只标单根 bar
- 只使用 `LABEL_DICTIONARY.md` 里的 `bar_quality` / `bar_role`
- 每个 field 单选，可不填
- 允许 note
- 保存到 `bar_labels`

### 任务
- [x] `lib/repo/dictionary.ts`：读取 active bar label 字典
- [x] `lib/repo/labels.ts`：`bar_labels` CRUD
- [x] `lib/actions/label.ts`：`upsertBarLabel`、`deleteBarLabel`
- [x] 图表点击选择 bar
- [x] 选中状态同步到 URL：`?bar=23`
- [x] 右侧 `<BarLabelForm>`：展示 `bar_quality` / `bar_role` + note
- [x] 保存后刷新页面数据
- [x] 即点即存 + toggle 取消（再次点击同一选项 → 删除）
- [x] 键盘：`←/→` 切 bar，`Esc` 取消

### 推迟
- **已标注 bar 在图表上显示 dot** → 推到 M5，和 segment band / context marker 一起做颜色和优先级统一设计

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

## M3 — Label Design（已完成）

**目标：** 根据 `LABEL_DICTIONARY.md` 定稿三类标签（Bar / Segment / Context）的 tag、底层 field 映射、note 归属、数据存储方式，为 M4 开发做准备。Outcome（第 4 类）推迟到未来。

### 已完成
- [x] 三层数据结构定稿：**Tag（V1 唯一存储）→ Field（由映射表派生）→ Note（自由文本）**
- [x] V1→V4 演化路径：V1 自由 tag、V2 taxonomy、V3 升级为 field、V4 NLP/ML
- [x] 人工标注 4 种入口动作：点单根 / 框选 / 事件结束 / 当天结束
- [x] Bar 拆 **Bar Shape**（direction/body/close/tail）+ **Bar Pattern**（role/relation）两组，inside/outside 归入 Bar Pattern
- [x] Segment 底层：structure + direction（pullback / breakout_attempt / reversal_attempt 移出 Segment，归 Bar Pattern / Context.event）
- [x] Context 简化到三维：market / event / location（删 bias、删 trade_quality、删 Market Logic 整组）
- [x] **全部多选**：Bar Shape / Bar Pattern / Segment / Context 各组都允许同一标注实体下多 tag
- [x] **Tag→Field 映射表**：写入 `LABEL_DICTIONARY.md`，每个 visible tag 标出对应底层 field 的什么值
- [x] schema 改造方案：`bar_labels` / `segment_labels` / `context_labels` → `bar_tags` / `segment_tags` / `context_tags`（一行一 tag，去 UNIQUE(bar_id, field)），见 `DATA_MODEL.md`
- [x] `label_dictionary` schema 调整：`field` 列改名 `group_name`（含义改为 UI 分组）
- [x] note 归属：每条 tag 一个可选 note，V1 不区分 bar 级 / field 级
- [x] Outcome 类标签**V1 不实现**，挪到"未来（先不做）"

### 收尾任务（M4 启动前要完成）
- [x] 写 migration `002_tag_model.sql`：DROP 旧三表 + label_dictionary 清空 + CREATE 新三表 + ALTER `label_dictionary` 列名
- [x] 写新 dictionary seed：根据 `LABEL_DICTIONARY.md` 把所有 visible tag 灌入 `label_dictionary`
- [x] 删除/重写 `lib/repo/labels.ts`、`lib/actions/label.ts` 中针对旧 schema 的代码（M2 写的 bar_labels CRUD 需要适配 bar_tags + 多选语义）
- [x] 适配 `components/label-panel/BarSelectionPanel.tsx`：从"每 field 单选 radio"改为"每 group 多 tag checkbox"
- [x] 更新 `UI_DESIGN.md`：UI 分组（Bar Shape / Bar Pattern / Segment / Context）、tag 多选交互、M5 显示规则草稿
- [x] 标注 SOP：在 `LABEL_DICTIONARY.md` 已加"标注 SOP"小节，跑一段时间后视情况补充

### 不做

- 字典管理 UI（停用 / 重命名 key）
- JSON/JSONL 导出
- NLP / 自动标注
- 多用户数据权限
- Outcome 类标签

### 验收

- `LABEL_DICTIONARY.md` 包含所有四类（注：Outcome 仅占位说明 V1 不做）的 visible tag 完整列表 + Tag→Field 映射 ✅
- `DATA_MODEL.md` 包含新 tag 模型 schema、M3→M4 迁移方案 ✅
- 收尾任务完成后，M4 可以直接动 UI / repo / action，不再回头改 schema

---

## M4 — Segment & Context Labels

**目标：** 支持多 K 范围标注、segment label、context label。此阶段只负责标注数据的选择、保存、回填、修改和删除，不做复杂图上显示。

### 任务
- [x] 图表支持选择 bar range：普通点击选 bar，Shift-click 选择 range
- [x] 单根 bar 支持 Bar / Context 两组多 tag 表单
- [x] 多根 range 支持 Segment 多 tag 表单
- [x] `lib/repo/labels.ts` 增加 segment_tags CRUD
- [x] `lib/repo/labels.ts` 增加 context_tags CRUD
- [x] `lib/actions/label.ts` 增加 segment actions
- [x] `lib/actions/label.ts` 增加 context actions
- [x] 右侧 panel 根据选择类型切换：
  - [x] 单 bar：Bar / Context
  - [x] range：Segment
  - [x] 同时优化 UI tag 选择有大分类和小选项，更容易选择，而不是全都连在一起
- [x] Bar tag 选择 UI：按大类分组，使用紧凑小选项，并提供即时选中反馈
- [x] 已有标注可回填、修改、删除（segment 当前按完全相同 start/end range 回填）

### 不做
- 图上复杂显示
- JSON/JSONL 导出

### 验收
- Shift-click 选择多根 K 线后能保存 segment label ✅
- 单根 bar 能同时保存 bar labels 和 context labels ✅
- 已有 segment / context 能回填、修改、删除 ✅
- 切换 bar 或 range 不丢已保存数据 ✅

---

## M5 — Label Visualization

**目标：** 把已标注内容清楚显示在图上，让复盘时一眼看出哪些 bar、segment、context 已标注。

### 任务
- [x] 选中 bar 时高亮对应标注
- [x] 选中 range 时高亮对应标注
- [x] bar 编号提示：每 2–3 根 K 线在下方显示低调小号 bar_number
- 整体UI
  - 允许深色/浅色模式切换 
  - [x] 下拉时保持 K 线图不变，只滚动 bar tags 选择。
  - [x] 允许每组 bar tag 收起
  - [x] 右侧默认收起 OHLC，有个按钮可以展开。这个看得比较少
- tag的UI显示 
  - [x] bar label：bar 上方 dot / badge
  - [x] segment label：横向 band / line
  - [x] context label：bar 下方 marker 或侧栏摘要
  - segment 的回填现在只有完全对应的 segment 会显示；后续需要显示/提示相交 segment
- [x] 加一个按钮隐藏/显示已标记的记号，有点眼花。只保留当前选择的
- [ ] 图表上下文：每个 RTH session 额外显示前一天 RTH 最后一根、后一天 RTH 第一根（待定 先不做）

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

- **Outcome Labels**：第 4 类标签，事后回看打的结果（failed_breakout / continued / reversed 等）。需要设计 outcome ↔ segment/context 的锚定关系。先用 segment note 兜底。
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
