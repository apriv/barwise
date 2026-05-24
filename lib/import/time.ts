type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
}

function partsFromDate(date: Date, timeZone: string): DateParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function offsetMs(date: Date, timeZone: string) {
  const parts = partsFromDate(date, timeZone);
  const utcFromLocalParts = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return utcFromLocalParts - date.getTime();
}

export function zonedTimeToUnixSeconds(
  parts: DateParts,
  timeZone: string,
) {
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  const firstGuess = new Date(localAsUtc);
  const firstOffset = offsetMs(firstGuess, timeZone);
  const secondGuess = new Date(localAsUtc - firstOffset);
  const secondOffset = offsetMs(secondGuess, timeZone);

  return Math.floor((localAsUtc - secondOffset) / 1000);
}

export function unixSecondsToZonedParts(
  unixSeconds: number,
  timeZone: string,
) {
  return partsFromDate(new Date(unixSeconds * 1000), timeZone);
}

export function formatDate(parts: Pick<DateParts, "year" | "month" | "day">) {
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));

  return formatDate({
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  });
}
