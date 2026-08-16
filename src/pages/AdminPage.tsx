import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  Trash2,
} from "lucide-react";
import { pl } from "date-fns/locale";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { auth } from "../lib/firebase";
import { firebaseReady } from "../lib/firebase-config";
import {
  addMonths,
  dateKeyForDay,
  formatDate,
  formatMonth,
  getMonthGrid,
  getWarsawMonth,
  isPastDate,
  isPastSlot,
  slotIdFor,
  toDateKey,
  warsawDateTime,
} from "../lib/date";
import type { CalendarMonth } from "../lib/date";
import { getDemoSlots } from "../features/slots/demo";
import type { Slot, SlotStatus } from "../features/slots/types";

type AuthState = "loading" | "signed-out" | "authorized";
const isLocalDemo = import.meta.env.DEV && !firebaseReady;
const WEEKDAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const TIME_OPTIONS = Array.from({ length: 53 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 15;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
});

function dateKeyFromPicker(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type AdminDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function AdminDatePicker({ value, onChange, disabled }: AdminDatePickerProps) {
  const selectedDate = value ? new Date(`${value}T12:00:00`) : undefined;
  const today = toDateKey(new Date());

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="admin-date-trigger"
            disabled={disabled}
          />
        }
      >
        <CalendarIcon aria-hidden="true" />
        <span>{value ? formatDate(value) : "Wybierz datę"}</span>
      </PopoverTrigger>
      <PopoverContent className="admin-date-popover" align="start">
        <Calendar
          mode="single"
          locale={pl}
          selected={selectedDate}
          disabled={(date) => dateKeyFromPicker(date) < today}
          onSelect={(date) => date && onChange(dateKeyFromPicker(date))}
          className="admin-date-calendar"
        />
      </PopoverContent>
    </Popover>
  );
}

type AdminMonthCalendarProps = {
  month: CalendarMonth;
  slots: Slot[];
  selectedDate: string;
  isLoading: boolean;
  onMonthChange: (amount: number) => void;
  onSelectDate: (dateKey: string) => void;
};

function AdminMonthCalendar({
  month,
  slots,
  selectedDate,
  isLoading,
  onMonthChange,
  onSelectDate,
}: AdminMonthCalendarProps) {
  const days = useMemo(() => getMonthGrid(month), [month]);
  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, Slot[]>();
    slots.forEach((slot) => {
      const dateSlots = grouped.get(slot.dateKey);
      if (dateSlots) dateSlots.push(slot);
      else grouped.set(slot.dateKey, [slot]);
    });
    return grouped;
  }, [slots]);

  return (
    <section className="admin-calendar-card" aria-labelledby="admin-month-title">
      <header className="admin-calendar-head">
        <button
          type="button"
          aria-label="Poprzedni miesiąc"
          onClick={() => onMonthChange(-1)}
        >
          <ChevronLeft />
        </button>
        <div>
          <span className="eyebrow">Wybierz dzień</span>
          <h2 id="admin-month-title">{formatMonth(month)}</h2>
        </div>
        <button
          type="button"
          aria-label="Następny miesiąc"
          onClick={() => onMonthChange(1)}
        >
          <ChevronRight />
        </button>
      </header>
      <div className="admin-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div
        className="admin-month-grid"
        aria-busy={isLoading}
        aria-label={`Kalendarz ${formatMonth(month)}`}
      >
        {days.map((day, index) => {
          if (!day)
            return <div className="admin-calendar-day outside" key={index} />;

          const dateKey = dateKeyForDay(month, day);
          const dateSlots = slotsByDate.get(dateKey) ?? [];
          const available = dateSlots.filter(
            (slot) => slot.status === "available",
          ).length;
          const booked = dateSlots.length - available;
          const past = isPastDate(dateKey);
          const state = available
            ? `${available} wolne`
            : booked
              ? `${booked} zajęte`
              : "brak godzin";

          return (
            <button
              key={dateKey}
              type="button"
              className={`admin-calendar-day ${selectedDate === dateKey ? "selected" : ""} ${available ? "has-available" : ""} ${booked ? "has-booked" : ""} ${past ? "past" : ""}`}
              aria-pressed={selectedDate === dateKey}
              aria-label={`${formatDate(dateKey)}: ${state}`}
              disabled={past}
              onClick={() => onSelectDate(dateKey)}
            >
              <span>{day}</span>
              {!isLoading && (
                <small>
                  {available > 0 && <b>{available} wolne</b>}
                  {booked > 0 && <i>{booked} zajęte</i>}
                  {!available && !booked && "—"}
                </small>
              )}
            </button>
          );
        })}
      </div>
      <p className="admin-calendar-legend">
        <span><i className="admin-legend-free" /> wolne godziny</span>
        <span><i className="admin-legend-booked" /> zajęte godziny</span>
      </p>
    </section>
  );
}

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>(
    firebaseReady ? "loading" : "signed-out",
  );
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setAuthState("signed-out");
        return;
      }
      setUser(currentUser);
      setAuthState("authorized");
    });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setMessage("Nie udało się zalogować. Sprawdź adres e-mail i hasło.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (demoMode)
    return <AdminDashboard demoMode onExit={() => setDemoMode(false)} />;
  if (authState === "loading")
    return (
      <main className="auth-page">
        <p className="form-message" aria-live="polite">
          Sprawdzanie dostępu…
        </p>
      </main>
    );
  if (authState === "authorized" && user)
    return <AdminDashboard user={user} onExit={() => void signOut(auth!)} />;
  return (
    <main className="auth-page">
      <a href={import.meta.env.BASE_URL} className="auth-brand">
        <PawPrint aria-hidden="true" /> yana grum
      </a>
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="eyebrow">Panel administratora</span>
        <h1 id="auth-title">Witaj ponownie</h1>
        <p>Zaloguj się, aby zarządzać wolnymi terminami.</p>
        {firebaseReady ? (
          <form onSubmit={submit}>
            <label>
              E-mail
              <input
                name="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="nazwa@domena.pl…"
                required
              />
            </label>
            <label>
              Hasło
              <input
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="••••••••"
                required
              />
            </label>
            <button
              className="gold-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Logowanie…"
              ) : (
                <>
                  Zaloguj się <ChevronRight />
                </>
              )}
            </button>
          </form>
        ) : isLocalDemo ? (
          <>
            <p className="auth-hint">
              Firebase nie jest jeszcze skonfigurowany. Możesz bezpiecznie
              otworzyć lokalny podgląd panelu.
            </p>
            <button
              className="demo-button"
              type="button"
              onClick={() => setDemoMode(true)}
            >
              Otwórz panel demonstracyjny
            </button>
          </>
        ) : (
          <p className="form-message error">
            Panel administratora wymaga konfiguracji Firebase.
          </p>
        )}
        {message && (
          <p className="form-message error" aria-live="polite">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

function AdminDashboard({
  user,
  demoMode = false,
  onExit,
}: {
  user?: User;
  demoMode?: boolean;
  onExit: () => void;
}) {
  const today = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(getWarsawMonth);
  const [slots, setSlots] = useState<Slot[]>(() =>
    demoMode ? getDemoSlots(getWarsawMonth()) : [],
  );
  const [newTime, setNewTime] = useState("");
  const [copyDate, setCopyDate] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<Slot | null>(null);
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">(
    demoMode ? "ready" : "loading",
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (demoMode) {
      setSlots(getDemoSlots(visibleMonth));
      setDataState("ready");
      return undefined;
    }
    let unsubscribe: (() => void) | undefined;
    let active = true;
    setSlots([]);
    setDataState("loading");
    void import("../features/slots/repository")
      .then(({ subscribeToMonthSlots }) => {
        if (!active) return;
        unsubscribe = subscribeToMonthSlots(
          visibleMonth,
          (nextSlots) => {
            setSlots(nextSlots);
            setDataState("ready");
          },
          () => {
            setSlots([]);
            setDataState("error");
            setMessage(
              "Nie udało się pobrać terminów. Odśwież stronę i spróbuj ponownie.",
            );
          },
        );
      })
      .catch(() => {
        setSlots([]);
        setDataState("error");
        setMessage(
          "Nie udało się pobrać terminów. Odśwież stronę i spróbuj ponownie.",
        );
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [demoMode, visibleMonth]);

  const daySlots = useMemo(
    () => slots.filter((slot) => slot.dateKey === selectedDate),
    [slots, selectedDate],
  );
  const changeMonth = (amount: number) => {
    const nextMonth = addMonths(visibleMonth, amount);
    setVisibleMonth(nextMonth);
    setSelectedDate(dateKeyForDay(nextMonth, 1));
  };
  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setMessage("");
    try {
      await action();
      setMessage("Zmiany zapisano.");
    } catch {
      setMessage("Nie udało się zapisać zmian. Spróbuj ponownie.");
    } finally {
      setPending(false);
    }
  };
  const updateLocalStatus = (id: string, status: SlotStatus) =>
    setSlots((current) =>
      current.map((slot) => (slot.id === id ? { ...slot, status } : slot)),
    );
  const addSlot = () => {
    if (!newTime || isPastSlot(selectedDate, newTime)) {
      setMessage("Wybierz przyszły termin i godzinę.");
      return;
    }
    if (daySlots.some((slot) => slot.time === newTime)) {
      setMessage("Ta godzina już istnieje w wybranym dniu.");
      return;
    }
    if (demoMode) {
      setSlots((current) => [
        ...current,
        {
          id: `demo-${selectedDate}-${newTime}`,
          dateKey: selectedDate,
          time: newTime,
          startsAt: new Date(`${selectedDate}T${newTime}:00`),
          status: "available",
        },
      ]);
      setNewTime("");
      return;
    }
    void run(async () => {
      const { createSlot } = await import("../features/slots/repository");
      await createSlot(
        { date: selectedDate, time: newTime, status: "available" },
        user!.uid,
      );
      const addedSlot: Slot = {
        id: slotIdFor(selectedDate, newTime),
        dateKey: selectedDate,
        time: newTime,
        startsAt: warsawDateTime(selectedDate, newTime),
        status: "available",
      };
      setSlots((current) => [
        ...current.filter((slot) => slot.id !== addedSlot.id),
        addedSlot,
      ]);
      setNewTime("");
    });
  };
  const toggleSlot = (slot: Slot) => {
    const status: SlotStatus =
      slot.status === "available" ? "booked" : "available";
    if (demoMode) {
      updateLocalStatus(slot.id, status);
      return;
    }
    void run(async () => {
      const { setSlotStatus } = await import("../features/slots/repository");
      await setSlotStatus(slot.id, status, user!.uid);
    });
  };
  const removeSelected = () => {
    dialogRef.current?.close();
    const slotIds = slotToDelete
      ? [slotToDelete.id]
      : daySlots.map((slot) => slot.id);
    if (demoMode) {
      setSlots((current) =>
        current.filter((slot) => !slotIds.includes(slot.id)),
      );
      setSlotToDelete(null);
      return;
    }
    void run(async () => {
      const { deleteSlots } = await import("../features/slots/repository");
      await deleteSlots(slotIds, user!.uid);
      setSlotToDelete(null);
    });
  };
  const copyDay = () => {
    if (!copyDate || !daySlots.length || isPastDate(copyDate)) {
      setMessage("Wybierz przyszłą datę docelową.");
      return;
    }
    if (demoMode) {
      setSlots((current) => [
        ...current,
        ...daySlots.map((slot) => ({
          ...slot,
          id: `demo-${copyDate}-${slot.id}`,
          dateKey: copyDate,
          startsAt: new Date(`${copyDate}T${slot.time}:00`),
        })),
      ]);
      return;
    }
    void run(async () => {
      const { copySlots } = await import("../features/slots/repository");
      await copySlots(daySlots, copyDate, user!.uid);
    });
  };

  return (
    <main className="dashboard">
      <header className="dashboard-head">
        <Logo href={import.meta.env.BASE_URL} />
        <div>
          {demoMode && <span className="demo-badge">Tryb demonstracyjny</span>}
          <a href={import.meta.env.BASE_URL} className="outline-button">
            Zobacz stronę
          </a>
          <button className="header-logout" type="button" onClick={onExit}>
            {demoMode ? "Wróć" : "Wyloguj się"}
          </button>
        </div>
      </header>
      <section className="dashboard-content">
        <div>
          <span className="eyebrow">Panel administratora</span>
          <h1>Kalendarz terminów</h1>
          <p className="dashboard-lead">
            Zarządzaj godzinami widocznymi dla klientów. Rezerwacje są nadal
            potwierdzane bezpośrednio przez kontakt.
          </p>
        </div>
        <div className="dashboard-editor">
          <AdminMonthCalendar
            month={visibleMonth}
            slots={slots}
            selectedDate={selectedDate}
            isLoading={dataState === "loading"}
            onMonthChange={changeMonth}
            onSelectDate={setSelectedDate}
          />
          <div className="dashboard-grid">
            <section className="admin-card">
            <h2>Godziny na wybrany dzień</h2>
            <p>
              <strong>{formatDate(selectedDate)}</strong>. Zmień status
              godziny, aby pokazać lub ukryć ją na stronie.
            </p>
            <div className="admin-slots">
              {dataState === "loading" ? (
                <p className="empty-admin" aria-live="polite">
                  Ładowanie godzin…
                </p>
              ) : daySlots.length ? (
                daySlots.map((slot) => (
                  <div className="admin-slot" key={slot.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={slot.status === "available"}
                        onChange={() => toggleSlot(slot)}
                        disabled={pending}
                      />
                      <span>{slot.time}</span>
                      <small>
                        {slot.status === "available" ? "Wolny" : "Zajęty"}
                      </small>
                    </label>
                    <button
                      className="slot-delete"
                      type="button"
                      disabled={pending}
                      aria-label={`Usuń godzinę ${slot.time}`}
                      onClick={() => {
                        setSlotToDelete(slot);
                        dialogRef.current?.showModal();
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-admin">Brak godzin na ten dzień.</p>
              )}
            </div>
            </section>
            <section className="admin-card">
            <h2>Dodaj godzinę</h2>
            <div className="add-slot">
              <Select
                value={newTime}
                onValueChange={(value) => setNewTime(value ?? "")}
              >
                <SelectTrigger className="admin-time-select" disabled={pending}>
                  <SelectValue placeholder="Wybierz godzinę" />
                </SelectTrigger>
                <SelectContent className="admin-select-content" align="start">
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                className="gold-button"
                type="button"
                disabled={
                  pending || !newTime || isPastSlot(selectedDate, newTime)
                }
                onClick={addSlot}
              >
                Dodaj
              </button>
            </div>
            <hr />
            <h2>Kopiuj godziny</h2>
            <label className="field-label">
              Data docelowa
              <AdminDatePicker
                value={copyDate}
                onChange={setCopyDate}
                disabled={pending}
              />
            </label>
            <button
              className="admin-action"
              type="button"
              disabled={
                pending || !copyDate || !daySlots.length || isPastDate(copyDate)
              }
              onClick={copyDay}
            >
              Skopiuj godziny na ten dzień
            </button>
            <button
              className="admin-action danger"
              type="button"
              disabled={!daySlots.length || pending}
              onClick={() => {
                setSlotToDelete(null);
                dialogRef.current?.showModal();
              }}
            >
              Usuń wybrany dzień z kalendarza
            </button>
            </section>
          </div>
        </div>
        {message && (
          <p className="form-message" aria-live="polite">
            {message}
          </p>
        )}
      </section>
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        aria-labelledby="delete-title"
        onClose={() => setSlotToDelete(null)}
      >
        <h2 id="delete-title">
          {slotToDelete ? "Usunąć godzinę?" : "Usunąć wybrany dzień?"}
        </h2>
        <p>
          {slotToDelete
            ? `Ta operacja usunie godzinę ${slotToDelete.time} z dnia ${formatDate(selectedDate)}.`
            : `Ta operacja usunie ${daySlots.length} godzin z dnia ${formatDate(selectedDate)}.`}
        </p>
        <div>
          <button
            type="button"
            className="demo-button"
            onClick={() => {
              setSlotToDelete(null);
              dialogRef.current?.close();
            }}
          >
            Anuluj
          </button>
          <button
            type="button"
            className="gold-button danger-button"
            onClick={removeSelected}
          >
            {slotToDelete ? "Usuń godzinę" : "Usuń dzień"}
          </button>
        </div>
      </dialog>
    </main>
  );
}
