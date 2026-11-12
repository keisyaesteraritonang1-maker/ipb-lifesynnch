import { useRef, useState } from "react";
import { UploadCloud, FileText, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/extract-client";
import { cn } from "@/lib/utils";

export function FileDropzone({
  accept,
  maxMB,
  file,
  onFile,
  onClear,
  disabled,
  hint,
}: {
  accept: string[];
  maxMB: number;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  disabled?: boolean;
  hint: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    const ext = "." + (f.name.split(".").pop()?.toLowerCase() ?? "");
    if (!accept.includes(ext)) return setError(`Format ${ext} tidak didukung. Gunakan ${accept.join(", ").toUpperCase()}.`);
    if (f.size > maxMB * 1024 * 1024) return setError(`Ukuran file maksimal ${maxMB} MB.`);
    if (f.size === 0) return setError("File kosong.");
    setError(null);
    onFile(f);
  }

  const input = (
    <input ref={ref} type="file" hidden accept={accept.join(",")} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
  );

  if (file)
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-4">
        {input}
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft"><FileText className="size-5 text-accent-foreground" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => ref.current?.click()}><RefreshCw /> Ganti</Button>
        <Button variant="ghost" size="icon" disabled={disabled} onClick={onClear} aria-label="Hapus file"><X /></Button>
      </div>
    );

  return (
    <div>
      {input}
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-input bg-card px-6 py-12 text-center transition-all",
          "hover:border-primary hover:bg-muted/40",
          drag && "scale-[1.01] border-primary bg-muted/60",
        )}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-brand"><UploadCloud className="size-6" /></span>
        <div>
          <p className="font-semibold">Tarik & lepas file di sini, atau klik untuk memilih</p>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
