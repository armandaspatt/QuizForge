export type Question = {
  id: string;
  topic: string;
  prompt: string;
  options: string[]; // length 4
  answerIndex: number; // 0-3
  hint?: string;
  explanation?: string;
};

export type QuestionSet = {
  id: string;
  name: string;
  createdAt: number;
  questions: Question[];
};

export type TimingRule =
  | { mode: "none" }
  | { mode: "total"; totalMinutes: number }
  | { mode: "per-question"; perQuestionSeconds: number };

export type TestRules = {
  timing: TimingRule;
  marking: { correct: number; wrong: number; unanswered: number };
  reattempt: boolean;
  hints: { enabled: boolean; penalty: "none" | "time" | "marks"; penaltyAmount: number };
  feedback: "realtime" | "end";
  questionCount: number;
};

export type Attempt = {
  id: string;
  setId: string;
  rules: TestRules;
  questionIds: string[];
  answers: Record<string, number | null>; // questionId -> chosen index (or null)
  locked: Record<string, boolean>; // questionId -> locked (reattempt=false after first lock)
  flags: Record<string, boolean>;
  hintsUsed: Record<string, boolean>;
  startedAt: number;
  finishedAt?: number;
  timeRemainingMs?: number; // for total mode at finish
  perQuestionMs: Record<string, number>; // time spent per question
};

export const defaultRules = (qCount: number): TestRules => ({
  timing: { mode: "total", totalMinutes: 10 },
  marking: { correct: 1, wrong: 0, unanswered: 0 },
  reattempt: true,
  hints: { enabled: true, penalty: "none", penaltyAmount: 0 },
  feedback: "end",
  questionCount: Math.min(qCount, 10),
});
