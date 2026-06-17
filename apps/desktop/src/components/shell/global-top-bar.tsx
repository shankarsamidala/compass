import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Briefcase06Icon,
  Notification01Icon,
  Sun02Icon,
  Moon01Icon,
  Fire02Icon,
  HexagonIcon,
} from "@hugeicons/core-free-icons";
import logo from "@/assets/logo.svg";

const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

/**
 * Global top bar — ported from natively's GlobalTopBar, tokenized (no hardcoded
 * hex). Compact at the default 1200px window; scales up at `xl` (≥1280px).
 * Right-side actions are placeholders for now (same as the source).
 */
export function GlobalTopBar() {
  const [isDark, setIsDark] = useState(true);

  return (
    <header
      className={
        "drag-region sticky top-0 z-[100] flex h-11 shrink-0 select-none items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 xl:h-14 xl:gap-3 xl:px-4 " +
        (isMac ? "pl-[78px]" : "")
      }
    >
      {/* Logo */}
      <button aria-label="Home" className="no-drag flex shrink-0 items-center gap-1.5">
        <img src={logo} alt="Compass" className="h-6 w-auto xl:h-7" draggable="false" />
        <span className="text-base font-bold tracking-tight xl:text-xl">reinit.ai</span>
      </button>

      {/* Search (centered) */}
      <div className="no-drag absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          type="button"
          aria-label="Open search"
          className="relative flex h-8 w-[20rem] max-w-[24rem] items-center overflow-hidden rounded-lg border border-sidebar-border bg-card px-2.5 text-left transition-colors hover:bg-accent xl:h-11 xl:w-[26rem] xl:max-w-[30rem] xl:rounded-xl xl:px-3"
        >
          <HugeiconsIcon icon={Search01Icon} size={16} className="mr-2 shrink-0 text-muted-foreground xl:mr-3" />
          <span className="min-w-0 flex-1 text-[13px] text-muted-foreground xl:text-sm">Search</span>
          <span className="flex items-center gap-1">
            <kbd className="flex min-w-4 justify-center rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 text-[10px] text-muted-foreground xl:min-w-5 xl:rounded-md xl:px-2 xl:text-xs">
              ⌘
            </kbd>
            <span className="text-[10px] text-muted-foreground xl:text-xs">+</span>
            <kbd className="flex min-w-4 justify-center rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 text-[10px] text-muted-foreground xl:min-w-5 xl:rounded-md xl:px-2 xl:text-xs">
              K
            </kbd>
          </span>
        </button>
      </div>

      {/* Right actions */}
      <div className="no-drag ml-auto flex items-center justify-end gap-2 xl:gap-3">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setIsDark((v) => !v)}
          aria-label="Toggle theme"
          className={
            "flex size-7 items-center justify-center rounded-lg border text-foreground transition-colors hover:bg-accent xl:size-9 xl:rounded-xl " +
            (isDark ? "border-brand/45" : "border-sidebar-border")
          }
        >
          <HugeiconsIcon
            icon={isDark ? Sun02Icon : Moon01Icon}
            size={15}
            className={(isDark ? "text-brand " : "") + "xl:!size-[19px]"}
          />
        </button>

        {/* Jobs */}
        <button
          aria-label="Jobs"
          className="flex size-7 items-center justify-center rounded-lg border border-sidebar-border text-foreground transition-colors hover:bg-accent xl:size-9 xl:rounded-xl"
        >
          <HugeiconsIcon icon={Briefcase06Icon} size={15} className="xl:!size-[19px]" />
        </button>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative flex size-7 items-center justify-center rounded-lg border border-sidebar-border text-foreground transition-colors hover:bg-accent xl:size-9 xl:rounded-xl"
        >
          <HugeiconsIcon icon={Notification01Icon} size={15} className="xl:!size-[19px]" />
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded bg-destructive px-1 text-[9px] font-medium text-white xl:-right-1.5 xl:-top-1.5 xl:min-h-5 xl:min-w-5 xl:rounded-md xl:text-[10px]">
            8
          </span>
        </button>

        {/* Streak / cores group */}
        <div className="flex h-7 items-stretch overflow-hidden rounded-lg border border-sidebar-border bg-card xl:h-9 xl:rounded-xl">
          <button
            type="button"
            aria-label="Current streak"
            className="flex items-center gap-1 pl-1.5 pr-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent xl:text-xs"
          >
            <HugeiconsIcon icon={Fire02Icon} size={15} className="text-brand xl:!size-[18px]" />
            <span>1</span>
          </button>
          <button
            aria-label="Cores"
            className="flex items-center gap-1 pl-1.5 pr-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent xl:text-xs"
          >
            <HugeiconsIcon icon={HexagonIcon} size={15} className="text-sidebar-primary xl:!size-[18px]" />
            <span>0</span>
          </button>
        </div>

        {/* Profile */}
        <button aria-label="Profile" className="flex shrink-0">
          <span className="flex size-7 items-center justify-center rounded-lg border border-brand/30 bg-brand/15 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/25 xl:size-9 xl:rounded-xl xl:text-sm">
            ST
          </span>
        </button>
      </div>
    </header>
  );
}
