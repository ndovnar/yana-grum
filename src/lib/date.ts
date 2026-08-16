export const WARSAW_TIME_ZONE = "Europe/Warsaw";

export type CalendarMonth = { year: number; month: number };

const numericFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WARSAW_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WARSAW_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function getWarsawMonth(now = new Date()): CalendarMonth {
  const parts = numericFormatter.formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value) - 1,
  };
}

export function addMonths(month: CalendarMonth, amount: number): CalendarMonth {
  const date = new Date(Date.UTC(month.year, month.month + amount, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function getMonthGrid(month: CalendarMonth): Array<number | null> {
  const firstDay = new Date(Date.UTC(month.year, month.month, 1)).getUTCDay();
  const startsOnMonday = (firstDay + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(month.year, month.month + 1, 0),
  ).getUTCDate();
  const cells = Math.ceil((startsOnMonday + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const day = index - startsOnMonday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
}

export function formatMonth(month: CalendarMonth) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: WARSAW_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(month.year, month.month, 1)));
}

export function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: WARSAW_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function toDateKey(date: Date) {
  const parts = numericFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function dateKeyForDay(month: CalendarMonth, day: number) {
  return `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function monthFromDateKey(dateKey: string): CalendarMonth {
  const [year, month] = dateKey.split("-").map(Number);
  return { year, month: month - 1 };
}

export function monthDateKeyRange({ year, month }: CalendarMonth) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endMonth = addMonths({ year, month }, 1);
  const end = `${endMonth.year}-${String(endMonth.month + 1).padStart(2, "0")}-01`;
  return { start, end };
}

function timeZoneOffset(date: Date) {
  const parts = offsetFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return (
    Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    ) - date.getTime()
  );
}

export function warsawDateTime(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const firstOffset = timeZoneOffset(utcGuess);
  const candidate = new Date(utcGuess.getTime() - firstOffset);
  return new Date(utcGuess.getTime() - timeZoneOffset(candidate));
}

export function slotIdFor(dateKey: string, time: string) {
  return `${dateKey}_${time.replace(":", "")}`;
}

export function isPastDate(dateKey: string, now = new Date()) {
  return dateKey < toDateKey(now);
}

export function isPastSlot(dateKey: string, time: string, now = new Date()) {
  return warsawDateTime(dateKey, time).getTime() < now.getTime();
}
