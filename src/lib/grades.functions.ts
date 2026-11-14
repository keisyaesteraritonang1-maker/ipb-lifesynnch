import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExtractedContract = {
  readable: boolean;
  reason?: string;
  courseName: string;
  components: { name: string; weight: number }[];
  rules: string;
  thresholds: { grade: string; min: number }[];
};

export const extractContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        filename: z.string().max(255),
        mime: z.string().max(200),
        base64: z.string().max(30_000_000).optional(),
        text: z.string().max(500_000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { askModel, parseJson, fileParts } = await import("./ai.server");
    const parts: Parameters<typeof askModel>[0]["parts"] = [];
    if (data.base64) parts.push(fileParts(data.base64, data.mime, data.filename));
    if (data.text) parts.push({ type: "text", text: `ISI KONTRAK:\n${data.text}` });
    parts.push({ type: "text", text: "Ekstrak informasi penilaian dari kontrak perkuliahan ini." });
    const raw = await askModel({
      json: true,
      system: `Anda mengekstrak aturan penilaian dari kontrak perkuliahan (RPS/kontrak kuliah). Gunakan HANYA informasi yang tertulis (lakukan OCR bila berupa gambar). Jangan menebak bobot.
Balas JSON: {"readable":boolean,"reason":string,"courseName":string,"components":[{"name":string,"weight":number}],"rules":string,"thresholds":[{"grade":string,"min":number}]}
- weight dalam persen (contoh 30 untuk 30%). Jika komponen dibagi sub-komponen, pecah dan bagi bobotnya sesuai dokumen.
- rules: ringkasan aturan perhitungan nilai akhir (Bahasa Indonesia), termasuk syarat khusus (mis. minimal kehadiran).
- thresholds: batas bawah tiap huruf mutu jika tertulis; kosongkan jika tidak ada.
- Jika dokumen tidak terbaca atau tidak memuat komponen penilaian, readable=false dan jelaskan di reason.`,
      parts,
    });
    const r = parseJson<ExtractedContract>(raw);
    return {
      readable: !!r.readable && Array.isArray(r.components) && r.components.length > 0,
      reason: r.reason ?? "",
      courseName: r.courseName || data.filename.replace(/\.[^.]+$/, ""),
      components: (r.components ?? []).filter((c) => c?.name).map((c) => ({ name: String(c.name), weight: Number(c.weight) || 0 })),
      rules: r.rules ?? "",
      thresholds: (r.thresholds ?? []).filter((t) => t?.grade && Number.isFinite(Number(t.min))).map((t) => ({ grade: String(t.grade), min: Number(t.min) })),
    } satisfies ExtractedContract;
  });

const planSchema = z.object({
  id: z.string().uuid().optional(),
  course_name: z.string().min(1).max(200),
  components: z.array(z.object({ id: z.string(), name: z.string().max(200), weight: z.number(), score: z.number().nullable() })).max(50),
  thresholds: z.array(z.object({ grade: z.string().max(10), min: z.number() })).max(20),
  target_grade: z.string().max(10).nullable(),
  notes: z.string().max(5000).nullable(),
});

export const savePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => planSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id: _id, ...rest } = data;
    const payload = { ...rest, components: data.components as never, thresholds: data.thresholds as never, updated_at: new Date().toISOString(), user_id: context.userId };
    const q = data.id
      ? context.supabase.from("grade_plans").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("grade_plans").insert(payload).select("id").single();
    const { data: row, error } = await q;
    if (error) throw new Error("Gagal menyimpan.");
    return { id: row.id };
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("grade_plans").select("*").order("updated_at", { ascending: false }).limit(30);
    return data ?? [];
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("grade_plans").delete().eq("id", data.id);
    return { ok: true };
  });
