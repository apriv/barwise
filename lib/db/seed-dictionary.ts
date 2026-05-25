import { getDb } from "@/lib/db/client";

type DictionarySeed = {
  category: "bar" | "segment" | "context";
  group_name: string;
  key: string;
  label: string;
  description?: string;
};

const dictionarySeeds: DictionarySeed[] = [
  {
    category: "bar",
    group_name: "bar_quality",
    key: "strong_bull_bar",
    label: "强阳线",
    description: "大实体收高、上影线短",
  },
  {
    category: "bar",
    group_name: "bar_quality",
    key: "strong_bear_bar",
    label: "强阴线",
    description: "大实体收低、下影线短",
  },
  {
    category: "bar",
    group_name: "bar_quality",
    key: "weak_signal_bar",
    label: "弱信号线",
    description: "实体小、方向不明",
  },
  {
    category: "bar",
    group_name: "bar_quality",
    key: "doji_or_overlap",
    label: "十字/重叠线",
    description: "开收接近，与前一根高度重叠",
  },
  {
    category: "bar",
    group_name: "bar_quality",
    key: "climactic_bar",
    label: "高潮线",
    description: "远超近期波幅，常见于趋势末端",
  },
  {
    category: "bar",
    group_name: "bar_quality",
    key: "inside_bar",
    label: "内包线",
    description: "完全在前一根高低之间",
  },
  {
    category: "bar",
    group_name: "bar_quality",
    key: "outside_bar",
    label: "外包线",
    description: "完全包住前一根",
  },
  {
    category: "bar",
    group_name: "bar_quality",
    key: "reversal_bar",
    label: "反转线",
    description: "长影线尾部反向收盘",
  },
  {
    category: "bar",
    group_name: "bar_role",
    key: "signal_bar",
    label: "信号线",
  },
  {
    category: "bar",
    group_name: "bar_role",
    key: "entry_bar",
    label: "进场线",
  },
  {
    category: "bar",
    group_name: "bar_role",
    key: "follow_through_bar",
    label: "跟进线",
  },
  {
    category: "bar",
    group_name: "bar_role",
    key: "failure_bar",
    label: "失败线",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "leg",
    label: "腿",
    description: "一段单向运动",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "pullback",
    label: "回调",
    description: "趋势中的反向小段",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "breakout_attempt",
    label: "突破尝试",
    description: "试图破近期 swing high/low",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "failed_breakout",
    label: "假突破",
    description: "破位后又回到区间",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "test_of_high",
    label: "测试高点",
    description: "回到近期高点附近",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "test_of_low",
    label: "测试低点",
    description: "回到近期低点附近",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "reversal_attempt",
    label: "反转尝试",
    description: "试图反转主方向",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "continuation_attempt",
    label: "延续尝试",
    description: "趋势继续的努力",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "consolidation",
    label: "盘整",
    description: "横向区间",
  },
  {
    category: "segment",
    group_name: "segment_kind",
    key: "weak_follow_through",
    label: "弱跟进",
    description: "突破后跟进无力",
  },
  {
    category: "context",
    group_name: "market_context",
    key: "trend",
    label: "趋势",
  },
  {
    category: "context",
    group_name: "market_context",
    key: "channel",
    label: "通道",
  },
  {
    category: "context",
    group_name: "market_context",
    key: "trading_range",
    label: "区间",
  },
  {
    category: "context",
    group_name: "market_context",
    key: "transition",
    label: "转换中",
  },
  {
    category: "context",
    group_name: "trend_direction",
    key: "bull",
    label: "多头",
  },
  {
    category: "context",
    group_name: "trend_direction",
    key: "bear",
    label: "空头",
  },
  {
    category: "context",
    group_name: "trend_direction",
    key: "neutral",
    label: "中性",
  },
  {
    category: "context",
    group_name: "current_location",
    key: "near_high_of_day",
    label: "接近日内高点",
  },
  {
    category: "context",
    group_name: "current_location",
    key: "near_low_of_day",
    label: "接近日内低点",
  },
  {
    category: "context",
    group_name: "current_location",
    key: "middle_of_range",
    label: "区间中间",
  },
  {
    category: "context",
    group_name: "current_location",
    key: "near_ema",
    label: "接近 EMA",
  },
  {
    category: "context",
    group_name: "current_location",
    key: "near_prior_swing_high",
    label: "接近前 swing 高",
  },
  {
    category: "context",
    group_name: "current_location",
    key: "near_prior_swing_low",
    label: "接近前 swing 低",
  },
  {
    category: "context",
    group_name: "current_event",
    key: "breakout_attempt",
    label: "突破尝试",
  },
  {
    category: "context",
    group_name: "current_event",
    key: "pullback",
    label: "回调中",
  },
  {
    category: "context",
    group_name: "current_event",
    key: "failed_breakout_possible",
    label: "可能假突破",
  },
  {
    category: "context",
    group_name: "current_event",
    key: "test_of_high",
    label: "测试高点",
  },
  {
    category: "context",
    group_name: "current_event",
    key: "test_of_low",
    label: "测试低点",
  },
  {
    category: "context",
    group_name: "current_event",
    key: "reversal_attempt",
    label: "反转尝试",
  },
  {
    category: "context",
    group_name: "current_event",
    key: "continuation_attempt",
    label: "延续尝试",
  },
  {
    category: "context",
    group_name: "current_event",
    key: "no_clear_setup",
    label: "没有明确形态",
  },
  {
    category: "context",
    group_name: "trade_quality",
    key: "good_context",
    label: "好上下文",
  },
  {
    category: "context",
    group_name: "trade_quality",
    key: "acceptable_context",
    label: "可接受",
  },
  {
    category: "context",
    group_name: "trade_quality",
    key: "bad_context",
    label: "不该交易",
  },
  {
    category: "context",
    group_name: "trade_quality",
    key: "wait_for_more_information",
    label: "再等等",
  },
];

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

export function seedDictionary() {
  const db = getDb();
  const now = unixNow();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO label_dictionary (
      category,
      group_name,
      key,
      label,
      description,
      sort_order,
      is_active,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const seed = db.transaction(() => {
    dictionarySeeds.forEach((entry, index) => {
      insert.run(
        entry.category,
        entry.group_name,
        entry.key,
        entry.label,
        entry.description ?? null,
        index + 1,
        now,
      );
    });
  });

  seed();
}

export { dictionarySeeds };
