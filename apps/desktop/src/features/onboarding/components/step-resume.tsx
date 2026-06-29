import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import FileUpload, { DropZone, FileList, type FileInfo } from "@/components/ui/file-upload";
import { api } from "@/lib/ipc";
import type { CvUpload } from "@compass/ipc-contract";
import type { OnboardingValues } from "../schema";

/**
 * Resume step (REIN-315). Extracts text locally (pdf-parse / mammoth in main) AND
 * uploads the original file to S3 in one pass, so the user only ever uploads once.
 * If a resume is already on file we show it and let the user reuse or replace it.
 */
export function StepResume({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [status, setStatus] = useState<"idle" | "extracting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Existing resume on file (so we don't force a re-upload).
  const [existing, setExisting] = useState<CvUpload | null>(null);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    let active = true;
    api.cv.listUploads().then((res) => {
      if (active && res.ok && res.data.length > 0) setExisting(res.data[0]);
    });
    return () => {
      active = false;
    };
  }, []);

  const removeFile = (id: string) => {
    setFiles((p) => p.filter((x) => x.id !== id));
    setStatus("idle");
    setMessage(null);
    form.setValue("resumeText", "");
  };

  const onSelect = async (picked: FileInfo[]) => {
    setFiles(picked);
    const f = picked[0]?.file;
    if (!f) return;
    setStatus("extracting");
    setMessage(null);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      // Extract text (for proof-point import) and persist the file to S3 together.
      const [extractRes, uploadRes] = await Promise.all([
        api.document.extractText(f.name, bytes),
        api.cv.uploadFile(f.name, bytes),
      ]);
      if (!extractRes.ok) {
        setStatus("error");
        setMessage(extractRes.error);
        return;
      }
      form.setValue("resumeText", extractRes.data.text);
      if (uploadRes.ok) setExisting(uploadRes.data);
      setReplacing(false);
      setStatus("done");
      setMessage(uploadRes.ok ? "Resume saved" : "Resume parsed (not stored — offline)");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Could not read the file");
    }
  };

  // A resume is already saved and the user hasn't chosen to replace it.
  if (existing && !replacing && status !== "done") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-transparent px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{existing.fileName}</p>
            <p className="text-xs text-emerald-600">Already on file — no need to upload again</p>
          </div>
          <button
            type="button"
            onClick={() => setReplacing(true)}
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Replace
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Continue to keep this resume, or replace it with a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FileUpload
        files={files}
        accept=".pdf,.doc,.docx"
        maxSize={10}
        maxCount={1}
        onFileSelectChange={onSelect}
        onRemove={removeFile}
      >
        <DropZone prompt="Drop your CV here, or click to browse" className="bg-transparent" />
        <FileList canRemove onRemove={removeFile} />
      </FileUpload>

      {status === "extracting" && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Reading and saving your resume…
        </p>
      )}
      {status === "done" && (
        <p className="flex items-center justify-center gap-2 text-xs text-emerald-600">
          <CheckCircle2 className="size-3.5" /> {message}
        </p>
      )}
      {status === "error" && <p className="text-center text-xs text-destructive">{message}</p>}
      {status === "idle" && (
        <p className="text-center text-xs text-muted-foreground">
          PDF or Word, up to 10MB. Prefer to type it out? Just continue — this step is optional.
        </p>
      )}
    </div>
  );
}
