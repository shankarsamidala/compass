import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/ipc";
import { ResumePreview, buildResumeHTML } from "./resume-template";
import { premiumToResumeData } from "./premium-to-resume-data";
import { downloadPdf } from "./download-pdf";

/**
 * Preview + download a job's stored tailored resume (co_tailored_cvs → PremiumResumeData),
 * rendered through the same template/PDF pipeline as the base "My Resume".
 */
export function TailoredResumeDialog({
  open,
  onOpenChange,
  jobId,
  company,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string | null;
  company?: string | null;
}) {
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tailored-cv", jobId],
    queryFn: async () => {
      const r = await api.jobs.getTailoredCv(jobId!);
      if (!r.ok) throw new Error(r.error);
      return r.data.tailoredCv;
    },
    enabled: open && !!jobId,
  });

  const resume = data ? premiumToResumeData(data.resumeJson) : null;

  const download = async () => {
    if (!resume) return;
    setDownloading(true);
    try {
      const html = buildResumeHTML(resume, "pdf");
      const name = resume.name.replace(/\s+/g, "_").toLowerCase() || "reinit";
      const co = (company ?? "").replace(/\s+/g, "_").toLowerCase();
      await downloadPdf(html, `resume_${name}${co ? `_${co}` : ""}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <DialogTitle className="text-sm">Tailored resume</DialogTitle>
            <DialogDescription className="text-[11px]">
              {company ? `Tailored for ${company}` : "Tailored for this role"}
              {data?.keywordCoverage != null ? ` — ${data.keywordCoverage}% JD keyword match` : ""}
            </DialogDescription>
          </div>
          <Button
            size="sm"
            onClick={download}
            disabled={downloading || !resume}
            className="shrink-0 gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {downloading ? "Generating…" : "Download PDF"}
          </Button>
        </DialogHeader>

        <div className="scrollbar-hide flex-1 overflow-y-auto bg-muted/30">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading tailored resume…
            </div>
          ) : isError || !resume ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="max-w-sm text-sm text-muted-foreground">
                No tailored resume for this job yet. Run “Tailor resume” first.
              </p>
            </div>
          ) : (
            <ResumePreview resume={resume} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
