# Roadmap

目标先做一个自己每天能用的 MVP：打开本地 ES 5m 数据，只看 RTH，每天一张图，点 bar 打标签，最后能导出。

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

## M1 — RTH Chart（当前）

**目标：** 直接读取 `data/samples/es_5m.csv`，只显示 ES RTH，每个交易日一张图。

### 任务
- [x] `lib/import/csv-parse.ts`：解析本地 CSV，校验 OHLC
- [x] `lib/import/session-build.ts`：按 RTH 切 session，生成 `bar_number`
- [x] `lib/data/local-es.ts`：打开页面时自动同步本地 CSV 到 SQLite
- [x] `lib/repo/sessions.ts`、`lib/repo/bars.ts`：读取 session 和 bars
- [x] `/sessions`：列出 RTH sessions，日期降序
- [x] `/sessions/[sessionId]`：显示当天 RTH K 线图
- [ ] 顶部 prev / next day 切换

### 不做
- 上传 CSV
- `/import` 页面
- session 类型切换 UI
- ETH / DAY 显示
- 删除 session / 覆盖导入

### 验收
- 打开 `/sessions` 自动看到本地 CSV 里的 RTH 日期列表
- 每天约 78 根 5 分钟 bar
- 打开任意一天，图表正常显示、缩放、hover 看 OHLC
- prev / next day 切换流畅

---

## M2 — Bar Labels（MVP 核心）

**目标：** 点一根 bar，打 `bar_quality` / `bar_role`，自动保存。

### 任务
- [ ] `lib/repo/dictionary.ts`：读取 active bar label 字典
- [ ] `lib/repo/labels.ts`：`bar_labels` CRUD
- [ ] `lib/actions/label.ts`：`upsertBarLabel`、`deleteBarLabel`
- [ ] 图表点击选择 bar
- [ ] 选中状态同步到 URL：`?bar=23`
- [ ] 右侧 `<BarLabelForm>`：只做 `bar_quality` / `bar_role` + note
- [ ] 保存后刷新页面数据
- [ ] 已标注 bar 在图表上显示一个简单 dot
- [ ] 键盘：`←/→` 切 bar，`Esc` 取消

### 不做
- segment labels
- context labels
- 拖动框选
- optimistic UI
- 快捷键 1-9
- 字典编辑页面

### 验收
- 点击 bar 后右栏出现表单
- 点选 label 后 SQLite 里立刻查得到
- 刷新页面后已选 label 仍然回填
- 已标注 bar 有视觉标记
- `←/→` 可以逐根切换

---

## M3 — Review & JSONL Export（够用版）

**目标：** 能看已标注内容，导出 JSONL。

### 任务
- [ ] `/labels`：列出所有 bar labels
- [ ] 每行 "Open" 跳回 `/sessions/[id]?bar=N`
- [ ] `lib/export/jsonl.ts`：导出 bars + bar_labels
- [ ] `/export`：一个按钮下载 JSONL

### 不做
- CSV zip
- 复杂过滤器
- note 全文搜索
- 字典管理
- segment/context 导出
- 数据集 manifest

### 验收
- 标注完几天后，可以浏览所有标签
- 随机点一条能回到对应图表和 bar
- JSONL 行数、bar_number、label value 正确

---

## V1 完成定义

M1–M3 完成后就是 V1：

> 打开本地 ES 5m 数据，只看 RTH；标注 5 天的 bar_quality / bar_role；导出 JSONL。

---

## 未来（先不做）

- ETH / DAY / RTH 视图切换
- segment labels
- context labels
- 上传任意 CSV
- CSV export
- 字典编辑 UI
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
