import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Flag, Loader2, RefreshCw, Sparkles, Timer, XCircle, ListChecks, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileDropzone } from "@/components/studyflow/FileDropzone";
import { extractOfficeText, fileToBase64, formatBytes } from "@/lib/extract-client";
import { deleteDocument, extractDocument, generateQuiz, generateSummary, listDocuments, submitQuiz, type QuizResult } from "@/lib/practice.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Smart Practice — StudyFlow" },
      { name: "description", content: "Unggah materi kuliah, dapatkan ringkasan terstruktur, dan latihan kuis interaktif." },
      { property: "og:title", content: "Smart Practice — StudyFlow" },
      { property: "og:description", content: "Unggah materi kuliah, dapatkan ringkasan terstruktur, dan latihan kuis interaktif." },
    ],
  }),
  component: PracticePage,
});

type Doc = { id: string; filename: string; size_bytes: number; mime: string | null; words?: number; summary?: string | null };
type PublicQ = { id: string; type: "mcq" | "tf"; question: string; options: string[]; topic: string; chapter: string };
const COUNTS = [5, 10, 15, 20, 30, 50] as const;
const LETTERS = ["A", "B", "C", "D"];

function PracticePage() {
  const extract = useServerFn(extractDocument);
  const summarize = useServerFn(generateSummary);
  const makeQuiz = useServerFn(generateQuiz);
  const submit = useServerFn(submitQuiz);
  const list = useServerFn(listDocuments);
  const del = useServerFn(deleteDocument);

  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "reading" | "processing">("idle");
  const [readPct, setReadPct] = useState(0);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [history, setHistory] = useState<Doc[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [sumBusy, setSumBusy] = useState(false);
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [types, setTypes] = useState<("mcq" | "tf")[]>(["mcq"]);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quiz, setQuiz] = useState<{ id: string; questions: PublicQ[] } | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => { list().then((d) => setHistory(d as Doc[])).catch(() => {}); }, [list]);

  async function process() {
    if (!file) return;
    const ext = file.name.split(".").pop()!.toLowerCase();
    try {
      setStage("reading"); setReadPct(0);
      let payload: { text?: string; base64?: string };
      if (ext === "pdf") payload = { base64: await fileToBase64(file, setReadPct) };
      else { payload = { text: await extractOfficeText(file) }; setReadPct(100); }
      setStage("processing");
      const res = await extract({ data: { filename: file.name, mime: file.type || "application/octet-stream", size: file.size, ...payload } });
      const d: Doc = { ...res, words: res.words };
      setDoc(d); setSummary(null); setQuiz(null); setResult(null); setFile(null);
      setHistory((h) => [d, ...h]);
      toast.success(`Dokumen berhasil dibaca (${res.words.toLocaleString("id-ID")} kata).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses dokumen.");
    } finally { setStage("idle"); }
  }

  async function runSummary() {
    if (!doc) return;
    setSumBusy(true);
    try { const r = await summarize({ data: { documentId: doc.id } }); setSummary(r.summary); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal membuat ringkasan."); }
    finally { setSumBusy(false); }
  }

  async function runQuiz() {
    if (!doc) return;
    setQuizBusy(true); setResult(null);
    try {
      const r = await makeQuiz({ data: { documentId: doc.id, count, difficulty, types } });
      setQuiz({ id: r.quizId, questions: r.questions as PublicQ[] });
      if (r.questions.length < count) toast.info(`${r.questions.length} soal valid berhasil dibuat dari materi ini.`);
      setTimeout(() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal membuat soal."); }
    finally { setQuizBusy(false); }
  }

  const busy = stage !== "idle";

  return (
    <div className="grid gap-6">
      <div className="fade-up">
        <h1 className="text-3xl font-semibold">Smart Practice</h1>
        <p className="mt-1 text-muted-foreground">Ubah materi kuliah menjadi ringkasan dan latihan soal interaktif.</p>
      </div>

      <section className="card-soft p-5 sm:p-7">
        <StepTitle n={1} title="Unggah materi" />
        <div className="mt-4">
          <FileDropzone accept={[".pdf", ".pptx", ".docx", ".txt"]} maxMB={20} file={file} onFile={setFile} onClear={() => setFile(null)} disabled={busy} hint="PDF, PPTX, DOCX, atau TXT · maks. 20 MB · PDF hasil scan didukung (OCR)" />
        </div>
        {busy && (
          <div className="mt-4 grid gap-2">
            <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{stage === "reading" ? "Mengunggah & membaca file…" : "Mengekstrak teks dokumen…"}</span><span className="text-muted-foreground">{stage === "reading" ? `${readPct}%` : ""}</span></div>
            <Progress value={stage === "reading" ? readPct * 0.4 : 70} className="h-2" />
          </div>
        )}
        {file && !busy && <Button className="mt-4" size="lg" onClick={process}><Sparkles /> Proses dokumen</Button>}

        {history.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dokumen kamu</p>
            <div className="flex flex-wrap gap-2">
              {history.map((h) => (
                <span key={h.id} className={cn("group inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors", doc?.id === h.id ? "border-primary bg-muted" : "border-border bg-card hover:bg-muted")}>
                  <button onClick={() => { setDoc(h); setSummary(h.summary ?? null); setQuiz(null); setResult(null); }} className="max-w-[220px] truncate">{h.filename}</button>
                  <button aria-label="Hapus dokumen" className="opacity-50 hover:opacity-100" onClick={async () => { await del({ data: { id: h.id } }); setHistory((x) => x.filter((y) => y.id !== h.id)); if (doc?.id === h.id) { setDoc(null); setSummary(null); setQuiz(null); setResult(null); } }}><Trash2 className="size-3.5" /></button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {doc && (
        <section className="card-soft p-5 sm:p-7 fade-up">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <StepTitle n={2} title="Ringkasan materi" />
            <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2 text-sm">
              <FileText className="size-4 text-muted-foreground" />
              <span className="max-w-[240px] truncate font-medium">{doc.filename}</span>
              <span className="text-muted-foreground">{formatBytes(doc.size_bytes)}{doc.words ? ` · ${doc.words.toLocaleString("id-ID")} kata` : ""}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!summary ? (
              <Button onClick={runSummary} disabled={sumBusy}>{sumBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Summary</Button>
            ) : (
              <>
                <Button variant="outline" onClick={runSummary} disabled={sumBusy}>{sumBusy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Regenerate Summary</Button>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(summary); toast.success("Ringkasan disalin."); }}><Copy /> Copy Summary</Button>
              </>
            )}
            <Button variant="soft" onClick={() => document.getElementById("quiz-config")?.scrollIntoView({ behavior: "smooth" })}><ListChecks /> Create Practice Questions</Button>
          </div>
          {sumBusy && <SkeletonLines />}
          {summary && !sumBusy && (
            <article className="prose-study mt-6 rounded-2xl border border-border bg-background/60 p-5 sm:p-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </article>
          )}
        </section>
      )}

      {doc && (
        <section id="quiz-config" className="card-soft p-5 sm:p-7">
          <StepTitle n={3} title="Atur latihan soal" />
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <Field label="Jumlah soal">
              <div className="flex flex-wrap gap-2">{COUNTS.map((c) => <Chip key={c} on={count === c} onClick={() => setCount(c)}>{c}</Chip>)}</div>
            </Field>
            <Field label="Tingkat kesulitan">
              <div className="flex flex-wrap gap-2">
                {([["easy", "Mudah"], ["medium", "Sedang"], ["hard", "Sulit"]] as const).map(([v, l]) => <Chip key={v} on={difficulty === v} onClick={() => setDifficulty(v)}>{l}</Chip>)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{{ easy: "Definisi & identifikasi konsep.", medium: "Pemahaman, penerapan & hubungan konsep.", hard: "Analisis kasus & penalaran multi-konsep." }[difficulty]}</p>
            </Field>
            <Field label="Tipe soal">
              <div className="flex flex-wrap gap-2">
                {([["mcq", "Pilihan Ganda"], ["tf", "Benar / Salah"]] as const).map(([v, l]) => (
                  <Chip key={v} on={types.includes(v)} onClick={() => setTypes((t) => t.includes(v) ? (t.length > 1 ? t.filter((x) => x !== v) : t) : [...t, v])}>{l}</Chip>
                ))}
              </div>
            </Field>
          </div>
          <Button className="mt-6" size="lg" onClick={runQuiz} disabled={quizBusy}>{quizBusy ? <><Loader2 className="animate-spin" /> Menyusun {count} soal…</> : <><Sparkles /> Buat soal</>}</Button>
        </section>
      )}

      {quiz && !result && <QuizRunner key={quiz.id} quiz={quiz} onSubmit={async (answers) => { const r = await submit({ data: { quizId: quiz.id, answers } }); setResult(r); setTimeout(() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" }), 50); }} />}
      {result && <Results r={result} onRetry={runQuiz} />}
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return <h2 className="flex items-center gap-3 text-lg font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-sm text-accent-foreground">{n}</span>{title}</h2>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-sm font-medium">{label}</p>{children}</div>;
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl border px-3.5 py-2 text-sm font-medium transition-all", on ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card hover:bg-muted")}>{children}</button>;
}
function SkeletonLines() {
  return <div className="mt-6 grid gap-3">{[90, 75, 95, 60, 80].map((w, i) => <div key={i} className="h-3 animate-pulse rounded-full bg-muted" style={{ width: `${w}%` }} />)}</div>;
}

function QuizRunner({ quiz, onSubmit }: { quiz: { id: string; questions: PublicQ[] }; onSubmit: (a: Record<string, number | null>) => Promise<void> }) {
  const qs = quiz.questions;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [left, setLeft] = useState(qs.length * 60);
  const answered = useMemo(() => Object.values(answers).filter((v) => v !== null && v !== undefined).length, [answers]);

  async function finish() {
    setBusy(true);
    try { await onSubmit(Object.fromEntries(qs.map((q) => [q.id, answers[q.id] ?? null]))); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal mengirim jawaban."); setBusy(false); }
  }

  useEffect(() => {
    if (!timerOn) return;
    if (left <= 0) { toast.info("Waktu habis! Jawaban dikirim otomatis."); finish(); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerOn, left]);

  const q = qs[i];
  return (
    <section id="quiz" className="card-soft p-5 sm:p-7 fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StepTitle n={4} title="Kuis" />
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-muted-foreground"><Switch checked={timerOn} onCheckedChange={setTimerOn} /> Timer</label>
          {timerOn && <span className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono font-semibold", left < 60 ? "bg-destructive/10 text-destructive" : "bg-muted")}><Timer className="size-4" />{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>}
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Soal {i + 1} dari {qs.length}</span><span>{answered} terjawab</span></div>
        <Progress value={(answered / qs.length) * 100} className="h-2" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {qs.map((x, idx) => (
          <button key={x.id} onClick={() => setI(idx)} aria-label={`Soal ${idx + 1}`} className={cn("size-8 rounded-lg text-xs font-semibold transition-all", idx === i ? "bg-foreground text-background" : answers[x.id] != null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border")}>{idx + 1}</button>
        ))}
      </div>
      <div key={q.id} className="mt-6 fade-up">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{q.type === "mcq" ? "Pilihan Ganda" : "Benar / Salah"}</span>
        <p className="mt-2 text-lg font-medium leading-relaxed">{q.question}</p>
        <div className={cn("mt-5 grid gap-2.5", q.type === "tf" && "sm:grid-cols-2")}>
          {q.options.map((opt, k) => {
            const sel = answers[q.id] === k;
            return (
              <button key={k} onClick={() => setAnswers((a) => ({ ...a, [q.id]: k }))} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-all", sel ? "border-primary bg-muted shadow-soft" : "border-border bg-card hover:border-primary/60 hover:bg-muted/40")}>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-sm font-semibold", sel ? "bg-primary text-primary-foreground" : "bg-muted")}>{q.type === "mcq" ? LETTERS[k] : k === 0 ? "B" : "S"}</span>
                <span className="pt-0.5">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setI((x) => x - 1)} disabled={i === 0}><ChevronLeft /> Sebelumnya</Button>
        <div className="flex gap-2">
          {i < qs.length - 1 && <Button variant="outline" onClick={() => setI((x) => x + 1)}>Berikutnya <ChevronRight /></Button>}
          <Button variant="hero" onClick={() => setConfirm(true)} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Flag />} Finish Quiz</Button>
        </div>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim jawaban?</AlertDialogTitle>
            <AlertDialogDescription>{answered < qs.length ? `Masih ada ${qs.length - answered} soal yang belum dijawab dan akan dihitung salah. ` : ""}Setelah dikirim, jawaban tidak dapat diubah.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Kirim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Results({ r, onRetry }: { r: QuizResult; onRetry: () => void }) {
  const pct = r.score;
  const tone = pct >= 80 ? "text-success-strong" : pct >= 60 ? "text-primary-strong" : "text-destructive";
  return (
    <section id="quiz" className="grid gap-6 fade-up">
      <div className="card-soft p-5 sm:p-7">
        <StepTitle n={5} title="Hasil kuis" />
        <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
          <div className="relative mx-auto grid size-44 place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--muted)" strokeWidth="12" /><circle cx="60" cy="60" r="52" fill="none" stroke="var(--primary)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 326.7} 326.7`} className="transition-all duration-700" /></svg>
            <div className="text-center"><p className={cn("font-display text-4xl font-semibold", tone)}>{Math.round(pct)}</p><p className="text-xs text-muted-foreground">dari 100</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total soal" value={r.total} />
            <Stat label="Benar" value={r.correct} cls="bg-success/40" />
            <Stat label="Salah" value={r.total - r.correct} cls="bg-destructive/10" />
            <Stat label="Keberhasilan" value={`${pct.toFixed(0)}%`} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-soft p-5 sm:p-6">
          <h3 className="font-semibold">Penguasaan per topik</h3>
          <div className="mt-4 grid gap-3">
            {r.topics.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between text-sm"><span className="truncate pr-2">{t.topic}</span><span className="text-muted-foreground">{t.correct}/{t.total}</span></div>
                <Progress value={(t.correct / t.total) * 100} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
        </div>
        <div className="card-soft grid gap-5 p-5 sm:p-6">
          <TagList title="Sudah dipahami" items={r.understood} empty="Belum ada topik yang dikuasai ≥70%." cls="bg-success/40 text-success-foreground" />
          <TagList title="Perlu dipelajari lagi" items={r.needsWork} empty="Mantap! Semua topik sudah dikuasai." cls="bg-warning/50 text-warning-foreground" />
          <TagList title="Bab yang disarankan untuk diulang" items={r.chaptersToReview} empty="Tidak ada." cls="bg-accent-soft text-accent-foreground" />
          <Button variant="soft" onClick={onRetry}><RefreshCw /> Buat kuis baru</Button>
        </div>
      </div>

      <div className="card-soft p-5 sm:p-7">
        <h3 className="font-semibold">Pembahasan</h3>
        <ol className="mt-4 grid gap-4">
          {r.items.map((q, idx) => (
            <li key={q.id} className={cn("rounded-2xl border p-4 sm:p-5", q.isCorrect ? "border-success" : "border-destructive/30")}>
              <div className="flex gap-3">
                {q.isCorrect ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-strong" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{idx + 1}. {q.question}</p>
                  <div className="mt-3 grid gap-1.5 text-sm">
                    {q.options.map((o, k) => (
                      <div key={k} className={cn("rounded-lg px-3 py-2", k === q.answer ? "bg-success/40 font-medium" : k === q.selected ? "bg-destructive/10" : "bg-muted/50")}>
                        {q.type === "mcq" ? `${LETTERS[k]}. ` : ""}{o}{k === q.answer ? " ✓ Jawaban benar" : k === q.selected ? " — Jawabanmu" : ""}
                      </div>
                    ))}
                    {q.selected === null && <p className="text-destructive">Tidak dijawab</p>}
                  </div>
                  <p className="mt-3 rounded-lg bg-muted p-3 text-sm leading-relaxed"><strong>Penjelasan:</strong> {q.explanation}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
function Stat({ label, value, cls }: { label: string; value: React.ReactNode; cls?: string }) {
  return <div className={cn("rounded-2xl bg-muted p-4", cls)}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-semibold">{value}</p></div>;
}
function TagList({ title, items, empty, cls }: { title: string; items: string[]; empty: string; cls: string }) {
  return <div><p className="mb-2 text-sm font-medium">{title}</p>{items.length ? <div className="flex flex-wrap gap-1.5">{items.map((t) => <span key={t} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", cls)}>{t}</span>)}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}</div>;
}
