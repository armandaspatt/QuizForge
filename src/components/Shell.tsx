import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";
import { useSession, signOut } from "@/lib/auth-client";

export function Shell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-6 pb-3">
        <Wordmark />
        <nav className="flex items-center gap-1 text-[13px] text-muted-foreground">
          {session?.user ? (
            <Link
              to="/dashboard"
              className="btn-press rounded-md px-2.5 py-1.5 hover:text-foreground hover:bg-[color-mix(in_oklab,var(--accent)_4%,transparent)]"
              activeProps={{ className: "text-foreground" }}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn-press rounded-md px-2.5 py-1.5 hover:text-foreground hover:bg-[color-mix(in_oklab,var(--accent)_4%,transparent)]"
              activeProps={{ className: "text-foreground" }}
            >
              Sign in
            </Link>
          )}
          <ThemeToggle />
          {session?.user && (
            <button
              type="button"
              onClick={handleSignOut}
              title={session.user.email}
              className="btn-press inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:text-foreground hover:bg-[color-mix(in_oklab,var(--accent)_4%,transparent)]"
            >
              <LogOut size={14} strokeWidth={1.75} />
            </button>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-24 fade-in-soft">{children}</main>
    </div>
  );
}
