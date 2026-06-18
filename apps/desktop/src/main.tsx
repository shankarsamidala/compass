import React from "react";
import ReactDOM from "react-dom/client";
import { Providers } from "@/app/providers";
import { AuthGate } from "@/app/auth-gate";
import { initAnalytics } from "@/lib/analytics";
import "./index.css";

initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <AuthGate />
    </Providers>
  </React.StrictMode>,
);
