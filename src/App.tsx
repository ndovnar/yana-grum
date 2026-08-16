import { lazy, Suspense, useSyncExternalStore } from "react";
import "./App.css";
import { HomePage } from "./pages/HomePage";

const AdminPage = lazy(() => import("./pages/AdminPage"));

function subscribeToLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getPathname() {
  return window.location.pathname;
}

export default function App() {
  const pathname = useSyncExternalStore(
    subscribeToLocation,
    getPathname,
    getPathname,
  );
  if (pathname === "/") return <HomePage />;
  if (pathname === "/auth")
    return (
      <Suspense
        fallback={<main className="route-loading">Ładowanie panelu…</main>}
      >
        <AdminPage />
      </Suspense>
    );
  return (
    <main className="not-found">
      <h1>Nie znaleziono strony</h1>
      <a className="gold-button" href="/">
        Wróć do strony głównej
      </a>
    </main>
  );
}
