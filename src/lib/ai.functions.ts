import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  topic: z.string().min(1),
  count: z.number().int().min(1).max(50),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const QuestionSchema = z.object({
  topic: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
  hint: z.string().optional(),
  explanation: z.string().optional(),
});

const CODE_RULE =
  "When a question or option contains source code, wrap that code in triple-backtick fences with a language tag, e.g. ```js\\ncode\\n```. Use inline `code` for short identifiers.";

// Model id is intentionally a single constant — swap it here if you want a
// different Gemini model (e.g. a newer "-flash" or "-pro" release).
const GEMINI_MODEL = "gemini-2.5-flash";

async function callAI(sys: string, user: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI is not configured. Set GEMINI_API_KEY.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: sys }] },
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
    if (res.status === 402) throw new Error("AI quota exhausted. Check your billing.");
    throw new Error(`AI error (${res.status}): ${t.slice(0, 200)}`);
  }

  const body = await res.json();
  const content = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty response from AI.");
  try {
    return typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
}

function normalizeQuestions(raw: any[], max: number, fallbackTopic = "General") {
  return raw
    .slice(0, max)
    .map((q) => {
      const safe = QuestionSchema.partial({ hint: true, explanation: true }).safeParse({
        topic: String(q?.topic ?? fallbackTopic),
        prompt: String(q?.prompt ?? ""),
        options: (q?.options ?? []).slice(0, 4).map((o: any) => String(o)),
        answerIndex: Math.max(0, Math.min(3, Number(q?.answerIndex ?? 0))),
        hint: q?.hint ? String(q.hint) : undefined,
        explanation: q?.explanation ? String(q.explanation) : undefined,
      });
      return safe.success ? safe.data : null;
    })
    .filter(Boolean);
}

const SHAPE_HINT =
  'Return JSON of shape: { "questions": [ { "topic": string, "prompt": string, "options": [string,string,string,string], "answerIndex": 0|1|2|3, "hint": string, "explanation": string } ] }';

export const generateQuestionsFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const sys = `You write multiple choice questions. Return strict JSON matching the schema. Exactly 4 options. answerIndex is the 0-based index of the correct option. Include a short hint and a one-sentence explanation. ${CODE_RULE}`;
    const user = `Generate ${data.count} ${data.difficulty} MCQs about: ${data.topic}. Vary the sub-topics across questions.\n\n${SHAPE_HINT}`;
    const parsed = await callAI(sys, user);
    return { questions: normalizeQuestions(parsed.questions ?? [], data.count, data.topic) };
  });

// ---------- AI clean from pasted text ----------

const TextInput = z.object({
  raw: z.string().min(10).max(40000),
  maxCount: z.number().int().min(1).max(50).default(30),
});

export const extractFromTextFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => TextInput.parse(d))
  .handler(async ({ data }) => {
    const sys = `You extract and clean multiple choice questions from messy user text. Output strict JSON only. Each question must have exactly 4 options. If the source has more or fewer, rewrite plausible distractors so there are exactly 4. answerIndex is 0-based. Tag a concise topic per question. Add a short hint and a one-sentence explanation. ${CODE_RULE}`;
    const user = `Extract up to ${data.maxCount} MCQs from this content. Preserve original wording where possible.\n\n---\n${data.raw}\n---\n\n${SHAPE_HINT}`;
    const parsed = await callAI(sys, user);
    return { questions: normalizeQuestions(parsed.questions ?? [], data.maxCount) };
  });

// ---------- Scrape URL + extract ----------

const UrlInput = z.object({
  url: z.string().url(),
  maxCount: z.number().int().min(1).max(50).default(30),
});

export const extractFromUrlFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => UrlInput.parse(d))
  .handler(async ({ data }) => {
    const fcKey = process.env.FIRECRAWL_API_KEY;
    if (!fcKey) throw new Error("Firecrawl is not connected.");

    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fcKey}`,
      },
      body: JSON.stringify({
        url: data.url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!scrapeRes.ok) {
      const t = await scrapeRes.text().catch(() => "");
      if (scrapeRes.status === 402) throw new Error("Firecrawl credits exhausted.");
      throw new Error(`Couldn't fetch URL (${scrapeRes.status}): ${t.slice(0, 200)}`);
    }
    const scrape = await scrapeRes.json();
    const md: string =
      scrape?.data?.markdown ?? scrape?.markdown ?? scrape?.data?.content ?? "";
    if (!md || md.trim().length < 40) {
      throw new Error("No readable content found at that URL.");
    }
    const truncated = md.slice(0, 30000);

    const sys = `You extract and clean multiple choice questions from scraped webpage markdown. Output strict JSON only. Each question must have exactly 4 options; rewrite or invent plausible distractors if the source has fewer. answerIndex is 0-based. Ignore navigation, ads, and unrelated text. Tag a concise topic per question. Add a short hint and a one-sentence explanation. ${CODE_RULE}`;
    const user = `Extract up to ${data.maxCount} MCQs from this page markdown.\n\n---\n${truncated}\n---\n\n${SHAPE_HINT}`;
    const parsed = await callAI(sys, user);
    return {
      questions: normalizeQuestions(parsed.questions ?? [], data.maxCount),
      source: data.url,
    };
  });
