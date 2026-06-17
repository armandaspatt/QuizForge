import { cn } from "@/lib/utils";
import { RichText } from "@/components/RichText";

type Props = {
  letter: string;
  text: string;
  selected: boolean;
  locked?: boolean;
  reveal?: "none" | "correct" | "wrong";
  onClick?: () => void;
};

export function OptionButton({ letter, text, selected, locked, reveal = "none", onClick }: Props) {
  const isCorrect = reveal === "correct";
  const isWrong = reveal === "wrong";
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={cn(
        "btn-press group relative flex w-full items-center gap-3 rounded-[10px] border border-border bg-surface px-4 py-3.5 text-left text-[14px] text-foreground lift-hover focus-ring",
        "transition-colors",
        selected && reveal === "none" && "text-accent",
        isCorrect && "shake-x-none fade-in-soft",
        isWrong && "shake-x",
        locked && "cursor-not-allowed opacity-90 hover:transform-none hover:shadow-none",
      )}
      style={{
        backgroundColor: isCorrect
          ? "var(--success-tint)"
          : isWrong
            ? "var(--danger-tint)"
            : selected
              ? "var(--accent-tint)"
              : undefined,
        borderLeft: isCorrect
          ? "2px solid var(--success)"
          : isWrong
            ? "2px solid var(--danger)"
            : selected
              ? "2px solid var(--accent)"
              : undefined,
      }}
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-[11px] font-medium text-muted-foreground",
          selected && reveal === "none" && "border-transparent bg-accent text-accent-foreground",
          isCorrect && "border-transparent bg-success text-white",
          isWrong && "border-transparent bg-danger text-white",
        )}
      >
        {letter}
      </span>
      <span className="min-w-0 flex-1 leading-snug">
        <RichText text={text} compact />
      </span>
    </button>
  );
}
