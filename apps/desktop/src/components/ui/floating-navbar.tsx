import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Live left/width of the content area (#main-content) so the bar centers over the
 *  page content, not the whole viewport. Tracks sidebar collapse + drawer toggles. */
function useContentRect(active: boolean) {
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    if (!active) return;
    const el = document.getElementById("main-content");
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, width: r.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [active]);
  return rect;
}

export type FloatingNavItem = {
  name: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "brand" | "danger";
};

/**
 * Floating action bar — a light, segmented pill (shadcn data-table style): a leading
 * label + close, a divider, then icon+text actions. Animates in when `visible`, portaled
 * to <body> so `fixed` anchors to the viewport regardless of transformed ancestors.
 */
export function FloatingNav({
  navItems,
  visible,
  label,
  onClose,
  className,
}: {
  navItems: FloatingNavItem[];
  visible: boolean;
  /** Leading context label (e.g. the active row's company). */
  label?: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const rect = useContentRect(visible);
  return createPortal(
    <div
      className="pointer-events-none fixed bottom-8 z-[120] flex justify-center px-4"
      style={rect ? { left: rect.left, width: rect.width } : { left: 0, right: 0 }}
    >
      <AnimatePresence>
        {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "pointer-events-auto flex w-fit items-center gap-1 rounded-xl border border-border bg-popover px-1.5 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
            className,
          )}
        >
          {(label || onClose) && (
            <>
              <div className="flex items-center gap-1.5 py-0.5 pl-2 pr-1">
                {label && <span className="text-sm font-medium text-foreground">{label}</span>}
                {onClose && (
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <span className="mx-0.5 h-5 w-px bg-border" />
            </>
          )}
          {navItems.map((item, i) => (
            <button
              key={i}
              type="button"
              disabled={item.disabled}
              onClick={item.onClick}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
                item.variant === "brand"
                  ? "text-brand hover:bg-brand/10"
                  : item.variant === "danger"
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground hover:bg-accent",
              )}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
