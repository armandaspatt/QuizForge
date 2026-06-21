import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { questionSets, questions } from "./db/schema";
import { requireAuth } from "./require-auth";
import { uid } from "./store";
import type { Question, QuestionSet } from "./types";

const QuestionInput = z.object({
  topic: z.string().min(1).default("General"),
  prompt: z.string().min(1),
  options: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
  hint: z.string().optional(),
  explanation: z.string().optional(),
});

const CreateSetInput = z.object({
  name: z.string().min(1),
  questions: z.array(QuestionInput).min(1),
});

/** List every question set owned by the current user, newest first. */
export const listSets = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const rows = await db.query.questionSets.findMany({
      where: eq(questionSets.userId, context.userId),
      orderBy: desc(questionSets.createdAt),
      with: { questions: true },
    });
    return rows.map(rowToSet);
  });

/** Fetch one question set (only if it belongs to the current user). */
export const getSet = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const row = await db.query.questionSets.findFirst({
      where: and(eq(questionSets.id, data.id), eq(questionSets.userId, context.userId)),
      with: { questions: true },
    });
    return row ? rowToSet(row) : null;
  });

/** Create a new question set with its questions, owned by the current user. */
export const createSet = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => CreateSetInput.parse(d))
  .handler(async ({ data, context }) => {
    const setId = uid();
    await db.insert(questionSets).values({
      id: setId,
      userId: context.userId,
      name: data.name,
    });
    await db.insert(questions).values(
      data.questions.map((q) => ({
        id: uid(),
        setId,
        topic: q.topic,
        prompt: q.prompt,
        options: q.options,
        answerIndex: q.answerIndex,
        hint: q.hint,
        explanation: q.explanation,
      })),
    );
    return { id: setId };
  });

/** Delete a question set (only if it belongs to the current user). Cascades to its questions and attempts. */
export const deleteSet = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await db
      .delete(questionSets)
      .where(and(eq(questionSets.id, data.id), eq(questionSets.userId, context.userId)));
    return { ok: true };
  });

// ---------------------------------------------------------------------------

type SetRow = {
  id: string;
  name: string;
  createdAt: Date;
  questions: Array<{
    id: string;
    topic: string;
    prompt: string;
    options: unknown;
    answerIndex: number;
    hint: string | null;
    explanation: string | null;
  }>;
};

function rowToSet(row: SetRow): QuestionSet {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.getTime(),
    questions: row.questions.map(
      (q): Question => ({
        id: q.id,
        topic: q.topic,
        prompt: q.prompt,
        options: q.options as string[],
        answerIndex: q.answerIndex,
        hint: q.hint ?? undefined,
        explanation: q.explanation ?? undefined,
      }),
    ),
  };
}

// Re-exported so route files that only need the type don't have to reach
// into ./db/schema directly.
export type { Question, QuestionSet };
