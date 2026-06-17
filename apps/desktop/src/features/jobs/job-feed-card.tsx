import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  MapPinpointIcon,
  DollarCircleIcon,
  ArrowBigUpDashIcon,
  ArrowBigDownDashIcon,
  Bookmark01Icon,
  SentIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { FeedJob } from "@compass/ipc-contract";

/** Qualitative relevance band from the embedding score (not a number). */
function fitBand(score: number): { label: string; className: string } {
  if (score >= 70) return { label: "Strong match", className: "bg-emerald-500/15 text-emerald-400" };
  if (score >= 40) return { label: "Fair match", className: "bg-amber-500/15 text-amber-400" };
  return { label: "Weak match", className: "bg-muted text-muted-foreground" };
}

/** Strip HTML tags + collapse whitespace from a JD blurb. */
function plainText(s?: string | null): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Relative "x days ago" from an ISO date. */
function ago(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  const days = Math.floor((Date.now() - d) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function JobFeedCard({ job, onClick }: { job: FeedJob; onClick?: () => void }) {
  const scored = job.score != null;
  const posted = ago(job.postedAt);

  const locParts = job.location
    ? job.location.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const locationText = locParts.length > 1 ? `${locParts[0]} +${locParts.length - 1}` : locParts[0] ?? null;

  const meta = [
    locationText && { icon: MapPinpointIcon, text: locationText },
    { icon: DollarCircleIcon, text: "Not disclosed" },
  ].filter(Boolean) as { icon: IconSvgElement; text: string }[];

  const blurb = plainText(job.jd);

  return (
    <article className="group relative flex flex-col rounded-xl border-[1.5px] border-border bg-card transition-colors hover:border-brand">
      {/* Whole-card click overlay */}
      <button type="button" onClick={onClick} aria-label={`Open ${job.title}`} className="absolute inset-0 z-0 rounded-xl" />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-3.5 px-5 pb-5 pt-4">
          {/* Title + company + fit band */}
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-lg font-semibold leading-snug text-white">{job.title}</p>
              <p className="text-xs leading-normal text-foreground">
                {job.company}
                {posted ? <span> · {posted}</span> : null}
              </p>
            </div>
            {scored ? (
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", fitBand(job.score!).className)}>
                {fitBand(job.score!).label}
              </span>
            ) : null}
          </div>

          {/* Meta chips */}
          {meta.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {meta.map((m) => (
                <div
                  key={m.text}
                  className="flex items-center gap-1 rounded border border-border px-1.5 py-px text-[10px] text-foreground"
                >
                  <HugeiconsIcon icon={m.icon} size={10} className="shrink-0" />
                  <span className="whitespace-nowrap">{m.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* JD blurb (HTML stripped, clamped) */}
          {blurb ? <p className="line-clamp-2 text-sm leading-relaxed text-foreground">{blurb}</p> : null}
        </div>

        {/* Footer action bar */}
        <footer className="pointer-events-auto flex items-center gap-2 border-t border-border px-3 py-2">
          <CardAction icon={ArrowBigUpDashIcon} label="Upvote" />
          <CardAction icon={ArrowBigDownDashIcon} label="Downvote" />
          <CardAction icon={Bookmark01Icon} label="Save" />
          <CardAction icon={SentIcon} label="Share" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-brand px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Insights
            <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
          </button>
        </footer>
      </div>
    </article>
  );
}

function CardAction({ icon, label }: { icon: IconSvgElement; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => e.stopPropagation()}
      className="flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent hover:text-white"
    >
      <HugeiconsIcon icon={icon} size={18} />
    </button>
  );
}
