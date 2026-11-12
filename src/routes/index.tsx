import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Calculator, FileText, ListChecks, Target, LineChart } from "lucide-react";
import { Logo } from "@/components/studyflow/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyFlow — Smart Learning & Grade Prediction" },
      { name: "description", content: "Ubah materi kuliah jadi ringkasan dan kuis interaktif, dan ketahui nilai yang kamu butuhkan untuk mencapai target." },
      { property: "og:title", content: "StudyFlow — Smart Learning & Grade Prediction" },
      { property: "og:description", content: "Ringkasan materi, kuis AI, dan prediksi nilai untuk mahasiswa IPB University." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-soft">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Button asChild variant="ghost" size="sm"><Link to="/auth" search={{ redirect: undefined }}>Masuk</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
        <section className="mx-auto max-w-2xl text-center fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">Learn Smarter, Achieve Better.</span>
          <h1 className="mt-5 text-4xl font-semibold sm:text-5xl">Welcome to StudyFlow!</h1>
          <p className="mt-4 text-lg text-muted-foreground">Your academic journey, made smarter.</p>
        </section>
        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <FeatureCard
            to="/practice"
            icon={<BookOpen className="size-6" />}
            tone="bg-primary"
            title="SMART PRACTICE"
            desc="Turn your lecture materials into summaries and interactive practice questions."
            bullets={[[FileText, "PDF, PPTX, DOCX, TXT"], [ListChecks, "Kuis 5–50 soal, 3 tingkat kesulitan"]]}
          />
          <FeatureCard
            to="/grades"
            icon={<Calculator className="size-6" />}
            tone="bg-secondary"
            title="GRADE PREDICTOR"
            desc="Know what scores you need to reach your academic goals."
            bullets={[[Target, "Hitung nilai minimum untuk target"], [LineChart, "Simulasi skenario nilai akhir"]]}
          />
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ to, icon, tone, title, desc, bullets }: { to: "/practice" | "/grades"; icon: React.ReactNode; tone: string; title: string; desc: string; bullets: [typeof FileText, string][] }) {
  return (
    <Link to={to} className="group card-soft lift flex flex-col p-7 sm:p-9">
      <span className={`grid size-14 place-items-center rounded-2xl ${tone}`}>{icon}</span>
      <h2 className="mt-6 text-sm font-semibold tracking-[0.14em] text-muted-foreground">{title}</h2>
      <p className="mt-2 text-xl font-semibold leading-snug">{desc}</p>
      <ul className="mt-6 grid gap-2 text-sm text-muted-foreground">
        {bullets.map(([I, t]) => (<li key={t} className="flex items-center gap-2"><I className="size-4" />{t}</li>))}
      </ul>
      <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong">Mulai <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
    </Link>
  );
}
