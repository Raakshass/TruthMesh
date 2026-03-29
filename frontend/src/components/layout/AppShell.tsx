/* ── App Shell: Sidebar + Main Content — Premium ──────────────────── */
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ChevronRight, Command } from "lucide-react";
import { Sidebar } from "./Sidebar";

const PAGE_META: Record<string, { title: string; breadcrumb: string }> = {
  "/": { title: "Dashboard", breadcrumb: "Dashboard" },
  "/pipeline": { title: "Verification Pipeline", breadcrumb: "Pipeline" },
  "/audit": { title: "Audit Log", breadcrumb: "Audit Log" },
  "/settings": { title: "Settings", breadcrumb: "Settings" },
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const meta = PAGE_META[location.pathname] ?? {
    title: "TruthMesh",
    breadcrumb: "Page",
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <header className="glass fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-1.5 transition-colors hover:bg-container"
        >
          <Menu size={22} className="text-on-surface" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 items-center justify-center rounded-md"
            style={{ background: "linear-gradient(135deg, #003ec7, #0052ff)" }}
          >
            <span className="text-[10px] font-black text-white">T</span>
          </div>
          <span className="text-sm font-extrabold tracking-tight text-on-surface">
            TruthMesh
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-container-low px-2 py-1 text-[10px] font-medium text-outline">
          <Command size={10} />
          <span>K</span>
        </div>
      </header>

      {/* Main area */}
      <div className="transition-[margin] duration-300 lg:ml-60">
        {/* Breadcrumb Bar (desktop only) */}
        <div className="hidden items-center gap-2 border-b border-outline-variant/15 px-8 py-3 lg:flex">
          <span className="text-[11px] font-medium text-outline">
            TruthMesh
          </span>
          <ChevronRight size={12} className="text-outline-variant" />
          <span className="text-[11px] font-bold text-on-surface">
            {meta.breadcrumb}
          </span>
          <div className="ml-auto flex items-center gap-1 rounded-md bg-container-low px-2.5 py-1 text-[10px] font-medium text-outline transition-colors hover:bg-container">
            <Command size={10} />
            <span>K</span>
            <span className="ml-1 text-outline-variant">Quick actions</span>
          </div>
        </div>

        <main className="min-h-screen p-6 pt-16 lg:p-8 lg:pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-outline-variant/15 px-6 py-5 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 md:flex-row">
            <div className="flex items-center gap-3">
              <div
                className="flex size-5 items-center justify-center rounded"
                style={{ background: "linear-gradient(135deg, #003ec7, #0052ff)" }}
              >
                <span className="text-[8px] font-black text-white">T</span>
              </div>
              <span className="text-sm font-extrabold tracking-tight text-on-surface">
                TruthMesh
              </span>
              <span className="text-[10px] font-medium text-outline">
                Team I-chan · IIT Roorkee · Microsoft AI Unlocked
              </span>
            </div>
            <div className="flex gap-6 text-[9px] font-bold uppercase tracking-widest text-outline-variant">
              <span>Track 5: Trustworthy AI</span>
              <span>© 2026 TruthMesh</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
