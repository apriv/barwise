# UI Design

布局、交互、键位。所有页面**桌面优先**，不做移动端适配。

---

## 全局布局

```
┌────────────────────────────────────────────────────────────────┐
│  BarWise   Sessions   Labels   Dictionary   Import   Export    │  ← top nav
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                       <page content>                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Top nav 在 `app/layout.tsx` 里，所有页面共享。

---

## 标注页 `/sessions/[sessionId]`

这是核心页面。布局：

```
┌──────────────────────────────────────────────┬───────────────┐
│  Session: 2024-03-15 (DAY, 288 bars)         │  Label Panel  │
│  ◀ prev   Mar 15 ▾    next ▶                 │               │
├──────────────────────────────────────────────┤  [Bar #23]    │
│                                              │               │
│   [ lightweight-charts canvas ]              │  bar_quality  │
│                                              │  ○ strong_bull│
│   [ SelectionOverlay (canvas/svg) ]          │  ● weak_signal│
│                                              │  ...          │
│   [ LabelBadges overlay ]                    │               │
│                                              │  bar_role     │
│                                              │  ...          │
│                                              │               │
│                                              │  Note:        │
│                                              │  [____________]│
│                                              │               │
│                                              │  [Save] [Del] │
├──────────────────────────────────────────────┤               │
│  Inline label timeline (small strip)         │               │
└──────────────────────────────────────────────┴───────────────┘
```

宽度：chart 区 70%，label panel 30%（最小 360px，可拖动调整）。

### Chart 区

- **lightweight-charts** 渲染 OHLC。
- 默认显示整个 session（一天内所有 5 分钟 bar）。
- 鼠标 hover → 顶部显示当前 bar 的 OHLC + bar_number + ts。
- 滚轮缩放、左右拖动平移（lightweight-charts 自带）。
- 主图叠两层 overlay（都是 absolutely positioned `<canvas>` 或 SVG，跟随 chart 时间轴变化）：
  - **SelectionOverlay**：用户当前框选的范围（半透明矩形）
  - **LabelBadges**：已存在的标签以小图标/色块叠在对应 bar 上

### 选择模式

| 操作 | 结果 | 触发的面板 |
|---|---|---|
| **左键点击单根 bar** | 选中该 bar | Bar Label + Context Label 两个 tab |
| **左键拖动横扫** | 选中 [start_bar, end_bar] 范围 | Segment Label |
| **Esc** | 清除选择 | 关闭面板 |
| **左键空白处** | 清除选择 | 同上 |

拖动方向不重要（左→右或右→左都得到同一个范围）。

### Label Panel（右侧）

根据当前选择动态切换内容：

- **未选择**：显示当天 session 的统计（已标注 bar 数、已标注 segment 数）+ 操作提示
- **选中单根 bar**：tab 切换 Bar Label / Context Label，每个 tab 下按 field 分组列出字典里的选项（radio button 风格）+ 一个 note 字段
- **选中范围**：Segment Label 表单：field=segment_kind 单选 + direction 单选 + note

**保存**：单选项一旦点击立即保存（optimistic UI + Server Action），note 字段失焦后保存。**不**需要显式 "Save" 按钮，但保留一个 "Clear All Labels for this bar" 按钮。

**已有标签的回填**：进入 panel 时把已存在的值预选高亮。

### Bottom strip（标签时间线）

chart 下方一条窄横条，把当前 session 所有 bar 用方格表示：
- 方格底色：已标注 = 浅色填充，未标注 = 灰
- 上方一行小色块表示 bar_quality 类别
- 下方一行表示 segment 覆盖范围
- 点方格 = 等同点 chart 上对应 bar，跳过去

让用户一眼看出今天哪里没标完。

---

## 键位

| 键 | 动作 |
|---|---|
| `←` / `→` | 选中前/后一根 bar |
| `Shift + ←` / `Shift + →` | 扩展选择范围 |
| `Esc` | 取消选择 |
| `n` / `p` | 跳下一/上一个 session |
| `1`–`9` | 快速给当前选中 bar 打 `bar_quality` 的第 N 个枚举（按字典 sort_order） |
| `g` | jump to bar number 输入框获焦 |
| `?` | 显示键位帮助 modal |
| `Cmd/Ctrl + S` | 强制保存当前 panel（防保险） |
| `Delete` | 清除当前 bar 的所有标签（要二次确认） |

V1 实现核心几个：`←/→`、`Esc`、`n/p`、`Delete`、`?`。`1`–`9` 和扩展选择放到 M3。

---

## Session 列表 `/sessions`

```
┌────────────────────────────────────────────────────┐
│  All Sessions                          [+ Import]  │
├────────────────────────────────────────────────────┤
│  Date         Type   Bars  Labeled  Last Edit      │
│  2024-03-15   DAY    288   12       2h ago         │
│  2024-03-14   DAY    288   78 ✓     yesterday      │
│  2024-03-13   DAY    288   0        —              │
│  ...                                               │
└────────────────────────────────────────────────────┘
```

- 默认按日期降序
- "Labeled" 列 = 至少有一条 label 的 bar 数 / 总 bar 数
- 行点击 → 跳标注页
- 行末有"删除 session" overflow 菜单

---

## Labels 浏览 `/labels`

```
┌──────────────────────────────────────────────────────────┐
│  Filter:  [category ▾] [field ▾] [value ▾] [date range]  │
├──────────────────────────────────────────────────────────┤
│  2024-03-15  bar#23  bar_quality = strong_bull_bar       │
│              "突破后的跟进强"                              │
│              [Open in chart]                             │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

V1 极简：列表 + 过滤 + 跳回原图。搜索关键字（note 字段）放到 M4。

---

## Dictionary 管理 `/labels/dictionary`

每个 (category, field) 一组：

```
▼ context / current_location
   ┌────────────────────────────────────────────────────┐
   │ key                       label             used   │
   │ near_high_of_day          接近日内高点       42     │
   │ near_low_of_day           接近日内低点       38     │
   │ middle_of_range           区间中间           7      │
   │ ...                                                │
   │ [+ Add]                                            │
   └────────────────────────────────────────────────────┘
```

行操作（hover 出现）：编辑 / 停用 / 重命名 key（带影响计数）。

---

## Local Data Sync `/import`

V1 先不做上传。页面读取 `data/samples/es_5m.csv`，同步到 SQLite，并按一天一个 session 生成列表。

1. **Sync** — 点击按钮
2. **Validate** — 校验 CSV 和 session 切分
3. **Confirm** — 写库完成后跳 `/sessions`

---

## Export 向导 `/export`

```
[ Date range ]      [ from ] → [ to ]
[ Session type ]    ● Both  ○ RTH  ○ ETH
[ Format ]          ● JSONL  ○ CSV (zip)
[ Only labeled bars ] ☐
                                    [Download]
```

按钮点击 → 跳 `/api/export/jsonl?...`，Route Handler stream 下载。

---

## 视觉风格

- **Tailwind v4**，配色 zinc + 一个强调色（决定时再选，暂用 blue-500）
- **暗色优先**：交易工具用暗色减少疲劳。`<html class="dark">` 默认开。
- 字体：Geist Mono 给数字（OHLC、价格），Geist Sans 给 UI 文字。
- 不引入 UI 库（shadcn 等）——V1 元素少，自己写。

---

## 性能预算

- 单 session ≤ 280 bars，lightweight-charts 没压力
- LabelBadges 重绘要做：用 `requestAnimationFrame` + 只在 chart 视口变化时重画
- Server Action 写一条 label 应在 50ms 内返回（SQLite WAL 单写无锁等待）
- 整个标注页 first paint 目标 < 500ms
