# Label Dictionary

四类标签的字段、tag、note 与底层 field 映射。本文档定义标注体系的全部内容，是 `DATA_MODEL.md` 中 tag 表的 seed，也是 UI 表单的依据。

---

## 标签四类

| 类别 | 关注点 | 数据形态 | 标注时机 |
|---|---|---|---|
| **Bar** | 单根 K 线本身的形状和即时含义 | 挂在一根 bar 上 | 实时（这根 bar 收盘后） |
| **Segment** | 一段 K 线形成的结构 | 挂在 [start_bar, end_bar] 范围上 | 实时或当天回看 |
| **Context** | 到某根 K 线收盘为止，市场处于什么环境 | 挂在一根 bar 上（语境快照） | 实时（这根 bar 收盘后） |
| **Outcome** | 事后才能知道的结果（如 failed breakout） | 挂在被确认的 segment 上 | **当天结束后回看** |

---

## 数据三层结构

```
Tag  (V1 唯一存储形态：人工自由打 tag、多选)
  ↓ 由"Tag → Field 映射表"派生
Field (底层正交维度；V1 不直接存储，由 tag derive 出来)
  ↓
Note (自由文本，补充无法 enum 化的内容)
```

**原则：**

1. **V1 全部用 tag**：人工打 tag 体感快、心智负担低，不需要在意"这是 direction 还是 close"。
2. **tag 多次稳定出现后，升级成 field**：V3 阶段会把高频稳定 tag 拆到底层 field，与训练数据对齐。
3. **底层 field 已经先想清楚**：见下文每类下"底层 field"小节。它**先存在于映射表里**，将来 NLP / ML 直接对接，避免标注语料丢失结构。
4. **note 是 V1 的兜底**：所有无法 enum 的内容（"多头试图站稳但量能不足"）进 note。

**多选规则：** 每个 tag group（Bar Shape、Bar Pattern、Segment、Context 各子组）都是**多选**。一根 bar 可以同时打 `strong_bull_bar` + `close_near_high` + `follow_through_bar`。

## V2 字典元数据

V2 起，Tag→Field 映射正式落到 `label_dictionary.field_mapping_json`，而不是只存在于文档表格里。字段命名沿用当前代码：

| roadmap 名称 | 数据库字段 |
|---|---|
| `tag_key` | `key` |
| `display_name` | `label` |
| `active` | `is_active` |
| `field_mapping_json` | `field_mapping_json` |

示例：

```json
{
  "direction": "bull",
  "body": "strong"
}
```

默认 `source = manual`，后续自动规则、NLP、导入和模型建议分别使用 `auto_numeric` / `nlp` / `imported_albrooks` / `model_suggested`。

---

## A. Bar Labels

一根 bar 可以同时挂 **Bar Shape** 和 **Bar Pattern**，两组互相独立。两组内部都允许多 tag。

### A.1 Bar Shape — 这根 K 线长什么样

底层 field 四维：

| field | values |
|---|---|
| `direction` | `bull` / `bear` / `neutral` |
| `body` | `strong` / `medium` / `weak` / `doji` |
| `close` | `near_high` / `upper_half` / `middle` / `lower_half` / `near_low` |
| `tail` | `small_tails` / `long_upper_tail` / `long_lower_tail` / `long_both_tails` |

Visible tags（人工选的）：

| tag | 对应底层 |
|---|---|
| `strong_bull_bar` | direction=bull, body=strong |
| `strong_bear_bar` | direction=bear, body=strong |
| `weak_bull_bar` | direction=bull, body=weak |
| `weak_bear_bar` | direction=bear, body=weak |
| `doji` | body=doji |
| `close_near_high` | close=near_high |
| `close_near_low` | close=near_low |
| `long_upper_tail` | tail=long_upper_tail |
| `long_lower_tail` | tail=long_lower_tail |

例：`strong_bull_bar` + `close_near_high` 共存合理（前者定 direction+body，后者细化 close）。

### A.2 Bar Pattern — 这根 bar 与上下文/前后 bar 的关系或功能

底层 field 两维：

| field | values |
|---|---|
| `role` | `signal` / `entry` / `follow_through` / `pullback` / `breakout_attempt` / `reversal_attempt` / `test` |
| `relation` | `inside` / `outside` / `none` |

Visible tags：

| tag | 对应底层 |
|---|---|
| `signal_bar` | role=signal |
| `entry_bar` | role=entry |
| `follow_through_bar` | role=follow_through |
| `pullback_bar` | role=pullback |
| `breakout_attempt_bar` | role=breakout_attempt |
| `reversal_attempt_bar` | role=reversal_attempt |
| `test_bar` | role=test |
| `inside_bar` | relation=inside |
| `outside_bar` | relation=outside |

例：`signal_bar` + `inside_bar` 共存合理（这根 bar 同时是 signal、且形态上是 inside bar）。

---

## B. Segment Labels

一段 K 线形成的结构。挂在 [start_bar, end_bar] 范围上，可以多 tag。

底层 field 两维：

| field | values |
|---|---|
| `structure` | `leg` / `channel` / `trading_range` / `flag` / `double_top` / `double_bottom` / `wedge` / `spike` |
| `direction` | `bull` / `bear` / `neutral` |

Visible tags：

| tag | 对应底层 |
|---|---|
| `bull_leg` | structure=leg, direction=bull |
| `bear_leg` | structure=leg, direction=bear |
| `bull_channel` | structure=channel, direction=bull |
| `bear_channel` | structure=channel, direction=bear |
| `trading_range` | structure=trading_range, direction=neutral |
| `flag` | structure=flag（direction 不固定，初始 neutral） |
| `double_top` | structure=double_top, direction=bear |
| `double_bottom` | structure=double_bottom, direction=bull |
| `wedge` | structure=wedge（direction 不固定） |
| `spike` | structure=spike（direction 跟随 spike 方向） |

**注意：** `pullback` / `breakout_attempt` / `reversal_attempt` 不在 Segment（这些是 event / bar pattern，不是结构形态）。如果想标"这段是一个 pullback"，请用 Bar Pattern 的 `pullback_bar` 给该段的关键 bar 打 tag，或在 Context.event 里打 `bull_pullback`。

---

## C. Context Labels

到某根 K 线收盘为止，当前市场处于什么环境。挂在一根 bar 上，多 tag。

底层 field 三维：

| field | values |
|---|---|
| `market` | `bull_trend` / `bear_trend` / `bull_channel` / `bear_channel` / `trading_range` / `transition` / `unclear` |
| `event` | `breakout_attempt` / `pullback` / `test_of_high` / `test_of_low` / `reversal_attempt` / `continuation_attempt` / `failed_breakout_possible` / `no_clear_event` |
| `location` | `near_high_of_day` / `near_low_of_day` / `middle_of_day_range` / `near_range_high` / `near_range_low` / `near_ema` / `above_ema` / `below_ema` / `near_prior_swing_high` / `near_prior_swing_low` |

Visible tags：

| tag | 对应底层 |
|---|---|
| `bull_trend_context` | market=bull_trend |
| `bear_trend_context` | market=bear_trend |
| `bull_channel_context` | market=bull_channel |
| `bear_channel_context` | market=bear_channel |
| `trading_range_context` | market=trading_range |
| `transition_context` | market=transition |
| `bull_breakout_attempt` | event=breakout_attempt, direction=bull |
| `bear_breakout_attempt` | event=breakout_attempt, direction=bear |
| `bull_pullback` | event=pullback, direction=bull |
| `bear_pullback` | event=pullback, direction=bear |
| `test_of_high` | event=test_of_high |
| `test_of_low` | event=test_of_low |
| `reversal_attempt` | event=reversal_attempt |
| `failed_breakout_possible` | event=failed_breakout_possible |
| `near_high_of_day` | location=near_high_of_day |
| `near_low_of_day` | location=near_low_of_day |
| `middle_of_day_range` | location=middle_of_day_range |
| `near_range_high` | location=near_range_high |
| `near_range_low` | location=near_range_low |
| `near_ema` | location=near_ema |
| `above_ema` | location=above_ema |
| `below_ema` | location=below_ema |
| `near_prior_swing_high` | location=near_prior_swing_high |
| `near_prior_swing_low` | location=near_prior_swing_low |

例（来自原文档）："As of Bar 37 = `bear_breakout_attempt` + `near_range_low`" → 同一根 bar 上挂两个 context tag。

**已删除（之前版本有）：**
- `Market Logic` 整组（`bulls_need_follow_through` / `limit_order_market` / `wait_for_more_information` 等）→ 用 note 自由文本写
- `bias`（bull / bear / two_sided / unclear）→ 信息已在 market + event 的 direction 编码里
- `trade_quality`（good / bad / wait）→ 用 note 写

---

## D. Outcome Labels（V2）

事后回看的结果，例："Bar 42 confirms `failed_bear_breakout` for the segment bar 35–37"。

V2 中 outcome 挂在 selected range 上，并可指定确认 outcome 的 bar。第一版 visible tags：

```
succeeded / failed / continued / reversed
evolved_into_range / evolved_into_channel / unclear
```

底层 field：

| field | values |
|---|---|
| `result` | `succeeded` / `failed` / `continued` / `reversed` / `evolved_into_range` / `evolved_into_channel` / `unclear` |

默认 `source = manual`。

---

## 标注 SOP（V1 工作流）

| 触发动作 | 打什么 |
|---|---|
| 点单根 K 线 | Bar Shape tags + Bar Pattern tags + Context tags |
| 框选一段 K 线 | Segment tags |
| 任何 tag 表达不出来的细节 | note |
| 当天结束 | （V2 才有的 Outcome；V1 用 note） |

**多 tag 的 mental model：** "我看到这根 bar，能用哪些词描述它？" 不要纠结"应该只选一个"。一根 strong_bull_bar 同时是 follow_through_bar 同时 close_near_high，那就三个都打。

---

## 字典演化（V1→V4）

| 版本 | 状态 |
|---|---|
| V1 | 人工自由打 tag（visible tag），底层 field 通过映射表 derive |
| V2 | 给 tag 加 taxonomy / group 元数据；加 Outcome；字典编辑 UI |
| V3 | 把稳定高频 tag 升级为正式 field；NLP 可直接产出 field 值 |
| V4 | field + tag 双轨；做 NLP / ML / 实时解释 |

**字典管理**：V1 不做 UI。如果要加新 tag，目前是改 seed SQL + 跑 migration。V2 再做编辑界面。

---

## 与 NLP / ML 衔接

未来用 NLP 从 YouTube 字幕生成候选标签时：
- 候选写到和人工同一张 tag 表
- 加列 `source TEXT NOT NULL DEFAULT 'human'`（`human` / `nlp:youtube`）
- 加列 `confidence REAL`（仅 NLP）
- 人工 tag 优先级高于 NLP，UI 标出来源

V1 schema 现在**不**加 `source` 列（YAGNI），等 V2 真正接入时一次 migration 加。
