import { cn } from "@/lib/utils";

export type PaletteState = "current" | "answered" | "answered-correct" | "answered-wrong" | "flagged" | "empty";

type Props = {
  states: PaletteState[];
  onJump: (index: number) => void;
};

export function QuestionPalette({ states, onJump }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {states.map((s, i) => (
        <button
          key={i}
          onClick={() => onJump(i)}
          aria-label={`Question ${i + 1}`}
          className={cn(
            "btn-press focus-ring h-7 w-7 rounded-[6px] border text-[11px] tabular-nums transition-colors",
            s === "empty" && "border-border bg-surface text-muted-foreground hover:border-border-strong",
            s === "answered" && "border-transparent text-foreground",
            s === "answered-correct" && "border-transparent text-foreground",
            s === "answered-wrong" && "border-transparent text-foreground",
            s === "flagged" && "border-transparent text-foreground",
            s === "current" && "border-transparent text-accent-foreground",
          )}
          style={{
            backgroundColor:
              s === "answered"
                ? "color-mix(in oklab, var(--foreground) 8%, transparent)"
                : s === "answered-correct"
                  ? "var(--success-tint)"
                  : s === "answered-wrong"
                    ? "var(--danger-tint)"
                    : s === "flagged"
                      ? "var(--warning-tint)"
                      : s === "current"
                        ? "var(--accent)"
                        : undefined,
          }}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
