/* ── Sidebar Navigation — Premium ─────────────────────────────────── */
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  GitBranch,
  ClipboardCheck,
  SlidersHorizontal,
  LogOut,
  Sparkles,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/topography", icon: Map, label: "Topography", end: false },
  { to: "/pipeline", icon: GitBranch, label: "Pipeline", end: false },
  { to: "/audit", icon: ClipboardCheck, label: "Audit Log", end: false },
  { to: "/settings", icon: SlidersHorizontal, label: "Settings", end: false },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  /* Determine which nav item is active for the animated pill */
  const activeIdx = NAV_ITEMS.findIndex((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col transition-transform duration-300 ease-out",
          "border-r border-outline-variant/20 bg-container-low",
          open ? "translate-x-0" : "-translate-x-60 lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="animate-breathe flex size-9 items-center justify-center rounded-lg shadow-glow-sm"
              style={{
                background: "linear-gradient(135deg, #003ec7, #0052ff)",
              }}
            >
              <span className="text-lg font-black text-white">T</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-on-surface">
                TruthMesh
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
                AI Verification
              </span>
            </div>
          </div>
        </div>

        {/* Decorative separator */}
        <div className="mx-5 mb-3 h-px bg-gradient-to-r from-transparent via-outline-variant/40 to-transparent" />

        {/* Section label */}
        <div className="px-5 mb-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-outline">
            Navigation
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }, i) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "font-bold text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Animated pill indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-lg bg-container-high"
                      style={{ zIndex: -1 }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}

                  {/* Left accent bar */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-accent-bar"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                      style={{ background: "linear-gradient(180deg, #003ec7, #0052ff)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md transition-all duration-200",
                      isActive
                        ? "bg-primary/10"
                        : "bg-transparent group-hover:bg-container"
                    )}
                  >
                    <Icon
                      size={16}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={cn(
                        "transition-all duration-200",
                        isActive
                          ? "text-primary"
                          : "text-outline group-hover:text-on-surface"
                      )}
                    />
                  </div>
                  <span className="flex-1">{label}</span>

                  {/* Hover sparkle on non-active items */}
                  {!isActive && (
                    <Sparkles
                      size={12}
                      className="text-outline-variant opacity-0 transition-opacity group-hover:opacity-60"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer badges + user */}
        <div className="space-y-3 px-4 pb-5">
          {/* Separator */}
          <div className="h-px bg-gradient-to-r from-transparent via-outline-variant/40 to-transparent" />

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-container-high px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Azure
            </span>
            <span className="rounded-full bg-container px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-secondary">
              Track 5
            </span>
            <span className="rounded-full bg-container-low px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-outline">
              v1.0.0
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-container p-2.5 transition-colors hover:bg-container-high">
            <div
              className="flex size-8 items-center justify-center rounded-full shadow-sm"
              style={{
                background: "linear-gradient(135deg, #003ec7, #0052ff)",
              }}
            >
              <span className="text-xs font-bold text-white">
                {user?.username?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-on-surface">
                {user?.username ?? "User"}
              </p>
              <p className="text-[9px] font-medium text-on-surface-variant">
                {user?.role ?? "Viewer"}
              </p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="rounded-md p-1.5 text-outline transition-all hover:bg-error/10 hover:text-error"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
