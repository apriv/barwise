# Data Model

SQLite 单文件，存放在 `./data/barwise.db`。所有表用 `INTEGER PRIMARY KEY`（即 rowid），时间戳统一存 **Unix epoch 秒（UTC）**，避免时区歧义。

V1 采用 **tag-only 多 tag** 存储模式（M3 决定）。每个标注实体（bar / segment / context anchor）可挂多个 tag，每个 tag 一行。底层 field 不直接存储，由 [`LABEL_DICTIONARY.md`](./LABEL_DICTIONARY.md) 的 Tag→Field 映射表派生。

---

## ER 概览

```
instruments ──< sessions ──< bars
                                │
                                ├──< bar_tags       (per-bar; 多 tag)
                                ├──< segment_tags   (per-range; 多 tag)
                                └──< context_tags   (per-bar 锚点；多 tag)

label_dictionary  (独立表；tag key 的元数据：category, group, label, description, sort_order, is_active)
```

V2 计划新增 `outcome_tags` 关联 `segment_id` / `context_anchor_bar_id`。当前不实现。

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

Tag 的元数据。**没有 `field` 列**（V1 不直接存 field；底层 field 由映射表 derive）。`group` 标记 tag 在 UI 上的分组归属（bar_shape / bar_pattern / segment / context_market / context_event / context_location）。

```sql
CREATE TABLE label_dictionary (
  id          INTEGER PRIMARY KEY,
  category    TEXT NOT NULL,               -- 'bar' | 'segment' | 'context'
  group_name  TEXT NOT NULL,               -- 'bar_shape' | 'bar_pattern' | 'segment' |
                                           -- 'context_market' | 'context_event' | 'context_location'
  key         TEXT NOT NULL,               -- visible tag key, e.g. 'strong_bull_bar'
  label       TEXT NOT NULL,               -- 显示名
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL,
  UNIQUE (category, key)                   -- key 在 category 内全局唯一（跨 group 不会冲突）
);
CREATE INDEX idx_dict_cat_group ON label_dictionary(category, group_name, is_active, sort_order);
```

> ⚠️ `group` 是 SQL 保留字，所以列名用 `group_name`。

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

### `schema_migrations`

```sql
CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  INTEGER NOT NULL,
  name        TEXT NOT NULL
);
```

---

## 查询模式

| 查询 | 走的索引 |
|---|---|
| 列出最近 N 个 session | `idx_sessions_date` |
| 加载一个 session 的所有 bar | `idx_bars_session` |
| 加载一个 session 的所有 bar tags | `idx_bar_tags_bar`（JOIN bars on session_id） |
| 加载一个 session 的所有 segment tags | `idx_seg_tags_session` |
| 加载一个 session 的所有 context tags | `idx_ctx_tags_bar`（JOIN bars） |
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

## 字典演化

参见 [`LABEL_DICTIONARY.md`](./LABEL_DICTIONARY.md) 的"字典演化（V1→V4）"。schema 角度：

1. **加新条目**：INSERT，`is_active = 1`，立即可用
2. **重命名 key**：事务内 `UPDATE label_dictionary SET key = ?` + 同步 `UPDATE bar_tags / segment_tags / context_tags SET tag_key = ?`
3. **停用**：`is_active = 0`，保留历史引用
4. **删除**：不允许硬删除

**为什么 tag_key 存字符串不存 dictionary_id？** 导出训练数据时不用 join 就有人类可读的 key。代价是重命名要级联更新，单用户量不大可接受。

---

## 迁移

文件：`lib/db/migrations/001_init.sql`、`002_*.sql`...

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

### 计划：M3 → M4 之间的破坏性迁移 `002_tag_model.sql`

旧 schema（`bar_labels` / `segment_labels` / `context_labels`，带 `UNIQUE(bar_id, field)`、`field` 列含义为 `bar_quality`/`bar_role`/`market_context`/...）**和新 tag 模型不兼容**。M2 期间打的标注是测试数据，可以一次性丢弃。

`002_tag_model.sql` 步骤：

1. `DROP TABLE bar_labels;`
2. `DROP TABLE segment_labels;`
3. `DROP TABLE context_labels;`
4. `DELETE FROM label_dictionary;`（旧字段定义全部清空）
5. `DROP INDEX` 任何旧 schema 的 idx_*
6. `ALTER TABLE label_dictionary` 把 `field` 列改名 `group_name`（SQLite 3.25+ 支持 rename column；如果版本不支持就走"create new + copy + drop"）
7. `CREATE TABLE bar_tags / segment_tags / context_tags`（如上）
8. 重新 seed 新 dictionary（从 `LABEL_DICTIONARY.md`）

**M4 实现前必须先跑完 002**，否则 schema 不匹配。

**回滚：** 不写 down migration。备份就是 `cp data/barwise.db data/barwise.db.bak`。

---

## 默认 PRAGMA

`lib/db/client.ts` 启动时：

```ts
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')
```
