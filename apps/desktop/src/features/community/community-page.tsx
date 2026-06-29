import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

/**
 * Network hub (social / LinkedIn-style). Clean empty state for now — the
 * people-list + filters land here next.
 */
export function CommunityPage() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <HugeiconsIcon icon={UserGroupIcon} size={56} strokeWidth={1.5} className="text-muted-foreground/50" />
      <h2 className="text-2xl font-bold tracking-tight">Nothing to See Here — Yet!</h2>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Your feed is empty because you haven't followed any People or Companies, or there is not enough
        content. Explore more People and Companies.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="bg-brand font-semibold text-brand-foreground hover:bg-brand-hover">
          Find People
        </Button>
        <Button size="lg" variant="outline" className="hover:border-brand hover:ring-1 hover:ring-brand">
          Discover Companies
        </Button>
      </div>
    </div>
  );
}
