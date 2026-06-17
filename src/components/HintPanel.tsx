import { Lightbulb } from "lucide-react";

export function HintPanel({ open, text }: { open: boolean; text?: string }) {
  return (
    <div
      className="overflow-hidden"
      style={{
        maxHeight: open ? 200 : 0,
        transition: "max-height 200ms ease",
      }}
    >
      <div className="mt-3 rounded-[10px] border border-border bg-[var(--surface-2)] px-4 py-3 text-[13px] text-foreground">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          <Lightbulb size={12} strokeWidth={1.5} /> Hint
        </div>
        {text || "No hint available for this question."}
      </div>
    </div>
  );
}
