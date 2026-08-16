import { dateKeyForDay } from "../../lib/date";
import type { CalendarMonth } from "../../lib/date";
import type { Slot } from "./types";

const demoTimes: Record<number, string[]> = {
  21: ["15:00", "17:00", "18:00", "19:00"],
  23: ["09:00", "12:00"],
  24: ["15:00"],
  25: ["15:00"],
  26: ["15:00"],
  27: ["15:00"],
  28: ["15:00"],
  29: ["09:00"],
  30: ["09:00"],
  31: ["15:00"],
};

export function getDemoSlots(month: CalendarMonth): Slot[] {
  return Object.entries(demoTimes).flatMap(([day, times]) =>
    times.map((time) => {
      const dateKey = dateKeyForDay(month, Number(day));
      return {
        id: `demo-${dateKey}-${time}`,
        dateKey,
        time,
        startsAt: new Date(`${dateKey}T${time}:00`),
        status: "available" as const,
      };
    }),
  );
}
