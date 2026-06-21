# QuizForge

A full-stack MCQ test-builder and runner. Import questions from text, a URL, or
generate them with AI, configure timing/marking/hint rules, take the test, and
review results. Sign in to save question sets and track spaced-repetition
progress over time — or skip the account entirely and just take a quiz.

Built with TanStack Start (React 19, file-based routing), TypeScript,
Tailwind 4, Postgres (Neon) + Drizzle ORM, and Better Auth.

## Features

- **No-login quizzing** — `/import` → `/configure/:setId` → `/test/:attemptId`
  → `/results/:attemptId` work for anyone, no account required. Anonymous
  attempts are stored client-side (`localStorage`) and never touch the
  database.
- **Optional accounts** — signing in unlocks saving question sets, a
  dashboard of past attempts, and spaced-repetition review tracking (SM-2).
  The same quiz flow above transparently persists to Postgres instead of
  `localStorage` once you're signed in.
- **Three import modes** — paste raw text (free local parser, or "Clean up
  with AI"), pull from a URL (Firecrawl scrape → Gemini extraction,
  automatic), or generate a fresh set from a topic.
- **Configurable test rules** — timing (none / total / per-question),
  marking scheme, hints with penalties, real-time vs. end-of-test feedback.

## Stack

| Layer      | Choice                                              |
| ---------- | ---------------------------------------------------- |
| Framework  | TanStack Start (React 19, file-based routing)        |
| Language   | TypeScript                                           |
| Styling    | Tailwind CSS 4                                       |
| Database   | Postgres via Neon (`@neondatabase/serverless`)       |
| ORM        | Drizzle                                              |
| Auth       | Better Auth (email/password, Drizzle adapter)        |
| AI         | Gemini (extraction + generation), Firecrawl (scrape) |

## Setup

```bash
npm install
cp .env.example .env   # fill in the values below
npm run auth:generate   # reconciles Better Auth's expected schema
npm run db:push           # pushes the full Drizzle schema to Postgres
npm run dev                 # http://localhost:8080
```

### Environment variables

```
DATABASE_URL=          # Neon Postgres connection string
BETTER_AUTH_SECRET=    # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:8080
GEMINI_API_KEY=        # required for Generate / Paste "Clean up with AI"
FIRECRAWL_API_KEY=     # optional, only for "From URL" import mode
```

`.env` is gitignored — never commit it. If a secret ever does get committed,
rotate it immediately; removing it from git history after the fact doesn't
undo the exposure.

## Architecture

- **Auth**: Better Auth, Drizzle adapter, mounted at `src/routes/api/auth/$.ts`.
  Client helpers in `src/lib/auth-client.ts`. The `_authed` pathless layout
  (`src/routes/_authed.tsx`) gates `/dashboard` and `/sets` only — the
  quiz-taking flow (`/import`, `/configure/:setId`, `/test/:attemptId`,
  `/results/:attemptId`) is public.
- **Session-aware data layer**: `src/lib/local-data.ts` is the single branch
  point between the two experiences. When `useSession()` shows a signed-in
  user, it calls the DB-backed server functions (`sets.functions.ts`,
  `attempts.functions.ts`); when anonymous, it reads/writes the same shapes
  to `localStorage` via `src/lib/store.ts`. Nothing else in the route files
  needs to know which path it's on.
- **DB**: `src/lib/db/schema.ts` — Better Auth's core tables plus
  `question_sets`, `questions`, `attempts`, `review_state`. Connection in
  `src/lib/db/index.ts`.
- **Server functions** (TanStack Start `createServerFn`): per-user functions
  chain `.middleware([requireAuth])` (hard-fails without a session) or
  `.middleware([optionalAuth])` (attaches `userId` if present, never throws)
  depending on whether the route needs a guaranteed session.
- **Spaced repetition**: `src/lib/sm2.ts`, a pure SM-2 implementation. Only
  runs for signed-in users — anonymous attempts skip review-state tracking
  entirely, since that's part of the account-only feature set.

## In progress

**Database integration — verifying end-to-end.** The DB/auth code has been
written and type-checked, and the dev server now runs against a live Neon
instance without crashing. Still to confirm before calling this solid:

- [ ] Full sign-up → sign-in → sign-out cycle against the real Postgres
      instance (not just that the schema pushes cleanly)
- [ ] Saved question sets and attempts actually round-trip correctly for a
      signed-in user (create, retrieve, delete)
- [ ] SM-2 review-state updates correctly on `finishAttempt` and surfaces on
      the dashboard's "Due for review"
- [ ] Anonymous → signed-in handoff: confirm a set/attempt created while
      anonymous loads correctly if the user signs in mid-flow (currently
      falls back to `localStorage` lookup, untested under real auth)

**OAuth.** Currently email/password only via Better Auth. Adding proper
OAuth (Google to start) so sign-in doesn't require a password at all:

- [ ] Add Google provider config to `src/lib/auth.ts`
      (`socialProviders: { google: { clientId, clientSecret } }`)
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars, redirect URI
      registered in Google Cloud Console
- [ ] `signIn.social({ provider: "google" })` wired into `/login`
- [ ] Re-run `auth:generate` / `db:push` if the account table needs new
      columns for the social provider

## Conventions

- Routes are file-based (TanStack Router). `_authed.foo.tsx` → protected
  `/foo`; a bare `foo.tsx` → public `/foo`. Don't hand-edit
  `routeTree.gen.ts` — it's regenerated automatically by the dev server.
- Every server function touching per-user data must chain
  `.middleware([requireAuth])` or `.middleware([optionalAuth])` and scope DB
  queries by `context.userId`.
- `localStorage` (`src/lib/store.ts`) is the anonymous-mode data layer for
  sets/attempts, plus `uid()` and theme preference. It's load-bearing now,
  not legacy — don't rip it out.
- No Lovable/AI-builder branding or dependencies — kept clean for
  resume/portfolio purposes.
