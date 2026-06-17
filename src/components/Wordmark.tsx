import { Link } from "@tanstack/react-router";

export function Wordmark() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-foreground btn-press">
      <span
        aria-hidden
        className="inline-block size-2 rounded-[2px] bg-accent"
      />
      <span className="text-[15px] font-medium tracking-tight">TestBench</span>
    </Link>
  );
}
