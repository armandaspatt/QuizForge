import type { Question } from "./types";
import { uid } from "./store";
import { generateQuestionsFn, extractFromTextFn, extractFromUrlFn } from "./ai.functions";

type GenInput = {
  topic: string;
  count: number;
  difficulty: "easy" | "medium" | "hard";
};

function toQuestions(arr: any[]): Question[] {
  return arr.map((q): Question => ({
    id: uid(),
    topic: q!.topic,
    prompt: q!.prompt,
    options: q!.options,
    answerIndex: q!.answerIndex,
    hint: q!.hint,
    explanation: q!.explanation,
  }));
}

export async function generateQuestions({ topic, count, difficulty }: GenInput): Promise<Question[]> {
  const { questions } = await generateQuestionsFn({ data: { topic, count, difficulty } });
  return toQuestions(questions);
}

export async function extractFromText(raw: string, maxCount = 30): Promise<Question[]> {
  const { questions } = await extractFromTextFn({ data: { raw, maxCount } });
  return toQuestions(questions);
}

export async function extractFromUrl(url: string, maxCount = 30): Promise<Question[]> {
  const { questions } = await extractFromUrlFn({ data: { url, maxCount } });
  return toQuestions(questions);
}
