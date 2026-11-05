"use client";

import { useIdioma } from "@/lib/i18n";

export default function Pie() {
  const { t } = useIdioma();
  return (
    <footer className="border-t-2 border-cocoa/10 py-6 text-center text-sm font-semibold text-cocoa/60 dark:border-white/10 dark:text-crema/60">
      Chaski Guardian · MIT · {t("pie.texto")}
    </footer>
  );
}
