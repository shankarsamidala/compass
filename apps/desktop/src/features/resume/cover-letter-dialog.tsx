import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Copy, Check, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/ipc";
import { buildCoverLetterHTML } from "./cover-letter-template";
import { downloadPdf } from "./download-pdf";

/** View, copy, download (PDF) and regenerate a job's stored cover letter. */
export function CoverLetterDialog({
  open,
  onOpenChange,
  jobId,
  company,
  candidateName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string | null;
  company?: string | null;
  candidateName?: string | null;
}) {
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const { data: letter, isLoading, isError } = useQuery({
    queryKey: ["cover-letter", jobId],
    queryFn: async () => {
      const r = await api.jobs.getCoverLetter(jobId!);
      if (!r.ok) throw new Error(r.error);
      return r.data.letter;
    },
    enabled: open && !!jobId,
  });

  const copy = async () => {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = async () => {
    if (!letter) return;
    setDownloading(true);
    try {
      const html = buildCoverLetterHTML(letter, {
        name: candidateName ?? undefined,
        company: company ?? undefined,
      });
      const co = (company ?? "").replace(/\s+/g, "_").toLowerCase();
      await downloadPdf(html, `cover_letter${co ? `_${co}` : ""}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const regenerate = async () => {
    if (!jobId || regenerating) return;
    setRegenerating(true);
    try {
      const r = await api.jobs.coverLetter(jobId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["cover-letter", jobId] });
      toast.success("Cover letter regenerated");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <DialogTitle className="text-sm">Cover letter</DialogTitle>
            <DialogDescription className="text-[11px]">
              {company ? `Drafted for ${company}` : "Drafted for this role"}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={!letter || regenerating} onClick={() => void regenerate()}>
              {regenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Regenerate
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={!letter} onClick={() => void copy()}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" className="h-8 gap-1.5 bg-foreground text-background hover:bg-foreground/90" disabled={!letter || downloading} onClick={() => void download()}>
              {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              {downloading ? "Generating…" : "Download PDF"}
            </Button>
          </div>
        </DialogHeader>

        <div className="scrollbar-hide flex-1 overflow-y-auto bg-muted/30 p-6">
          {isLoading || regenerating ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {regenerating ? "Regenerating…" : "Loading cover letter…"}
            </div>
          ) : isError || !letter ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Mail className="size-10 text-muted-foreground/40" />
              <p className="max-w-sm text-sm text-muted-foreground">
                No cover letter for this job yet. Run “Cover letter” first.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-xl whitespace-pre-wrap rounded-lg border border-border bg-background p-8 text-[13px] leading-relaxed text-foreground shadow-sm">
              {letter}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
