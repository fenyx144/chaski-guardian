"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useIdioma, type Clave } from "@/lib/i18n";

const LINKS: { href: string; clave: Clave }[] = [
  { href: "/", clave: "nav.inicio" },
  { href: "/panel", clave: "nav.panel" },

];

export default function NavBar() {
  const path = usePathname();
  const { t, lang, setLang } = useIdioma();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-cocoa/10 bg-crema/95 backdrop-blur dark:border-white/10 dark:bg-noche/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" aria-label="Chaski Guardian inicio">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex flex-wrap gap-1" aria-label="Principal">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-4 py-1.5 text-sm font-extrabold transition-colors ${
                  path === l.href
                    ? "bg-cocoa text-crema dark:bg-sol dark:text-cocoa"
                    : "text-cocoa/70 hover:bg-sol/60 dark:text-crema/75 dark:hover:bg-white/10"
                }`}
              >
                {t(l.clave)}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            aria-label={lang === "es" ? "Switch to English" : "Cambiar a español"}
            className="rounded-lg border-2 border-cocoa/30 px-2 py-1 text-sm font-black hover:bg-sol/50 dark:border-crema/40 dark:hover:bg-white/10"
          >
            {t("nav.idioma")}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
