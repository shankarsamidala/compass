import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";
import { SETTINGS_TABS, type SettingsTabId } from "./tabs";
import { GeneralPanel } from "./panels/general-panel";
import { AiPanel } from "./panels/ai-panel";
import { JobSearchPanel } from "./panels/job-search-panel";
import { PlaceholderPanel } from "./panels/placeholder-panel";

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTabId>("general");

  return (
    <div className="flex h-full w-full">
      {/* Inner settings sidebar (natively design) */}
      <div className="flex w-[260px] shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="px-3 py-5">
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settings</h2>
          <nav className="space-y-1">
            {SETTINGS_TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  {t.brand ? (
                    <img src={logo} alt="Reinit" draggable={false} className={cn("h-4 w-auto", active ? "" : "opacity-60")} />
                  ) : (
                    <HugeiconsIcon icon={t.icon} size={16} className={active ? "text-brand" : undefined} />
                  )}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <ActivePanel tab={tab} />
      </div>
    </div>
  );
}

function ActivePanel({ tab }: { tab: SettingsTabId }) {
  switch (tab) {
    case "general":
      return <GeneralPanel />;
    case "ai-providers":
      return <AiPanel />;
    case "job-search":
      return <JobSearchPanel />;
    default:
      return <PlaceholderPanel label={SETTINGS_TABS.find((t) => t.id === tab)!.label} />;
  }
}
