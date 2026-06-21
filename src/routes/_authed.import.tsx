import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowRight, Loader2, Link2, Sparkles, ClipboardPaste, Wand2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Slider } from "@/components/Slider";
import { parseQA } from "@/lib/parse";
import { generateQuestions, extractFromText, extractFromUrl } from "@/lib/openai";
import { createSet } from "@/lib/sets.functions";
import { RichText } from "@/components/RichText";
import type { Question } from "@/lib/types";

export const Route = createFileRoute("/_authed/import")({
  head: () => ({
    meta: [
      { title: "Import questions — TestBench" },
      { name: "description", content: "Import questions from a URL, paste text, or generate them with AI." },
    ],
  }),
  component: Import,
});

type Mode = "url" | "paste" | "generate";

const MODES: { id: Mode; label: string; icon: typeof Link2 }[] = [
  { id: "url", label: "From URL", icon: Link2 },
  { id: "paste", label: "Paste", icon: ClipboardPaste },
  { id: "generate", label: "Generate", icon: Sparkles },
];

const SAMPLE = `1. What is the capital of France?
A) London
B) Berlin
C) Paris
D) Madrid
Answer: C
Topic: Geography
Hint: City on the Seine.
Explanation: Paris has been the capital of France since 987 AD.

2. Which language runs in a web browser?
A) Java
B) C
C) Python
D) JavaScript
Answer: D
Topic: Programming`;

function Import() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("url");

  // Paste (strict parser first, AI cleanup as fallback/override)
  const [raw, setRaw] = useState("");
  const parsed = useMemo(() => parseQA(raw), [raw]);
  const [aiQs, setAiQs] = useState<Question[]>([]);
  const [aiCleaned, setAiCleaned] = useState(false);

  // URL
  const [url, setUrl] = useState("");
  const [urlQs, setUrlQs] = useState<Question[]>([]);
  const [urlStage, setUrlStage] = useState<"idle" | "scraping">("idle");

  // Generate
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [genQs, setGenQs] = useState<Question[]>([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const previewQs: Question[] =
    mode === "paste" ? (aiCleaned ? aiQs : parsed) : mode === "url" ? urlQs : genQs;

  const setName = () => {
    if (mode === "generate") return topic.trim() || "Generated set";
    if (mode === "url") {
      try {
        return `Imported — ${new URL(url).hostname}`;
      } catch {
        return "Imported set";
      }
    }
    return `Pasted set — ${new Date().toLocaleDateString()}`;
  };

  const runAiClean = async () => {
    setErr(null);
    setBusy(true);
    try {
      setAiQs(await extractFromText(raw, 50));
      setAiCleaned(true);
    } catch (e: any) {
      setErr(e.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (mode === "generate") {
        setGenQs(await generateQuestions({ topic, count, difficulty }));
      } else if (mode === "url") {
        setUrlStage("scraping");
        setUrlQs(await extractFromUrl(url, 50));
      }
    } catch (e: any) {
      setErr(e.message ?? "Failed.");
    } finally {
      setBusy(false);
      setUrlStage("idle");
    }
  };

  const handleSave = async () => {
    if (previewQs.length === 0) return;
    const { id } = await createSet({ data: { name: setName(), questions: previewQs } });
    navigate({ to: "/configure/$setId", params: { setId: id } });
  };

  return (
    <Shell>
      <div className="pt-4">
        <h1 className="text-[22px] font-medium tracking-tight">Import questions</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Bring questions in from a link, your clipboard, or generate them with AI.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-full border border-border bg-[var(--surface-2)] p-1">
        {MODES.map((m) => {
          const active = mode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                setErr(null);
              }}
              className="btn-press relative rounded-full px-3.5 py-1.5 text-[12.5px]"
            >
              {active && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-full bg-surface"
                  style={{ border: "1px solid var(--border)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span
                className={
                  active
                    ? "relative inline-flex items-center gap-1.5 text-foreground"
                    : "relative inline-flex items-center gap-1.5 text-muted-foreground"
                }
              >
                <Icon size={13} strokeWidth={1.75} />
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- URL ---------- */}
      {mode === "url" && (
        <div className="mt-5 rounded-[10px] border border-border bg-surface p-5">
          <label className="block text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Page URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/quiz-on-react-hooks"
            className="focus-ring mt-2 h-10 w-full rounded-[8px] border border-border bg-background px-3 text-[14px]"
          />
          <p className="mt-2 text-[12px] text-muted-foreground">
            We fetch the page, strip the noise, and let the AI pull out clean MCQs.
          </p>
          <button
            onClick={run}
            disabled={!url.trim() || busy}
            className="btn-press mt-4 inline-flex h-10 items-center gap-2 rounded-[8px] bg-accent px-4 text-[13px] font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? (urlStage === "scraping" ? "Scraping & extracting…" : "Working…") : "Extract questions"}
          </button>
          {err && <p className="mt-3 text-[12.5px] text-danger">{err}</p>}
        </div>
      )}

      {/* ---------- Paste ---------- */}
      {mode === "paste" && (
        <div className="mt-5 space-y-3">
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setAiCleaned(false);
              setErr(null);
            }}
            placeholder={SAMPLE}
            rows={14}
            className="focus-ring w-full resize-y rounded-[10px] border border-border bg-surface p-4 font-mono text-[12.5px] leading-relaxed text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] text-muted-foreground">
              Paste any format — structured (options A–D, then <span className="font-mono">Answer:</span>) parses
              instantly for free, or messy/unstructured text can be cleaned up with AI.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setRaw(SAMPLE);
                  setAiCleaned(false);
                }}
                className="btn-press text-[12px] text-muted-foreground underline-offset-4 hover:underline"
              >
                Load sample
              </button>
              <span className="text-[12px] text-muted-foreground">
                {raw.trim().length === 0
                  ? "0 parsed"
                  : aiCleaned
                    ? `${aiQs.length} from AI`
                    : `${parsed.length} parsed`}
              </span>
            </div>
          </div>

          {!aiCleaned && raw.trim().length > 0 && parsed.length === 0 && (
            <p className="text-[12.5px] text-danger">
              Couldn't parse any questions from the format above. Try "Clean up with AI" below instead.
            </p>
          )}

          {!aiCleaned && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSave}
                disabled={parsed.length === 0}
                className="btn-press inline-flex h-10 items-center gap-2 rounded-[8px] bg-accent px-4 text-[13px] font-medium text-accent-foreground disabled:opacity-40"
              >
                Submit {parsed.length > 0 ? `(${parsed.length})` : ""}{" "}
                <ArrowRight size={14} strokeWidth={1.75} />
              </button>
              <button
                onClick={runAiClean}
                disabled={raw.trim().length < 10 || busy}
                className="btn-press inline-flex h-10 items-center gap-2 rounded-[8px] border border-border bg-surface px-4 text-[13px] font-medium text-foreground disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                <Wand2 size={14} strokeWidth={1.75} />
                {busy ? "Cleaning…" : "Clean up with AI"}
              </button>
            </div>
          )}
          {err && <p className="text-[12.5px] text-danger">{err}</p>}
        </div>
      )}

      {/* ---------- Generate ---------- */}
      {mode === "generate" && (
        <div className="mt-5 rounded-[10px] border border-border bg-surface p-5">
          <label className="block text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis, World War II, React hooks"
            className="focus-ring mt-2 h-10 w-full rounded-[8px] border border-border bg-background px-3 text-[14px]"
          />

          <div className="mt-5 flex flex-wrap items-center gap-6">
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Count</div>
              <Slider value={count} onChange={setCount} min={3} max={50} />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Difficulty</div>
              <SegmentedControl
                value={difficulty}
                onChange={setDifficulty}
                options={[
                  { value: "easy", label: "Easy" },
                  { value: "medium", label: "Medium" },
                  { value: "hard", label: "Hard" },
                ]}
              />
            </div>
          </div>

          <button
            onClick={run}
            disabled={!topic.trim() || busy}
            className="btn-press mt-5 inline-flex h-10 items-center gap-2 rounded-[8px] bg-accent px-4 text-[13px] font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? "Generating…" : "Generate questions"}
          </button>
          {err && <p className="mt-3 text-[12.5px] text-danger">{err}</p>}
        </div>
      )}

      {/* ---------- Preview ---------- */}
      {previewQs.length > 0 && (mode !== "paste" || aiCleaned) && (
        <div className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">Preview</h2>
            <span className="text-[12px] text-muted-foreground">{previewQs.length} questions</span>
          </div>
          <ul className="space-y-2.5">
            {previewQs.map((q, i) => (
              <li
                key={q.id}
                className="rounded-[10px] border border-border bg-surface p-4 fade-in-soft"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-baseline gap-2 text-[13.5px] text-foreground">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <RichText text={q.prompt} compact />
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">{q.topic}</div>
              </li>
            ))}
          </ul>

          <button
            onClick={handleSave}
            className="btn-press mt-5 inline-flex h-10 items-center gap-2 rounded-[8px] bg-accent px-4 text-[13px] font-medium text-accent-foreground"
          >
            Continue to configure <ArrowRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </Shell>
  );
}
