import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, MapPinpointIcon, Link01Icon, Building06Icon } from "@hugeicons/core-free-icons";
import { Loader2 } from "lucide-react";
import { useJob } from "./api";

function plainText(s?: string | null): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Read-only job detail slide-over (Phase 1). Opens when jobId is set. */
export function JobDetail({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const { data: job, isLoading, error } = useJob(jobId);

  // Close on Escape.
  useEffect(() => {
    if (!jobId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jobId, onClose]);

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-medium text-muted-foreground">Job details</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error || !job ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">Couldn't load this job.</p>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <HugeiconsIcon icon={Building06Icon} size={14} /> {job.company}
                  </span>
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <HugeiconsIcon icon={MapPinpointIcon} size={14} /> {job.location}
                    </span>
                  )}
                  {job.source && <span className="capitalize">· {job.source}</span>}
                </div>
              </div>

              {job.jobUrl && (
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <HugeiconsIcon icon={Link01Icon} size={15} />
                  View original posting
                </a>
              )}

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-foreground">Description</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {plainText(job.jd) || "No description available for this posting."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
