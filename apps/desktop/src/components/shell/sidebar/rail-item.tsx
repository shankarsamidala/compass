import type { ReactNode } from "react";
import { Icon, type IconSvgElement } from "./icon";
import { cn } from "@/lib/utils";

type RailItemProps = {
  collapsed: boolean;
  icon: IconSvgElement;
  label: string;
  right?: ReactNode;
  active?: boolean;
  onClick?: () => void;
};

/** Sidebar row — icon in a square slot + truncating label. */
export function RailItem({ collapsed, icon, label, right, active, onClick }: RailItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "ml-2 mr-1 flex h-8 items-center overflow-hidden rounded-lg text-sm transition-colors",
        collapsed ? "w-auto justify-center" : "w-[calc(100%-0.75rem)]",
        active
          ? "bg-sidebar-accent text-primary"
          : "text-foreground hover:bg-sidebar-accent hover:text-primary",
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center">
        <Icon icon={icon} size={16} />
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          {right ? <span className="pr-3">{right}</span> : <span className="pr-3" />}
        </>
      )}
    </button>
  );
}
