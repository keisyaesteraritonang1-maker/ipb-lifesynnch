import { generateChatCompletion, GatewayError } from "@lovable.dev/ai-gateway";

// Gemini reads PDFs and images natively (incl. scanned pages), so all document work uses it.
export const DOC_MODEL = "google/gemini-3.8-flash" as const;

type Part =
  | { type: "text"; text: string }
  | { type: "file"; file: { file_data: string; filename: string } }
  | { type: "image_url"; image_url: { url: string } };

export async function askModel(opts: { system: string; parts: Part[]; json?: boolean }) {
  try {
    const res = await generateChatCompletion({
      model: DOC_MODEL,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.parts },
      ],
      ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
    });
    const content = res.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : "";
    if (!text.trim()) throw new Error("AI tidak mengembalikan jawaban. Coba lagi.");
    return text;
  } catch (e) {
    if (e instanceof GatewayError) {
      const status = (e as { httpStatus?: number }).httpStatus;
      if (status === 429) throw new Error("Layanan AI sedang sibuk. Tunggu sebentar lalu coba lagi.");
      if (status === 402) throw new Error("Kuota AI habis. Hubungi pemilik aplikasi.");
      throw new Error("Layanan AI gagal memproses permintaan. Coba lagi.");
    }
    throw e;
  }
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("Format jawaban AI tidak valid. Coba lagi.");
  }
}

export function fileParts(base64: string, mime: string, filename: string): Part {
  if (mime.startsWith("image/")) return { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } };
  return { type: "file", file: { filename, file_data: `data:${mime};base64,${base64}` } };
}
