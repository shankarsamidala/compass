import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS, LOGOUT_TAB, SETTINGS_TABS, type SettingsTabId } from "./tabs";
import { GeneralPanel } from "./panels/general-panel";
import { AiPanel } from "./panels/ai-panel";
import { JobSearchPanel } from "./panels/job-search-panel";
import { PlaceholderPanel } from "./panels/placeholder-panel";
import { WorkExperiencePanel } from "./panels/work-experience-panel";
import { ProfilePanel } from "./panels/profile-panel";
import { EducationPanel } from "./panels/education-panel";
import { CertificationsPanel } from "./panels/certifications-panel";
import { ProjectsPanel } from "./panels/projects-panel";
import { CliPanel } from "./panels/cli-panel";

// External link icon (matches daily.dev's arrow-out-of-box style)
function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-auto shrink-0 text-muted-foreground/40 pointer-events-none">
      <path d="M7.751 7c.412 0 .747.334.747.747a.74.74 0 01-.64.734l-.105.006h-.769l-.108.004-.128.009c-.646 0-1.178.491-1.242 1.12l-.006.128v7.502c0 .647.492 1.18 1.122 1.244l.128.006h7.498a1.25 1.25 0 001.243-1.122l.007-1.128a.75.75 0 011.5 0v1a2.75 2.75 0 01-2.583 2.745l-.167.005H6.75a2.75 2.75 0 01-2.745-2.582L4 17.25V9.748A2.748 2.748 0 016.748 7H7.75zm11.497-3a.75.75 0 01.75.75v7a.75.75 0 11-1.5 0V6.559L12 13.059a.75.75 0 01-1.06-1.061L17.435 5.5h-5.188a.75.75 0 110-1.5h7z" fillRule="evenodd" />
    </svg>
  );
}

function NavItem({
  tab,
  active,
  onClick,
}: {
  tab: { id: string; label: string; icon: Parameters<typeof HugeiconsIcon>[0]["icon"]; brand?: boolean; external?: boolean };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full cursor-pointer items-center gap-2 rounded-xl px-1 text-left text-sm transition-colors",
        active
          ? "bg-accent text-primary font-medium"
          : "text-foreground hover:bg-accent/60 hover:text-primary",
      )}
    >
      {tab.brand ? (
        <img src={logo} alt="Reinit" draggable={false} className={cn("h-4 w-auto shrink-0", active ? "" : "opacity-50")} />
      ) : (
        <HugeiconsIcon icon={tab.icon} size={18} className="shrink-0 pointer-events-none" />
      )}
      <span className="flex-1 truncate">{tab.label}</span>
      {tab.external && <ExternalIcon />}
    </button>
  );
}

export function SettingsPage({ defaultTab }: { defaultTab?: SettingsTabId }) {
  const [tab, setTab] = useState<SettingsTabId>(defaultTab ?? "general");

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-5xl gap-6 px-6 pb-12 pt-8">

        {/* ── Left nav ─────────────────────────────────────────────────────── */}
        <aside className="w-64 shrink-0 self-start">
          <div className="flex flex-col gap-2 rounded-xl border border-border p-2">

            {/* User header */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl px-1 py-1 hover:bg-accent/60 transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-xs font-bold text-brand">
                S
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <p className="truncate text-sm font-semibold leading-none text-white">ShankR</p>
                <p className="truncate text-xs leading-none text-foreground">@sami2911</p>
              </div>
              <ExternalIcon />
            </button>

            <div className="border-t border-border/50" />

            {/* Nav sections */}
            <nav className="flex flex-col gap-3">
              {SETTINGS_SECTIONS.map((section, si) => (
                <div key={si} className="flex flex-col gap-0.5">
                  {section.label && (
                    <p className="px-1 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      {section.label}
                    </p>
                  )}
                  {section.tabs.map((t) => (
                    <NavItem
                      key={t.id}
                      tab={t}
                      active={tab === t.id}
                      onClick={() => setTab(t.id as SettingsTabId)}
                    />
                  ))}
                  {si < SETTINGS_SECTIONS.length - 1 && (
                    <div className="mt-2 border-t border-border/50" />
                  )}
                </div>
              ))}

              {/* Log out */}
              <div className="border-t border-border/50" />
              <button
                type="button"
                className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-xl px-1 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                <HugeiconsIcon icon={LOGOUT_TAB.icon} size={18} className="shrink-0 pointer-events-none" />
                <span>{LOGOUT_TAB.label}</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {tab === "profile" ? (
          <ProfilePanel />
        ) : tab === "work-experience" ? (
          <WorkExperiencePanel />
        ) : tab === "education" ? (
          <EducationPanel />
        ) : tab === "certifications" ? (
          <CertificationsPanel />
        ) : tab === "projects" ? (
          <ProjectsPanel />
        ) : (
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
            {/* Title bar */}
            <div className="flex h-14 w-full shrink-0 items-center border-b border-border bg-background px-6">
              <h2 className="text-base font-bold text-white">
                {SETTINGS_TABS.find((t) => t.id === tab)?.label ?? tab}
              </h2>
            </div>
            {/* Panel content */}
            <section className="flex w-full flex-col overflow-x-hidden p-6">
              <ActivePanel tab={tab} />
            </section>
          </main>
        )}
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
    case "reinit-api":
      return <CliPanel />;
    default:
      return <PlaceholderPanel label={SETTINGS_TABS.find((t) => t.id === tab)?.label ?? tab} />;
  }
}
