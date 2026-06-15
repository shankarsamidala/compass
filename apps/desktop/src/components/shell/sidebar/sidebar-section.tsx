import { useState, type ReactNode } from "react";
import { ArrowDown01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

type SidebarSectionProps = {
  title: string;
  defaultOpen?: boolean;
  onAdd?: () => void;
  children: ReactNode;
};

/** Collapsible sidebar section — label + chevron (+ optional add). */
export function SidebarSection({ title, defaultOpen = true, onAdd, children }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="group/section mt-2 first:mt-1">
      <div className="ml-1 mr-2 flex items-center justify-between py-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-accent hover:text-foreground"
        >
          <span className="text-sm font-normal text-[color-mix(in_srgb,#a8b3cf,transparent_36%)]">{title}</span>
          <Icon
            icon={ArrowDown01Icon}
            size={14}
            className={cn(
              "size-3 text-[color-mix(in_srgb,#a8b3cf,transparent_36%)] transition-transform duration-200",
              open ? "" : "-rotate-90",
            )}
          />
        </button>
        {onAdd ? (
          <button
            onClick={onAdd}
            aria-label={`Add to ${title}`}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon icon={PlusSignIcon} size={16} />
          </button>
        ) : null}
      </div>
      {!!open && <ul className="m-0 list-none p-0">{children}</ul>}
    </div>
  );
}
