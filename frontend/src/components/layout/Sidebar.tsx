/* ── Sidebar Navigation ───────────────────────────────────────────── */
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  GitBranch,
  ClipboardCheck,
  SlidersHorizontal,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/pipeline", icon: GitBranch, label: "Pipeline" },
  { to: "/audit", icon: ClipboardCheck, label: "Audit Log" },
  { to: "/settings", icon: SlidersHorizontal, label: "Settings" },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col transition-transform duration-300 ease-out",
          "bg-container-low",
          open ? "translate-x-0" : "-translate-x-60 lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex size-9 items-center justify-center rounded-lg"
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

        {/* Nav Links */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-container-high font-bold text-primary"
                    : "text-on-surface-variant hover:bg-container hover:text-on-surface"
                )
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer badges + user */}
        <div className="space-y-3 px-4 pb-5">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-container-high px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Azure
            </span>
            <span className="rounded-full bg-container px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-secondary">
              Track 5
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-container p-2">
            <div
              className="flex size-8 items-center justify-center rounded-full"
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
              className="text-outline hover:text-error transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
