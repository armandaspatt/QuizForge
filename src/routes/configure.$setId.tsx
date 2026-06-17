import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Slider } from "@/components/Slider";
import { Toggle } from "@/components/Toggle";
import { Section, Row } from "@/components/Field";
import { defaultRules, type Attempt, type QuestionSet, type TestRules } from "@/lib/types";
import { getSet, saveAttempt, uid } from "@/lib/store";

export const Route = createFileRoute("/configure/$setId")({
  head: () => ({
    meta: [
      { title: "Configure test — TestBench" },
      { name: "description", content: "Set the timing, marking, hints and feedback rules for your test." },
    ],
  }),
  component: Configure,
});

function Configure() {
  const { setId } = Route.useParams();
  const navigate = useNavigate();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [rules, setRules] = useState<TestRules | null>(null);

  useEffect(() => {
    const s = getSet(setId);
    if (s) {
      setSet(s);
      setRules(defaultRules(s.questions.length));
    }
  }, [setId]);

  const maxScore = useMemo(() => {
    if (!rules) return 0;
    return rules.marking.correct * rules.questionCount;
  }, [rules]);

  if (!set || !rules) {
    return (
      <Shell>
        <div className="pt-10 text-[13px] text-muted-foreground">Loading...</div>
      </Shell>
    );
  }

  const update = (patch: Partial<TestRules>) => setRules({ ...rules, ...patch });

  const start = () => {
    const ids = set.questions.slice(0, rules.questionCount).map((q) => q.id);
    const attempt: Attempt = {
      id: uid(),
      setId: set.id,
      rules,
      questionIds: ids,
      answers: Object.fromEntries(ids.map((id) => [id, null])),
      locked: {},
      flags: {},
      hintsUsed: {},
      startedAt: Date.now(),
      perQuestionMs: Object.fromEntries(ids.map((id) => [id, 0])),
    };
    saveAttempt(attempt);
    navigate({ to: "/test/$attemptId", params: { attemptId: attempt.id } });
  };

  return (
    <Shell>
      <div className="pt-4">
        <h1 className="text-[22px] font-medium tracking-tight">{set.name}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {set.questions.length} questions available. Tune the rules, then start.
        </p>
      </div>

      <div className="mt-6 rounded-[10px] border border-border bg-surface px-5">
        <Section title="Timing">
          <Row label="Mode" hint="How time is enforced during the test.">
            <SegmentedControl
              value={rules.timing.mode}
              onChange={(mode) => {
                if (mode === "none") update({ timing: { mode: "none" } });
                else if (mode === "total") update({ timing: { mode: "total", totalMinutes: 10 } });
                else update({ timing: { mode: "per-question", perQuestionSeconds: 30 } });
              }}
              options={[
                { value: "none", label: "None" },
                { value: "total", label: "Total" },
                { value: "per-question", label: "Per question" },
              ]}
            />
          </Row>
          {rules.timing.mode === "total" && (
            <Row label="Total duration" hint="Single countdown across the test.">
              <Slider
                value={rules.timing.totalMinutes}
                onChange={(v) => update({ timing: { mode: "total", totalMinutes: v } })}
                min={1}
                max={120}
                suffix=" min"
              />
            </Row>
          )}
          {rules.timing.mode === "per-question" && (
            <Row label="Per question" hint="Timer resets on each question.">
              <Slider
                value={rules.timing.perQuestionSeconds}
                onChange={(v) => update({ timing: { mode: "per-question", perQuestionSeconds: v } })}
                min={5}
                max={180}
                step={5}
                suffix=" s"
              />
            </Row>
          )}
        </Section>

        <Section title="Marking" hint={`Max score: ${maxScore}`}>
          <Row label="Correct" hint="Marks awarded for a correct answer.">
            <Slider
              value={rules.marking.correct}
              onChange={(v) => update({ marking: { ...rules.marking, correct: v } })}
              min={1}
              max={5}
            />
          </Row>
          <Row label="Wrong" hint="Negative marks for a wrong answer.">
            <Slider
              value={rules.marking.wrong}
              onChange={(v) => update({ marking: { ...rules.marking, wrong: v } })}
              min={-3}
              max={0}
              step={0.25}
            />
          </Row>
          <Row label="Unanswered" hint="Negative marks for skipped questions.">
            <Slider
              value={rules.marking.unanswered}
              onChange={(v) => update({ marking: { ...rules.marking, unanswered: v } })}
              min={-2}
              max={0}
              step={0.25}
            />
          </Row>
        </Section>

        <Section title="Reattempt">
          <Row label="Allow changing answers" hint="If off, each answer locks once you move on.">
            <Toggle checked={rules.reattempt} onChange={(v) => update({ reattempt: v })} />
          </Row>
        </Section>

        <Section title="Hints">
          <Row label="Enable hints">
            <Toggle
              checked={rules.hints.enabled}
              onChange={(v) => update({ hints: { ...rules.hints, enabled: v } })}
            />
          </Row>
          {rules.hints.enabled && (
            <>
              <Row label="Penalty" hint="How using a hint is penalised.">
                <SegmentedControl
                  value={rules.hints.penalty}
                  onChange={(v) => update({ hints: { ...rules.hints, penalty: v, penaltyAmount: v === "none" ? 0 : rules.hints.penaltyAmount || (v === "time" ? 10 : 0.25) } })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "time", label: "Time" },
                    { value: "marks", label: "Marks" },
                  ]}
                />
              </Row>
              {rules.hints.penalty === "time" && (
                <Row label="Time penalty" hint="Seconds deducted per hint used.">
                  <Slider
                    value={rules.hints.penaltyAmount}
                    onChange={(v) => update({ hints: { ...rules.hints, penaltyAmount: v } })}
                    min={5}
                    max={60}
                    step={5}
                    suffix=" s"
                  />
                </Row>
              )}
              {rules.hints.penalty === "marks" && (
                <Row label="Marks penalty" hint="Marks deducted per hint used.">
                  <Slider
                    value={rules.hints.penaltyAmount}
                    onChange={(v) => update({ hints: { ...rules.hints, penaltyAmount: v } })}
                    min={0.25}
                    max={2}
                    step={0.25}
                  />
                </Row>
              )}
            </>
          )}
        </Section>

        <Section title="Feedback">
          <Row label="When to reveal correctness" hint="Real-time shows after each answer; end shows on results only.">
            <SegmentedControl
              value={rules.feedback}
              onChange={(v) => update({ feedback: v })}
              options={[
                { value: "realtime", label: "Real-time" },
                { value: "end", label: "At the end" },
              ]}
            />
          </Row>
        </Section>

        <Section title="Length">
          <Row label="Number of questions">
            <Slider
              value={rules.questionCount}
              onChange={(v) => update({ questionCount: v })}
              min={1}
              max={set.questions.length}
            />
          </Row>
        </Section>
      </div>

      <button
        onClick={start}
        className="btn-press mt-5 inline-flex h-11 items-center gap-2 rounded-[8px] bg-accent px-5 text-[14px] font-medium text-accent-foreground"
      >
        Start test <ArrowRight size={15} strokeWidth={1.75} />
      </button>
    </Shell>
  );
}
