import { useEffect, useState } from "react";
import { useLogout } from "@/features/auth/api";
import { GlobalTopBar } from "@/components/shell/global-top-bar";
import { Sidebar } from "@/components/shell/sidebar/sidebar";
import { PagePlaceholder } from "@/components/shell/page-placeholder";
import { NAV_BY_ID, type ViewId } from "@/components/shell/nav";
import { JobsPage } from "@/features/jobs/jobs-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { ProfilePage } from "@/features/profile/profile-page";
import { EvaluationsPage } from "@/features/evaluations/evaluations-page";
import { AgentTerminal } from "@/features/agent-terminal/agent-terminal";
import type { SettingsTabId } from "@/features/settings/tabs";
import { trackView } from "@/lib/analytics";

export default function App() {
  const [view, setView] = useState<ViewId>(() => {
    const saved = localStorage.getItem("compass:active-view");
    return (saved as ViewId | null) ?? "home";
  });
  const [settingsTab, setSettingsTab] = useState<SettingsTabId | undefined>(undefined);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const logout = useLogout();

  useEffect(() => { trackView("home"); }, []);

  const navigateToSettings = (tab: SettingsTabId) => {
    setSettingsTab(tab);
    setView("settings");
    localStorage.setItem("compass:active-view", "settings");
    trackView("settings");
  };

  const handleNavigate = (id: ViewId) => {
    if (id !== "settings") setSettingsTab(undefined);
    setView(id);
    localStorage.setItem("compass:active-view", id);
    trackView(id);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Header (natively GlobalTopBar) — full width, fixed */}
      <GlobalTopBar
        onNavigate={handleNavigate}
        onNavigateToSettings={navigateToSettings}
        onToggleTerminal={() => setTerminalOpen((v) => !v)}
        terminalOpen={terminalOpen}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar — registry-driven, fixed left */}
        <Sidebar
          activeView={view}
          onNavigate={handleNavigate}
          onLogout={() => logout.mutate()}
          loggingOut={logout.isPending}
        />

        {/* Main — scrollable content. Real pages branch by id; the rest fall back. */}
        <main id="main-content" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {view === "jobs" ? (
            <JobsPage />
          ) : view === "reports" ? (
            <EvaluationsPage />
          ) : view === "settings" ? (
            <SettingsPage defaultTab={settingsTab} />
          ) : view === "profile" ? (
            <ProfilePage onNavigateToSettings={navigateToSettings} />
          ) : (
            <PagePlaceholder entry={NAV_BY_ID[view]} />
          )}
        </main>

        {/* Agent terminal — right drawer */}
        {terminalOpen && (
          <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-border xl:w-[480px]">
            <AgentTerminal onClose={() => setTerminalOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
