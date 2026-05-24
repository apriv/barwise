# Input & Export

V1 数据格式契约。输入是本地 CSV，导出优先 JSONL。

---

## Input: Local CSV → SQLite

V1 不做上传。数据源固定为 `data/samples/es_5m.csv`，由 `scripts/fetch_es.py` 维护；打开 `/sessions` 时应用自动读取这个本地 CSV，并同步 RTH sessions 到 SQLite。

### 1. 接受的列

最小列集（**必须**有，列名大小写不敏感）：

```
datetime, open, high, low, close
```

可选列：
```
volume
```

**不接受**多 instrument 混合的文件。V1 固定 ES。

### 2. `datetime` 解析

按下面顺序尝试，第一个成功的赢：

1. ISO 8601 with offset：`2024-03-15T08:30:00-05:00` → 直接 parse
2. ISO 8601 无 offset：`2024-03-15 08:30:00` → 按 UI 选的 "source timezone" 解释
3. 仅日期不接受 → 报错

存库时统一转 **Unix epoch 秒（UTC）**。

### 3. Session 切分

当前只切 RTH：

| 选项 | 含义 | 时间范围（CT/Chicago） |
|---|---|---|
| `RTH` | 常规交易时段 | 08:30–15:00（即 ET 09:30–16:00） |

切分逻辑：
- 把所有 bar 按 ts 排序
- 只保留 RTH 时间范围
- 按 America/Chicago 日期归到 `session_date`
- 每个 session 内 `bar_number` 从 1 递增

RTH × 5min = 78 根/天。

### 4. 校验

读取前做下面检查，任一失败则拒收：

- 必填列存在
- 每行 OHLC 是数字，且 `low ≤ open, close ≤ high`
- 时间单调递增（同一时间戳允许并报警，但不允许逆序）
- 5min 间隔（允许 session 边界跳，不允许中间断点 → 警告但不拒）

### 5. 去重

`UNIQUE (session_id, ts)` 保证同 session 内时间戳不重复。重复打开页面时已有 bar 会跳过。

### 6. 备份

不额外备份，因为源文件已经在 `data/samples/es_5m.csv`。

### 7. UI 流程

```
[1] 打开 /sessions
[2] 读取 data/samples/es_5m.csv
[3] 校验 + 按 RTH 切 session
[4] 显示日期列表
```

---

## Export: JSONL（训练用）

M2 只需要导出 bar labels。M3 会正式完善 JSONL schema，M4 再把 segment/context 加进去。

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

  "context_labels": {},
  "segments": []
}
```

**规则：**
- `bar_labels` / `context_labels` 是 `{ field: value }` 扁平字典。
- `segments` 是数组。
- field 没标就不出现该 key，不输出 `null` 占位。
- 时间戳是 Unix epoch 秒（UTC）。
- 所有 `value` 是字典里的英文 `key`，方便 ML pipeline 处理。

### 导出选项

- V1 只导出 RTH
- M2 默认只导出有 bar label 的 bar
- M4 支持导出 bar / segment / context

---

## 导出实现要点

- 用 Route Handler 流式写出（`new Response(stream)`），不一次性载入内存。
- JSONL 时按 (session_date, bar_number) 排序输出，方便人工查阅。
- 文件名包含时间戳，避免覆盖。
- 导出不带字典定义。
