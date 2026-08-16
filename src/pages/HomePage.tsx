import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  PawPrint,
  Phone,
  X,
} from "lucide-react";
import {
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "../components/BrandIcons";
import { Logo } from "../components/Logo";
import { Calendar } from "../features/slots/Calendar";

export function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Przejdź do głównej treści
      </a>
      <main id="top">
        <header className="topbar">
          <button
            ref={menuButtonRef}
            className="menu-button"
            type="button"
            aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <Logo />
          <a className="outline-button" href="#terminy">
            Rezerwacje
          </a>
          {menuOpen && (
            <nav
              id="mobile-navigation"
              ref={menuRef}
              className="mobile-nav"
              aria-label="Nawigacja główna"
            >
              <a href="#o-nas" onClick={() => setMenuOpen(false)}>
                O salonie
              </a>
              <a href="#terminy" onClick={() => setMenuOpen(false)}>
                Terminy
              </a>
              <a href="#kontakt" onClick={() => setMenuOpen(false)}>
                Kontakt
              </a>
            </nav>
          )}
        </header>
        <div id="main-content" tabIndex={-1}>
          <section className="hero" id="o-nas">
            <div className="hero-image">
              <img
                src={`${import.meta.env.BASE_URL}images/yana-grum-hero.png`}
                alt="Czarny buldog francuski w złotym świetle"
                width="1024"
                height="1536"
                fetchPriority="high"
              />
            </div>
            <div className="hero-copy">
              <h1>
                Profesjonalna <em>pielęgnacja</em> psów
              </h1>
              <div className="hero-rule" />
              <ul>
                <li>
                  <PawPrint aria-hidden="true" /> Indywidualne podejście
                </li>
                <li>
                  <PawPrint aria-hidden="true" /> Bezpieczeństwo i komfort
                </li>
                <li>
                  <PawPrint aria-hidden="true" /> Profesjonalne kosmetyki
                </li>
              </ul>
              <p>
                <Heart aria-hidden="true" /> Wybierz dogodny termin i skontaktuj
                się ze mną, aby umówić wizytę.
              </p>
              <a className="gold-button" href="#terminy">
                Zobacz wolne terminy <ChevronRight aria-hidden="true" />
              </a>
            </div>
          </section>
          <Calendar />
        </div>
        <footer id="kontakt">
          <div className="contact-grid">
            <section className="contact-area">
              <h2>KONTAKT</h2>
              <div className="contact-detail-grid">
                <div className="contact-list">
                  <div className="contact-item">
                    <InstagramIcon />
                    <p>
                      <b>Instagram</b>
                      <br />
                      <a href="https://instagram.com/yana_grum">@yana_grum</a>
                    </p>
                  </div>
                  <div className="contact-item">
                    <TikTokIcon />
                    <p>
                      <b>TikTok</b>
                      <br />
                      <a href="https://www.tiktok.com/@yana_grum">@yana_grum</a>
                    </p>
                  </div>
                </div>
                <div className="contact-list">
                  <div className="contact-item">
                    <Phone aria-hidden="true" />
                    <p>
                      <b>Telefon</b>
                      <br />
                      <a href="tel:+48663676652">+48 663 676 652</a>
                    </p>
                  </div>
                  <div className="contact-item">
                    <WhatsAppIcon />
                    <p>
                      <b>WhatsApp</b>
                      <br />
                      <a href="https://wa.me/48663676652">+48 663 676 652</a>
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <section className="address-area">
              <h2>ADRES</h2>
              <div>
                <MapPin aria-hidden="true" />
                <p>
                  Koszalin
                  <br />
                  Podgórna 30/26
                  <br />3 piętro
                </p>
              </div>
            </section>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Yana Grum</span>
          </div>
        </footer>
      </main>
    </>
  );
}
