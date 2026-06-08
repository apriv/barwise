# 四类标签
1. Bar Labels
   单根 K 线本身的形状和即时含义
   这根 K 线长什么样？
   strong_bear_bar / closes_near_low / breakout_bar

2. Segment Labels
   一段 K 线形成的结构，比如 leg, channel, range, flag, wedge, double top
   这一段 K 线形成了什么结构？
   Bar 18–36 = trading_range


3. Context Labels
   到某一根 K 线收盘为止，当前市场处于什么环境
   看到这根 K 线收盘时，现在市场处于什么状态？
  As of Bar 37 = bear_breakout_attempt near_range_low

4. Outcome Labels
   事后才能知道的结果，比如 failed breakout, successful breakout, reversal confirmed
   后来证明这个事件结果是什么？
   Bar 42 confirms failed_bear_breakout
# 人工标注方式
- 点单根 K 线 → 添加 bar_shape / bar_role / context
- 框选一段 K 线 → 添加 segment_structure
- 事件结束后 → 添加 outcome
- 当天结束 → 添加 session tags（下一步）

# 标签格式
- Field + value as the main structure
- Tags as flexible add-ons
- Notes for natural language explanation

# 第一版标签设计原则
1. 核心字段稳定，tags 灵活扩展。核心判断用字段 + 值，补充概念用 tags。tag稳定后可以升级成字段。
2. 标签结构最简，但分类合理、可扩展、未来能服务 NLP 和机器学习。
3. V1 不做复杂字段表单。

# 标注可见标签

 ```
 Bar Shape:
strong_bull_bar
strong_bear_bar
weak_bull_bar
weak_bear_bar
doji
close_near_high
close_near_low
long_upper_tail
long_lower_tail
inside_bar
outside_bar

Bar Role:
signal_bar
entry_bar
breakout_attempt_bar
follow_through_bar
pullback_bar
reversal_attempt_bar
test_bar

Segment Structure:
bull_leg
bear_leg
bull_channel
bear_channel
trading_range
flag
double_top
double_bottom
wedge
spike

Market Context:
bull_trend_context
bear_trend_context
bull_channel_context
bear_channel_context
trading_range_context
transition_context

Location:
near_range_high
near_range_low
near_high_of_day
near_low_of_day
near_ema
middle_of_range

Active Event:
bull_breakout_attempt
bear_breakout_attempt
bull_pullback
bear_pullback
test_of_high
test_of_low
reversal_attempt

Market Logic:
bulls_need_follow_through
bears_need_follow_through
bulls_may_buy_failed_breakout
bears_may_sell_failed_breakout
limit_order_market
stop_entry_market
wait_for_more_information

Outcome:
breakout_succeeded_later
breakout_failed_later
reversal_confirmed_later
reversal_failed_later
range_continued_later
trend_continued_later
 ```
# 底层标签格式
- 这个后续会把可见标签map到field里面
V1：人工打 tag
V2：把 tag 映射到底层 field
V3：用 field + tag 做 NLP / ML / 实时解释 
后面是可能的field

# 1. Bar label值
- Shape: bear trend bar, close near low
- Role: breakout attempt bar

## shape
描述形态

direction:
- bull
- bear
- neutral

body:
- strong
- medium
- weak
- doji

close:
- near_high
- upper_half
- middle
- lower_half
- near_low

tail:
- small_tails
- long_upper_tail
- long_lower_tail
- long_both_tails

## Role
描述这个k线在市场中的作用

# 2. Segment Label值
structure:
- bull_leg
- bear_leg
- bull_channel
- bear_channel
- trading_range
- flag
- double_top
- double_bottom
- wedge
- spike
- pullback
- breakout_attempt
- reversal_attempt

direction:
- bull
- bear
- neutral

# 3. Context Label值
market:
- bull_trend
- bear_trend
- bull_channel
- bear_channel
- trading_range
- transition
- unclear

event:
- breakout_attempt
- pullback
- test
- reversal_attempt
- continuation_attempt
- failed_breakout_possible
- no_clear_event

location:
- near_high_of_day
- near_low_of_day
- middle_of_day_range
- near_range_high
- near_range_low
- near_ema
- above_ema
- below_ema
- near_prior_swing_high
- near_prior_swing_low

bias:
- bull
- bear
- two_sided
- unclear

# 4. Outcome label
outcome:
- succeeded
- failed
- continued
- reversed
- evolved_into_range
- evolved_into_channel
- unclear
