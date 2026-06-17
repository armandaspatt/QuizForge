import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { OptionButton } from "@/components/OptionButton";
import { getAttempt, getSet } from "@/lib/store";
import type { Attempt, Question, QuestionSet } from "@/lib/types";

export const Route = createFileRoute("/results/$attemptId")({
  head: () => ({
    meta: [{ title: "Results — TestBench" }],
  }),
  component: Results,
});

const LETTERS = ["A", "B", "C", "D"];

function Results() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [set, setSet] = useState<QuestionSet | null>(null);

  useEffect(() => {
    const a = getAttempt(attemptId);
    if (!a) return;
    setAttempt(a);
    const s = getSet(a.setId);
    if (s) setSet(s);
  }, [attemptId]);

  const summary = useMemo(() => {
    if (!attempt || !set) return null;
    const qs: Question[] = attempt.questionIds.map((id) => set.questions.find((q) => q.id === id)!).filter(Boolean);
    let correct = 0, wrong = 0, unanswered = 0, hints = 0, totalMs = 0;
    for (const q of qs) {
      const ans = attempt.answers[q.id];
      if (ans == null) unanswered++;
      else if (ans === q.answerIndex) correct++;
      else wrong++;
      if (attempt.hintsUsed[q.id]) hints++;
      totalMs += attempt.perQuestionMs[q.id] ?? 0;
    }
    const m = attempt.rules.marking;
    let score = correct * m.correct + wrong * m.wrong + unanswered * m.unanswered;
    if (attempt.rules.hints.penalty === "marks") {
      score -= hints * attempt.rules.hints.penaltyAmount;
    }
    const maxScore = qs.length * m.correct;

    // Per-topic accuracy
    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const q of qs) {
      const t = byTopic.get(q.topic) ?? { correct: 0, total: 0 };
      t.total++;
      if (attempt.answers[q.id] === q.answerIndex) t.correct++;
      byTopic.set(q.topic, t);
    }
    const topics = Array.from(byTopic.entries())
      .map(([topic, v]) => ({ topic, ...v, pct: v.total ? Math.round((v.correct / v.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);

    return { qs, correct, wrong, unanswered, hints, totalMs, score, maxScore, topics };
  }, [attempt, set]);

  if (!attempt || !set || !summary) {
    return (
      <Shell>
        <div className="pt-10 text-[13px] text-muted-foreground">Loading...</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="pt-4">
        <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Results</div>
        <h1 className="mt-1 text-[26px] font-medium tracking-tight">
          {summary.score.toFixed(2)}<span className="text-muted-foreground"> / {summary.maxScore}</span>
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {set.name} · {Math.round(summary.totalMs / 1000)}s total
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Correct" value={summary.correct} color="var(--success)" />
        <Metric label="Wrong" value={summary.wrong} color="var(--danger)" />
        <Metric label="Skipped" value={summary.unanswered} color="var(--muted-foreground)" />
        <Metric label="Hints used" value={summary.hints} color="var(--warning)" />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">By topic</h2>
        <ul className="space-y-2.5">
          {summary.topics.map((t, i) => {
            const color = t.pct >= 70 ? "var(--success)" : t.pct >= 40 ? "var(--warning)" : "var(--danger)";
            return (
              <li key={t.topic} className="flex items-center gap-3">
                <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-foreground">{t.topic}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">{t.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${t.pct}%`,
                        backgroundColor: color,
                        transition: "width 600ms ease",
                        transitionDelay: `${i * 60}ms`,
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Review</h2>
        <ul className="space-y-4">
          {summary.qs.map((q, i) => {
            const ans = attempt.answers[q.id];
            const isCorrect = ans === q.answerIndex;
            return (
              <li key={q.id} className="rounded-[10px] border border-border bg-surface p-5">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{(i + 1).toString().padStart(2, "0")}</span>
                  <span className="text-[14.5px] text-foreground">{q.prompt}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[12px]" style={{ color: isCorrect ? "var(--success)" : "var(--danger)" }}>
                    {isCorrect ? <Check size={13} /> : <X size={13} />}
                    {isCorrect ? "Correct" : ans == null ? "Skipped" : "Wrong"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, oi) => {
                    let reveal: "none" | "correct" | "wrong" = "none";
                    if (oi === q.answerIndex) reveal = "correct";
                    else if (oi === ans) reveal = "wrong";
                    return (
                      <OptionButton
                        key={oi}
                        letter={LETTERS[oi]}
                        text={opt}
                        selected={ans === oi}
                        reveal={reveal}
                        locked
                      />
                    );
                  })}
                </div>
                {q.explanation && (
                  <p className="mt-3 text-[12.5px] text-muted-foreground">{q.explanation}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-8 flex gap-2">
        <button
          onClick={() => navigate({ to: "/configure/$setId", params: { setId: set.id } })}
          className="btn-press inline-flex h-10 items-center rounded-[8px] bg-accent px-4 text-[13px] font-medium text-accent-foreground"
        >
          Retake
        </button>
        <Link
          to="/"
          className="btn-press inline-flex h-10 items-center rounded-[8px] border border-border bg-surface px-4 text-[13px] text-foreground"
        >
          Home
        </Link>
      </div>
    </Shell>
  );
}

function Metric({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div
      className="rounded-[10px] border border-border bg-surface p-4"
      style={{ borderTop: `2px solid ${color}` }}
    >
      <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-[20px] tabular-nums text-foreground">{value}</div>
    </div>
  );
}
