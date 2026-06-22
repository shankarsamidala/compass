import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  iconClassName?: string;
  iconBgClassName?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

export function CollapsibleSection({
  icon: Icon,
  title,
  iconClassName,
  iconBgClassName,
  defaultOpen = true,
  children,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full cursor-pointer items-center justify-between"
      >
        <h4 className="text-foreground/75 flex items-center gap-2 text-[13px] font-semibold tracking-wider uppercase">
          <div className={cn("bg-coral-100 flex h-6 w-6 items-center justify-center rounded-md", iconBgClassName)}>
            <Icon className={cn("text-brand h-3.5 w-3.5", iconClassName)} />
          </div>
          {title}
          {badge}
        </h4>
        <ChevronDown className={cn("text-muted-foreground h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      <div className={cn("grid transition-all duration-300 ease-in-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
