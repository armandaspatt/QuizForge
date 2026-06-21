import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TestBench — Custom MCQ tests" },
      {
        name: "description",
        content:
          "Generate or paste multiple choice questions, configure the test rules, and run timed quizzes.",
      },
      { property: "og:title", content: "TestBench" },
      { property: "og:description", content: "Build and run custom multiple choice tests." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-6 pb-3">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/login"
            className="btn-press rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-[color-mix(in_oklab,var(--accent)_4%,transparent)]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-14 pb-24 fade-in-soft">
        <h1 className="max-w-xl text-[32px] font-medium leading-tight tracking-tight text-foreground">
          Build a multiple choice test, your way.
        </h1>
        <p className="mt-3 max-w-lg text-[15px] text-muted-foreground">
          Paste your own questions, generate them from a topic, or pull from a web page. Set the
          timing, marking, and feedback rules yourself, then take the test.
        </p>

        <Link
          to="/import"
          className="btn-press mt-7 inline-flex h-11 items-center gap-2 rounded-[8px] bg-accent px-5 text-[14px] font-medium text-accent-foreground hover:opacity-95"
        >
          Get started <ArrowRight size={15} strokeWidth={1.75} />
        </Link>

        <ul className="mt-14 grid gap-4 sm:grid-cols-3">
          <Feature
            title="Bring your own questions"
            body="Paste any format — the parser handles structured text instantly, or clean up messy text with AI."
          />
          <Feature
            title="Set your own rules"
            body="Timing, negative marking, hints, and when correctness is revealed — all configurable per test."
          />
          <Feature
            title="Track what's weak"
            body="A dashboard breaks down performance by topic across every attempt you've taken."
          />
        </ul>
      </main>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-[10px] border border-border bg-surface px-4 py-4">
      <div className="text-[13.5px] font-medium text-foreground">{title}</div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}
