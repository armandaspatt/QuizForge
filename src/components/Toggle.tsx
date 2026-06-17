export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="focus-ring relative inline-flex h-[22px] w-[36px] items-center rounded-full border border-border transition-colors"
      style={{ backgroundColor: checked ? "var(--accent)" : "var(--surface-2)" }}
    >
      <span
        className="inline-block h-[16px] w-[16px] rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        style={{
          transform: `translateX(${checked ? 17 : 2}px)`,
          transition: "transform 200ms ease",
        }}
      />
    </button>
  );
}
