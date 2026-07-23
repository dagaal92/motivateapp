import Image from "next/image";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Image
        src="/logo-mark.png"
        alt="Motívate"
        fill
        sizes={`${size}px`}
        className="object-contain rounded-lg"
        priority
      />
    </div>
  );
}

export default function Logo({
  compact = false,
  withTagline = false,
}: {
  compact?: boolean;
  withTagline?: boolean;
}) {
  const alto = withTagline ? (compact ? 40 : 56) : compact ? 30 : 36;
  const anchoBase = withTagline ? 335 : 335;
  const altoBase = withTagline ? 267 : 236;
  const ancho = Math.round((anchoBase / altoBase) * alto);

  return (
    <div className="relative shrink-0" style={{ width: ancho, height: alto }}>
      <Image
        src={withTagline ? "/logo-full.png" : "/logo-wordmark.png"}
        alt="Motívate — Ser mejor que ayer"
        fill
        sizes={`${ancho}px`}
        className="object-contain"
        priority
      />
    </div>
  );
}
