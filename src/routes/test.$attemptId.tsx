import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Lightbulb } from "lucide-react";
import { Shell } from "@/components/Shell";
import { TimerRing } from "@/components/TimerRing";
import { OptionButton } from "@/components/OptionButton";
import { QuestionPalette, type PaletteState } from "@/components/QuestionPalette";
import { HintPanel } from "@/components/HintPanel";
import { RichText } from "@/components/RichText";
import { getAttempt, getSet, saveAttempt } from "@/lib/store";
import type { Attempt, Question, QuestionSet } from "@/lib/types";

export const Route = createFileRoute("/test/$attemptId")({
  head: () => ({
    meta: [{ title: "Test in progress — TestBench" }],
  }),
  component: TestRunner,
});

const LETTERS = ["A", "B", "C", "D"];

function TestRunner() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [idx, setIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [now, setNow] = useState(Date.now());
  const questionStart = useRef<number>(Date.now());
  // Per-question timer: track segment start and an offset for hint penalty.
  const segmentStart = useRef<number>(Date.now());
  const segmentOffset = useRef<number>(0);
  // Total timer: offset for hint penalty
  const totalOffset = useRef<number>(0);

  // Load attempt + set
  useEffect(() => {
    const a = getAttempt(attemptId);
    if (!a) return;
    setAttempt(a);
    const s = getSet(a.setId);
    if (s) setSet(s);
  }, [attemptId]);

  // Tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Reset per-question segment & hint panel on question change
  useEffect(() => {
    segmentStart.current = Date.now();
    segmentOffset.current = 0;
    questionStart.current = Date.now();
    setShowHint(false);
  }, [idx]);

  const questions: Question[] = useMemo(() => {
    if (!attempt || !set) return [];
    return attempt.questionIds.map((id) => set.questions.find((q) => q.id === id)!).filter(Boolean);
  }, [attempt, set]);

  const persist = useCallback(
    (next: Attempt) => {
      setAttempt(next);
      saveAttempt(next);
    },
    [],
  );

  const finish = useCallback(() => {
    if (!attempt) return;
    const next: Attempt = {
      ...attempt,
      finishedAt: Date.now(),
    };
    // Capture per-question time for current question
    next.perQuestionMs = {
      ...next.perQuestionMs,
      [questions[idx]?.id ?? ""]: (next.perQuestionMs[questions[idx]?.id ?? ""] ?? 0) + (Date.now() - questionStart.current),
    };
    persist(next);
    navigate({ to: "/results/$attemptId", params: { attemptId: next.id } });
  }, [attempt, idx, navigate, persist, questions]);

  const q = questions[idx];
  const selected = q ? attempt?.answers[q.id] : undefined;
  const locked = q ? !!attempt?.locked[q.id] : false;
  const flagged = q ? !!attempt?.flags[q.id] : false;
  const hintUsed = q ? !!attempt?.hintsUsed[q.id] : false;
  const rules = attempt?.rules;
  const realtime = rules?.feedback === "realtime" && locked;

  // Timer math
  const elapsedSec = !rules
    ? 0
    : rules.timing.mode === "total"
      ? Math.floor((now - (attempt?.startedAt ?? now)) / 1000) + totalOffset.current
      : rules.timing.mode === "per-question"
        ? Math.floor((now - segmentStart.current) / 1000) + segmentOffset.current
        : Math.floor((now - (attempt?.startedAt ?? now)) / 1000);

  const totalSec = !rules
    ? 0
    : rules.timing.mode === "total"
      ? rules.timing.totalMinutes * 60
      : rules.timing.mode === "per-question"
        ? rules.timing.perQuestionSeconds
        : 0;

  // Auto-finish/advance on timer expiry
  useEffect(() => {
    if (!attempt || !rules) return;
    if (rules.timing.mode === "total" && elapsedSec >= totalSec && !attempt.finishedAt) {
      finish();
    }
  }, [rules?.timing.mode, elapsedSec, totalSec, attempt?.finishedAt, finish, attempt, rules]);

  useEffect(() => {
    if (!attempt || !rules || !q) return;
    if (rules.timing.mode === "per-question" && elapsedSec >= totalSec) {
      const next: Attempt = { ...attempt };
      next.locked = { ...next.locked, [q.id]: true };
      next.perQuestionMs = {
        ...next.perQuestionMs,
        [q.id]: (next.perQuestionMs[q.id] ?? 0) + (Date.now() - questionStart.current),
      };
      persist(next);
      if (idx + 1 < questions.length) setIdx(idx + 1);
      else finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSec, totalSec, rules?.timing.mode]);

const choose = (i: number) => {
  if (!attempt || !q || !rules) return;
  if (locked && !rules.reattempt) return;
  const next: Attempt = { ...attempt, answers: { ...attempt.answers, [q.id]: i } };
  if (rules.feedback === "realtime") {
    next.locked = { ...next.locked, [q.id]: true };
  }
  persist(next);
};

  const advance = (dir: 1 | -1) => {
    if (!attempt || !q || !rules) return;
    const elapsedMs = Date.now() - questionStart.current;
    const next: Attempt = {
      ...attempt,
      perQuestionMs: {
        ...attempt.perQuestionMs,
        [q.id]: (attempt.perQuestionMs[q.id] ?? 0) + elapsedMs,
      },
    };
    if (dir === 1 && !rules.reattempt) {
      next.locked = { ...next.locked, [q.id]: true };
    }
    persist(next);
    const nextIdx = idx + dir;
    if (nextIdx < 0) return;
    if (nextIdx >= questions.length) {
      finish();
      return;
    }
    setIdx(nextIdx);
  };

  const toggleFlag = () => {
    if (!attempt || !q) return;
    const next: Attempt = { ...attempt, flags: { ...attempt.flags, [q.id]: !flagged } };
    persist(next);
  };

  const useHint = () => {
    if (!attempt || !q || !rules) return;
    setShowHint(true);
    if (hintUsed) return;
    const next: Attempt = { ...attempt, hintsUsed: { ...attempt.hintsUsed, [q.id]: true } };
    if (rules.hints.penalty === "time") {
      if (rules.timing.mode === "total") totalOffset.current += rules.hints.penaltyAmount;
      else if (rules.timing.mode === "per-question") segmentOffset.current += rules.hints.penaltyAmount;
    }
    persist(next);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!rules) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "4") {
        choose(parseInt(e.key, 10) - 1);
      } else if (e.key === "ArrowRight") advance(1);
      else if (e.key === "ArrowLeft") advance(-1);
      else if (e.key.toLowerCase() === "f") toggleFlag();
      else if (e.key.toLowerCase() === "h" && rules.hints.enabled) useHint();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, idx]);

  if (!attempt || !set || !rules || !q || questions.length === 0) {
    return (
      <Shell>
        <div className="pt-10 text-[13px] text-muted-foreground">Loading...</div>
      </Shell>
    );
  }


  const paletteStates: PaletteState[] = questions.map((qq, i) => {
    const ans = attempt.answers[qq.id];
    if (i === idx) return "current";
    if (attempt.flags[qq.id]) return "flagged";
    if (ans == null) return "empty";
    if (rules.feedback === "realtime" && attempt.locked[qq.id]) {
      return ans === qq.answerIndex ? "answered-correct" : "answered-wrong";
    }
    return "answered";
  });

  return (
    <Shell>
      <header className="flex items-start justify-between gap-4 pt-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">{set.name}</div>
          <div className="mt-1 text-[14px] text-foreground">
            Question <span className="font-mono">{idx + 1}</span>
            <span className="text-muted-foreground"> / {questions.length}</span>
            <span className="ml-3 text-[12px] text-muted-foreground">· {q.topic}</span>
          </div>
        </div>
        {rules.timing.mode !== "none" ? (
          <div key={rules.timing.mode === "per-question" ? idx : "total"}>
            <TimerRing totalSeconds={totalSec} elapsedSeconds={elapsedSec} />
          </div>
        ) : (
          <div className="font-mono text-[13px] text-muted-foreground">
            {fmt(Math.floor((now - attempt.startedAt) / 1000))}
          </div>
        )}
      </header>

      <article className="mt-8 rounded-[10px] border border-border bg-surface p-7 fade-in-soft" key={q.id}>
        <div className="text-[18px] font-normal leading-relaxed text-foreground">
          <RichText text={q.prompt} />
        </div>

        <div className="mt-6 space-y-2.5">
          {q.options.map((opt, i) => {
            let reveal: "none" | "correct" | "wrong" = "none";
            if (realtime) {
              if (i === q.answerIndex) reveal = "correct";
              else if (i === selected) reveal = "wrong";
            }
            return (
              <OptionButton
                key={i}
                letter={LETTERS[i]}
                text={opt}
                selected={selected === i}
                locked={locked && !rules.reattempt}
                reveal={reveal}
                onClick={() => choose(i)}
              />
            );
          })}
        </div>

        {rules.hints.enabled && (
          <HintPanel open={showHint} text={q.hint} />
        )}
      </article>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          onClick={() => advance(-1)}
          disabled={idx === 0}
          className="btn-press inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3 text-[13px] text-foreground hover:bg-[color-mix(in_oklab,var(--accent)_4%,transparent)] disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFlag}
            className="btn-press inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3 text-[13px] text-foreground"
            style={flagged ? { backgroundColor: "var(--warning-tint)", borderColor: "var(--warning)", color: "var(--warning)" } : undefined}
          >
            <Flag size={14} /> {flagged ? "Flagged" : "Flag"}
          </button>
          {rules.hints.enabled && (
            <button
              onClick={useHint}
              disabled={showHint}
              className="btn-press inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3 text-[13px] text-foreground disabled:opacity-50"
            >
              <Lightbulb size={14} /> Hint
              {rules.hints.penalty !== "none" && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  −{rules.hints.penaltyAmount}{rules.hints.penalty === "time" ? "s" : "m"}
                </span>
              )}
            </button>
          )}
        </div>

        <button
          onClick={() => advance(1)}
          className="btn-press inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-3 text-[13px] font-medium text-accent-foreground"
        >
          {idx + 1 === questions.length ? "Finish" : "Next"} <ChevronRight size={14} />
        </button>
      </div>

      <div className="mt-8 rounded-[10px] border border-border bg-surface px-4 py-3">
        <div className="mb-2 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Questions</div>
        <QuestionPalette states={paletteStates} onJump={(i) => setIdx(i)} />
      </div>
    </Shell>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${ss}`;
}
