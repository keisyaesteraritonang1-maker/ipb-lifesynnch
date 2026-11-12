// Browser-side text extraction for Office/TXT files. PDFs and images go to the AI (supports OCR).
import JSZip from "jszip";

function xmlText(xml: string, paraTag: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const paras = Array.from(doc.getElementsByTagName(paraTag));
  return paras
    .map((p) => Array.from(p.getElementsByTagName(paraTag === "w:p" ? "w:t" : "a:t")).map((t) => t.textContent ?? "").join(""))
    .filter((t) => t.trim())
    .join("\n");
}

export async function extractOfficeText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "txt") return await file.text();
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  if (ext === "docx") {
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw new Error("File DOCX tidak dapat dibaca.");
    return xmlText(xml, "w:p");
  }
  if (ext === "pptx") {
    const slides = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/g)!.pop()) - Number(b.match(/\d+/g)!.pop()));
    const out: string[] = [];
    for (const [i, name] of slides.entries()) {
      const xml = await zip.file(name)!.async("string");
      const t = xmlText(xml, "a:p");
      if (t.trim()) out.push(`--- Slide ${i + 1} ---\n${t}`);
    }
    return out.join("\n\n");
  }
  throw new Error("Format tidak didukung.");
}

export function fileToBase64(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Gagal membaca file."));
    r.readAsDataURL(file);
  });
}

export const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;
