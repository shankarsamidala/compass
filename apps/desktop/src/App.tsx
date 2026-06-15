import { useState } from "react";
import { useLogout } from "@/features/auth/api";
import { GlobalTopBar } from "@/components/shell/global-top-bar";
import { Sidebar } from "@/components/shell/sidebar/sidebar";
import { PagePlaceholder } from "@/components/shell/page-placeholder";
import { NAV_BY_ID, type ViewId } from "@/components/shell/nav";
import { JobsPage } from "@/features/jobs/jobs-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { ProfilePage } from "@/features/profile/profile-page";

export default function App() {
  const [view, setView] = useState<ViewId>("home");
  const logout = useLogout();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Header (natively GlobalTopBar) — full width, fixed */}
      <GlobalTopBar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar — registry-driven, fixed left */}
        <Sidebar
          activeView={view}
          onNavigate={setView}
          onLogout={() => logout.mutate()}
          loggingOut={logout.isPending}
        />

        {/* Main — scrollable content. Real pages branch by id; the rest fall back. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {view === "jobs" ? (
            <JobsPage />
          ) : view === "settings" ? (
            <SettingsPage />
          ) : view === "profile" ? (
            <ProfilePage />
          ) : (
            <PagePlaceholder entry={NAV_BY_ID[view]} />
          )}
        </main>
      </div>
    </div>
  );
}
