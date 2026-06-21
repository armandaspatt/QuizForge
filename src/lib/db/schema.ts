import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Better Auth core tables.
// These match what `npx @better-auth/cli generate` expects for the Drizzle
// adapter. Don't hand-edit columns here without re-checking the Better Auth
// docs — the adapter validates against this exact shape at startup.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// App tables.
// ---------------------------------------------------------------------------

export const questionSets = pgTable("question_sets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  setId: text("set_id")
    .notNull()
    .references(() => questionSets.id, { onDelete: "cascade" }),
  topic: text("topic").notNull().default("General"),
  prompt: text("prompt").notNull(),
  // Always length 4, stored as jsonb to keep the shape close to the
  // original client-side `Question` type.
  options: jsonb("options").$type<string[]>().notNull(),
  answerIndex: integer("answer_index").notNull(),
  hint: text("hint"),
  explanation: text("explanation"),
});

export const attempts = pgTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    setId: text("set_id")
      .notNull()
      .references(() => questionSets.id, { onDelete: "cascade" }),
    // Client-generated key, one per "attempt session" (created once when the
    // user hits Start). Submitting an attempt is keyed off this, not the
    // attempt id, so retries/double-clicks can't create duplicate scoring.
    idempotencyKey: text("idempotency_key").notNull(),
    rules: jsonb("rules").notNull(),
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    answers: jsonb("answers").$type<Record<string, number | null>>().notNull(),
    locked: jsonb("locked").$type<Record<string, boolean>>().notNull(),
    flags: jsonb("flags").$type<Record<string, boolean>>().notNull(),
    hintsUsed: jsonb("hints_used").$type<Record<string, boolean>>().notNull(),
    perQuestionMs: jsonb("per_question_ms").$type<Record<string, number>>().notNull(),
    startedAt: timestamp("started_at").notNull(),
    finishedAt: timestamp("finished_at"),
    timeRemainingMs: integer("time_remaining_ms"),
  },
  (t) => [unique("attempts_idempotency_key_unique").on(t.idempotencyKey)],
);

// SM-2 spaced-repetition state, one row per (user, question).
export const reviewState = pgTable(
  "review_state",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    easeFactor: real("ease_factor").notNull().default(2.5),
    intervalDays: real("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    dueAt: timestamp("due_at").notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at"),
  },
  (t) => [unique("review_state_user_question_unique").on(t.userId, t.questionId)],
);

// ---------------------------------------------------------------------------
// Relations (needed for the `db.query.X.findMany({ with: {...} })` API).
// ---------------------------------------------------------------------------

export const questionSetsRelations = relations(questionSets, ({ many }) => ({
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  set: one(questionSets, { fields: [questions.setId], references: [questionSets.id] }),
}));

export const attemptsRelations = relations(attempts, ({ one }) => ({
  set: one(questionSets, { fields: [attempts.setId], references: [questionSets.id] }),
}));
