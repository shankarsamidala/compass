import type { ReactNode } from "react";
import logo from "@/assets/logo.svg";

const DOTS = "radial-gradient(circle, var(--border) 1.5px, transparent 1.5px)";

export const openExternal = (url: string) => {
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    /* no-op */
  }
};

interface Brand {
  lead: string;
  accent: string;
  subtitle: string;
}
const DEFAULT_BRAND: Brand = {
  lead: "Your AI workspace,",
  accent: "built for focus.",
  subtitle:
    "Chat, files, projects, and connectors — one calm surface. Designed to stay out of your way.",
};

/**
 * Shared auth/onboarding shell — natively's two-column design (light form right,
 * dark brand panel left), tokenized + radix-maia. Parametrized so auth and
 * onboarding reuse it (width, brand copy, a top-right slot, optional footer).
 */
export function AuthLayout({
  children,
  maxWidthClass = "max-w-sm",
  topRight,
  brand = DEFAULT_BRAND,
  footer = true,
}: {
  children: ReactNode;
  maxWidthClass?: string;
  topRight?: ReactNode;
  brand?: Brand;
  footer?: boolean;
}) {
  return (
    <div className="grid h-svh grid-cols-1 overflow-hidden bg-background text-foreground lg:grid-cols-2">
      {/* Form column — right at lg+ (light). Only this column scrolls. */}
      <div className="relative flex flex-col gap-4 overflow-y-auto bg-background p-6 pb-3 md:p-10 md:pb-4 lg:order-2">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ backgroundImage: DOTS, backgroundSize: "28px 28px" }}
        />

        <div className="relative flex items-center justify-between gap-4">
          <button type="button" onClick={() => openExternal("https://reinit.in")} className="flex items-center gap-2">
            <img src={logo} alt="Reinit logo" className="h-7 w-auto" />
            <span className="text-xl font-bold">reinit.in</span>
          </button>
          {topRight}
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div className={"w-full " + maxWidthClass}>{children}</div>
        </div>

        {footer && (
          <div className="relative hidden border-t pt-3 sm:block">
            <div className="flex flex-row items-center gap-4">
              <div className="flex-1">
                <button type="button" onClick={() => openExternal("https://reinit.in")} className="inline-flex items-center gap-1.5">
                  <img src={logo} alt="Reinit logo" className="h-5 w-auto" />
                  <span className="text-sm font-bold">reinit.in</span>
                </button>
              </div>
              <div className="flex-1 text-center text-sm font-medium text-muted-foreground">
                © {new Date().getFullYear()} reinit
              </div>
              <div className="flex flex-1 items-center justify-end gap-4 text-sm font-medium text-muted-foreground">
                <button type="button" onClick={() => openExternal("https://reinit.in/privacy")} className="transition-colors hover:text-foreground">
                  Privacy
                </button>
                <button type="button" onClick={() => openExternal("https://reinit.in/terms")} className="transition-colors hover:text-foreground">
                  Terms
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Brand panel — left at lg+ (dark scope) */}
      <div className="dark relative hidden flex-col items-center justify-center overflow-hidden bg-background lg:order-1 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{ backgroundImage: DOTS, backgroundSize: "28px 28px" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 40%, var(--background) 100%)" }}
        />
        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="mb-6 flex justify-center">
            <img src={logo} alt="Reinit logo" className="h-12 w-auto" />
          </div>
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            {brand.lead}
            <br />
            <span className="text-brand">{brand.accent}</span>
          </h2>
          <p className="text-base text-muted-foreground">{brand.subtitle}</p>
        </div>
      </div>
    </div>
  );
}
