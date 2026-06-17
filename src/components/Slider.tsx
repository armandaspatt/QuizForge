import type { ChangeEvent } from "react";

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  width = 200,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  width?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value));
  return (
    <div className="flex items-center gap-3" style={{ width }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handle}
        className="qf-range h-1 flex-1 appearance-none rounded-full bg-border outline-none focus-ring"
        style={{
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`,
        }}
      />
      <span className="w-14 text-right font-mono text-[12px] tabular-nums text-foreground">
        {value}
        {suffix ?? ""}
      </span>
      <style>{`
        .qf-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: var(--accent);
          border: 2px solid var(--surface);
          box-shadow: 0 0 0 1px var(--border-strong);
          cursor: pointer;
          transition: transform 100ms ease;
        }
        .qf-range::-webkit-slider-thumb:active { transform: scale(0.92); }
        .qf-range::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 9999px;
          background: var(--accent); border: 2px solid var(--surface);
          box-shadow: 0 0 0 1px var(--border-strong); cursor: pointer;
        }
      `}</style>
    </div>
  );
}
