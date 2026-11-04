"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/panel", label: "Panel" },
  { href: "/simulacion", label: "Simulación" },
  { href: "/chat", label: "Chat demo" },
];

export default function NavBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-cocoa/10 bg-crema/95 backdrop-blur dark:border-white/10 dark:bg-noche/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" aria-label="Yaku Guardian inicio">
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
                {l.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
