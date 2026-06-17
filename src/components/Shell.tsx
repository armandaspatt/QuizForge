import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-6 pb-3">
        <Wordmark />
        <nav className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <Link
            to="/dashboard"
            className="btn-press rounded-md px-2.5 py-1.5 hover:text-foreground hover:bg-[color-mix(in_oklab,var(--accent)_4%,transparent)]"
            activeProps={{ className: "text-foreground" }}
          >
            Dashboard
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-24 fade-in-soft">{children}</main>
    </div>
  );
}
