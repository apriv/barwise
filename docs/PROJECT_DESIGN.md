# BarWise

BarWise 是一个**单用户、纯本地**的价格行为标注工具，目标是对 ES 5 分钟 K 线进行复盘、人工打标签，沉淀**可复盘、可搜索、可训练**的数据集。

项目**不做自动交易**。它服务于一个长期目标：先用人工标注建立 bar-by-bar 的读盘流程 → 再用 NLP 从 YouTube 解说字幕扩充数据集 → 最终训练一个能解说未来 K 线的模型。

---

## 范围（V1）

只做最少够用的闭环。任何超出这个闭环的功能都推迟到后续版本。

| 能力 | 说明 |
|---|---|
| 导入 K 线 | CSV → 解析 session → 写入本地 SQLite |
| 显示图表 | 用 TradingView lightweight-charts 渲染当天 session |
| 选择 K 线 | 鼠标拖动框选范围；点击单根 |
| 打标签 | 右侧栏面板根据所选范围显示对应级别的标签表单（Bar / Segment / Context） |
| 查看 | 列出已标注的 bar/segment/context，可跳回原图 |
| 导出 | 导出 JSONL（bars + labels join）用于后续分析或训练 |

**明确不做：** 多用户、登录、AI 建议、相似 case 检索、实时数据、移动端、回放模式。这些都在 [`ROADMAP.md`](./ROADMAP.md) 的"未来"里。

---

## 三类标签

参见 [`LABEL_DICTIONARY.md`](./LABEL_DICTIONARY.md) 的完整定义和枚举。

- **Bar Label** — 描述**单根** K 线本身（如 `strong_bull_bar`、`doji`、`climactic_bar`）
- **Segment Label** — 描述**一段** K 线形成的结构（如 `pullback`、`breakout_attempt`、`leg`），有起止 bar
- **Context Label** — 描述某根 K 线**收盘时**的市场语境（如 `trend / bull`、`near_high_of_day`、`good_context`）

标签字典**会演化**，因此字典本身是数据库里的可编辑表，不是硬编码枚举。

---

## 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Next.js 16 (App Router) + React 19 | 已经初始化好，单仓库覆盖前后端 |
| 样式 | Tailwind v4 | 已就位 |
| 数据库 | SQLite (`better-sqlite3`) | 单用户、零运维、备份就是拷文件；Next.js 16 已把 `better-sqlite3` 列入 `serverExternalPackages` 白名单，无需额外配置 |
| 图表 | TradingView **lightweight-charts** | 金融 K 线专用、性能足够 5min × 一年 (~7 万根)、自带十字光标和缩放 |
| 标注层 | 自写 Canvas / SVG overlay | lightweight-charts 不直接支持自定义框选区域和 badge 叠层 |
| 部署 | `next dev` / `next start`，仅 localhost | 单机就够；不引入 auth |

详见 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

---

## 文档地图

| 文档 | 内容 |
|---|---|
| [`PROJECT_DESIGN.md`](./PROJECT_DESIGN.md) | 总览（本文档） |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 目录布局、模块边界、Next.js 16 注意事项 |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | SQLite 表结构、索引、迁移策略 |
| [`LABEL_DICTIONARY.md`](./LABEL_DICTIONARY.md) | 三类标签的字段、枚举、生命周期 |
| [`IMPORT_EXPORT.md`](./IMPORT_EXPORT.md) | CSV 导入契约、JSONL 导出格式 |
| [`UI_DESIGN.md`](./UI_DESIGN.md) | 页面布局、交互、键位 |
| [`ROADMAP.md`](./ROADMAP.md) | M1–M5 里程碑和验收标准 |
