import type { ReactNode } from "react";

export function Section({ title, children, hint }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-t border-border py-6 first:border-t-0 first:pt-0">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">{title}</h3>
        {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <div className="text-[14px] text-foreground">{label}</div>
        {hint && <div className="text-[12px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
