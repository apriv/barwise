# Import & Export

V1 数据格式契约。导入是 CSV，导出是 JSONL（训练用）+ CSV（备份/查阅用）。

---

## Import: CSV → SQLite

### 1. 接受的列

最小列集（**必须**有，列名大小写不敏感）：

```
datetime, open, high, low, close
```

可选列：
```
volume
```

**不接受**多 instrument 混合的文件——一次导入只属于一个 instrument。

### 2. `datetime` 解析

按下面顺序尝试，第一个成功的赢：

1. ISO 8601 with offset：`2024-03-15T08:30:00-05:00` → 直接 parse
2. ISO 8601 无 offset：`2024-03-15 08:30:00` → 按 UI 选的 "source timezone" 解释
3. 仅日期不接受 → 报错

存库时统一转 **Unix epoch 秒（UTC）**。

### 3. Session 切分

ES 一天有两种 session 选择，导入向导让用户选：

| 选项 | 含义 | 时间范围（CT/Chicago） |
|---|---|---|
| `RTH`（默认） | 常规交易时段 | 08:30–15:00（即 ET 09:30–16:00） |
| `ETH` | 全天电子盘 | 前日 17:00 → 当日 16:00 |

切分逻辑：
- 把所有 bar 按 ts 排序
- 按上面规则归到 `session_date`（local trading date）
- 每个 session 内 `bar_number` 从 1 递增

RTH × 5min = 78 根/天。ETH × 5min ≈ 276 根/天。

### 4. 校验

导入前做下面检查，任一失败则整文件拒收：

- 必填列存在
- 每行 OHLC 是数字，且 `low ≤ open, close ≤ high`
- 时间单调递增（同一时间戳允许并报警，但不允许逆序）
- 5min 间隔（允许 session 边界跳，不允许中间断点 → 警告但不拒）

### 5. 去重

`UNIQUE (session_id, ts)` 保证同 session 内时间戳不重复。重复导入同一段数据：
- 默认行为：**跳过已存在的 bar，import 已有 session 时报告 "X 行已存在，跳过"**
- 不提供"覆盖"——如果要覆盖，用户先到 session 列表删 session（级联删 bar 和 label）

### 6. 备份

原始 CSV 复制到 `data/imports/<timestamp>__<原文件名>` 留底。

### 7. UI 流程（导入向导）

```
[1] 选文件
[2] 预览前 10 行 + 列识别
[3] 选 source timezone（默认 America/Chicago）+ session_type（默认 RTH）
[4] 校验（显示行数、session 数、潜在问题）
[5] 确认 → Server Action 写库 → 跳转 session 列表
```

---

## Export: JSONL（训练用）

每行一个 JSON 对象，**一根 bar 一行**，附带它所有标签和它收盘时的 context。这是 V1 主要导出格式，给后续 ML/NLP 用。

### 文件：`barwise_export_<YYYYMMDD_HHMMSS>.jsonl`

### 每行 schema

```json
{
  "instrument": "ES",
  "session_date": "2024-03-15",
  "session_type": "RTH",
  "bar_number": 23,
  "ts": 1710503400,
  "ohlc": { "open": 5230.25, "high": 5232.50, "low": 5229.75, "close": 5231.00, "volume": 12453 },

  "bar_labels": {
    "bar_quality": "strong_bull_bar",
    "bar_role": "follow_through_bar"
  },

  "context_labels": {
    "market_context": "trend",
    "trend_direction": "bull",
    "current_location": "near_high_of_day",
    "current_event": "continuation_attempt",
    "trade_quality": "good_context",
    "interpretation": "多头延续，但接近日高，注意衰减"
  },

  "segments": [
    {
      "field": "segment_kind",
      "value": "leg",
      "direction": "bull",
      "start_bar": 18,
      "end_bar": 25,
      "note": null
    }
  ],

  "notes": {
    "bar": null,
    "context": null
  }
}
```

**规则：**
- `bar_labels` / `context_labels` 是 `{ field: value }` 扁平字典——field 没标就不出现该 key（**不**输出 `null` 占位）。
- `segments` 是数组，因为同一根 bar 可能属于多个 segment（pullback 内套 leg）。如果 bar 不属于任何 segment，输出空数组。
- 时间戳是 Unix epoch 秒（UTC）。
- 所有 `value` 是字典里的英文 `key`，方便 ML pipeline 处理。

### 过滤选项（导出向导）

- 日期范围：`from` → `to`
- Session 类型：RTH / ETH / 全部
- 仅导出"有任意标签"的 bar：勾选框（默认关；勾上后未标注的 bar 不出现在 JSONL）

---

## Export: CSV（备份 / 人工查阅）

三个独立 CSV 文件，对应三张 label 表 + session 元数据。打包成 zip 下载。

### `bar_labels.csv`
```
session_date,session_type,bar_number,ts,field,value,note,created_at
```

### `segment_labels.csv`
```
session_date,session_type,start_bar,end_bar,field,value,direction,note,created_at
```

### `context_labels.csv`
```
session_date,session_type,bar_number,ts,field,value,note,created_at
```

加一个 `bars.csv`（可选，文件大时勾掉）：
```
session_date,session_type,bar_number,ts,open,high,low,close,volume
```

---

## 导出实现要点

- 用 Route Handler 流式写出（`new Response(stream)`），不一次性载入内存。
- JSONL 时按 (session_date, bar_number) 排序输出，方便人工查阅。
- 文件名包含时间戳，避免覆盖。
- 导出**不**带字典定义。字典快照如果需要，单独导 `label_dictionary.csv`。

---

## 未来：增量导出 / 数据集版本

V1 不做。V2 训练数据集化时再加：
- 给每次导出加 `export_manifest.json`：包含 query 参数、字典 snapshot hash、行数
- 用 hash 做训练数据可重现性
