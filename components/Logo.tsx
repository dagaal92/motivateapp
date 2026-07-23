export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-accent text-white flex items-center justify-center font-display font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
    >
      M
    </div>
  );
}

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <LogoMark size={compact ? 26 : 30} />
      <span
        className="font-display font-semibold text-ink2 truncate"
        style={{ fontSize: compact ? 15 : 17 }}
      >
        Motívate
      </span>
    </div>
  );
}
