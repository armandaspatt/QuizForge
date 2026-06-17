import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { deleteSet, getSets } from "@/lib/store";
import type { QuestionSet } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TestBench — Custom MCQ tests" },
      { name: "description", content: "Generate or paste multiple choice questions, configure the test rules, and run timed quizzes." },
      { property: "og:title", content: "TestBench" },
      { property: "og:description", content: "Build and run custom multiple choice tests." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [sets, setSets] = useState<QuestionSet[]>([]);

  useEffect(() => {
    setSets(getSets());
  }, []);

  const removeSet = (id: string) => {
    deleteSet(id);
    setSets(getSets());
  };

  return (
    <Shell>
      <section className="pt-6">
        <h1 className="text-[26px] font-medium leading-tight tracking-tight text-foreground">
          Build a test, your way.
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          Generate questions from a topic, or paste your own. You set the timing, marking, hints, and feedback rules.
        </p>
      </section>

      <Link
        to="/import"
        className="btn-press fade-in-soft mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-accent text-[14px] font-medium text-accent-foreground hover:opacity-95"
      >
        <Plus size={16} strokeWidth={1.75} /> Create new test
      </Link>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Question sets</h2>
          <span className="text-[12px] text-muted-foreground">{sets.length} saved</span>
        </div>

        {sets.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border bg-surface/40 px-5 py-10 text-center text-[13px] text-muted-foreground">
            No question sets yet. Create one to get started.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {sets.map((s) => (
              <li
                key={s.id}
                className="lift-hover group relative flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3.5"
                style={{ borderLeft: "2px solid var(--accent)" }}
              >
                <button
                  onClick={() => navigate({ to: "/configure/$setId", params: { setId: s.id } })}
                  className="flex-1 text-left btn-press"
                >
                  <div className="text-[14px] text-foreground">{s.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {s.questions.length} questions · {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </button>
                <button
                  onClick={() => removeSet(s.id)}
                  aria-label="Delete set"
                  className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
