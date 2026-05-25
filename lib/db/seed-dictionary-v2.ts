import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "@/lib/db/client";

export function seedDictionary() {
  const db = getDb();

  const now = Math.floor(Date.now() / 1000);

  // Clear existing dictionary
  db.exec("DELETE FROM label_dictionary");

  // Bar labels
  const barTags = [
    // Bar Shape
    {
      category: "bar",
      group_name: "bar_shape",
      key: "strong_bull_bar",
      label: "Strong Bull Bar",
      description: "Strong bullish candle with large body",
    },
    {
      category: "bar",
      group_name: "bar_shape",
      key: "strong_bear_bar",
      label: "Strong Bear Bar",
      description: "Strong bearish candle with large body",
    },
    {
      category: "bar",
      group_name: "bar_shape",
      key: "weak_bull_bar",
      label: "Weak Bull Bar",
      description: "Weak bullish candle with small body",
    },
    {
      category: "bar",
      group_name: "bar_shape",
      key: "weak_bear_bar",
      label: "Weak Bear Bar",
      description: "Weak bearish candle with small body",
    },
    {
      category: "bar",
      group_name: "bar_shape",
      key: "doji",
      label: "Doji",
      description: "Candle with nearly equal open and close",
    },
    {
      category: "bar",
      group_name: "bar_shape",
      key: "close_near_high",
      label: "Close Near High",
      description: "Close in upper portion of range",
    },
    {
      category: "bar",
      group_name: "bar_shape",
      key: "close_near_low",
      label: "Close Near Low",
      description: "Close in lower portion of range",
    },
    {
      category: "bar",
      group_name: "bar_shape",
      key: "long_upper_tail",
      label: "Long Upper Tail",
      description: "Long wick above body",
    },
    {
      category: "bar",
      group_name: "bar_shape",
      key: "long_lower_tail",
      label: "Long Lower Tail",
      description: "Long wick below body",
    },

    // Bar Pattern (Role + inside/outside)
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "signal_bar",
      label: "Signal Bar",
      description: "Bar that signals a potential setup",
    },
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "entry_bar",
      label: "Entry Bar",
      description: "Bar used as entry point",
    },
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "breakout_attempt_bar",
      label: "Breakout Attempt Bar",
      description: "Bar attempting to break prior level",
    },
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "follow_through_bar",
      label: "Follow Through Bar",
      description: "Bar following up on prior direction",
    },
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "pullback_bar",
      label: "Pullback Bar",
      description: "Bar pulling back against trend",
    },
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "reversal_attempt_bar",
      label: "Reversal Attempt Bar",
      description: "Bar attempting to reverse trend",
    },
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "test_bar",
      label: "Test Bar",
      description: "Bar testing prior level",
    },
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "inside_bar",
      label: "Inside Bar",
      description: "Bar contained within prior bar range",
    },
    {
      category: "bar",
      group_name: "bar_pattern",
      key: "outside_bar",
      label: "Outside Bar",
      description: "Bar exceeding prior bar range",
    },
  ];

  // Segment labels
  const segmentTags = [
    {
      category: "segment",
      group_name: "segment",
      key: "bull_leg",
      label: "Bull Leg",
      description: "Upward trending movement",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "bear_leg",
      label: "Bear Leg",
      description: "Downward trending movement",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "bull_channel",
      label: "Bull Channel",
      description: "Uptrend moving within channel",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "bear_channel",
      label: "Bear Channel",
      description: "Downtrend moving within channel",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "trading_range",
      label: "Trading Range",
      description: "Price oscillating within range",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "flag",
      label: "Flag",
      description: "Consolidation pattern after strong move",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "double_top",
      label: "Double Top",
      description: "Two peaks at similar levels",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "double_bottom",
      label: "Double Bottom",
      description: "Two troughs at similar levels",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "wedge",
      label: "Wedge",
      description: "Converging price range",
    },
    {
      category: "segment",
      group_name: "segment",
      key: "spike",
      label: "Spike",
      description: "Sharp move away and back",
    },
  ];

  // Context labels
  const contextTags = [
    // Market Context
    {
      category: "context",
      group_name: "context_market",
      key: "bull_trend_context",
      label: "Bull Trend",
      description: "Market in uptrend",
    },
    {
      category: "context",
      group_name: "context_market",
      key: "bear_trend_context",
      label: "Bear Trend",
      description: "Market in downtrend",
    },
    {
      category: "context",
      group_name: "context_market",
      key: "bull_channel_context",
      label: "Bull Channel",
      description: "Market in bull channel",
    },
    {
      category: "context",
      group_name: "context_market",
      key: "bear_channel_context",
      label: "Bear Channel",
      description: "Market in bear channel",
    },
    {
      category: "context",
      group_name: "context_market",
      key: "trading_range_context",
      label: "Trading Range",
      description: "Market in trading range",
    },
    {
      category: "context",
      group_name: "context_market",
      key: "transition_context",
      label: "Transition",
      description: "Market in transition state",
    },

    // Active Event
    {
      category: "context",
      group_name: "context_event",
      key: "bull_breakout_attempt",
      label: "Bull Breakout Attempt",
      description: "Potential upside breakout",
    },
    {
      category: "context",
      group_name: "context_event",
      key: "bear_breakout_attempt",
      label: "Bear Breakout Attempt",
      description: "Potential downside breakout",
    },
    {
      category: "context",
      group_name: "context_event",
      key: "bull_pullback",
      label: "Bull Pullback",
      description: "Pullback in uptrend",
    },
    {
      category: "context",
      group_name: "context_event",
      key: "bear_pullback",
      label: "Bear Pullback",
      description: "Pullback in downtrend",
    },
    {
      category: "context",
      group_name: "context_event",
      key: "test_of_high",
      label: "Test of High",
      description: "Testing prior high level",
    },
    {
      category: "context",
      group_name: "context_event",
      key: "test_of_low",
      label: "Test of Low",
      description: "Testing prior low level",
    },
    {
      category: "context",
      group_name: "context_event",
      key: "reversal_attempt",
      label: "Reversal Attempt",
      description: "Potential trend reversal",
    },

    // Location
    {
      category: "context",
      group_name: "context_location",
      key: "near_range_high",
      label: "Near Range High",
      description: "Near upper edge of trading range",
    },
    {
      category: "context",
      group_name: "context_location",
      key: "near_range_low",
      label: "Near Range Low",
      description: "Near lower edge of trading range",
    },
    {
      category: "context",
      group_name: "context_location",
      key: "near_high_of_day",
      label: "Near High of Day",
      description: "Near today's high",
    },
    {
      category: "context",
      group_name: "context_location",
      key: "near_low_of_day",
      label: "Near Low of Day",
      description: "Near today's low",
    },
    {
      category: "context",
      group_name: "context_location",
      key: "near_ema",
      label: "Near EMA",
      description: "Near moving average",
    },
    {
      category: "context",
      group_name: "context_location",
      key: "middle_of_range",
      label: "Middle of Range",
      description: "Middle of trading range",
    },
  ];

  const allTags = [...barTags, ...segmentTags, ...contextTags];

  const stmt = db.prepare(`
    INSERT INTO label_dictionary
    (category, group_name, key, label, description, sort_order, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 1, ?)
  `);

  for (const tag of allTags) {
    stmt.run(
      tag.category,
      tag.group_name,
      tag.key,
      tag.label,
      tag.description || "",
      now
    );
  }

  console.log(`✓ Seeded ${allTags.length} tags into label_dictionary`);
}

export default seedDictionary;
