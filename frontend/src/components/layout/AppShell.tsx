/* ── App Shell: Sidebar + Main Content ────────────────────────────── */
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between bg-surface/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-1">
          <Menu size={24} className="text-on-surface" />
        </button>
        <span className="text-sm font-extrabold tracking-tight text-on-surface">
          TruthMesh
        </span>
        <div
          className="flex size-8 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, #003ec7, #0052ff)" }}
        >
          <span className="text-xs font-bold text-white">T</span>
        </div>
      </header>

      {/* Main area */}
      <div className="transition-[margin] duration-300 lg:ml-60">
        <main className="min-h-screen p-6 pt-16 lg:p-8 lg:pt-8">
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
        <footer className="mt-4 px-6 py-5 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 md:flex-row">
            <div className="flex items-center gap-3">
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
