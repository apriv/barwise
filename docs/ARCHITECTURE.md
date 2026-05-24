# Architecture

单用户、本地优先、Next.js 16 全栈一体。所有持久化都进 SQLite，所有 UI 都在浏览器渲染。

---

## 目录结构

```
barwise/
├── app/                          # Next.js 16 App Router
│   ├── layout.tsx                # 根布局，挂载全局 nav
│   ├── page.tsx                  # 首页：session 列表 + 快速操作
│   ├── import/
│   │   └── page.tsx              # CSV 导入向导
│   ├── sessions/
│   │   ├── page.tsx              # session 列表
│   │   └── [sessionId]/
│   │       └── page.tsx          # 单 session 标注页（图表 + 侧栏）
│   ├── labels/
│   │   ├── page.tsx              # 已标注数据浏览
│   │   └── dictionary/
│   │       └── page.tsx          # 标签字典管理
│   ├── export/
│   │   └── page.tsx              # 导出向导
│   └── api/                      # Route Handlers（仅在 Server Action 不合适时使用）
│       └── export/[format]/route.ts   # 流式下载导出文件
│
├── lib/                          # 服务端逻辑（不进客户端 bundle）
│   ├── db/
│   │   ├── client.ts             # better-sqlite3 单例
│   │   ├── migrations/           # 顺序 SQL 文件 001_init.sql ...
│   │   └── migrate.ts            # 启动时 apply
│   ├── repo/                     # 数据访问层（一个表一个文件）
│   │   ├── sessions.ts
│   │   ├── bars.ts
│   │   ├── labels.ts
│   │   └── dictionary.ts
│   ├── import/
│   │   ├── csv-parse.ts          # 解析 CSV
│   │   └── session-build.ts      # 切 session、生成 bar_number
│   ├── export/
│   │   ├── jsonl.ts              # 训练用 join 导出
│   │   └── csv.ts                # 原始标签表导出
│   └── actions/                  # Server Actions
│       ├── import.ts
│       ├── label.ts              # 增删改标签
│       └── dictionary.ts
│
├── components/                   # Client Components
│   ├── chart/
│   │   ├── Chart.tsx             # lightweight-charts 包装
│   │   ├── SelectionOverlay.tsx  # 框选 canvas/svg overlay
│   │   └── LabelBadges.tsx       # 已有标签的视觉标记
│   ├── label-panel/
│   │   ├── BarLabelForm.tsx
│   │   ├── SegmentLabelForm.tsx
│   │   └── ContextLabelForm.tsx
│   └── ui/                       # 通用按钮、Modal、Toast 等
│
├── data/                         # ⚠️ .gitignore: 本地数据库和导入快照
│   ├── barwise.db                # SQLite 主库
│   └── imports/                  # 导入过的 CSV 原始备份
│
└── docs/                         # 本目录
```

**关键约束：**
- `lib/` 里的代码**只在服务端运行**。不要从 `components/` 直接 import `lib/db`，要通过 Server Action 或 Server Component。
- `components/chart/` 全部是 `'use client'`，因为 lightweight-charts 需要 DOM。
- 不要把 SQLite 连接放进 React state — 用 `lib/db/client.ts` 的进程级单例。

---

## Next.js 16 注意事项

这版 Next.js **与训练数据有差异**，写代码前请对照 `node_modules/next/dist/docs/`。本节列出本项目会踩到的几点。

### 1. `params` / `searchParams` 是 Promise

```tsx
// app/sessions/[sessionId]/page.tsx
export default async function Page({
  params,
}: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  // ...
}
```

Client Component 用 React 的 `use()` hook：

```tsx
'use client'
import { use } from 'react'
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
}
```

### 2. Server Actions vs Route Handlers

**默认用 Server Action**（标签增删改、导入触发、字典编辑都是表单提交或按钮事件）。

只在以下情况用 Route Handler：
- 文件流式下载（导出 JSONL/CSV）
- 未来要给外部脚本调用的接口

### 3. `better-sqlite3` 原生模块

Next.js 16 已把 `better-sqlite3` 加入内置 `serverExternalPackages` 白名单，**无需在 `next.config.ts` 显式配置**。Turbopack（v16 默认 dev bundler）也支持。

### 4. 缓存

- 标注页的数据**全部动态**：用 Server Action 写完后调用 `revalidatePath('/sessions/[sessionId]')`。
- 不启用 `cacheComponents`（PPR），因为没必要——所有页面都是单用户实时数据。
- 标签字典页可以加 `'use cache'` + `revalidateTag('dictionary')`，但 V1 不做。

### 5. Server Action 错误处理

Server Action 抛错会冒到最近的 `error.tsx`。每个主页面（`sessions/[id]`、`import`）配一个 `error.tsx`。

---

## 数据流

### 写路径（标注一根 bar）

```
用户点击 bar → SelectionOverlay 记录范围
  → 侧栏 BarLabelForm 提交
  → Server Action `labelBar(sessionId, barId, payload)`
  → lib/repo/labels.ts INSERT/UPDATE
  → revalidatePath('/sessions/[sessionId]')
  → React Server Component 重渲染，新标签出现在 LabelBadges
```

### 读路径（打开 session）

```
URL /sessions/123 → Server Component
  → lib/repo/sessions.ts.getWithBars(123) → SQLite
  → lib/repo/labels.ts.listForSession(123) → SQLite
  → 把 bars + labels 作为 props 传给 Client Component <Chart>
  → lightweight-charts 渲染，LabelBadges 叠加标记
```

### 导出路径

```
用户点 "Export JSONL" → 跳到 /api/export/jsonl
  → Route Handler stream 写出 NDJSON 行
  → 浏览器下载
```

---

## 进程模型

- **一个进程**：`next dev` 或 `next start`。
- **一个 SQLite 连接**：`lib/db/client.ts` 用模块级单例 + WAL 模式。`better-sqlite3` 是同步 API，单进程多并发请求由 SQLite 自己排队。
- **数据目录**：`./data/`（已在 `.gitignore`）。备份就是 `cp -r data/ data.backup-YYYYMMDD/`。

---

## 安全 & 部署

- **只监听 127.0.0.1**：`next dev -H 127.0.0.1`，避免局域网误访问。
- **不做 auth**：单用户本地工具。
- **不做 CSRF token**：纯本地、无跨站脚本来源。
- **CSP**：默认 Next.js 头够用，V1 不配。

---

## 可观测性（V1 极简）

- 服务端报错走 `console.error`，由 `next dev` 输出到终端。
- 客户端报错走 `error.tsx`。
- 不接入 Sentry/Grafana。

---

## 不在 V1 里

- 任何认证、用户管理
- 远程部署、HTTPS
- 多 instrument 切换 UI（schema 留位，但 UI 写死 ES）
- 撤销/重做栈（数据库已记 created_at/updated_at，先靠手动）
- 实时数据接入
