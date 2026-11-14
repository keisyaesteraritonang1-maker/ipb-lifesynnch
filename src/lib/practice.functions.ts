import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_CHARS = 180_000;
const MIN_CHARS = 300;

export type QuizQuestion = {
  id: string;
  type: "mcq" | "tf";
  question: string;
  options: string[]; // 4 for mcq, ["Benar","Salah"] for tf
  answer: number; // index into options
  explanation: string;
  topic: string;
  chapter: string;
};

export const extractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        filename: z.string().min(1).max(255),
        mime: z.string().max(200),
        size: z.number().int().positive().max(20 * 1024 * 1024),
        text: z.string().max(2_000_000).optional(),
        base64: z.string().max(30_000_000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let text = data.text ?? "";
    if (!text && data.base64) {
      const { askModel, fileParts } = await import("./ai.server");
      const out = await askModel({
        system:
          "Anda adalah mesin ekstraksi teks dokumen. Salin SELURUH isi dokumen apa adanya (lakukan OCR bila halaman berupa gambar/scan). Pertahankan istilah asli, struktur judul bab/subbab (gunakan # dan ##), poin, dan tabel. Tulis rumus matematika dalam LaTeX ($...$ atau $$...$$) secara akurat. Jangan meringkas, jangan menambah informasi. Jika dokumen tidak terbaca, kosong, rusak, atau hampir tidak berisi teks, balas HANYA dengan: UNREADABLE: <alasan singkat dalam Bahasa Indonesia>.",
        parts: [fileParts(data.base64, data.mime || "application/pdf", data.filename), { type: "text", text: "Ekstrak seluruh teks dokumen ini." }],
      });
      if (out.trim().startsWith("UNREADABLE")) {
        throw new Error("Dokumen tidak dapat dibaca: " + out.replace(/^UNREADABLE:?/, "").trim());
      }
      text = out;
    }
    text = text.replace(/\u0000/g, "").trim();
    if (text.length < MIN_CHARS) {
      throw new Error("Isi dokumen terlalu sedikit untuk dianalisis. Pastikan file berisi teks materi yang cukup (bukan hanya gambar tanpa teks).");
    }
    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({ filename: data.filename, size_bytes: data.size, mime: data.mime, extracted_text: text.slice(0, 1_000_000), user_id: context.userId })
      .select("id, filename, size_bytes, mime, created_at")
      .single();
    if (error) throw new Error("Gagal menyimpan dokumen.");
    return { ...row, chars: text.length, words: text.split(/\s+/).length };
  });

async function loadDoc(supabase: any, id: string) {
  const { data, error } = await supabase.from("documents").select("id, filename, extracted_text").eq("id", id).single();
  if (error || !data) throw new Error("Dokumen tidak ditemukan.");
  return data as { id: string; filename: string; extracted_text: string };
}

export const generateSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const doc = await loadDoc(context.supabase, data.documentId);
    const { askModel } = await import("./ai.server");
    const summary = await askModel({
      system: `Anda adalah asisten belajar untuk mahasiswa IPB University. Buat ringkasan terstruktur HANYA berdasarkan dokumen yang diberikan. Jangan menambah fakta yang tidak ada di dokumen. Tulis dalam Bahasa Indonesia yang sederhana dan jelas, pertahankan istilah akademik penting (beri penjelasan singkat). Gunakan Markdown dengan struktur persis berikut:
## Gambaran Umum
## Konsep Utama
## Definisi Penting
## Penjelasan per Bab / Subbab
(gunakan ### untuk tiap bab/subbab yang teridentifikasi)
## Istilah Penting
## Contoh
(hanya jika ada di dokumen; jika tidak ada tulis "Dokumen tidak memuat contoh spesifik.")
## Kesimpulan
## Poin Penting untuk Diingat
(daftar bernomor)
Gunakan poin dan daftar bernomor. Jika dokumen tidak memuat cukup informasi untuk suatu bagian, katakan demikian dengan jujur.
ATURAN MATEMATIKA & SAINS: Tulis setiap rumus, variabel, simbol, dan angka berpangkat dalam LaTeX: inline dengan $...$ (contoh $x^2$, $\\frac{a}{b}$, $\\sqrt{n}$, $\\alpha$) dan rumus panjang dengan $$...$$ pada baris sendiri. Jangan menulis rumus sebagai teks biasa atau Unicode acak. Salin rumus dari dokumen secara akurat. Gunakan istilah matematika baku Bahasa Indonesia seperti di perkuliahan (turunan, integral, limit, fungsi, daerah asal, daerah hasil, himpunan, matriks, nilai eigen, peluang, rataan, simpangan baku); jangan menerjemahkan secara harfiah dan kaku. Penjelasan langkah perhitungan harus runtut dan alami.`,
      parts: [{ type: "text", text: `Judul file: ${doc.filename}\n\nISI DOKUMEN:\n${doc.extracted_text.slice(0, MAX_CHARS)}` }],
    });
    await context.supabase.from("documents").update({ summary }).eq("id", doc.id);
    return { summary };
  });

const DIFF: Record<string, string> = {
  easy: "MUDAH: pemahaman dasar, definisi, identifikasi konsep.",
  medium: "SEDANG: pemahaman konseptual, penerapan, hubungan antar konsep.",
  hard: "SULIT: berpikir kritis, analisis kasus, penalaran, penerapan beberapa konsep sekaligus.",
};

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        documentId: z.string().uuid(),
        count: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(50)]),
        difficulty: z.enum(["easy", "medium", "hard"]),
        types: z.array(z.enum(["mcq", "tf"])).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const doc = await loadDoc(context.supabase, data.documentId);
    const { askModel, parseJson } = await import("./ai.server");
    const typeText =
      data.types.length === 2
        ? "campuran pilihan ganda (mcq) dan benar/salah (tf)"
        : data.types[0] === "mcq"
          ? "hanya pilihan ganda (mcq)"
          : "hanya benar/salah (tf)";
    const raw = await askModel({
      json: true,
      system: `Anda membuat soal latihan HANYA dari dokumen yang diberikan. Setiap soal harus bisa dijawab dari isi dokumen; jangan mengarang informasi. Hindari soal berulang. Pastikan kunci jawaban benar secara logis. Bahasa Indonesia.
Balas JSON: {"questions":[{"type":"mcq"|"tf","question":string,"options":string[],"answer":number,"explanation":string,"topic":string,"chapter":string}]}
- mcq: options tepat 4 teks (tanpa awalan huruf), answer = indeks 0-3 jawaban benar. Sebarkan posisi jawaban benar secara acak.
- tf: options persis ["Benar","Salah"], answer 0 atau 1.
- explanation: alasan jawaban benar merujuk isi dokumen.
- topic: konsep yang diuji (singkat). chapter: nama bab/subbab asal di dokumen.
ATURAN MATEMATIKA & SAINS: Tulis setiap rumus, variabel, simbol, dan angka berpangkat dalam LaTeX: inline dengan $...$ (contoh $x^2$, $\\frac{a}{b}$, $\\sqrt{n}$, $\\alpha$) dan rumus panjang dengan $$...$$ pada baris sendiri. Jangan menulis rumus sebagai teks biasa atau Unicode acak. Salin rumus dari dokumen secara akurat. Gunakan istilah matematika baku Bahasa Indonesia seperti di perkuliahan (turunan, integral, limit, fungsi, daerah asal, daerah hasil, himpunan, matriks, nilai eigen, peluang, rataan, simpangan baku); jangan menerjemahkan secara harfiah dan kaku. Penjelasan langkah perhitungan harus runtut dan alami. Di dalam JSON, backslash LaTeX wajib di-escape (tulis \\\\frac, bukan \\frac).`,
      parts: [
        {
          type: "text",
          text: `Buat tepat ${data.count} soal, tipe: ${typeText}. Tingkat kesulitan ${DIFF[data.difficulty]}\n\nISI DOKUMEN:\n${doc.extracted_text.slice(0, MAX_CHARS)}`,
        },
      ],
    });
    const parsed = parseJson<{ questions: Omit<QuizQuestion, "id">[] }>(raw);
    const questions: QuizQuestion[] = (parsed.questions ?? [])
      .filter((q) => {
        if (!q?.question || !Array.isArray(q.options)) return false;
        if (q.type === "mcq") return q.options.length === 4 && q.answer >= 0 && q.answer < 4 && data.types.includes("mcq");
        if (q.type === "tf") return data.types.includes("tf") && (q.answer === 0 || q.answer === 1);
        return false;
      })
      .map((q, i) => ({ ...q, options: q.type === "tf" ? ["Benar", "Salah"] : q.options, id: `q${i + 1}`, topic: q.topic || "Umum", chapter: q.chapter || "Umum" }))
      .slice(0, data.count);
    if (questions.length === 0) throw new Error("Gagal membuat soal yang valid dari dokumen ini. Coba lagi.");
    const { data: row, error } = await context.supabase
      .from("quizzes")
      .insert({ document_id: doc.id, config: data as never, questions: questions as never, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error("Gagal menyimpan kuis.");
    // Never send answer keys to the browser before submission.
    return {
      quizId: row.id,
      questions: questions.map(({ answer: _a, explanation: _e, ...q }) => q),
    };
  });

export type QuizResult = {
  total: number;
  correct: number;
  score: number;
  items: (QuizQuestion & { selected: number | null; isCorrect: boolean })[];
  topics: { topic: string; correct: number; total: number }[];
  understood: string[];
  needsWork: string[];
  chaptersToReview: string[];
};

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ quizId: z.string().uuid(), answers: z.record(z.string(), z.number().int().min(0).max(3).nullable()) }).parse(d))
  .handler(async ({ data, context }): Promise<QuizResult> => {
    const { data: quiz, error } = await context.supabase.from("quizzes").select("id, questions").eq("id", data.quizId).single();
    if (error || !quiz) throw new Error("Kuis tidak ditemukan.");
    const qs = quiz.questions as unknown as QuizQuestion[];
    const items = qs.map((q) => {
      const selected = data.answers[q.id] ?? null;
      return { ...q, selected, isCorrect: selected === q.answer };
    });
    const correct = items.filter((i) => i.isCorrect).length;
    const score = Math.round((correct / items.length) * 10000) / 100;
    const tmap = new Map<string, { topic: string; correct: number; total: number; chapter: string }>();
    for (const i of items) {
      const t = tmap.get(i.topic) ?? { topic: i.topic, correct: 0, total: 0, chapter: i.chapter };
      t.total++;
      if (i.isCorrect) t.correct++;
      tmap.set(i.topic, t);
    }
    const topics = [...tmap.values()];
    const understood = topics.filter((t) => t.correct / t.total >= 0.7).map((t) => t.topic);
    const weak = topics.filter((t) => t.correct / t.total < 0.7);
    const result: QuizResult = {
      total: items.length,
      correct,
      score,
      items,
      topics: topics.map(({ chapter: _c, ...t }) => t),
      understood,
      needsWork: weak.map((t) => t.topic),
      chaptersToReview: [...new Set(weak.map((t) => t.chapter))],
    };
    await context.supabase
      .from("quizzes")
      .update({ answers: data.answers as never, score, evaluation: { understood, needsWork: result.needsWork, chaptersToReview: result.chaptersToReview } as never })
      .eq("id", quiz.id);
    return result;
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("documents")
      .select("id, filename, size_bytes, mime, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("documents").delete().eq("id", data.id);
    return { ok: true };
  });
