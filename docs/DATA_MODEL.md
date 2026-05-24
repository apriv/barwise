# Data Model

SQLite 单文件，存放在 `./data/barwise.db`。所有表用 `INTEGER PRIMARY KEY`（即 rowid），时间戳统一存 **Unix epoch 秒（UTC）**，避免时区歧义。

---

## ER 概览

```
instruments ──< sessions ──< bars
                                │
                                ├──< bar_labels       (per-bar)
                                ├──< segment_labels   (range: start_bar..end_bar)
                                └──< context_labels   (anchored at one bar)

label_dictionary  (独立表，被三类 label 表通过 (category, key, value) 引用)
```

---

## 表定义

### `instruments`

V1 只有一行（ES），但留位多品种。

```sql
CREATE TABLE instruments (
  id          INTEGER PRIMARY KEY,
  symbol      TEXT NOT NULL UNIQUE,         -- 'ES'
  description TEXT,                          -- 'E-mini S&P 500 Futures'
  tick_size   REAL NOT NULL,                 -- 0.25
  tick_value  REAL,                          -- $12.50（V1 可空）
  timezone    TEXT NOT NULL                  -- 'America/Chicago'
);
```

### `sessions`

一个交易日一行。ES 的 session 切分默认按**美东时间 RTH 09:30–16:00**（即 CT 08:30–15:00）切；用户可在导入向导切换为"全天 24h"（CME 电子盘 17:00 前夜 → 16:00 当日）。具体见 [`IMPORT_EXPORT.md`](./IMPORT_EXPORT.md)。

```sql
CREATE TABLE sessions (
  id            INTEGER PRIMARY KEY,
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  session_date  TEXT NOT NULL,             -- 'YYYY-MM-DD'（local trading date）
  session_type  TEXT NOT NULL,             -- 'RTH' | 'ETH'
  start_ts      INTEGER NOT NULL,          -- Unix sec, UTC, 第一根 bar 的开盘
  end_ts        INTEGER NOT NULL,          -- 最后一根 bar 的开盘
  bar_count     INTEGER NOT NULL,
  imported_at   INTEGER NOT NULL,
  source_file   TEXT,                      -- 原始 CSV 文件名
  UNIQUE (instrument_id, session_date, session_type)
);
CREATE INDEX idx_sessions_date ON sessions(session_date DESC);
```

### `bars`

5 分钟 OHLC，`bar_number` 在 session 内从 1 开始递增（V1 用户的标注语言用 bar number 而不是 timestamp）。

```sql
CREATE TABLE bars (
  id          INTEGER PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  bar_number  INTEGER NOT NULL,            -- 1-based, session 内
  ts          INTEGER NOT NULL,            -- Unix sec, UTC, bar 开盘
  open        REAL NOT NULL,
  high        REAL NOT NULL,
  low         REAL NOT NULL,
  close       REAL NOT NULL,
  volume      INTEGER,                     -- 可空（部分 CSV 没有）
  UNIQUE (session_id, bar_number),
  UNIQUE (session_id, ts)
);
CREATE INDEX idx_bars_session ON bars(session_id, bar_number);
```

### `label_dictionary`

**字典是数据，不是代码**。用户可以增、改名、停用条目。三类 label 表的 `value` 字段都是软引用字典里的 `key`——重命名 key 时用 Server Action 同步更新引用（见下方"演化"）。

```sql
CREATE TABLE label_dictionary (
  id          INTEGER PRIMARY KEY,
  category    TEXT NOT NULL,               -- 'bar' | 'segment' | 'context'
  field       TEXT NOT NULL,               -- 例 'bar_quality', 'current_event'
  key         TEXT NOT NULL,               -- 例 'strong_bull_bar'
  label       TEXT NOT NULL,               -- 显示名，可中文
  description TEXT,                        -- 详细说明，悬浮提示用
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,  -- 0 = 软删除
  created_at  INTEGER NOT NULL,
  UNIQUE (category, field, key)
);
CREATE INDEX idx_dict_cat_field ON label_dictionary(category, field, is_active);
```

完整字段/枚举见 [`LABEL_DICTIONARY.md`](./LABEL_DICTIONARY.md)。

### `bar_labels`

一根 bar 可以有多条 label（不同 field）。同 (bar, field) 唯一。

```sql
CREATE TABLE bar_labels (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  field       TEXT NOT NULL,               -- 'bar_quality' 等
  value       TEXT NOT NULL,               -- 字典里的 key
  note        TEXT,                        -- 自由文本备注
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, field)
);
CREATE INDEX idx_bar_labels_bar ON bar_labels(bar_id);
CREATE INDEX idx_bar_labels_value ON bar_labels(field, value);   -- 反向查"所有 strong_bull_bar"
```

### `segment_labels`

一段 K 线的结构标签。一个 segment 跨越 `start_bar_id..end_bar_id`（含两端），必须同属一个 session。

```sql
CREATE TABLE segment_labels (
  id              INTEGER PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  start_bar_id    INTEGER NOT NULL REFERENCES bars(id),
  end_bar_id      INTEGER NOT NULL REFERENCES bars(id),
  field           TEXT NOT NULL,           -- 'segment_kind'（pullback/leg/breakout_attempt...）
  value           TEXT NOT NULL,
  direction       TEXT,                    -- 'bull' | 'bear' | NULL
  note            TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_seg_session ON segment_labels(session_id);
CREATE INDEX idx_seg_range ON segment_labels(start_bar_id, end_bar_id);
CREATE INDEX idx_seg_value ON segment_labels(field, value);
```

**注意：** 同一段范围允许打多个 segment_label（例：既是 `leg`，又被解释为 `breakout_attempt`），所以不设组合唯一约束。

### `context_labels`

某根 bar **收盘时**的市场语境快照。多 field、同 (bar, field) 唯一。

```sql
CREATE TABLE context_labels (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  field       TEXT NOT NULL,               -- 'market_context' | 'trend_direction' | 'current_location' | ...
  value       TEXT NOT NULL,
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, field)
);
CREATE INDEX idx_ctx_bar ON context_labels(bar_id);
CREATE INDEX idx_ctx_value ON context_labels(field, value);
```

### `schema_migrations`

```sql
CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  INTEGER NOT NULL,
  name        TEXT NOT NULL
);
```

---

## 索引和查询模式

V1 主要的查询：

| 查询 | 走的索引 |
|---|---|
| 列出最近 N 个 session | `idx_sessions_date` |
| 加载一个 session 的所有 bar | `idx_bars_session` |
| 加载一个 session 的所有 label | `idx_bar_labels_bar` + `idx_seg_session` + `idx_ctx_bar` |
| 反向搜 "所有 strong_bull_bar" | `idx_bar_labels_value` |

V2+ 反向检索（"按标签找历史 case"）依赖 `idx_*_value`，已经留好。

---

## 字典演化策略

标签**会**改名、增减。流程：

1. **加新条目**：直接 INSERT，`is_active = 1`。立即可用。
2. **重命名 key**：UI 上"重命名"动作 → 一个事务里：
   - `UPDATE label_dictionary SET key = ? WHERE id = ?`
   - `UPDATE bar_labels SET value = ? WHERE field = ? AND value = ?`
   - 同样更新 `segment_labels`、`context_labels`
3. **停用**：`is_active = 0`，**保留**历史引用。UI 在选择框里隐藏，但在已有标注里显示并标灰，允许"清除"或"迁移到新 key"。
4. **删除**：不允许硬删除。只能停用。

**为什么不用 dictionary_id 外键？** 把 `value` 存字符串而不是 id，导出 JSONL 时不用 join 字典就能产生人类可读的训练数据。代价是重命名要级联更新——单用户、量不大，可接受。

---

## 迁移

文件：`lib/db/migrations/001_init.sql`、`002_xxx.sql`...

启动时 `lib/db/migrate.ts`：

```ts
const current = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations').get().v
for (const file of sortedMigrationFiles) {
  const version = parseInt(file.split('_')[0])
  if (version > current) {
    db.transaction(() => {
      db.exec(readFileSync(file, 'utf8'))
      db.prepare('INSERT INTO schema_migrations VALUES (?, ?, ?)').run(version, unixNow(), file)
    })()
  }
}
```

**回滚**：V1 不写 down migrations。备份 = 拷 `data/barwise.db`。

---

## 默认 PRAGMA

`lib/db/client.ts` 启动时：

```ts
db.pragma('journal_mode = WAL')      // 并发读 / 单写
db.pragma('synchronous = NORMAL')    // WAL 下安全且快
db.pragma('foreign_keys = ON')       // SQLite 默认关，必须显式开
db.pragma('busy_timeout = 5000')
```
