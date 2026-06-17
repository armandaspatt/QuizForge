import type { Attempt, QuestionSet } from "./types";

const isBrowser = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const KEYS = {
  apiKey: "qf:openai-key",
  sets: "qf:sets",
  attempts: "qf:attempts",
  theme: "qf:theme",
} as const;

export const getApiKey = () => read<string>(KEYS.apiKey, "");
export const setApiKey = (v: string) => write(KEYS.apiKey, v);

export const getSets = () => read<QuestionSet[]>(KEYS.sets, []);
export const getSet = (id: string) => getSets().find((s) => s.id === id);
export const saveSet = (set: QuestionSet) => {
  const sets = getSets();
  const idx = sets.findIndex((s) => s.id === set.id);
  if (idx >= 0) sets[idx] = set;
  else sets.unshift(set);
  write(KEYS.sets, sets);
};
export const deleteSet = (id: string) => {
  write(
    KEYS.sets,
    getSets().filter((s) => s.id !== id),
  );
};

export const getAttempts = () => read<Attempt[]>(KEYS.attempts, []);
export const getAttempt = (id: string) => getAttempts().find((a) => a.id === id);
export const saveAttempt = (a: Attempt) => {
  const list = getAttempts();
  const idx = list.findIndex((x) => x.id === a.id);
  if (idx >= 0) list[idx] = a;
  else list.unshift(a);
  write(KEYS.attempts, list);
};

export const uid = () =>
  isBrowser && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
