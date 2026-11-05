export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascotas/saludando.png"
        alt="Chaski, el cuy guardián"
        width={size + 8}
        height={size + 8}
        className="rounded-full border-2 border-cocoa bg-white object-cover dark:border-crema/70"
        style={{ width: size + 8, height: size + 8 }}
      />
      <span className="font-display text-xl font-bold tracking-tight">
        Chaski <span className="text-clay dark:text-sol">Guardian</span>
      </span>
    </span>
  );
}
