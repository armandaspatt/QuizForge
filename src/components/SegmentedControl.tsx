import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

type Option<V extends string> = { value: V; label: string };

export function SegmentedControl<V extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: V;
  onChange: (v: V) => void;
  options: Option<V>[];
  size?: "sm" | "md";
}) {
  const layoutId = useId();
  return (
    <div
      className={cn(
        "inline-flex rounded-[8px] border border-border bg-[var(--surface-2)] p-1",
        size === "sm" ? "text-[12px]" : "text-[13px]",
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "btn-press relative rounded-[6px] px-3 py-1.5 font-normal transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${layoutId}`}
                className="absolute inset-0 rounded-[6px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                style={{ border: "1px solid var(--border)" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
