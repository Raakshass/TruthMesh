/* ── Entry Point ──────────────────────────────────────────────────── */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        style: {
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
        },
      }}
    />
    <App />
  </StrictMode>
);
