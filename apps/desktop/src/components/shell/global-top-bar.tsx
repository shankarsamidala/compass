import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Notification01Icon,
  Settings01Icon,
  Fire02Icon,
  HexagonIcon,
  Target02Icon,
  ChatSpark01Icon,
} from "@hugeicons/core-free-icons";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";

const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

export function GlobalTopBar({
  onNavigate,
  onNavigateToSettings,
  onToggleTerminal,
  terminalOpen,
}: {
  onNavigate: (view: string) => void;
  onNavigateToSettings: (tab: string) => void;
  onToggleTerminal: () => void;
  terminalOpen: boolean;
}) {
  return (
    <header
      className={
        "drag-region sticky top-0 z-[100] flex h-9 shrink-0 select-none items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 xl:h-14 xl:gap-3 xl:px-4 " +
        (isMac ? "pl-[78px]" : "")
      }
    >
      {/* Logo */}
      <button aria-label="Home" className="no-drag ml-2 flex shrink-0 items-center gap-1.5 xl:ml-3">
        <img src={logo} alt="Compass" className="h-4 w-auto xl:h-6" draggable="false" />
        <span className="text-sm font-bold tracking-tight xl:text-lg">reinit.ai</span>
      </button>

      {/* Search (centered) */}
      <div className="no-drag absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          type="button"
          aria-label="Open search"
          className="relative flex h-6 w-[16rem] max-w-[20rem] items-center overflow-hidden rounded-lg border border-sidebar-border bg-transparent px-2.5 text-left transition-colors hover:bg-[#1e2229] xl:h-9 xl:w-[22rem] xl:max-w-[26rem] xl:rounded-xl xl:px-3"
        >
          <HugeiconsIcon icon={Search01Icon} size={14} className="mr-2 shrink-0 text-muted-foreground xl:mr-3" />
          <span className="min-w-0 flex-1 text-[13px] text-muted-foreground xl:text-sm">Search</span>
          <span className="flex items-center gap-1">
            <kbd className="flex min-w-3.5 justify-center rounded border border-sidebar-border bg-sidebar px-1 py-0 text-[9px] text-muted-foreground xl:min-w-5 xl:rounded-md xl:px-2 xl:text-xs">
              ⌘
            </kbd>
            <span className="text-[9px] text-muted-foreground xl:text-xs">+</span>
            <kbd className="flex min-w-3.5 justify-center rounded border border-sidebar-border bg-sidebar px-1 py-0 text-[9px] text-muted-foreground xl:min-w-5 xl:rounded-md xl:px-2 xl:text-xs">
              K
            </kbd>
          </span>
        </button>
      </div>

      {/* Right actions */}
      <div className="no-drag ml-auto flex items-center justify-end gap-2 xl:gap-3">
        {/* Agent terminal toggle */}
        <button
          aria-label="Agent terminal"
          onClick={onToggleTerminal}
          className={cn(
            "flex size-6 items-center justify-center rounded-lg border transition-colors xl:size-9 xl:rounded-xl",
            terminalOpen
              ? "border-brand/40 bg-brand/10 text-brand"
              : "border-sidebar-border text-foreground hover:bg-accent",
          )}
        >
          <HugeiconsIcon icon={ChatSpark01Icon} size={13} className="xl:!size-[19px]" />
        </button>

        {/* Job preferences */}
        <button
          aria-label="Job preferences"
          onClick={() => onNavigateToSettings("job-search")}
          className="flex size-6 items-center justify-center rounded-lg border border-sidebar-border text-foreground transition-colors hover:bg-accent xl:size-9 xl:rounded-xl"
        >
          <HugeiconsIcon icon={Target02Icon} size={13} className="xl:!size-[19px]" />
        </button>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative flex size-6 items-center justify-center rounded-lg border border-sidebar-border text-foreground transition-colors hover:bg-accent xl:size-9 xl:rounded-xl"
        >
          <HugeiconsIcon icon={Notification01Icon} size={13} className="xl:!size-[19px]" />
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded bg-destructive px-1 text-[9px] font-medium text-bg-elevated xl:-right-1.5 xl:-top-1.5 xl:min-h-5 xl:min-w-5 xl:rounded-md xl:text-[10px]">
            8
          </span>
        </button>

        {/* Settings */}
        <button
          aria-label="Settings"
          onClick={() => onNavigate("settings")}
          className="flex size-6 items-center justify-center rounded-lg border border-sidebar-border text-foreground transition-colors hover:bg-accent xl:size-9 xl:rounded-xl"
        >
          <HugeiconsIcon icon={Settings01Icon} size={13} className="xl:!size-[19px]" />
        </button>

        {/* Streak / cores group */}
        <div className="flex h-6 items-stretch overflow-hidden rounded-lg border border-sidebar-border bg-card xl:h-9 xl:rounded-xl">
          <button
            type="button"
            aria-label="Current streak"
            className="flex items-center gap-1 pl-1.5 pr-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent xl:text-xs"
          >
            <HugeiconsIcon icon={Fire02Icon} size={13} className="text-brand xl:!size-[18px]" />
            <span>1</span>
          </button>
          <button
            aria-label="Cores"
            className="flex items-center gap-1 pl-1.5 pr-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent xl:text-xs"
          >
            <HugeiconsIcon icon={HexagonIcon} size={13} className="text-sidebar-primary xl:!size-[18px]" />
            <span>0</span>
          </button>
        </div>

        {/* Profile */}
        <button aria-label="Profile" className="flex shrink-0">
          <span className="flex size-6 items-center justify-center rounded-lg border border-brand/30 bg-brand/15 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/25 xl:size-9 xl:rounded-xl xl:text-sm">
            ST
          </span>
        </button>
      </div>
    </header>
  );
}
