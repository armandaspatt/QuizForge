import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { listSets } from "@/lib/sets.functions";
import { listAttempts, getDueReviews } from "@/lib/attempts.functions";

export const Route = createFileRoute("/_authed/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TestBench" },
      { name: "description", content: "Review your past attempts and per-topic performance over time." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: attempts = [] } = useQuery({ queryKey: ["attempts"], queryFn: () => listAttempts() });
  const { data: sets = [] } = useQuery({ queryKey: ["sets"], queryFn: () => listSets() });
  const { data: dueReviews = [] } = useQuery({ queryKey: ["due-reviews"], queryFn: () => getDueReviews() });

  const setById = useMemo(() => new Map(sets.map((s) => [s.id, s])), [sets]);

  // Build per-topic series across attempts (oldest -> newest).
  const ordered = useMemo(() => [...attempts].sort((a, b) => a.startedAt - b.startedAt), [attempts]);

  const topicSeries = useMemo(() => {
    const map = new Map<string, { pct: number; attemptId: string }[]>();
    for (const a of ordered) {
      const s = setById.get(a.setId);
      if (!s) continue;
      const byTopic = new Map<string, { c: number; t: number }>();
      for (const qid of a.questionIds) {
        const q = s.questions.find((qq) => qq.id === qid);
        if (!q) continue;
        const e = byTopic.get(q.topic) ?? { c: 0, t: 0 };
        e.t++;
        if (a.answers[qid] === q.answerIndex) e.c++;
        byTopic.set(q.topic, e);
      }
      for (const [topic, v] of byTopic.entries()) {
        const arr = map.get(topic) ?? [];
        arr.push({ pct: v.t ? Math.round((v.c / v.t) * 100) : 0, attemptId: a.id });
        map.set(topic, arr);
      }
    }
    return Array.from(map.entries()).map(([topic, series]) => {
      const last = series[series.length - 1];
      return { topic, series, latest: last?.pct ?? 0 };
    });
  }, [ordered, setById]);

  const strong = topicSeries.filter((t) => t.latest >= 70).sort((a, b) => b.latest - a.latest);
  const weak = topicSeries.filter((t) => t.latest < 70).sort((a, b) => a.latest - b.latest);

  // Join due-review rows (just question ids) back to their question/set info
  // so we can show something a person can act on, not just a count.
  const dueDetails = useMemo(() => {
    if (dueReviews.length === 0) return [];
    const byQuestion = new Map<string, { setId: string; setName: string; topic: string; prompt: string }>();
    for (const s of sets) {
      for (const q of s.questions) {
        byQuestion.set(q.id, { setId: s.id, setName: s.name, topic: q.topic, prompt: q.prompt });
      }
    }
    return dueReviews
      .map((r) => {
        const info = byQuestion.get(r.questionId);
        return info ? { ...r, ...info } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.dueAt - b.dueAt);
  }, [dueReviews, sets]);

  return (
    <Shell>
      <div className="pt-4">
        <h1 className="text-[22px] font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {attempts.length} attempts · {topicSeries.length} topics covered.
        </p>
      </div>

      {dueDetails.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">
            Due for review · {dueDetails.length}
          </h2>
          <ul className="space-y-2">
            {dueDetails.slice(0, 6).map((d) => (
              <li key={d.questionId}>
                <Link
                  to="/configure/$setId"
                  params={{ setId: d.setId }}
                  className="lift-hover flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3"
                  style={{ borderLeft: "2px solid var(--warning)" }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-foreground">{d.prompt}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {d.setName} · {d.topic}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-muted-foreground">Retake</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {attempts.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-dashed border-border bg-surface/40 px-5 py-12 text-center text-[13px] text-muted-foreground">
          No completed attempts yet. <Link to="/sets" className="text-accent">Create a test</Link> to get started.
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Recent attempts</h2>
            <ul className="space-y-2">
              {[...attempts]
                .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
                .slice(0, 8)
                .map((a) => {
                  const s = setById.get(a.setId);
                  const qs = (s?.questions ?? []).filter((q) => a.questionIds.includes(q.id));
                  const correct = qs.filter((q) => a.answers[q.id] === q.answerIndex).length;
                  return (
                    <li key={a.id}>
                      <Link
                        to="/results/$attemptId"
                        params={{ attemptId: a.id }}
                        className="lift-hover flex items-center justify-between rounded-[10px] border border-border bg-surface px-4 py-3"
                      >
                        <div>
                          <div className="text-[13.5px] text-foreground">{s?.name ?? "Set"}</div>
                          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {new Date(a.finishedAt ?? a.startedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="font-mono text-[13px] tabular-nums text-foreground">
                          {correct}/{qs.length}
                        </div>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Topic heatmap</h2>

            {strong.length > 0 && <HeatmapList rows={strong} />}
            {strong.length > 0 && weak.length > 0 && (
              <hr className="my-5 border-t border-dashed border-border" />
            )}
            {weak.length > 0 && <HeatmapList rows={weak} weak />}
          </section>
        </>
      )}
    </Shell>
  );
}

function HeatmapList({
  rows,
  weak,
}: {
  rows: { topic: string; series: { pct: number }[]; latest: number }[];
  weak?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.topic}
          className="flex items-center gap-4 rounded-[10px] border border-border px-4 py-2.5"
          style={{
            backgroundColor: weak ? "color-mix(in oklab, var(--danger) 6%, var(--surface))" : "var(--surface)",
          }}
        >
          <div className="w-40 truncate text-[13px] text-foreground">{r.topic}</div>
          <div className="flex flex-1 items-center gap-1.5">
            {r.series.map((p, i) => {
              const op = 0.4 + (0.6 * (i + 1)) / r.series.length;
              const color = p.pct >= 70 ? "var(--success)" : p.pct >= 40 ? "var(--warning)" : "var(--danger)";
              return (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-full"
                  style={{ backgroundColor: color, opacity: op }}
                  title={`${p.pct}%`}
                />
              );
            })}
          </div>
          <div className="w-12 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
            {r.latest}%
          </div>
        </li>
      ))}
    </ul>
  );
}
