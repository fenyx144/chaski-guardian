"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/panel", label: "Panel" },
  { href: "/simulacion", label: "Simulación" },
  { href: "/chat", label: "Chat demo" },
];

export default function NavBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-andino-negro/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" aria-label="Yaku Guardian inicio">
          <Logo />
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="Principal">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                path === l.href
                  ? "bg-andino-verde text-white"
                  : "text-andino-arena/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
