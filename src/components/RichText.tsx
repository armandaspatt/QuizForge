import { Fragment } from "react";

/**
 * Renders text with fenced ``` code ``` blocks and inline `code`.
 * Code blocks render as a styled window with a faux title bar.
 */
export function RichText({ text, compact = false }: { text: string; compact?: boolean }) {
  const parts = splitFences(text);
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {parts.map((p, i) =>
        p.type === "code" ? (
          <CodeWindow key={i} code={p.value} lang={p.lang} compact={compact} />
        ) : (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {renderInline(p.value)}
          </p>
        ),
      )}
    </div>
  );
}

function CodeWindow({ code, lang, compact }: { code: string; lang?: string; compact?: boolean }) {
  return (
    <div
      className="overflow-hidden rounded-[8px] border border-border bg-[var(--surface-2)]"
      style={{ fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" }}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <span className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
          {lang || "code"}
        </span>
      </div>
      <pre
        className={`overflow-x-auto ${compact ? "px-3 py-2 text-[12px]" : "px-4 py-3 text-[12.5px]"} leading-relaxed text-foreground`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

type Part = { type: "text" | "code"; value: string; lang?: string };

function splitFences(text: string): Part[] {
  const out: Part[] = [];
  const re = /```([a-zA-Z0-9+_-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "code", value: m[2].replace(/\n$/, ""), lang: m[1] || undefined });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out.filter((p) => (p.type === "code" ? p.value.length > 0 : p.value.trim().length > 0));
}

function renderInline(text: string) {
  const nodes: React.ReactNode[] = [];
  const re = /`([^`\n]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>);
    nodes.push(
      <code
        key={k++}
        className="rounded-[4px] border border-border bg-[var(--surface-2)] px-1.5 py-[1px] font-mono text-[0.9em] text-foreground"
      >
        {m[1]}
      </code>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return nodes.length ? nodes : text;
}
