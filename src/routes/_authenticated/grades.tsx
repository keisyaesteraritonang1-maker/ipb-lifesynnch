import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Save, Sparkles, Trash2, Target, FolderOpen, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "@/components/studyflow/FileDropzone";
import { extractOfficeText, fileToBase64 } from "@/lib/extract-client";
import { deletePlan, extractContract, listPlans, savePlan } from "@/lib/grades.functions";
import { DEFAULT_THRESHOLDS, letterFor, projectedScore, requiredAverage, summarize, totalWeight, type GradeComponent, type GradeThreshold } from "@/lib/grade";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/grades")({
  head: () => ({
    meta: [
      { title: "Grade Predictor — StudyFlow" },
      { name: "description", content: "Analisis kontrak kuliah dan hitung nilai yang kamu butuhkan untuk mencapai target." },
      { property: "og:title", content: "Grade Predictor — StudyFlow" },
      { property: "og:description", content: "Analisis kontrak kuliah dan hitung nilai yang kamu butuhkan untuk mencapai target." },
    ],
  }),
  component: GradesPage,
});

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
type Plan = { id?: string; course_name: string; components: GradeComponent[]; thresholds: GradeThreshold[]; target_grade: string | null; notes: string | null };
const blank = (): Plan => ({
  course_name: "Mata Kuliah Baru",
  components: [
    { id: uid(), name: "Tugas", weight: 20, score: null },
    { id: uid(), name: "UTS", weight: 35, score: null },
    { id: uid(), name: "UAS", weight: 45, score: null },
  ],
  thresholds: DEFAULT_THRESHOLDS,
  target_grade: "A",
  notes: null,
});

function GradesPage() {
  const extract = useServerFn(extractContract);
  const save = useServerFn(savePlan);
  const list = useServerFn(listPlans);
  const remove = useServerFn(deletePlan);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan>(blank);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [sim, setSim] = useState<Record<string, number>>({});

  useEffect(() => { list().then((p) => setPlans(p as unknown as Plan[])).catch(() => {}); }, [list]);

  const comps = plan.components;
  const tw = totalWeight(comps);
  const s = summarize(comps);
  const thresholds = plan.thresholds.length ? plan.thresholds : DEFAULT_THRESHOLDS;
  const targetMin = thresholds.find((t) => t.grade === plan.target_grade)?.min ?? thresholds[0]?.min ?? 0;
  const req = requiredAverage(comps, targetMin);
  const unknown = comps.filter((c) => c.score === null);
  const projected = projectedScore(comps, sim);
  const perGrade = useMemo(() => [...thresholds].sort((a, b) => b.min - a.min).map((t) => ({ ...t, req: requiredAverage(comps, t.min) })), [thresholds, comps]);

  function patch(id: string, p: Partial<GradeComponent>) {
    setPlan((x) => ({ ...x, components: x.components.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
  }

  async function analyze() {
    if (!file) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()!.toLowerCase();
      const payload = ext === "docx" ? { text: await extractOfficeText(file) } : { base64: await fileToBase64(file) };
      const mime = file.type || (ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg");
      const r = await extract({ data: { filename: file.name, mime, ...payload } });
      if (!r.readable) { toast.error(r.reason || "Komponen penilaian tidak ditemukan di dokumen. Isi tabel secara manual."); return; }
      const th = r.thresholds.length ? r.thresholds : DEFAULT_THRESHOLDS;
      setPlan({ course_name: r.courseName, components: r.components.map((c) => ({ id: uid(), name: c.name, weight: c.weight, score: null })), thresholds: th, target_grade: [...th].sort((a, b) => b.min - a.min)[0]?.grade ?? "A", notes: r.rules || null });
      setSim({}); setFile(null);
      toast.success(`${r.components.length} komponen penilaian ditemukan. Periksa kembali bobotnya.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menganalisis kontrak."); }
    finally { setBusy(false); }
  }

  async function doSave() {
    setSaving(true);
    try {
      const r = await save({ data: plan });
      setPlan((p) => ({ ...p, id: r.id }));
      setPlans((ps) => [{ ...plan, id: r.id }, ...ps.filter((x) => x.id !== r.id)]);
      toast.success("Tersimpan.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan."); }
    finally { setSaving(false); }
  }

  return (
    <div className="grid gap-6">
      <div className="fade-up">
        <h1 className="text-3xl font-semibold">Grade Predictor</h1>
        <p className="mt-1 text-muted-foreground">Ketahui nilai yang kamu butuhkan untuk mencapai target mutu.</p>
      </div>

      <section className="card-soft p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Unggah kontrak perkuliahan</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setPlan(blank()); setSim({}); }}><FilePlus2 /> Isi manual</Button>
          </div>
        </div>
        <div className="mt-4"><FileDropzone accept={[".pdf", ".docx", ".jpg", ".jpeg", ".png"]} maxMB={15} file={file} onFile={setFile} onClear={() => setFile(null)} disabled={busy} hint="PDF, DOCX, JPG, atau PNG · maks. 15 MB" /></div>
        {file && <Button className="mt-4" size="lg" onClick={analyze} disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Menganalisis kontrak…</> : <><Sparkles /> Analisis kontrak</>}</Button>}
        {plans.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mata kuliah tersimpan</p>
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <span key={p.id} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", plan.id === p.id ? "border-primary bg-muted" : "border-border bg-card hover:bg-muted")}>
                  <button className="flex items-center gap-1.5" onClick={() => { setPlan(p); setSim({}); }}><FolderOpen className="size-3.5" />{p.course_name}</button>
                  <button aria-label="Hapus" className="opacity-50 hover:opacity-100" onClick={async () => { await remove({ data: { id: p.id! } }); setPlans((x) => x.filter((y) => y.id !== p.id)); if (plan.id === p.id) setPlan(blank()); }}><Trash2 className="size-3.5" /></button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <section className="card-soft p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input value={plan.course_name} onChange={(e) => setPlan({ ...plan, course_name: e.target.value })} className="h-11 max-w-sm rounded-xl font-display text-lg font-semibold" aria-label="Nama mata kuliah" />
            <Button onClick={doSave} disabled={saving} variant="soft">{saving ? <Loader2 className="animate-spin" /> : <Save />} Simpan</Button>
          </div>
          {plan.notes && <p className="mt-4 rounded-xl bg-accent-soft p-3 text-sm leading-relaxed text-accent-foreground"><strong>Aturan penilaian:</strong> {plan.notes}</p>}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="pb-2 font-semibold">Komponen</th><th className="w-24 pb-2 font-semibold">Bobot (%)</th><th className="w-28 pb-2 font-semibold">Nilai (0–100)</th><th className="w-20 pb-2 text-right font-semibold">Kontribusi</th><th className="w-10" /></tr></thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2 pr-2"><Input value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} className="h-9 rounded-lg" /></td>
                    <td className="py-2 pr-2"><Input type="number" min={0} max={100} step="any" value={Number.isFinite(c.weight) ? c.weight : ""} onChange={(e) => patch(c.id, { weight: e.target.value === "" ? 0 : Number(e.target.value) })} className="h-9 rounded-lg" /></td>
                    <td className="py-2 pr-2"><Input type="number" min={0} max={100} step="any" placeholder="belum ada" value={c.score ?? ""} onChange={(e) => { const v = e.target.value; patch(c.id, { score: v === "" ? null : Math.min(100, Math.max(0, Number(v))) }); }} className="h-9 rounded-lg" /></td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{c.score === null ? "–" : fmt((c.weight * c.score) / 100)}</td>
                    <td className="py-2 text-right"><Button variant="ghost" size="icon" aria-label="Hapus komponen" onClick={() => setPlan({ ...plan, components: comps.filter((x) => x.id !== c.id) })}><Trash2 /></Button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-border font-semibold"><td className="pt-3">Total</td><td className={cn("pt-3", Math.abs(tw - 100) > 0.01 && "text-destructive")}>{fmt(tw)}%</td><td /><td className="pt-3 text-right tabular-nums">{fmt(s.earned)}</td><td /></tr></tfoot>
            </table>
          </div>
          {Math.abs(tw - 100) > 0.01 && <p className="mt-3 flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" />Total bobot harus 100% agar perhitungan akurat (saat ini {fmt(tw)}%).</p>}
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setPlan({ ...plan, components: [...comps, { id: uid(), name: "Komponen baru", weight: 0, score: null }] })}><Plus /> Tambah komponen</Button>

          <div className="mt-7">
            <p className="mb-2 text-sm font-medium">Batas huruf mutu</p>
            <div className="flex flex-wrap gap-2">
              {thresholds.map((t, k) => (
                <label key={k} className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2 py-1.5 text-sm">
                  <span className="w-7 font-semibold">{t.grade}</span>≥
                  <input type="number" value={t.min} onChange={(e) => setPlan({ ...plan, thresholds: thresholds.map((x, j) => (j === k ? { ...x, min: Number(e.target.value) } : x)) })} className="w-14 rounded-md border border-input bg-card px-1.5 py-0.5" />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Gunakan batas dari kontrak kuliahmu jika berbeda.</p>
          </div>
        </section>

        <section className="grid content-start gap-6">
          <div className="card-soft p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Target className="size-5" />Target</h2>
              <div className="flex flex-wrap justify-end gap-1.5">
                {[...thresholds].sort((a, b) => b.min - a.min).map((t) => (
                  <button key={t.grade} onClick={() => setPlan({ ...plan, target_grade: t.grade })} className={cn("min-w-10 rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-all", plan.target_grade === t.grade ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>{t.grade}</button>
                ))}
              </div>
            </div>
            <div className={cn("mt-5 rounded-2xl p-5", req.status === "impossible" ? "bg-destructive/10" : req.status === "achieved" ? "bg-success/40" : "bg-brand")}>
              {req.status === "achieved" && <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" />Target {plan.target_grade} sudah tercapai!</p>}
              {req.status === "possible" && (<><p className="text-sm">Rata-rata nilai minimum di komponen tersisa</p><p className="mt-1 font-display text-4xl font-semibold">{fmt(req.needed)}</p><p className="mt-1 text-sm">untuk mencapai {plan.target_grade} (≥ {targetMin})</p></>)}
              {req.status === "impossible" && (<><p className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="size-5" />Target {plan.target_grade} tidak mungkin tercapai</p><p className="mt-1 text-sm">Dibutuhkan rata-rata {fmt(req.needed)} (melebihi 100). Nilai maksimal yang masih bisa diraih: {fmt(s.maxPossible)} ({letterFor(s.maxPossible, thresholds)}).</p></>)}
              {req.status === "no-remaining" && <p className="font-semibold">Semua nilai sudah terisi. Nilai akhir: {fmt(s.earned)} ({letterFor(s.earned, thresholds)}).</p>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Mini label="Poin terkumpul" value={`${fmt(s.earned)} / ${fmt(s.totalWeight)}`} />
              <Mini label="Bobot tersisa" value={`${fmt(s.remainingWeight)}%`} />
              <Mini label="Rata-rata saat ini" value={s.averageOnCompleted === null ? "–" : fmt(s.averageOnCompleted)} />
              <Mini label="Rentang akhir" value={`${fmt(s.minPossible)}–${fmt(s.maxPossible)}`} />
            </div>
            <div className="mt-4"><div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Progres penilaian</span><span>{fmt(s.completedWeight)}% selesai</span></div><Progress value={s.totalWeight ? (s.completedWeight / s.totalWeight) * 100 : 0} className="h-2" /></div>
          </div>

          <div className="card-soft p-5 sm:p-6">
            <h3 className="font-semibold">Nilai yang dibutuhkan per huruf mutu</h3>
            <div className="mt-3 grid gap-1.5 text-sm">
              {perGrade.map((g) => (
                <div key={g.grade} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-semibold">{g.grade} <span className="font-normal text-muted-foreground">≥ {g.min}</span></span>
                  <span className={cn("tabular-nums", g.req.status === "impossible" && "text-destructive", g.req.status === "achieved" && "text-success-strong font-medium")}>
                    {g.req.status === "achieved" ? "Tercapai" : g.req.status === "impossible" ? "Tidak mungkin" : g.req.status === "possible" ? `rata-rata ${fmt(g.req.needed)}` : "–"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="card-soft p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Simulasi skenario</h2><p className="text-sm text-muted-foreground">Geser untuk mencoba nilai pada komponen yang belum ada.</p></div>
          <div className="rounded-2xl bg-brand px-5 py-3 text-right"><p className="text-xs">Proyeksi nilai akhir</p><p className="font-display text-3xl font-semibold">{fmt(projected)} <span className="text-xl">· {letterFor(projected, thresholds)}</span></p></div>
        </div>
        {unknown.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Semua komponen sudah memiliki nilai.</p> : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {unknown.map((c) => {
              const v = sim[c.id] ?? 0;
              return (
                <div key={c.id}>
                  <div className="mb-2 flex justify-between text-sm"><span className="font-medium">{c.name} <span className="text-muted-foreground">({fmt(c.weight)}%)</span></span><span className="tabular-nums font-semibold">{v}</span></div>
                  <Slider value={[v]} min={0} max={100} step={1} onValueChange={([n]) => setSim((x) => ({ ...x, [c.id]: n }))} />
                </div>
              );
            })}
          </div>
        )}
        {unknown.length > 0 && req.status === "possible" && (
          <Button variant="outline" size="sm" className="mt-6" onClick={() => setSim(Object.fromEntries(unknown.map((c) => [c.id, Math.ceil(req.needed)])))}>Isi dengan nilai minimum untuk {plan.target_grade}</Button>
        )}
      </section>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-semibold tabular-nums">{value}</p></div>;
}
