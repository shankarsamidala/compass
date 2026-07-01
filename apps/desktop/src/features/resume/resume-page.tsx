import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumePreview, buildResumeHTML } from "./resume-template";
import { useResumeData } from "./use-resume-data";
import { downloadPdf } from "./download-pdf";

export function ResumePage() {
  const { resume, isLoading, isEmpty } = useResumeData();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const html = buildResumeHTML(resume, "pdf");
      const name = resume.name.replace(/\s+/g, "_").toLowerCase() || "reinit";
      await downloadPdf(html, `resume_${name}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <div className="shrink-0 border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground sm:flex">
              <FileText className="h-4 w-4 text-background" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground sm:text-base">My Resume</h1>
              <p className="truncate text-[11px] text-muted-foreground">
                {resume.name} — A4, ATS-optimized
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={download}
            disabled={downloading || isLoading || isEmpty}
            className="shrink-0 gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="scrollbar-hide flex-1 overflow-y-auto bg-muted/30">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your resume…
          </div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground">Your resume is empty</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Add your experience, education, projects, and skills from the Profile page and
              they'll appear here automatically.
            </p>
          </div>
        ) : (
          <ResumePreview resume={resume} />
        )}
      </div>
    </div>
  );
}
