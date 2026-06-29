import { useEffect, useState } from "react";
import { useLogout } from "@/features/auth/api";
import { GlobalTopBar } from "@/components/shell/global-top-bar";
import { Sidebar } from "@/components/shell/sidebar/sidebar";
import { PagePlaceholder } from "@/components/shell/page-placeholder";
import { NAV_BY_ID, type ViewId } from "@/components/shell/nav";
import { JobsPage } from "@/features/jobs/jobs-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { ProfilePage } from "@/features/profile/profile-page";
import { useProfileCompletion } from "@/features/profile/use-profile-completion";
import { EvaluationsPage } from "@/features/evaluations/evaluations-page";
import { CommunityPage } from "@/features/community/community-page";
import { AgentTerminal } from "@/features/agent-terminal/agent-terminal";
import type { SettingsTabId } from "@/features/settings/tabs";
import { trackView } from "@/lib/analytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function App() {
  const [view, setView] = useState<ViewId>(() => {
    const saved = localStorage.getItem("compass:active-view");
    return (saved as ViewId | null) ?? "home";
  });
  const [settingsTab, setSettingsTab] = useState<SettingsTabId | undefined>(undefined);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const logout = useLogout();

  // Profile-completion gate: until the profile is 100%, every nav feature page is
  // forced to Profile and the sidebar locks. Settings (not a nav page) stays
  // reachable so the basics can still be filled in.
  const { pct, ready } = useProfileCompletion();
  const profileLocked = ready && pct < 100;
  const activeView: ViewId =
    profileLocked && view !== "profile" && Boolean(NAV_BY_ID[view]) ? "profile" : view;

  useEffect(() => { trackView("home"); }, []);

  const navigateToSettings = (tab: SettingsTabId) => {
    setSettingsTab(tab);
    setView("settings");
    localStorage.setItem("compass:active-view", "settings");
    trackView("settings");
  };

  const handleNavigate = (id: ViewId) => {
    // While the profile is incomplete, block every nav feature page except Profile.
    if (profileLocked && id !== "profile" && NAV_BY_ID[id]) return;
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
          activeView={activeView}
          onNavigate={handleNavigate}
          onLogout={() => setLogoutOpen(true)}
          loggingOut={logout.isPending}
          locked={profileLocked}
        />

        {/* Main — scrollable content. Real pages branch by id; the rest fall back. */}
        <main id="main-content" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {activeView === "jobs" ? (
            <JobsPage />
          ) : activeView === "following" ? (
            <CommunityPage />
          ) : activeView === "happening" ? (
            <CommunityPage />
          ) : activeView === "reports" ? (
            <EvaluationsPage />
          ) : activeView === "settings" ? (
            <SettingsPage defaultTab={settingsTab} />
          ) : activeView === "profile" ? (
            <ProfilePage onNavigateToSettings={navigateToSettings} />
          ) : (
            <PagePlaceholder entry={NAV_BY_ID[activeView]} />
          )}
        </main>

        {/* Agent terminal — right drawer */}
        {terminalOpen && (
          <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-border xl:w-[480px]">
            <AgentTerminal onClose={() => setTerminalOpen(false)} />
          </div>
        )}
      </div>

      {/* Logout confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={(open) => !logout.isPending && setLogoutOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be signed out and returned to the login screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logout.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={logout.isPending}
              onClick={(e) => {
                e.preventDefault();
                logout.mutate();
              }}
            >
              {logout.isPending ? "Signing out…" : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
