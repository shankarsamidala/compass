import React from "react";
import ReactDOM from "react-dom/client";
import { Providers } from "@/app/providers";
import { AuthGate } from "@/app/auth-gate";
import { ErrorBoundary } from "@/app/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { initAnalytics } from "@/lib/analytics";
import "./index.css";

initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <AuthGate />
        <Toaster position="top-center" />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>,
);
