import { TickMarkType, type Time } from "lightweight-charts";

const chartTimeZone = "America/Los_Angeles";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: chartTimeZone,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: chartTimeZone,
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: chartTimeZone,
  month: "short",
  day: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: chartTimeZone,
  month: "short",
});

const yearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: chartTimeZone,
  year: "numeric",
});

function dateFromChartTime(time: Time) {
  if (typeof time === "number") {
    return new Date(time * 1000);
  }

  if (typeof time === "string") {
    return new Date(`${time}T00:00:00Z`);
  }

  return new Date(Date.UTC(time.year, time.month - 1, time.day));
}

export function formatPacificChartTime(time: Time) {
  return dateTimeFormatter.format(dateFromChartTime(time));
}

export function formatPacificTickMark(
  time: Time,
  tickMarkType: TickMarkType,
) {
  const date = dateFromChartTime(time);

  if (tickMarkType === TickMarkType.Year) {
    return yearFormatter.format(date);
  }

  if (tickMarkType === TickMarkType.Month) {
    return monthFormatter.format(date);
  }

  if (tickMarkType === TickMarkType.DayOfMonth) {
    return dayFormatter.format(date);
  }

  return timeFormatter.format(date);
}

