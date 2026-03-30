/* ── App Router ───────────────────────────────────────────────────── */
import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const TopographyPage = lazy(() => import("@/pages/TopographyPage"));
const PipelinePage = lazy(() => import("@/pages/PipelinePage"));
const AuditPage = lazy(() => import("@/pages/AuditPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const PitchDeckPage = lazy(() => import("@/pages/PitchDeckPage"));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs font-medium text-outline">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pitch" element={<PitchDeckPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="topography" element={<TopographyPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
