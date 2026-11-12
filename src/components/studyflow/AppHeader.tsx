import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, BookOpen, Calculator, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-brand shadow-soft">
        <Sparkles className="size-4 text-foreground" />
      </span>
      <span className="font-display text-lg font-semibold">StudyFlow</span>
    </Link>
  );
}

export function AppHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  const navCls = "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  const active = { className: "bg-muted text-foreground" };
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link to="/practice" className={navCls} activeProps={active}>
            <BookOpen className="size-4" /> <span className="hidden sm:inline">Smart Practice</span>
          </Link>
          <Link to="/grades" className={navCls} activeProps={active}>
            <Calculator className="size-4" /> <span className="hidden sm:inline">Grade Predictor</span>
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground md:inline">{email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Keluar">
            <LogOut /> <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
