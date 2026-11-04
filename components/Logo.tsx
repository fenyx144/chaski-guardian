export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-label="Logo Yaku Guardian"
      >
        <circle cx="24" cy="24" r="22" fill="#141210" stroke="#c77d2a" strokeWidth="2.5" />
        {/* gota de agua andina */}
        <path
          d="M24 7 C24 7 14 20 14 27 a10 10 0 0 0 20 0 C34 20 24 7 24 7 Z"
          fill="#2f9e44"
          stroke="#e8a94e"
          strokeWidth="1.6"
        />
        {/* ojo guardián */}
        <ellipse cx="24" cy="27.5" rx="5.2" ry="3.6" fill="#141210" />
        <circle cx="24" cy="27.5" r="1.8" fill="#e8a94e" />
        {/* chacana simplificada */}
        <path
          d="M24 3.5 v3 M24 41.5 v3 M3.5 24 h3 M41.5 24 h3"
          stroke="#e8a94e"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">
        Yaku <span className="text-clay dark:text-sol">Guardian</span>
      </span>
    </span>
  );
}
