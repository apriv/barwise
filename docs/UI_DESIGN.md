# UI Design

桌面优先。当前产品节奏：

- M1：RTH session 图表，已完成
- M2：单根 bar 的简单标签
- M3：完善标签体系和导出数据格式设计
- M4：多 K / segment / context 标注与图上显示

---

## 全局布局

```
┌────────────────────────────────────────────────────────────────┐
│  BarWise   Sessions   Demo                                     │
├────────────────────────────────────────────────────────────────┤
│                       <page content>                           │
└────────────────────────────────────────────────────────────────┘
```

Labels / Export 做出来后再加入 top nav。

---

## Session 列表 `/sessions`

```
┌────────────────────────────────────────────────────┐
│  Sessions                                          │
├────────────────────────────────────────────────────┤
│  Date         Type   Bars  Labeled  Loaded         │
│  2024-03-15   RTH    78    12/78    2h ago         │
│  2024-03-14   RTH    78    78/78    yesterday      │
│  2024-03-13   RTH    78    0/78     —              │
└────────────────────────────────────────────────────┘
```

- 打开页面时自动读取 `data/samples/es_5m.csv`
- 只显示 RTH
- 默认按日期降序
- 行点击 → `/sessions/[sessionId]`

---

## M2 标注页：单根 Bar Label

M2 只做一个简单可用的单根 bar 标注体验。

```
┌──────────────────────────────────────────────┬───────────────┐
│  2024-03-15 RTH, 78 bars   Prev Next         │  Bar Label    │
├──────────────────────────────────────────────┤               │
│                                              │  Bar #23      │
│   [ lightweight-charts candlestick chart ]   │               │
│                                              │  simple tags  │
│                                              │  note         │
└──────────────────────────────────────────────┴───────────────┘
```

### Chart
- hover 显示 bar_number + OHLC + volume
- 点击 bar 选中
- 选中 bar 用简单高亮显示
- 已标注 bar 画一个 dot

### Label Panel
- 未选择：显示当天已标注统计
- 选中 bar：显示简单标签选项 + note
- 标签点击后保存
- 刷新页面后回填已有标签

M2 不要求最终标签组设计。可以先使用 `LABEL_DICTIONARY.md` 中 `bar_quality` / `bar_role` 的初始枚举，也可以先收敛成更少的临时选项；M3 再正式定稿。

### M2 键位

| 键 | 动作 |
|---|---|
| `←` / `→` | 选中前/后一根 bar |
| `Esc` | 取消选择 |
| `n` / `p` | 下一天 / 上一天 |

---

## M3 设计：标签体系和数据格式

M3 不急着堆 UI 功能，先把标签设计定清楚。

### Bar Labels

来源：`LABEL_DICTIONARY.md` 的 `category=bar`。

- `bar_quality`：K 线本身强弱/形态
- `bar_role`：这根 bar 在结构里的角色

UI 设计要确定：
- 每个 field 的显示顺序
- 每个 key 的显示 label、说明、颜色
- field 是必填还是可空
- 同一 bar 同一 field 单选
- note 是每个 field 一条，还是整个 bar 共用一条

### Segment Labels

来源：`category=segment`。

- `segment_kind`
- `direction`
- note

UI 设计要确定：
- range 如何选择
- segment band 如何画
- 多个 segment 重叠时如何显示
- 点击已有 segment 后如何编辑

### Context Labels

来源：`category=context`。

- `market_context`
- `trend_direction`
- `current_location`
- `current_event`
- `trade_quality`
- interpretation note

UI 设计要确定：
- context 是挂在某根 bar 收盘时
- 多个 context field 如何分组
- context marker 如何和 bar label 区分

---

## M4 标注页：完整 Bar / Segment / Context

M4 的目标是把 M3 设计实现出来。

```
单根 bar selected:
┌ chart ┬ panel: tabs [Bar] [Context] ┐

range selected:
┌ chart ┬ panel: Segment Label        ┐
```

### 选择模式

| 操作 | 结果 | Panel |
|---|---|---|
| 点击单根 bar | 选择 bar | Bar / Context |
| 拖动横扫多根 bar | 选择 range | Segment |
| Esc | 清除选择 | 空状态 |

### 图上显示
- bar label：bar 上方 dot / badge
- segment label：横向 band / line
- context label：bar 下方 marker 或侧栏摘要

显示优先级要避免遮挡 K 线主体。颜色由 M3 设计决定。

---

## Labels `/labels`

M2 后可以先做简单 bar labels 列表。M4 后扩展到三类标签。

```
2024-03-15  #23  bar_quality = strong_bull_bar   [Open]
2024-03-15  #24  bar_role = follow_through_bar   [Open]
2024-03-15  #20-#28 segment_kind = pullback      [Open]
```

---

## Export `/export`

M3 先设计 JSONL schema；M4 完整实现导出。

V1 优先 JSONL，不做 CSV zip。

---

## 未来再说

- ETH / DAY / RTH 切换
- 上传 CSV
- 字典编辑 UI
- CSV zip
- 回放模式
