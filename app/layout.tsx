import type { Metadata } from "next";
import { Bowlby_One, Urbanist, Schoolbell } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Proveedores from "@/components/Proveedores";
import Pie from "@/components/Pie";
import SimulacroLocal from "@/components/SimulacroLocal";

const display = Bowlby_One({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
});

const sans = Urbanist({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const mano = Schoolbell({
  subsets: ["latin"],
  variable: "--font-mano",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Chaski Guardian · Alerta temprana ante lluvias en Arequipa",
  description:
    "Sistema comunitario de alerta temprana ante lluvias de El Niño para barrios de quebrada en Arequipa, Perú.",
};

const TEMA_INICIAL = `(function(){try{if(localStorage.getItem('chaski-tema')==='oscuro'){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mano.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} />
      </head>
      <body className="min-h-screen">
        <Proveedores>
          <NavBar />
          <SimulacroLocal>
            <main className="mx-auto w-full max-w-6xl px-4 pb-16">{children}</main>
            <Pie />
          </SimulacroLocal>
        </Proveedores>
      </body>
    </html>
  );
}
