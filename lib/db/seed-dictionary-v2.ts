import { getDb } from "@/lib/db/client";

type LabelCategory = "bar" | "segment" | "context" | "outcome";
type LabelSource =
  | "manual"
  | "auto_numeric"
  | "nlp"
  | "imported_albrooks"
  | "model_suggested";

type FieldMapping = Record<string, string>;

type DictionarySeed = {
  category: LabelCategory;
  group_name: string;
  key: string;
  label: string;
  description: string;
  example?: string;
  fieldMapping?: FieldMapping;
  source?: LabelSource;
};

const barTags: DictionarySeed[] = [
  {
    category: "bar",
    group_name: "bar_shape",
    key: "strong_bull_bar",
    label: "Strong Bull Bar",
    description: "Strong bullish candle with a large body.",
    fieldMapping: { direction: "bull", body: "strong" },
  },
  {
    category: "bar",
    group_name: "bar_shape",
    key: "strong_bear_bar",
    label: "Strong Bear Bar",
    description: "Strong bearish candle with a large body.",
    fieldMapping: { direction: "bear", body: "strong" },
  },
  {
    category: "bar",
    group_name: "bar_shape",
    key: "weak_bull_bar",
    label: "Weak Bull Bar",
    description: "Bullish candle with weak body or poor close.",
    fieldMapping: { direction: "bull", body: "weak" },
  },
  {
    category: "bar",
    group_name: "bar_shape",
    key: "weak_bear_bar",
    label: "Weak Bear Bar",
    description: "Bearish candle with weak body or poor close.",
    fieldMapping: { direction: "bear", body: "weak" },
  },
  {
    category: "bar",
    group_name: "bar_shape",
    key: "doji",
    label: "Doji",
    description: "Candle with nearly equal open and close.",
    fieldMapping: { body: "doji" },
  },
  {
    category: "bar",
    group_name: "bar_shape",
    key: "close_near_high",
    label: "Close Near High",
    description: "Close is near the high of the bar.",
    fieldMapping: { close: "near_high" },
  },
  {
    category: "bar",
    group_name: "bar_shape",
    key: "close_near_low",
    label: "Close Near Low",
    description: "Close is near the low of the bar.",
    fieldMapping: { close: "near_low" },
  },
  {
    category: "bar",
    group_name: "bar_shape",
    key: "long_upper_tail",
    label: "Long Upper Tail",
    description: "Bar has a long upper tail.",
    fieldMapping: { tail: "long_upper_tail" },
  },
  {
    category: "bar",
    group_name: "bar_shape",
    key: "long_lower_tail",
    label: "Long Lower Tail",
    description: "Bar has a long lower tail.",
    fieldMapping: { tail: "long_lower_tail" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "signal_bar",
    label: "Signal Bar",
    description: "Bar that signals a potential setup.",
    fieldMapping: { role: "signal" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "entry_bar",
    label: "Entry Bar",
    description: "Bar used as an entry point.",
    fieldMapping: { role: "entry" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "follow_through_bar",
    label: "Follow Through Bar",
    description: "Bar that follows through after a prior move.",
    fieldMapping: { role: "follow_through" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "pullback_bar",
    label: "Pullback Bar",
    description: "Bar pulling back against the current move.",
    fieldMapping: { role: "pullback" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "breakout_attempt_bar",
    label: "Breakout Attempt Bar",
    description: "Bar attempting to break beyond a prior level.",
    fieldMapping: { role: "breakout_attempt" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "reversal_attempt_bar",
    label: "Reversal Attempt Bar",
    description: "Bar attempting to reverse the current move.",
    fieldMapping: { role: "reversal_attempt" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "test_bar",
    label: "Test Bar",
    description: "Bar testing a prior level.",
    fieldMapping: { role: "test" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "inside_bar",
    label: "Inside Bar",
    description: "Bar fully contained within the prior bar range.",
    fieldMapping: { relation: "inside" },
  },
  {
    category: "bar",
    group_name: "bar_pattern",
    key: "outside_bar",
    label: "Outside Bar",
    description: "Bar exceeding both sides of the prior bar range.",
    fieldMapping: { relation: "outside" },
  },
];

const segmentTags: DictionarySeed[] = [
  {
    category: "segment",
    group_name: "segment",
    key: "bull_leg",
    label: "Bull Leg",
    description: "Directional upward leg.",
    fieldMapping: { structure: "leg", direction: "bull" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "bear_leg",
    label: "Bear Leg",
    description: "Directional downward leg.",
    fieldMapping: { structure: "leg", direction: "bear" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "bull_channel",
    label: "Bull Channel",
    description: "Upward movement within a channel.",
    fieldMapping: { structure: "channel", direction: "bull" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "bear_channel",
    label: "Bear Channel",
    description: "Downward movement within a channel.",
    fieldMapping: { structure: "channel", direction: "bear" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "trading_range",
    label: "Trading Range",
    description: "Sideways price action within a range.",
    fieldMapping: { structure: "trading_range", direction: "neutral" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "flag",
    label: "Flag",
    description: "Consolidation after a strong move.",
    fieldMapping: { structure: "flag", direction: "neutral" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "double_top",
    label: "Double Top",
    description: "Two pushes up to a similar price area.",
    fieldMapping: { structure: "double_top", direction: "bear" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "double_bottom",
    label: "Double Bottom",
    description: "Two pushes down to a similar price area.",
    fieldMapping: { structure: "double_bottom", direction: "bull" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "wedge",
    label: "Wedge",
    description: "Three-push or converging structure.",
    fieldMapping: { structure: "wedge" },
  },
  {
    category: "segment",
    group_name: "segment",
    key: "spike",
    label: "Spike",
    description: "Sharp directional move.",
    fieldMapping: { structure: "spike" },
  },
];

const contextTags: DictionarySeed[] = [
  {
    category: "context",
    group_name: "context_market",
    key: "bull_trend_context",
    label: "Bull Trend",
    description: "Market is in a bull trend.",
    fieldMapping: { market: "bull_trend" },
  },
  {
    category: "context",
    group_name: "context_market",
    key: "bear_trend_context",
    label: "Bear Trend",
    description: "Market is in a bear trend.",
    fieldMapping: { market: "bear_trend" },
  },
  {
    category: "context",
    group_name: "context_market",
    key: "bull_channel_context",
    label: "Bull Channel",
    description: "Market is in a bull channel.",
    fieldMapping: { market: "bull_channel" },
  },
  {
    category: "context",
    group_name: "context_market",
    key: "bear_channel_context",
    label: "Bear Channel",
    description: "Market is in a bear channel.",
    fieldMapping: { market: "bear_channel" },
  },
  {
    category: "context",
    group_name: "context_market",
    key: "trading_range_context",
    label: "Trading Range",
    description: "Market is in a trading range.",
    fieldMapping: { market: "trading_range" },
  },
  {
    category: "context",
    group_name: "context_market",
    key: "transition_context",
    label: "Transition",
    description: "Market is transitioning between structures.",
    fieldMapping: { market: "transition" },
  },
  {
    category: "context",
    group_name: "context_event",
    key: "bull_breakout_attempt",
    label: "Bull Breakout Attempt",
    description: "Possible upside breakout attempt.",
    fieldMapping: { event: "breakout_attempt", direction: "bull" },
  },
  {
    category: "context",
    group_name: "context_event",
    key: "bear_breakout_attempt",
    label: "Bear Breakout Attempt",
    description: "Possible downside breakout attempt.",
    fieldMapping: { event: "breakout_attempt", direction: "bear" },
  },
  {
    category: "context",
    group_name: "context_event",
    key: "bull_pullback",
    label: "Bull Pullback",
    description: "Pullback within a bull move or bull trend.",
    fieldMapping: { event: "pullback", direction: "bull" },
  },
  {
    category: "context",
    group_name: "context_event",
    key: "bear_pullback",
    label: "Bear Pullback",
    description: "Pullback within a bear move or bear trend.",
    fieldMapping: { event: "pullback", direction: "bear" },
  },
  {
    category: "context",
    group_name: "context_event",
    key: "test_of_high",
    label: "Test of High",
    description: "Price is testing a prior high.",
    fieldMapping: { event: "test_of_high" },
  },
  {
    category: "context",
    group_name: "context_event",
    key: "test_of_low",
    label: "Test of Low",
    description: "Price is testing a prior low.",
    fieldMapping: { event: "test_of_low" },
  },
  {
    category: "context",
    group_name: "context_event",
    key: "reversal_attempt",
    label: "Reversal Attempt",
    description: "Market is attempting to reverse.",
    fieldMapping: { event: "reversal_attempt" },
  },
  {
    category: "context",
    group_name: "context_event",
    key: "failed_breakout_possible",
    label: "Failed Breakout Possible",
    description: "Breakout may fail back into the prior range.",
    fieldMapping: { event: "failed_breakout_possible" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "near_high_of_day",
    label: "Near High of Day",
    description: "Price is near the current high of day.",
    fieldMapping: { location: "near_high_of_day" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "near_low_of_day",
    label: "Near Low of Day",
    description: "Price is near the current low of day.",
    fieldMapping: { location: "near_low_of_day" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "middle_of_day_range",
    label: "Middle of Day Range",
    description: "Price is near the middle of the day's range.",
    fieldMapping: { location: "middle_of_day_range" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "near_range_high",
    label: "Near Range High",
    description: "Price is near the upper edge of a trading range.",
    fieldMapping: { location: "near_range_high" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "near_range_low",
    label: "Near Range Low",
    description: "Price is near the lower edge of a trading range.",
    fieldMapping: { location: "near_range_low" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "near_ema",
    label: "Near EMA",
    description: "Price is near the EMA.",
    fieldMapping: { location: "near_ema" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "above_ema",
    label: "Above EMA",
    description: "Price is above the EMA.",
    fieldMapping: { location: "above_ema" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "below_ema",
    label: "Below EMA",
    description: "Price is below the EMA.",
    fieldMapping: { location: "below_ema" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "near_prior_swing_high",
    label: "Near Prior Swing High",
    description: "Price is near a prior swing high.",
    fieldMapping: { location: "near_prior_swing_high" },
  },
  {
    category: "context",
    group_name: "context_location",
    key: "near_prior_swing_low",
    label: "Near Prior Swing Low",
    description: "Price is near a prior swing low.",
    fieldMapping: { location: "near_prior_swing_low" },
  },
];

const outcomeTags: DictionarySeed[] = [
  {
    category: "outcome",
    group_name: "outcome_result",
    key: "succeeded",
    label: "Succeeded",
    description: "The expected price action succeeded.",
    fieldMapping: { result: "succeeded" },
  },
  {
    category: "outcome",
    group_name: "outcome_result",
    key: "failed",
    label: "Failed",
    description: "The expected price action failed.",
    fieldMapping: { result: "failed" },
  },
  {
    category: "outcome",
    group_name: "outcome_result",
    key: "continued",
    label: "Continued",
    description: "The move continued after the labeled structure.",
    fieldMapping: { result: "continued" },
  },
  {
    category: "outcome",
    group_name: "outcome_result",
    key: "reversed",
    label: "Reversed",
    description: "The move reversed after the labeled structure.",
    fieldMapping: { result: "reversed" },
  },
  {
    category: "outcome",
    group_name: "outcome_result",
    key: "evolved_into_range",
    label: "Evolved Into Range",
    description: "The structure evolved into a trading range.",
    fieldMapping: { result: "evolved_into_range" },
  },
  {
    category: "outcome",
    group_name: "outcome_result",
    key: "evolved_into_channel",
    label: "Evolved Into Channel",
    description: "The structure evolved into a channel.",
    fieldMapping: { result: "evolved_into_channel" },
  },
  {
    category: "outcome",
    group_name: "outcome_result",
    key: "unclear",
    label: "Unclear",
    description: "The outcome is unclear.",
    fieldMapping: { result: "unclear" },
  },
];

export const dictionarySeeds = [
  ...barTags,
  ...segmentTags,
  ...contextTags,
  ...outcomeTags,
];

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function mappingJson(seed: DictionarySeed) {
  return JSON.stringify(seed.fieldMapping ?? {});
}

export function seedDictionary() {
  const db = getDb();
  const now = unixNow();

  const insert = db.prepare(`
    INSERT INTO label_dictionary (
      category,
      group_name,
      key,
      label,
      description,
      example,
      field_mapping_json,
      sort_order,
      is_active,
      created_by,
      source,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'local', ?, ?, ?)
    ON CONFLICT (category, key) DO UPDATE SET
      description = CASE
        WHEN label_dictionary.description IS NULL OR label_dictionary.description = ''
        THEN excluded.description
        ELSE label_dictionary.description
      END,
      example = CASE
        WHEN label_dictionary.example IS NULL OR label_dictionary.example = ''
        THEN excluded.example
        ELSE label_dictionary.example
      END,
      field_mapping_json = CASE
        WHEN label_dictionary.field_mapping_json IS NULL OR label_dictionary.field_mapping_json = '{}'
        THEN excluded.field_mapping_json
        ELSE label_dictionary.field_mapping_json
      END,
      sort_order = CASE
        WHEN label_dictionary.sort_order = 0
        THEN excluded.sort_order
        ELSE label_dictionary.sort_order
      END
  `);

  const seed = db.transaction(() => {
    dictionarySeeds.forEach((entry, index) => {
      insert.run(
        entry.category,
        entry.group_name,
        entry.key,
        entry.label,
        entry.description,
        entry.example ?? null,
        mappingJson(entry),
        index + 1,
        entry.source ?? "manual",
        now,
        now,
      );
    });
  });

  seed();
}

export default seedDictionary;
