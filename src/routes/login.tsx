import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { signIn, signUp } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — TestBench" }],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const result =
        mode === "signin"
          ? await signIn.email({ email, password })
          : await signUp.email({ email, password, name: name || email.split("@")[0] });

      if (result.error) {
        setErr(result.error.message ?? "Something went wrong.");
        return;
      }
      navigate({ to: "/dashboard" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-6">
          <h1 className="text-[16px] font-medium tracking-tight text-foreground">
            {mode === "signin" ? "Sign in" : "Create an account"}
          </h1>
          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="focus-ring w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13.5px] text-foreground placeholder:text-muted-foreground"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="focus-ring w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13.5px] text-foreground placeholder:text-muted-foreground"
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="focus-ring w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13.5px] text-foreground placeholder:text-muted-foreground"
            />
            {err && <p className="text-[12.5px] text-danger">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="btn-press inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-accent text-[13px] font-medium text-accent-foreground disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErr(null);
            }}
            className="btn-press mt-4 w-full text-center text-[12.5px] text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline">
            ← Back home
          </Link>
        </p>
      </div>
    </div>
  );
}
