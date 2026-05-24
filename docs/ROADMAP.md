# Roadmap

里程碑划分原则：**每个 milestone 完成后都是一个能用的工具**，不是半成品。M1 完成后已经可以"打开一天 K 线、点 bar、保存 bar 标签"；只是 segment、context、导出还没接上。

时间估算是粗略目标（单人 part-time），不是承诺。

---

## M0 — Foundation（基建）

**目标：** 数据库 + 一个能跑起来的 Next.js 16 骨架。

### 任务
- [x] 装依赖：`better-sqlite3`、`zod`（输入校验）、`papaparse`（CSV 解析）（`lightweight-charts` 已装于预热 demo）← M0-C2
- [x] 建目录：`lib/db/`、`lib/repo/`、`lib/import/`、`lib/export/`、`lib/actions/`、`components/label-panel/`（`components/chart/`、`components/ui/` 已建）← M0-C2
- [x] `lib/db/client.ts`：`better-sqlite3` 单例 + WAL/foreign_keys PRAGMA ← M0-C2
- [x] `lib/db/migrate.ts`：启动时跑迁移 ← M0-C2
- [x] `lib/db/migrations/001_init.sql`：所有表（见 `DATA_MODEL.md`）← M0-C2
- [x] `lib/db/seed-dictionary.ts`：把 `LABEL_DICTIONARY.md` 里的初始字典写库 ← M0-C3
- [x] `data/` 加 `.gitignore`（提交于 init docs/plot；`/data/samples/` 例外入 git）
- [x] Top nav layout（`app/layout.tsx`），暗色主题 ← M0-C1
- [x] 首页占位（指向 Sessions 和 Import）← M0-C1
- [x] `.claude/settings.local.json` 允许 `npm run dev`、`npm install` 等

### 验收
- `npm run dev` 启动后，访问首页能看到 nav
- 第一次启动自动建库、跑迁移、seed 字典
- 重启不会重复 seed
- `sqlite3 data/barwise.db ".tables"` 能看到全部表

**估时：** 4–6 小时

---

## M1 — Import & Display（导入 + 显示图表）

**目标：** 导一个 CSV 进来，能在标注页看到 K 线图。

### 任务
- [ ] `lib/import/csv-parse.ts`：用 papaparse 解析、校验、规范化
- [ ] `lib/import/session-build.ts`：按 RTH/ETH 切 session、生成 bar_number
- [ ] `lib/repo/sessions.ts`、`lib/repo/bars.ts`：CRUD
- [ ] `lib/actions/import.ts`：Server Action，事务性写入
- [ ] `/import` 页面：拖拽上传 → 预览 → 校验 → 确认（四步向导）
- [ ] `/sessions` 列表页：日期降序、显示 bar 数和已标注计数
- [ ] `/sessions/[sessionId]` 页面：
  - Server Component 取 session + bars
  - 传给 `<Chart>` Client Component
  - `<Chart>` 用 lightweight-charts 渲染 OHLC
- [ ] 顶部 prev/next session 切换 + 日期选择
- [ ] Top nav 高亮当前页

### 验收
- 拿一个真实的 ES 5min CSV 测试，全部正确切 session
- 同一文件重复导入，跳过已有 bar，不报错
- 标注页打开任意 session，K 线正常显示、能缩放、能 hover 看 OHLC
- 切换 prev/next session 不丢状态、不慢

**估时：** 10–14 小时

---

## M2 — Bar Labels（单根 K 线标注）

**目标：** 点 bar、打 bar_quality / bar_role 标签、保存。

### 任务
- [ ] `lib/repo/labels.ts`：CRUD for `bar_labels`
- [ ] `lib/repo/dictionary.ts`：读字典
- [ ] `lib/actions/label.ts`：`upsertBarLabel`、`deleteBarLabel`
- [ ] `<Chart>` 加 click 检测：把屏幕坐标映射到 bar_number（lightweight-charts API: `timeScale().coordinateToTime()`）
- [ ] `<SelectionOverlay>`：高亮选中 bar 的半透明矩形
- [ ] `<BarLabelForm>`：按 field 分组、单选 radio、note 字段
- [ ] 选中状态通过 URL search param 同步（`?bar=23`）—— 刷新不丢
- [ ] 保存后 `revalidatePath`，新标签出现在 `<LabelBadges>`
- [ ] `<LabelBadges>`：在 bar 上方画一个色块/dot 表示已标注
- [ ] 键位：`←/→` 切 bar、`Esc` 取消、`Delete` 清除标签

### 验收
- 点 bar 后右栏出现表单，已有值预选
- 选项点击立即持久化（DB 查得到）
- 切到下一根 bar 不影响刚才的保存
- 已标注 bar 上有视觉标记
- `←/→` 平滑切换、不丢已有选择

**估时：** 12–16 小时

---

## M3 — Segment & Context Labels（段标签 + 语境标签）

**目标：** 拖动框选打 segment label；同一个单选 bar 也能打 context label。

### 任务
- [ ] `<SelectionOverlay>` 支持拖动选择 [start, end] 范围
- [ ] `<SegmentLabelForm>`：segment_kind + direction + note
- [ ] `<ContextLabelForm>`：5 个 field 的语境表单
- [ ] `lib/repo/labels.ts` 加 segment_labels / context_labels
- [ ] `lib/actions/label.ts` 加对应 action
- [ ] `<LabelBadges>` 画 segment：在 bar 时间轴上画一条横线/色带
- [ ] panel 顶部 tab 切换（单 bar：Bar / Context；范围：Segment）
- [ ] 同一 bar 多 field 全部同时可见 / 可编辑

### 验收
- 拖动横扫产生范围（左右方向都行），松手出现 segment 表单
- 一根 bar 可以同时有 bar_quality + bar_role + 5 个 context 字段，全部独立保存
- segment 在 chart 上可视化（颜色按 direction）
- 取消选择/切 bar 时 panel 内容平滑切换

**估时：** 14–18 小时

---

## M4 — Review & Export（浏览 + 导出）

**目标：** 看已标注的清单、跳回原图、导 JSONL 和 CSV。

### 任务
- [ ] `/labels` 浏览页：列表 + (category, field, value, 日期范围) 过滤
- [ ] note 字段全文搜索（SQLite `LIKE`，V1 不引 FTS）
- [ ] 每行 "Open in chart" → 跳 `/sessions/[id]?bar=N`
- [ ] `/export` 向导：日期范围、类型、格式、only-labeled 开关
- [ ] `lib/export/jsonl.ts`：流式生成 NDJSON
- [ ] `lib/export/csv.ts`：流式生成多 CSV + zip
- [ ] `app/api/export/[format]/route.ts`：Route Handler 流式下载
- [ ] `/labels/dictionary` 字典管理页：列出 / 编辑 / 停用 / 重命名（带影响计数）

### 验收
- 导出 JSONL：手动 `wc -l` 行数对得上、随机抽几行 JSON schema 正确
- 导出 CSV zip：解压、用 pandas 读取 OK
- 字典里改一个 key 的名字，所有已有标注同步更新
- 停用一个 key 后，UI 选项里不再出现，但已有数据保留

**估时：** 12–16 小时

---

## V1 完成定义

M0–M4 全部 done = V1 发布。

**手感验收（真实任务）：**
> "导入过去 20 个交易日的 ES 5min CSV，标注其中 5 天（每天 ~40 条标签），导出 JSONL。从开始到导出不超过 2 小时。期间不崩、不丢数据。"

如果这个任务能完成，V1 OK。

---

## 未来（V2+）

按价值从高到低排序，**不**承诺时间。

### V2 — NLP 半自动标注
- 接 YouTube transcript 抓取
- LLM/NLP pipeline 把字幕段映射到 bar 范围 + 候选标签
- 候选标签进 DB 时打 `source = 'nlp:youtube'`，UI 上区分人工和机器
- 人工审核 + 接受/拒绝/修改候选

### V3 — 模型训练
- 数据集化：固定 train/val/test split，导出带 manifest
- baseline 模型：把 (window of 20 bars + context) → bar_quality 分类
- 集成评估 dashboard

### V4 — 实时解说助手
- 接实时 ES 数据
- 模型对当前 bar 收盘做 context 预测和解释
- 与人工读盘对比、记录差异

### V5 — 检索 & 复盘
- 按标签组合反向检索"历史上类似的 setup"
- Replay mode：bar-by-bar 重放、隐藏未来、考自己

---

## 不在 roadmap 上

明确**不做**的事情，列出来避免日后纠结：

- 多用户、登录、远程部署
- 多 instrument 多市场（schema 已留位，但 UI 只支持 ES）
- 移动端
- 自动交易、信号推送
- 任何金融建议性质的产品功能

---

## 当前状态

- [x] 项目初始化（Next.js 16 + Tailwind v4）
- [x] 设计文档（本目录）
- [x] 数据获取脚本（`scripts/fetch_es.py` via yfinance, 60d ES=F 5min）
- [x] Demo K 线渲染（lightweight-charts v5，`/demo`）
- [x] M0 基建（C1 ✅ nav + landing；C2 ✅ SQLite；C3 ✅ dictionary seed）
