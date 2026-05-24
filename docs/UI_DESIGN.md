# UI Design

MVP 桌面优先，只保留正在做的最小闭环：RTH session 列表、单日图表、bar label 面板、简单浏览和 JSONL 导出。

---

## 全局布局

```
┌────────────────────────────────────────────────────────────────┐
│  BarWise   Sessions   Demo                                     │
├────────────────────────────────────────────────────────────────┤
│                       <page content>                           │
└────────────────────────────────────────────────────────────────┘
```

Top nav 只放真实可用的入口。Labels / Export 做出来后再加入。

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

## 标注页 `/sessions/[sessionId]`

```
┌──────────────────────────────────────────────┬───────────────┐
│  2024-03-15 RTH, 78 bars   prev / next       │  Label Panel  │
├──────────────────────────────────────────────┤               │
│                                              │  Bar #23      │
│   [ lightweight-charts candlestick chart ]   │               │
│                                              │  bar_quality  │
│                                              │  bar_role     │
│                                              │  note         │
└──────────────────────────────────────────────┴───────────────┘
```

### Chart
- lightweight-charts 渲染 OHLC
- 默认显示整个 RTH session
- hover 显示 bar_number + OHLC + volume
- 点击 bar 选中
- 已标注 bar 画一个简单 dot

### Label Panel
- 未选择：显示当天已标注统计
- 选中 bar：显示 `bar_quality`、`bar_role`、note
- 单选项点击后立即保存
- note 先做简单保存按钮或失焦保存，哪种实现更稳用哪种

---

## 键位

V1 只做：

| 键 | 动作 |
|---|---|
| `←` / `→` | 选中前/后一根 bar |
| `Esc` | 取消选择 |
| `n` / `p` | 下一天 / 上一天 |

---

## Labels `/labels`

够用版列表：

```
2024-03-15  #23  bar_quality = strong_bull_bar   [Open]
2024-03-15  #24  bar_role = follow_through_bar   [Open]
```

不做复杂过滤，不做全文搜索。

---

## Export `/export`

一个按钮：

```
[ Download JSONL ]
```

V1 只导出 RTH + bar labels。

---

## 未来再说

- ETH / DAY / RTH 切换
- segment/context labels
- 拖动框选
- 字典管理
- CSV zip
- 回放模式
