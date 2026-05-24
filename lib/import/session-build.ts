import { z } from "zod";

import type { ParsedBar } from "@/lib/import/csv-parse";
import {
  addDays,
  formatDate,
  unixSecondsToZonedParts,
} from "@/lib/import/time";

export type SessionType = "RTH" | "ETH";

export type SessionBar = ParsedBar & {
  barNumber: number;
};

export type BuiltSession = {
  sessionDate: string;
  sessionType: SessionType;
  startTs: number;
  endTs: number;
  barCount: number;
  bars: SessionBar[];
};

export type SessionBuildWarning = {
  row?: number;
  message: string;
};

export type SessionBuildResult = {
  sessions: BuiltSession[];
  warnings: SessionBuildWarning[];
};

const buildOptionsSchema = z.object({
  sessionType: z.enum(["RTH", "ETH"]).default("RTH"),
  marketTimezone: z.string().min(1).default("America/Chicago"),
});

function minutesAfterMidnight(hour: number, minute: number) {
  return hour * 60 + minute;
}

function sessionDateForBar(
  bar: ParsedBar,
  sessionType: SessionType,
  marketTimezone: string,
) {
  const parts = unixSecondsToZonedParts(bar.ts, marketTimezone);
  const localDate = formatDate(parts);
  const minute = minutesAfterMidnight(parts.hour, parts.minute);

  if (sessionType === "RTH") {
    const rthOpen = 8 * 60 + 30;
    const rthClose = 15 * 60;

    if (minute < rthOpen || minute >= rthClose) {
      return null;
    }

    return localDate;
  }

  const ethOpen = 17 * 60;
  const ethClose = 16 * 60;

  if (minute >= ethOpen) {
    return addDays(localDate, 1);
  }

  if (minute < ethClose) {
    return localDate;
  }

  return null;
}

function sessionKey(sessionDate: string, sessionType: SessionType) {
  return `${sessionDate}:${sessionType}`;
}

export function buildSessions(
  bars: ParsedBar[],
  options?: z.input<typeof buildOptionsSchema>,
): SessionBuildResult {
  const { sessionType, marketTimezone } = buildOptionsSchema.parse(
    options ?? {},
  );
  const sessions = new Map<string, BuiltSession>();
  const warnings: SessionBuildWarning[] = [];

  for (const bar of bars) {
    const sessionDate = sessionDateForBar(
      bar,
      sessionType,
      marketTimezone,
    );

    if (!sessionDate) {
      warnings.push({
        row: bar.sourceRow,
        message: `Bar is outside ${sessionType} hours and was skipped.`,
      });
      continue;
    }

    const key = sessionKey(sessionDate, sessionType);
    let session = sessions.get(key);

    if (!session) {
      session = {
        sessionDate,
        sessionType,
        startTs: bar.ts,
        endTs: bar.ts,
        barCount: 0,
        bars: [],
      };
      sessions.set(key, session);
    }

    session.bars.push({
      ...bar,
      barNumber: session.bars.length + 1,
    });
    session.startTs = Math.min(session.startTs, bar.ts);
    session.endTs = Math.max(session.endTs, bar.ts);
    session.barCount = session.bars.length;
  }

  return {
    sessions: [...sessions.values()].sort((a, b) =>
      a.sessionDate.localeCompare(b.sessionDate),
    ),
    warnings,
  };
}
