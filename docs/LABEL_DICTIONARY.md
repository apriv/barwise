# Label Dictionary

三类标签的字段、枚举、用法。本文档是 [`DATA_MODEL.md`](./DATA_MODEL.md) 里 `label_dictionary` 表的**初始 seed 数据**，也是 UI 表单的依据。

字典会演化。本文里的枚举值是 V1 的起点，不是最终态。

---

## 设计原则

1. **每个 field 都是一个 enum-like 单选**。不允许同一根 bar 在同一个 field 下打两个值（DB 已强制 `UNIQUE (bar_id, field)`）。
2. **不强制每个 field 都要填**。用户决定标注密度。
3. **可以打部分标签后跳走**——不存草稿，写一条就持久化一条。
4. **note 字段**是自由文本，所有三类标签都有。
5. 字典里的 `label`（显示名）允许中文，`key` 永远是英文 snake_case（导出时用 key）。

---

## A. Bar Labels（单根 K 线）

每个 field 描述一根 bar 的某个独立属性。

### `bar_quality` — K 线本身的强度/形态

| key | label | 说明 |
|---|---|---|
| `strong_bull_bar` | 强阳线 | 大实体收高、上影线短 |
| `strong_bear_bar` | 强阴线 | 大实体收低、下影线短 |
| `weak_signal_bar` | 弱信号线 | 实体小、方向不明 |
| `doji_or_overlap` | 十字/重叠线 | 开收接近，与前一根高度重叠 |
| `climactic_bar` | 高潮线 | 远超近期波幅，常见于趋势末端 |
| `inside_bar` | 内包线 | 完全在前一根高低之间 |
| `outside_bar` | 外包线 | 完全包住前一根 |
| `reversal_bar` | 反转线 | 长影线尾部反向收盘 |

### `bar_role` — 这根 bar 在结构里扮演的角色（可选）

| key | label |
|---|---|
| `signal_bar` | 信号线 |
| `entry_bar` | 进场线 |
| `follow_through_bar` | 跟进线 |
| `failure_bar` | 失败线 |

---

## B. Segment Labels（一段 K 线）

每条 segment_label 有：`start_bar`、`end_bar`、`field`、`value`、可选 `direction`、`note`。

### `segment_kind` — 这段走势是什么

| key | label | 说明 |
|---|---|---|
| `leg` | 腿 | 一段单向运动 |
| `pullback` | 回调 | 趋势中的反向小段 |
| `breakout_attempt` | 突破尝试 | 试图破近期 swing high/low |
| `failed_breakout` | 假突破 | 破位后又回到区间 |
| `test_of_high` | 测试高点 | 回到近期高点附近 |
| `test_of_low` | 测试低点 | 回到近期低点附近 |
| `reversal_attempt` | 反转尝试 | 试图反转主方向 |
| `continuation_attempt` | 延续尝试 | 趋势继续的努力 |
| `consolidation` | 盘整 | 横向区间 |
| `weak_follow_through` | 弱跟进 | 突破后跟进无力 |

### `direction` — 这段是看多还是看空（segment 表的独立列）

`bull` / `bear` / `NULL`（横盘类如 `consolidation` 用 NULL）

---

## C. Context Labels（某根 bar 收盘时的市场语境）

绑定在一根 bar 上，表示**在那根 bar 收盘的当下**，整体市场是什么状态。多 field、每 field 一个值。

### `market_context` — 整体结构

| key | label |
|---|---|
| `trend` | 趋势 |
| `channel` | 通道 |
| `trading_range` | 区间 |
| `transition` | 转换中 |

### `trend_direction` — 主方向

| key | label |
|---|---|
| `bull` | 多头 |
| `bear` | 空头 |
| `neutral` | 中性 |

### `current_location` — 当前位置

| key | label |
|---|---|
| `near_high_of_day` | 接近日内高点 |
| `near_low_of_day` | 接近日内低点 |
| `middle_of_range` | 区间中间 |
| `near_ema` | 接近 EMA |
| `near_prior_swing_high` | 接近前 swing 高 |
| `near_prior_swing_low` | 接近前 swing 低 |

### `current_event` — 正在发生什么

| key | label |
|---|---|
| `breakout_attempt` | 突破尝试 |
| `pullback` | 回调中 |
| `failed_breakout_possible` | 可能假突破 |
| `test_of_high` | 测试高点 |
| `test_of_low` | 测试低点 |
| `reversal_attempt` | 反转尝试 |
| `continuation_attempt` | 延续尝试 |
| `no_clear_setup` | 没有明确形态 |

### `trade_quality` — 此刻进场的胜率感

| key | label |
|---|---|
| `good_context` | 好上下文 |
| `acceptable_context` | 可接受 |
| `bad_context` | 不该交易 |
| `wait_for_more_information` | 再等等 |

### `interpretation` — 多空双方解释（自由文本字段，非枚举）

不进字典，用 `context_labels` 的 `note` 字段存自由文本。例：
> "多头试图站稳前一日高点，但量能不足；空头在 prior swing high 附近防守"

---

## 字段总览（用于 seed）

```
category=bar:
  - bar_quality       (single)
  - bar_role          (single, optional)

category=segment:
  - segment_kind      (single, multiple per range allowed in DB but one per kind)

category=context:
  - market_context    (single)
  - trend_direction   (single)
  - current_location  (single)
  - current_event     (single)
  - trade_quality     (single)
```

---

## 生命周期（未来字典管理 UI）

M2 不做字典管理 UI。M3 先完善标签体系设计；如果后续需要编辑字典，再提供 `/labels/dictionary` 页面：

- 按 (category, field) 分组列出
- 行内可编辑 `label`、`description`、`sort_order`
- 行操作：**停用** / **重命名 key**（带影响计数 "会更新 X 条已有标注"）/ **新增**
- **不允许硬删除**

字典变更全部走 Server Action，写完 `revalidatePath('/labels/dictionary')` + `revalidateTag('dictionary')`。

---

## 与 V2 NLP 标注的衔接

未来 V2 用 NLP 从 YouTube 字幕生成候选标签时：
- 候选会写入和人工同一张 `bar_labels` / `segment_labels` 表
- 增加列 `source TEXT NOT NULL DEFAULT 'human'`（`human` / `nlp:youtube`）
- 增加列 `confidence REAL`（仅 NLP）
- 人工标签优先级高于 NLP，UI 会标出来源

V1 schema **现在就不要加** `source` 列——YAGNI。等 V2 真正接入时一次性 migration 加。
