# Data Model

SQLite 单文件，存放在 `./data/barwise.db`。正式 schema 定义在 `lib/db/schema.sql`，默认标签字典定义在 `lib/db/seed-dictionary.ts`，由 `lib/db/ensure.ts` 在启动时确保存在。

所有表用 `INTEGER PRIMARY KEY`（即 rowid），时间戳统一存 **Unix epoch 秒（UTC）**，避免时区歧义。标注采用 **tag-only 多 tag** 存储模式：每个标注实体（bar / segment / context anchor / outcome range）可挂多个 tag，每个 tag 一行。底层 field 不直接存储，由 [`LABEL_DICTIONARY.md`](./LABEL_DICTIONARY.md) 的 Tag→Field 映射表派生。

---

## ER 概览

```
instruments ──< sessions ──< bars
                                │
                                ├──< bar_tags       (per-bar; 多 tag)
                                ├──< segment_tags   (per-range; 多 tag)
                                ├──< context_tags   (per-bar 锚点；多 tag)
                                └──< outcome_tags   (per-range; 多 tag)

label_dictionary  (独立表；tag key 的元数据：category, group, label, description, sort_order, is_active)
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

一个交易日一行。V1 当前默认从本地 `data/samples/es_5m.csv` 读取数据，并只切 `RTH` session。

```sql
CREATE TABLE sessions (
  id            INTEGER PRIMARY KEY,
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  session_date  TEXT NOT NULL,             -- 'YYYY-MM-DD'（local trading date）
  session_type  TEXT NOT NULL,             -- 'DAY' | 'RTH' | 'ETH'
  start_ts      INTEGER NOT NULL,
  end_ts        INTEGER NOT NULL,
  bar_count     INTEGER NOT NULL,
  imported_at   INTEGER NOT NULL,
  source_file   TEXT,
  UNIQUE (instrument_id, session_date, session_type)
);
CREATE INDEX idx_sessions_date ON sessions(session_date DESC);
```

### `bars`

```sql
CREATE TABLE bars (
  id          INTEGER PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  bar_number  INTEGER NOT NULL,
  ts          INTEGER NOT NULL,
  open        REAL NOT NULL,
  high        REAL NOT NULL,
  low         REAL NOT NULL,
  close       REAL NOT NULL,
  volume      INTEGER,
  UNIQUE (session_id, bar_number),
  UNIQUE (session_id, ts)
);
CREATE INDEX idx_bars_session ON bars(session_id, bar_number);
```

### `label_dictionary`

Tag 的元数据。`label_dictionary` 是可编辑的标签字典。**没有 `field` 列**；底层 field 由 `field_mapping_json` derive。`group_name` 标记 tag 在 UI 上的分组归属（bar_shape / bar_pattern / segment / context_market / context_event / context_location / outcome_result）。

```sql
CREATE TABLE label_dictionary (
  id                 INTEGER PRIMARY KEY,
  category           TEXT NOT NULL CHECK (category IN ('bar', 'segment', 'context', 'outcome')),
  group_name         TEXT NOT NULL,
  key                TEXT NOT NULL,         -- visible tag key, e.g. 'strong_bull_bar'
  label              TEXT NOT NULL,         -- display name
  description        TEXT,
  example            TEXT,
  field_mapping_json TEXT NOT NULL DEFAULT '{}',
  sort_order         INTEGER NOT NULL DEFAULT 0,
  is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_by         TEXT NOT NULL DEFAULT 'local',
  source             TEXT NOT NULL DEFAULT 'manual'
                       CHECK (source IN ('manual', 'auto_numeric', 'nlp', 'imported_albrooks', 'model_suggested')),
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  UNIQUE (category, key)
);
CREATE INDEX idx_dict_cat_group ON label_dictionary(category, group_name, is_active, sort_order);
CREATE INDEX idx_dict_key ON label_dictionary(key);
CREATE INDEX idx_dict_source ON label_dictionary(source);
```

> ⚠️ `group` 是 SQL 保留字，所以列名用 `group_name`。

`key` / `label` 是当前代码里的正式字段名，对应 roadmap 里的 `tag_key` / `display_name`。`is_active` 对应 roadmap 里的 `active`。

`field_mapping_json` 示例：

```json
{
  "direction": "bull",
  "body": "strong"
}
```

完整 tag 列表和 Tag→Field 映射见 [`LABEL_DICTIONARY.md`](./LABEL_DICTIONARY.md)。

### `bar_tags`

一根 bar 挂多个 tag。每条记录一个 tag。

```sql
CREATE TABLE bar_tags (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  tag_key     TEXT NOT NULL,               -- 字典里的 key，例 'strong_bull_bar', 'inside_bar'
  note        TEXT,                        -- 这一条 tag 的可选备注
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, tag_key)                 -- 同 bar 不重复打同一个 tag
);
CREATE INDEX idx_bar_tags_bar ON bar_tags(bar_id);
CREATE INDEX idx_bar_tags_key ON bar_tags(tag_key);   -- 反向查"所有打了 strong_bull_bar 的 bar"
```

### `segment_tags`

一段 K 线挂多个 tag。范围 [start_bar_id..end_bar_id]，含两端，必须同 session。

```sql
CREATE TABLE segment_tags (
  id              INTEGER PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  start_bar_id    INTEGER NOT NULL REFERENCES bars(id),
  end_bar_id      INTEGER NOT NULL REFERENCES bars(id),
  tag_key         TEXT NOT NULL,
  note            TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  UNIQUE (start_bar_id, end_bar_id, tag_key)
);
CREATE INDEX idx_seg_tags_session ON segment_tags(session_id);
CREATE INDEX idx_seg_tags_range ON segment_tags(start_bar_id, end_bar_id);
CREATE INDEX idx_seg_tags_key ON segment_tags(tag_key);
```

> **没有独立 `direction` 列**：方向已编码在 visible tag 里（`bull_leg` / `bear_channel`）。Tag→Field 映射表负责 derive direction 给训练数据。

### `context_tags`

某根 bar **收盘时**的市场语境快照，挂多 tag。

```sql
CREATE TABLE context_tags (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  tag_key     TEXT NOT NULL,
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, tag_key)
);
CREATE INDEX idx_ctx_tags_bar ON context_tags(bar_id);
CREATE INDEX idx_ctx_tags_key ON context_tags(tag_key);
```

### `outcome_tags`

事后结果标签，挂在一段 bar range 上。`confirm_bar_id` 是确认 outcome 的 bar；`related_context_bar_id` 预留给后续把 outcome 和当时的 context snapshot 关联起来。

```sql
CREATE TABLE outcome_tags (
  id                     INTEGER PRIMARY KEY,
  session_id             INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  start_bar_id           INTEGER NOT NULL REFERENCES bars(id),
  end_bar_id             INTEGER NOT NULL REFERENCES bars(id),
  confirm_bar_id         INTEGER REFERENCES bars(id),
  related_context_bar_id INTEGER REFERENCES bars(id),
  tag_key                TEXT NOT NULL,
  note                   TEXT,
  source                 TEXT NOT NULL DEFAULT 'manual',
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL,
  UNIQUE (start_bar_id, end_bar_id, tag_key)
);
CREATE INDEX idx_outcome_tags_session ON outcome_tags(session_id);
CREATE INDEX idx_outcome_tags_range ON outcome_tags(start_bar_id, end_bar_id);
CREATE INDEX idx_outcome_tags_confirm_bar ON outcome_tags(confirm_bar_id);
CREATE INDEX idx_outcome_tags_key ON outcome_tags(tag_key);
```

## 查询模式

| 查询 | 走的索引 |
|---|---|
| 列出最近 N 个 session | `idx_sessions_date` |
| 加载一个 session 的所有 bar | `idx_bars_session` |
| 加载一个 session 的所有 bar tags | `idx_bar_tags_bar`（JOIN bars on session_id） |
| 加载一个 session 的所有 segment tags | `idx_seg_tags_session` |
| 加载一个 session 的所有 context tags | `idx_ctx_tags_bar`（JOIN bars） |
| 加载一个 session 的所有 outcome tags | `idx_outcome_tags_session` |
| 反向查"所有打了 strong_bull_bar 的 bar" | `idx_bar_tags_key` |
| 字典按 group 列出 | `idx_dict_cat_group` |

---

## Note 归属

每条 tag 行可以**单独**带一个 note，不强制。设计上：

- **field 级 / tag 级 note**：直接写在 `bar_tags.note` / `segment_tags.note` / `context_tags.note`，描述对**这一条 tag** 的补充
- **bar 级整体 note**：V1 不单独建表；如果想"对这根 bar 整体说点什么"，写在任一一条 tag 的 note 里即可
- **session 级 note** 等设计需要时再加

V1 标注 UI 在 panel 底部显示一个聚合 note 视图（多 tag 的 note 拼起来），暂不区分谁的 note；M5 可以细化。

---

## 字典维护

参见 [`LABEL_DICTIONARY.md`](./LABEL_DICTIONARY.md) 的完整标签定义。schema 角度：

1. **加新条目**：INSERT，`is_active = 1`，立即可用
2. **重命名 key**：事务内 `UPDATE label_dictionary SET key = ?` + 同步 `UPDATE bar_tags / segment_tags / context_tags / outcome_tags SET tag_key = ?`
3. **停用**：`is_active = 0`，保留历史引用
4. **删除**：只删除尚未使用、确认不再需要的混淆条目；已有历史引用的 tag 优先停用

**为什么 tag_key 存字符串不存 dictionary_id？** 导出训练数据时不用 join 就有人类可读的 key。代价是重命名要级联更新，单用户量不大可接受。

---

## 默认 PRAGMA

`lib/db/client.ts` 启动时：

```ts
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')
```
