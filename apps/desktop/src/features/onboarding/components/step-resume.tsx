import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { CheckCircle2, Loader2 } from "lucide-react";
import FileUpload, { DropZone, FileList, type FileInfo } from "@/components/ui/file-upload";
import { api } from "@/lib/ipc";
import type { OnboardingValues } from "../schema";

/**
 * Resume step (REIN-315). Extracts text locally (pdf-parse / mammoth in main) so the
 * next step can offer to import proof points. Extracted text is held in local state;
 * persistence + LLM parse-to-fields land with the backend.
 */
export function StepResume({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [status, setStatus] = useState<"idle" | "extracting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

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
      const res = await api.document.extractText(f.name, bytes);
      if (res.ok) {
        form.setValue("resumeText", res.data.text);
        setStatus("done");
        setMessage("Resume parsed");
      } else {
        setStatus("error");
        setMessage(res.error);
      }
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Could not read the file");
    }
  };

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
        <DropZone prompt="Drop your CV here, or click to browse" />
        <FileList canRemove onRemove={removeFile} />
      </FileUpload>

      {status === "extracting" && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Reading your resume…
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
