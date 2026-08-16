import { lazy, Suspense, useSyncExternalStore } from "react";
import "./App.css";
import { HomePage } from "./pages/HomePage";

const AdminPage = lazy(() => import("./pages/AdminPage"));

function subscribeToLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getPathname() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const pathname = window.location.pathname;

  return basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length) || "/"
    : pathname;
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
      <a className="gold-button" href={import.meta.env.BASE_URL}>
        Wróć do strony głównej
      </a>
    </main>
  );
}
