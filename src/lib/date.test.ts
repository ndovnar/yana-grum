import { describe, expect, it } from "vitest";
import {
  getMonthGrid,
  monthDateKeyRange,
  slotIdFor,
  toDateKey,
  warsawDateTime,
  isPastSlot,
} from "./date";

describe("calendar date utilities", () => {
  it("creates a Monday-first grid with the correct days for February 2021", () => {
    const grid = getMonthGrid({ year: 2021, month: 1 });

    expect(grid).toHaveLength(28);
    expect(grid[0]).toBe(1);
    expect(grid.at(-1)).toBe(28);
  });

  it("creates inclusive month date-key boundaries", () => {
    expect(monthDateKeyRange({ year: 2026, month: 11 })).toEqual({
      start: "2026-12-01",
      end: "2027-01-01",
    });
  });

  it("stores an appointment as the intended Warsaw calendar date and time", () => {
    const appointment = warsawDateTime("2026-08-21", "15:00");

    expect(toDateKey(appointment)).toBe("2026-08-21");
    expect(
      appointment.toLocaleTimeString("pl-PL", {
        timeZone: "Europe/Warsaw",
        hour: "2-digit",
        minute: "2-digit",
      }),
    ).toBe("15:00");
  });

  it("creates deterministic IDs that prevent duplicate times per day", () => {
    expect(slotIdFor("2026-08-21", "15:00")).toBe("2026-08-21_1500");
  });

  it("marks elapsed same-day appointment times as unavailable", () => {
    const now = warsawDateTime("2026-08-21", "15:30");

    expect(isPastSlot("2026-08-21", "15:00", now)).toBe(true);
    expect(isPastSlot("2026-08-21", "16:00", now)).toBe(false);
  });
});
