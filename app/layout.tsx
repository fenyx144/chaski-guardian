import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Yaku Guardian · Alerta temprana ante lluvias en Arequipa",
  description:
    "Sistema comunitario de alerta temprana ante lluvias de El Niño para barrios de quebrada en Arequipa, Perú.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-andino-negro text-andino-arena antialiased">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-sm text-andino-arena/60">
          Yaku Guardian · MIT · Estimación ilustrativa, no reemplaza alertas
          oficiales (INDECI / SENAMHI).
        </footer>
      </body>
    </html>
  );
}
