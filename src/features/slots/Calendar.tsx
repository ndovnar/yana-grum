import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  X,
} from "lucide-react";
import { firebaseReady } from "../../lib/firebase-config";
import {
  addMonths,
  dateKeyForDay,
  formatDate,
  formatMonth,
  getMonthGrid,
  getWarsawMonth,
  isPastDate,
  isPastSlot,
} from "../../lib/date";
import { getDemoSlots } from "./demo";
import type { Slot } from "./types";

const WEEKDAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const MONTH_COUNT = 4;
const isDemoMode =
  import.meta.env.VITE_DEMO_MODE === "true" ||
  (import.meta.env.DEV && !firebaseReady);

export function Calendar() {
  const [firstMonth, setFirstMonth] = useState(getWarsawMonth);
  const [monthOffset, setMonthOffset] = useState(0);
  const month = useMemo(
    () => addMonths(firstMonth, monthOffset),
    [firstMonth, monthOffset],
  );
  const [slots, setSlots] = useState<Slot[]>(() =>
    isDemoMode ? getDemoSlots(month) : [],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">(
    isDemoMode ? "ready" : "loading",
  );
  const days = useMemo(() => getMonthGrid(month), [month]);

  useEffect(() => {
    setSelectedDate(null);
    setSelectedTime(null);
    if (isDemoMode) {
      setSlots(getDemoSlots(month));
      setDataState("ready");
      return undefined;
    }
    if (!firebaseReady) {
      setSlots([]);
      setDataState("error");
      return undefined;
    }
    setSlots([]);
    setDataState("loading");

    let unsubscribe: (() => void) | undefined;
    let active = true;
    void import("./repository")
      .then(({ subscribeToMonthSlots }) => {
        if (!active) return;
        unsubscribe = subscribeToMonthSlots(
          month,
          (nextSlots) => {
            setSlots(nextSlots);
            setDataState("ready");
          },
          () => setDataState("error"),
        );
      })
      .catch(() => setDataState("error"));

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [month]);

  useEffect(() => {
    const refreshBaseMonth = () => {
      if (document.visibilityState === "visible")
        setFirstMonth(getWarsawMonth());
    };
    document.addEventListener("visibilitychange", refreshBaseMonth);
    return () =>
      document.removeEventListener("visibilitychange", refreshBaseMonth);
  }, []);

  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, Slot[]>();
    slots.forEach((slot) => {
      const current = grouped.get(slot.dateKey);
      if (current) current.push(slot);
      else grouped.set(slot.dateKey, [slot]);
    });
    return grouped;
  }, [slots]);

  const selectedSlots = selectedDate
    ? (slotsByDate.get(selectedDate) ?? []).filter(
        (slot) =>
          slot.status === "available" && !isPastSlot(slot.dateKey, slot.time),
      )
    : [];
  const selectedTimes = selectedSlots.map((slot) => slot.time);

  return (
    <section
      className="calendar-section"
      id="terminy"
      aria-labelledby="calendar-title"
    >
      <h2 id="calendar-title">Wybierz dogodny termin</h2>
      <p className="section-lead">
        Sprawdź wolne godziny i skontaktuj się ze mną, aby potwierdzić wizytę.
      </p>
      <div className="calendar-card">
        <header className="calendar-head">
          <button
            type="button"
            onClick={() => setMonthOffset((offset) => offset - 1)}
            disabled={monthOffset === 0}
            aria-label="Poprzedni miesiąc"
          >
            <ChevronLeft />
          </button>
          <h3>{formatMonth(month)}</h3>
          <button
            type="button"
            onClick={() => setMonthOffset((offset) => offset + 1)}
            disabled={monthOffset === MONTH_COUNT - 1}
            aria-label="Następny miesiąc"
          >
            <ChevronRight />
          </button>
        </header>
        <div className="weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div
          className="month-grid"
          aria-label={`Kalendarz ${formatMonth(month)}`}
        >
          {days.map((day, index) => {
            if (!day)
              return (
                <div
                  className="day outside"
                  key={`empty-${index}`}
                  aria-hidden="true"
                />
              );
            const dateKey = dateKeyForDay(month, day);
            const dateSlots = slotsByDate.get(dateKey) ?? [];
            const past = isPastDate(dateKey);
            const freeSlots = dateSlots.filter(
              (slot) =>
                slot.status === "available" &&
                !isPastSlot(slot.dateKey, slot.time),
            );
            const booked =
              !past &&
              dateSlots.some((slot) => slot.status === "booked") &&
              freeSlots.length === 0;
            const available =
              dataState === "ready" && freeSlots.length > 0 && !past;
            const firstTime = freeSlots[0]?.time;
            const state = available
              ? `wolne od ${firstTime}`
              : booked
                ? "zajęte"
                : past
                  ? "termin minął"
                  : "brak wolnych terminów";
            return (
              <button
                key={dateKey}
                type="button"
                disabled={!available}
                aria-pressed={selectedDate === dateKey}
                aria-label={`${formatDate(dateKey)}: ${state}`}
                onClick={() => {
                  setSelectedDate(dateKey);
                  setSelectedTime(null);
                }}
                className={`day ${available ? "available" : ""} ${booked ? "booked" : ""} ${past ? "past" : ""} ${selectedDate === dateKey ? "selected" : ""}`}
              >
                <span>{day}</span>
                {available && (
                  <div className="day-status">
                    <i>od {firstTime}</i>
                    <small>wolne</small>
                  </div>
                )}
                {booked && (
                  <div className="day-status">
                    <X />
                    <small>zajęte</small>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span>
            <i className="legend-free" /> wolne terminy
          </span>
          <span>
            <X size={16} /> zajęte terminy
          </span>
        </div>
      </div>
      {dataState === "error" && (
        <p className="form-message error" aria-live="polite">
          Terminy są chwilowo niedostępne. Odśwież stronę i spróbuj ponownie.
        </p>
      )}
      <div className="slots-card">
        <div className="slots-title">
          <CalendarDays />
          <div>
            <strong>Wybierz godzinę</strong>
            <span>
              {selectedDate
                ? formatDate(selectedDate)
                : "Wybierz dostępny dzień"}
            </span>
          </div>
        </div>
        <div className="slot-list" aria-label="Dostępne godziny">
          {dataState === "loading" ? (
            <span className="empty-slots" aria-live="polite">
              Ładowanie terminów…
            </span>
          ) : selectedTimes.length ? (
            selectedTimes.map((time) => (
              <button
                type="button"
                aria-pressed={selectedTime === time}
                className={selectedTime === time ? "active" : ""}
                key={time}
                onClick={() => setSelectedTime(time)}
              >
                {time}
              </button>
            ))
          ) : (
            <span className="empty-slots">Wybierz dzień w kalendarzu</span>
          )}
        </div>
      </div>
      {selectedTime && selectedDate ? (
        <div className="contact-prompt">
          <Heart size={18} fill="currentColor" aria-hidden="true" />{" "}
          <span>
            Wybrano:{" "}
            <b>
              {formatDate(selectedDate)}, {selectedTime}
            </b>
            . Skontaktuj się ze mną, aby potwierdzić wizytę.
          </span>
          <a
            href={`https://wa.me/48663676652?text=${encodeURIComponent(`Dzień dobry! Chcę umówić wizytę: ${formatDate(selectedDate)}, ${selectedTime}.`)}`}
          >
            Napisz na WhatsApp
          </a>
        </div>
      ) : (
        <p className="confirmation-note">
          Po wyborze terminu skontaktuj się ze mną w celu potwierdzenia wizyty.
        </p>
      )}
    </section>
  );
}
