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

/**
 * Shared auth/onboarding shell — single full-screen dark surface with the content
 * centered (no two-column split). Tokenized + radix-nova. Parametrized so auth and
 * onboarding reuse it (width, brand copy, a top-right slot, optional footer).
 */
export function AuthLayout({
  children,
  maxWidthClass = "max-w-sm",
  topRight,
}: {
  children: ReactNode;
  maxWidthClass?: string;
  topRight?: ReactNode;
}) {
  return (
    <div className="dark relative flex h-svh flex-col overflow-hidden bg-background text-foreground">
      {/* dotted texture + soft center vignette */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ backgroundImage: DOTS, backgroundSize: "28px 28px" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 45%, var(--background) 100%)" }}
      />

      {/* Top bar — logo + optional right slot */}
      <div className="relative flex items-center justify-between gap-4 p-6 md:p-8">
        <button type="button" onClick={() => openExternal("https://reinit.in")} className="flex items-center gap-2">
          <img src={logo} alt="Reinit logo" className="h-7 w-auto" />
          <span className="text-xl font-bold">reinit.in</span>
        </button>
        {topRight}
      </div>

      {/* Centered content */}
      <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
        <div className={"mx-auto w-full " + maxWidthClass}>{children}</div>
      </div>
    </div>
  );
}
