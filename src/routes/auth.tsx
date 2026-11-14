import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/studyflow/AppHeader";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//") ? s["redirect"] : undefined }),
  head: () => ({
    meta: [
      { title: "Masuk — StudyFlow" },
      { name: "description", content: "Masuk atau daftar ke StudyFlow untuk mulai belajar lebih cerdas." },
      { property: "og:title", content: "Masuk — StudyFlow" },
      { property: "og:description", content: "Masuk atau daftar ke StudyFlow untuk mulai belajar lebih cerdas." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const dest = redirect ?? "/practice";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: dest }); });
    const { data } = supabase.auth.onAuthStateChange((e, session) => { if (e === "SIGNED_IN" && session) navigate({ to: dest }); });
    return () => data.subscription.unsubscribe();
  }, [dest, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + dest } });
        if (error) throw error;
        if (!data.session) setSent(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg.includes("Invalid login") ? "Email atau kata sandi salah." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Gagal masuk. Coba lagi.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-soft px-4 py-10">
      <div className="w-full max-w-md fade-up">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card-soft p-7 sm:p-8">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold">Cek email kamu</h1>
              <p className="mt-2 text-sm text-muted-foreground">Kami mengirim tautan konfirmasi ke <strong>{email}</strong>. Klik tautan tersebut untuk mengaktifkan akun.</p>
              <Button variant="soft" className="mt-6" onClick={() => { setSent(false); setMode("login"); }}>Kembali ke Masuk</Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">{mode === "login" ? "Selamat datang kembali" : "Buat akun StudyFlow"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Your academic journey, made smarter.</p>
              <div className="mt-6 grid gap-2.5">
                <button type="button" onClick={() => oauth("google")} className="flex h-11 items-center justify-center gap-2.5 rounded-xl border border-[#747775] bg-[#FFFFFF] text-sm font-medium text-[#1F1F1F] transition-opacity hover:opacity-90">
                  <GoogleIcon /> Continue with Google
                </button>
                <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>Continue with Lovable</button>
              </div>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />atau dengan email<span className="h-px flex-1 bg-border" /></div>
              <form onSubmit={submit} className="grid gap-4">
                <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" placeholder="nama@apps.ipb.ac.id" /></div>
                <div className="grid gap-1.5"><Label htmlFor="pw">Kata sandi</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl" /></div>
                <Button type="submit" size="lg" variant="hero" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "login" ? "Masuk" : "Daftar"}</Button>
              </form>
              <p className="mt-5 text-center text-sm text-muted-foreground">
                {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
                <button className="font-semibold text-primary-strong hover:underline" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Daftar" : "Masuk"}</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
