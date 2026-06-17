import type { Question } from "./types";
import { uid } from "./store";

/**
 * Parses a loose Q&A block. Expected per-question shape:
 *
 * 1. What is 2+2?
 * A) 3
 * B) 4
 * C) 5
 * D) 22
 * Answer: B
 * Topic: Math
 * Hint: Basic addition.
 * Explanation: 2 plus 2 equals 4.
 *
 * Blank lines separate questions. Topic/Hint/Explanation are optional.
 */
export function parseQA(input: string): Question[] {
  const blocks = input
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const questions: Question[] = [];
  for (const block of blocks) {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 5) continue;

    const promptLine = lines[0].replace(/^\d+[\.\)]\s*/, "");
    const options: string[] = [];
    let answerIndex = -1;
    let topic = "General";
    let hint: string | undefined;
    let explanation: string | undefined;

    for (let i = 1; i < lines.length; i++) {
      const ln = lines[i];
      const optMatch = ln.match(/^([A-Da-d])[\)\.\:]\s*(.+)$/);
      if (optMatch && options.length < 4) {
        options.push(optMatch[2].trim());
        continue;
      }
      const ans = ln.match(/^answer\s*[:\-]\s*([A-Da-d1-4])/i);
      if (ans) {
        const v = ans[1].toUpperCase();
        answerIndex = "ABCD".indexOf(v);
        if (answerIndex < 0) answerIndex = parseInt(v, 10) - 1;
        continue;
      }
      const top = ln.match(/^topic\s*[:\-]\s*(.+)$/i);
      if (top) {
        topic = top[1].trim();
        continue;
      }
      const hi = ln.match(/^hint\s*[:\-]\s*(.+)$/i);
      if (hi) {
        hint = hi[1].trim();
        continue;
      }
      const ex = ln.match(/^explanation\s*[:\-]\s*(.+)$/i);
      if (ex) {
        explanation = ex[1].trim();
        continue;
      }
    }

    if (options.length === 4 && answerIndex >= 0 && promptLine) {
      questions.push({
        id: uid(),
        topic,
        prompt: promptLine,
        options,
        answerIndex,
        hint,
        explanation,
      });
    }
  }
  return questions;
}
