import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { ChevronRight, PawPrint } from "lucide-react";
import { Logo } from "../components/Logo";
import { auth } from "../lib/firebase";
import { firebaseReady } from "../lib/firebase-config";
import {
  formatDate,
  getWarsawMonth,
  isPastDate,
  isPastSlot,
  monthFromDateKey,
  toDateKey,
} from "../lib/date";
import { getDemoSlots } from "../features/slots/demo";
import type { Slot, SlotStatus } from "../features/slots/types";

type AuthState = "loading" | "signed-out" | "not-authorized" | "authorized";
const isLocalDemo = import.meta.env.DEV && !firebaseReady;

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
    return onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setAuthState("signed-out");
        return;
      }
      const token = await currentUser.getIdTokenResult();
      setUser(currentUser);
      setAuthState(
        token.claims.admin === true ? "authorized" : "not-authorized",
      );
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
  if (authState === "not-authorized")
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Brak dostępu</h1>
          <p>
            Twoje konto nie ma uprawnień administratora. Poproś właścicielkę o
            zaproszenie.
          </p>
          <button
            className="demo-button"
            type="button"
            onClick={() => void signOut(auth!)}
          >
            Wyloguj się
          </button>
        </section>
      </main>
    );

  return (
    <main className="auth-page">
      <a href="/" className="auth-brand">
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
  const [slots, setSlots] = useState<Slot[]>(() =>
    demoMode ? getDemoSlots(getWarsawMonth()) : [],
  );
  const [newTime, setNewTime] = useState("");
  const [copyDate, setCopyDate] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">(
    demoMode ? "ready" : "loading",
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const month = useMemo(() => monthFromDateKey(selectedDate), [selectedDate]);

  useEffect(() => {
    if (demoMode) {
      setSlots(getDemoSlots(month));
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
          month,
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
  }, [demoMode, month]);

  const daySlots = useMemo(
    () => slots.filter((slot) => slot.dateKey === selectedDate),
    [slots, selectedDate],
  );
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
  const removeDay = () => {
    dialogRef.current?.close();
    if (demoMode) {
      setSlots((current) =>
        current.filter((slot) => slot.dateKey !== selectedDate),
      );
      return;
    }
    void run(async () => {
      const { deleteSlots } = await import("../features/slots/repository");
      await deleteSlots(
        daySlots.map((slot) => slot.id),
        user!.uid,
      );
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
        <Logo href="/" />
        <div>
          {demoMode && <span className="demo-badge">Tryb demonstracyjny</span>}
          <a href="/" className="outline-button">
            Zobacz stronę
          </a>
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
        <div className="dashboard-grid">
          <section className="admin-card">
            <h2>Godziny na wybrany dzień</h2>
            <label className="field-label">
              Data
              <input
                name="selected-date"
                autoComplete="off"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>
            <p>
              {formatDate(selectedDate)}. Zmień status godziny, aby pokazać lub
              ukryć ją na stronie.
            </p>
            <div className="admin-slots">
              {dataState === "loading" ? (
                <p className="empty-admin" aria-live="polite">
                  Ładowanie godzin…
                </p>
              ) : daySlots.length ? (
                daySlots.map((slot) => (
                  <label key={slot.id}>
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
                ))
              ) : (
                <p className="empty-admin">Brak godzin na ten dzień.</p>
              )}
            </div>
          </section>
          <section className="admin-card">
            <h2>Dodaj godzinę</h2>
            <div className="add-slot">
              <input
                name="new-time"
                autoComplete="off"
                aria-label="Nowa godzina"
                type="time"
                value={newTime}
                onChange={(event) => setNewTime(event.target.value)}
              />
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
              <input
                name="copy-date"
                autoComplete="off"
                type="date"
                value={copyDate}
                onChange={(event) => setCopyDate(event.target.value)}
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
              onClick={() => dialogRef.current?.showModal()}
            >
              Usuń wszystkie godziny z dnia
            </button>
          </section>
        </div>
        {message && (
          <p className="form-message" aria-live="polite">
            {message}
          </p>
        )}
        <button className="back-demo" type="button" onClick={onExit}>
          {demoMode ? "← Wróć do logowania" : "Wyloguj się"}
        </button>
      </section>
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        aria-labelledby="delete-title"
      >
        <h2 id="delete-title">Usunąć wszystkie godziny?</h2>
        <p>
          Ta operacja usunie {daySlots.length} godzin z dnia{" "}
          {formatDate(selectedDate)}.
        </p>
        <div>
          <button
            type="button"
            className="demo-button"
            onClick={() => dialogRef.current?.close()}
          >
            Anuluj
          </button>
          <button
            type="button"
            className="gold-button danger-button"
            onClick={removeDay}
          >
            Usuń godziny
          </button>
        </div>
      </dialog>
    </main>
  );
}
