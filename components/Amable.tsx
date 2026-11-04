// Detalles amables: resaltador, subrayado garabato y notas manuscritas.

export function Resaltado({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block px-1">
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-1 top-[0.55em] -skew-x-6 rounded-sm bg-sol"
      />
      <span className="relative">{children}</span>
    </span>
  );
}

export function Garabato({
  children,
  color = "#ef7d26",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 120 12"
        preserveAspectRatio="none"
        className="absolute -bottom-1.5 left-0 h-2.5 w-full"
      >
        <path
          d="M2 8 Q 20 2 40 7 T 78 7 T 118 5"
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Nota({
  children,
  giro = "-rotate-3",
  className = "",
}: {
  children: React.ReactNode;
  giro?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block font-mano text-2xl leading-none text-naranja dark:text-sol ${giro} ${className}`}
    >
      {children}
    </span>
  );
}

export function Flecha({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-9 w-14 ${className}`}
    >
      <path d="M6 6 C 26 4, 46 12, 50 32" />
      <path d="M41 27 L50 34 L55 23" />
    </svg>
  );
}
