import { useState } from "react";
import { LogoutCircle01Icon, SidebarLeft01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";
import { RailItem } from "./rail-item";
import { SidebarSection } from "./sidebar-section";
import { NAV_GROUPS, type ViewId } from "../nav";

type SidebarProps = {
  activeView: ViewId;
  onNavigate: (id: ViewId) => void;
  onLogout?: () => void;
  loggingOut?: boolean;
};

export function Sidebar({ activeView, onNavigate, onLogout, loggingOut }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const railRow = (id: ViewId, key?: React.Key) => {
    const it = NAV_GROUPS.flatMap((g) => g.items).find((x) => x.id === id)!;
    return (
      <RailItem
        key={key ?? id}
        collapsed={collapsed}
        icon={it.icon}
        label={it.label}
        active={activeView === id}
        onClick={() => onNavigate(id)}
      />
    );
  };

  return (
    <aside
      className={cn(
        "shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out",
        collapsed ? "w-14" : "w-[260px]",
      )}
    >
      <div className={cn("flex h-full flex-col", collapsed ? "w-14" : "w-[260px]")}>
        <SidebarHeader collapsed={collapsed} onToggle={setCollapsed} />

        <div
          className={cn(
            "flex-1 overflow-y-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            collapsed ? "px-1" : "px-2",
          )}
        >
          {collapsed ? (
            <nav className="mt-1 flex flex-col">
              {NAV_GROUPS.flatMap((g) => g.items).map((it) => railRow(it.id))}
            </nav>
          ) : (
            NAV_GROUPS.map((g, gi) =>
              g.title ? (
                <SidebarSection key={g.title} title={g.title} defaultOpen={g.defaultOpen}>
                  {g.items.map((it) => railRow(it.id))}
                </SidebarSection>
              ) : (
                <nav key={`g-${gi}`} className={cn("flex flex-col", gi === 0 ? "mb-1" : "mt-1")}>
                  {g.items.map((it) => railRow(it.id))}
                </nav>
              ),
            )
          )}
        </div>

        {/* Bottom — Log out */}
        <div className={cn("border-t border-sidebar-border py-2", collapsed ? "px-1" : "px-2")}>
          <button
            onClick={onLogout}
            disabled={loggingOut}
            title={collapsed ? "Log out" : undefined}
            className={cn(
              "ml-2 mr-1 flex h-8 items-center rounded-lg text-sm text-foreground transition-colors hover:bg-sidebar-accent hover:text-primary disabled:opacity-50",
              collapsed ? "w-auto justify-center" : "w-[calc(100%-0.75rem)] px-2",
            )}
          >
            {collapsed ? (
              <span className="flex size-7 shrink-0 items-center justify-center">
                <Icon icon={LogoutCircle01Icon} size={16} />
              </span>
            ) : (
              <>
                <span className="flex-1 truncate text-left">{loggingOut ? "Signing out…" : "Log out"}</span>
                <Icon icon={LogoutCircle01Icon} size={16} className="shrink-0" />
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarHeader({ collapsed, onToggle }: { collapsed: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className={cn("flex items-center pb-2 pt-3", collapsed ? "justify-center px-1" : "justify-between px-2")}>
      {collapsed ? (
        <button
          onClick={() => onToggle(false)}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-accent"
          aria-label="Expand sidebar"
        >
          <Icon icon={SidebarLeft01Icon} size={18} className="text-foreground" />
        </button>
      ) : (
        <>
          <span className="px-2 text-sm font-medium text-muted-foreground">Menu</span>
          <button
            onClick={() => onToggle(true)}
            className="flex size-7 items-center justify-center rounded-lg hover:bg-accent"
            aria-label="Collapse sidebar"
          >
            <Icon icon={SidebarLeft01Icon} size={18} className="text-foreground" />
          </button>
        </>
      )}
    </div>
  );
}
