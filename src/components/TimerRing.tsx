import { useEffect, useMemo, useState } from "react";

type Props = {
  /** Total seconds for current segment (total test or current question). */
  totalSeconds: number;
  /** Seconds elapsed within that segment. */
  elapsedSeconds: number;
  /** Pass a key prop to trigger sweep-reset on per-question mode. */
  size?: number;
};

export function TimerRing({ totalSeconds, elapsedSeconds, size = 72 }: Props) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // Sweep-in on mount: animate from full → actual.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const remaining = Math.max(0, totalSeconds - elapsedSeconds);
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, remaining / totalSeconds)) : 0;
  const dashOffset = mounted ? c * (1 - ratio) : 0;

  const color = useMemo(() => {
    if (ratio < 0.1) return "var(--danger)";
    if (ratio < 0.3) return "var(--warning)";
    return "var(--accent)";
  }, [ratio]);

  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(remaining % 60)
    .toString()
    .padStart(2, "0");

  const pulsing = ratio < 0.1 && ratio > 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          className={pulsing ? "pulse-soft" : undefined}
          style={{
            transition:
              "stroke-dashoffset 700ms linear, stroke 400ms ease",
          }}
        />
      </svg>
      <span
        className="absolute font-mono text-[14px] tabular-nums text-foreground"
        style={{ fontSize: 14, letterSpacing: "-0.02em" }}
      >
        {mm}:{ss}
      </span>
    </div>
  );
}
