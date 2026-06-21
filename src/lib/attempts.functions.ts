import { createServerFn } from "@tanstack/react-start";
import { eq, and, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { attempts, reviewState } from "./db/schema";
import { requireAuth } from "./require-auth";
import { uid } from "./store";
import { reviewFromOutcome, newReviewCard, type ReviewCard } from "./sm2";
import type { Attempt, TestRules } from "./types";

const TimingRule = z.union([
  z.object({ mode: z.literal("none") }),
  z.object({ mode: z.literal("total"), totalMinutes: z.number() }),
  z.object({ mode: z.literal("per-question"), perQuestionSeconds: z.number() }),
]);

const TestRulesSchema = z.object({
  timing: TimingRule,
  marking: z.object({ correct: z.number(), wrong: z.number(), unanswered: z.number() }),
  reattempt: z.boolean(),
  hints: z.object({
    enabled: z.boolean(),
    penalty: z.enum(["none", "time", "marks"]),
    penaltyAmount: z.number(),
  }),
  feedback: z.enum(["realtime", "end"]),
  questionCount: z.number(),
});

/**
 * Start a new attempt. `clientAttemptId` is generated once by the browser
 * when the user clicks "Start" and re-used on any retry of this call (e.g.
 * a double-click, or React re-invoking an effect). Because it's the primary
 * key, a second call with the same id is a no-op that returns the original
 * row — you can't end up with two attempts for one "Start" click.
 */
export const startAttempt = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) =>
    z
      .object({
        clientAttemptId: z.string().min(1),
        setId: z.string().min(1),
        rules: TestRulesSchema,
        questionIds: z.array(z.string()).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const existing = await db.query.attempts.findFirst({
      where: and(eq(attempts.id, data.clientAttemptId), eq(attempts.userId, context.userId)),
    });
    if (existing) return rowToAttempt(existing);

    const answers = Object.fromEntries(data.questionIds.map((id) => [id, null]));
    const perQuestionMs = Object.fromEntries(data.questionIds.map((id) => [id, 0]));

    const [row] = await db
      .insert(attempts)
      .values({
        id: data.clientAttemptId,
        userId: context.userId,
        setId: data.setId,
        idempotencyKey: data.clientAttemptId,
        rules: data.rules,
        questionIds: data.questionIds,
        answers,
        locked: {},
        flags: {},
        hintsUsed: {},
        perQuestionMs,
        startedAt: new Date(),
      })
      .onConflictDoNothing({ target: attempts.idempotencyKey })
      .returning();

    // Extremely rare race: two concurrent starts with the same id both miss
    // the `existing` check above. onConflictDoNothing means the loser's
    // `row` is undefined here — re-fetch instead of erroring.
    if (!row) {
      const fallback = await db.query.attempts.findFirst({
        where: eq(attempts.idempotencyKey, data.clientAttemptId),
      });
      if (!fallback) throw new Error("Failed to start attempt.");
      return rowToAttempt(fallback);
    }
    return rowToAttempt(row);
  });

/** Save in-progress answer/flag/hint/lock state. Safe to call repeatedly. */
export const saveAttemptProgress = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string(),
        answers: z.record(z.string(), z.number().nullable()),
        locked: z.record(z.string(), z.boolean()),
        flags: z.record(z.string(), z.boolean()),
        hintsUsed: z.record(z.string(), z.boolean()),
        perQuestionMs: z.record(z.string(), z.number()),
        timeRemainingMs: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // finishedAt IS NULL guard: once an attempt is finished, progress
    // updates are silently ignored rather than reopening a scored attempt.
    await db
      .update(attempts)
      .set({
        answers: data.answers,
        locked: data.locked,
        flags: data.flags,
        hintsUsed: data.hintsUsed,
        perQuestionMs: data.perQuestionMs,
        timeRemainingMs: data.timeRemainingMs,
      })
      .where(
        and(
          eq(attempts.id, data.id),
          eq(attempts.userId, context.userId),
          isNull(attempts.finishedAt),
        ),
      );
    return { ok: true };
  });

/**
 * Finish (score) an attempt. Idempotent: if it's already finished, this
 * just returns the existing finished row instead of re-scoring — so a
 * retried request (flaky network, double-click on "Submit") can never
 * double-count a result or overwrite an earlier finish.
 */
export const finishAttempt = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const existing = await db.query.attempts.findFirst({
      where: and(eq(attempts.id, data.id), eq(attempts.userId, context.userId)),
    });
    if (!existing) throw new Error("Attempt not found.");
    if (existing.finishedAt) return rowToAttempt(existing); // already finished — no-op

    const [row] = await db
      .update(attempts)
      .set({ finishedAt: new Date() })
      .where(
        and(
          eq(attempts.id, data.id),
          eq(attempts.userId, context.userId),
          isNull(attempts.finishedAt), // re-check at the DB level, not just in JS
        ),
      )
      .returning();

    // Lost the race to another concurrent finish call — fetch what won.
    const final = row ?? (await db.query.attempts.findFirst({ where: eq(attempts.id, data.id) }));
    if (!final) throw new Error("Failed to finish attempt.");

    await updateReviewState(context.userId, final);
    return rowToAttempt(final);
  });

export const getAttempt = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const row = await db.query.attempts.findFirst({
      where: and(eq(attempts.id, data.id), eq(attempts.userId, context.userId)),
    });
    return row ? rowToAttempt(row) : null;
  });

/** All finished attempts for the current user, newest first. Used by the dashboard. */
export const listAttempts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const rows = await db.query.attempts.findMany({
      where: and(eq(attempts.userId, context.userId), sql`${attempts.finishedAt} is not null`),
      orderBy: (a, { desc: d }) => d(a.finishedAt),
    });
    return rows.map(rowToAttempt);
  });

/** Questions due for review right now, across all of the user's sets. */
export const getDueReviews = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const rows = await db.query.reviewState.findMany({
      where: and(eq(reviewState.userId, context.userId), sql`${reviewState.dueAt} <= now()`),
    });
    return rows.map((r) => ({
      questionId: r.questionId,
      dueAt: r.dueAt.getTime(),
      easeFactor: r.easeFactor,
      intervalDays: r.intervalDays,
      repetitions: r.repetitions,
    }));
  });

// ---------------------------------------------------------------------------

async function updateReviewState(userId: string, finished: typeof attempts.$inferSelect) {
  const qIds = finished.questionIds as string[];
  const answers = finished.answers as Record<string, number | null>;
  const hintsUsed = finished.hintsUsed as Record<string, boolean>;
  if (qIds.length === 0) return;

  const qRows = await db.query.questions.findMany({
    where: (q, { inArray }) => inArray(q.id, qIds),
  });
  const answerIndexById = new Map(qRows.map((q) => [q.id, q.answerIndex]));

  const existingStates = await db.query.reviewState.findMany({
    where: (rs, { inArray, and: dAnd, eq: dEq }) =>
      dAnd(dEq(rs.userId, userId), inArray(rs.questionId, qIds)),
  });
  const stateByQuestion = new Map(existingStates.map((s) => [s.questionId, s]));

  for (const qId of qIds) {
    const correctIndex = answerIndexById.get(qId);
    if (correctIndex === undefined) continue;
    const chosen = answers[qId];
    const correct = chosen != null && chosen === correctIndex;
    const hintUsed = !!hintsUsed[qId];

    const prior = stateByQuestion.get(qId);
    const card: ReviewCard = prior
      ? {
          easeFactor: prior.easeFactor,
          intervalDays: prior.intervalDays,
          repetitions: prior.repetitions,
        }
      : newReviewCard();

    const next = reviewFromOutcome(card, correct, hintUsed);
    const dueAt = new Date(Date.now() + next.intervalDays * 24 * 60 * 60 * 1000);

    if (prior) {
      await db
        .update(reviewState)
        .set({
          easeFactor: next.easeFactor,
          intervalDays: next.intervalDays,
          repetitions: next.repetitions,
          dueAt,
          lastReviewedAt: new Date(),
        })
        .where(eq(reviewState.id, prior.id));
    } else {
      await db.insert(reviewState).values({
        id: uid(),
        userId,
        questionId: qId,
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        dueAt,
        lastReviewedAt: new Date(),
      });
    }
  }
}

function rowToAttempt(row: typeof attempts.$inferSelect): Attempt {
  return {
    id: row.id,
    setId: row.setId,
    rules: row.rules as TestRules,
    questionIds: row.questionIds as string[],
    answers: row.answers as Record<string, number | null>,
    locked: row.locked as Record<string, boolean>,
    flags: row.flags as Record<string, boolean>,
    hintsUsed: row.hintsUsed as Record<string, boolean>,
    perQuestionMs: row.perQuestionMs as Record<string, number>,
    startedAt: row.startedAt.getTime(),
    finishedAt: row.finishedAt ? row.finishedAt.getTime() : undefined,
    timeRemainingMs: row.timeRemainingMs ?? undefined,
  };
}
