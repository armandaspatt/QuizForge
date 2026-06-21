import type { Attempt, Question, QuestionSet, TestRules } from "./types";
import * as store from "./store";
import { uid } from "./store";
import { createSetAuthed, getSetAuthed, deleteSetAuthed } from "./sets.functions";
import {
  startAttemptAuthed,
  saveAttemptProgressAuthed,
  finishAttemptAuthed,
  getAttemptAuthed,
} from "./attempts.functions";

/**
 * Session-aware data layer for the public quiz-taking flow (import →
 * configure → test → results). When the caller is signed in, everything is
 * persisted to Postgres exactly as before. When anonymous, everything stays
 * in localStorage via `store.ts` and never touches the server — so the core
 * quiz experience has no DB/auth dependency at all.
 *
 * `hasSession` is passed in explicitly (from `useSession()` client-side)
 * rather than checked here, since these helpers run in the browser and
 * shouldn't need their own session round-trip just to decide which path to
 * take.
 */

export async function saveQuestionSet(
  hasSession: boolean,
  name: string,
  questions: Question[],
): Promise<{ id: string }> {
  if (hasSession) {
    return createSetAuthed({ data: { name, questions } });
  }
  const id = uid();
  store.saveSet({ id, name, createdAt: Date.now(), questions });
  return { id };
}

export async function loadQuestionSet(
  hasSession: boolean,
  id: string,
): Promise<QuestionSet | null> {
  if (hasSession) {
    // A signed-in user can still be viewing a set that was created locally
    // before they logged in (e.g. mid-flow sign-in). Fall back to local
    // storage if the server doesn't have it.
    const fromServer = await getSetAuthed({ data: { id } });
    if (fromServer) return fromServer;
  }
  return store.getSet(id) ?? null;
}

export async function deleteQuestionSet(hasSession: boolean, id: string): Promise<void> {
  if (hasSession) {
    await deleteSetAuthed({ data: { id } });
  }
  store.deleteSet(id);
}

export async function startQuizAttempt(
  hasSession: boolean,
  args: { clientAttemptId: string; setId: string; rules: TestRules; questionIds: string[] },
): Promise<Attempt> {
  if (hasSession) {
    return startAttemptAuthed({ data: args });
  }
  const existing = store.getAttempt(args.clientAttemptId);
  if (existing) return existing;

  const answers = Object.fromEntries(args.questionIds.map((id) => [id, null]));
  const perQuestionMs = Object.fromEntries(args.questionIds.map((id) => [id, 0]));
  const attempt: Attempt = {
    id: args.clientAttemptId,
    setId: args.setId,
    rules: args.rules,
    questionIds: args.questionIds,
    answers,
    locked: {},
    flags: {},
    hintsUsed: {},
    perQuestionMs,
    startedAt: Date.now(),
  };
  store.saveAttempt(attempt);
  return attempt;
}

export async function saveQuizProgress(
  hasSession: boolean,
  args: {
    id: string;
    answers: Record<string, number | null>;
    locked: Record<string, boolean>;
    flags: Record<string, boolean>;
    hintsUsed: Record<string, boolean>;
    perQuestionMs: Record<string, number>;
    timeRemainingMs?: number;
  },
): Promise<void> {
  if (hasSession) {
    await saveAttemptProgressAuthed({ data: args });
    return;
  }
  const existing = store.getAttempt(args.id);
  if (!existing || existing.finishedAt) return; // mirror the finishedAt-IS-NULL guard
  store.saveAttempt({ ...existing, ...args });
}

export async function finishQuizAttempt(hasSession: boolean, id: string): Promise<Attempt> {
  if (hasSession) {
    return finishAttemptAuthed({ data: { id } });
  }
  const existing = store.getAttempt(id);
  if (!existing) throw new Error("Attempt not found.");
  if (existing.finishedAt) return existing; // idempotent, mirrors server behavior
  const finished = { ...existing, finishedAt: Date.now() };
  store.saveAttempt(finished);
  // No SM-2 / review_state update for anonymous attempts — spaced-repetition
  // tracking is part of the signed-in "save + track" feature set.
  return finished;
}

export async function loadQuizAttempt(hasSession: boolean, id: string): Promise<Attempt | null> {
  if (hasSession) {
    const fromServer = await getAttemptAuthed({ data: { id } });
    if (fromServer) return fromServer;
  }
  return store.getAttempt(id) ?? null;
}
