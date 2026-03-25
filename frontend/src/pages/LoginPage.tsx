/* ── Login Page ───────────────────────────────────────────────────── */
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { NetworkScene } from "@/components/three/NetworkScene";

export default function LoginPage() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch {
      setLocalError("Invalid credentials or access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-surface">
      {/* Full Background 3D Network Graph */}
      <div className="absolute inset-0 z-0">
        <NetworkScene className="absolute inset-0" />
      </div>

      {/* Left: Hero Text */}
      <div className="relative z-10 hidden flex-[1.5] flex-col justify-center p-16 lg:flex">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="max-w-[520px]"
        >
          <h1 className="text-[3.5rem] font-black leading-[1.1] tracking-tight text-white">
            TruthMesh
          </h1>
          <p className="mt-3 text-lg font-medium text-inverse-primary">
            Self-Auditing Hallucination
            <br />
            Topography Engine
          </p>
          <p className="mt-5 max-w-[400px] text-sm leading-relaxed text-inverse-primary/50">
            Real-time LLM verification. Domain-aware routing. Multi-source
            consensus scoring. Built for high-stakes AI applications.
          </p>
          <div className="mt-12 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-inverse-primary/40">
            <span className="size-1.5 rounded-full bg-primary-container shadow-[0_0_8px_rgba(0,82,255,0.6)]" />
            Trusted by researchers & enterprises
          </div>
        </motion.div>
      </div>

      {/* Right: Login Form */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-[380px] rounded-xl bg-container-lowest p-8 shadow-ambient"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-on-surface">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Sign in to your account
          </p>

          {(localError || error) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-lg bg-error/10 px-3 py-2.5 text-center text-xs font-medium text-error"
            >
              {localError || error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Enter username"
                className="w-full rounded-md border-[1.5px] border-outline-variant bg-container-lowest px-4 py-3 text-sm text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-primary focus:ring-3 focus:ring-primary/12"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full rounded-md border-[1.5px] border-outline-variant bg-container-lowest px-4 py-3 text-sm text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-primary focus:ring-3 focus:ring-primary/12"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md py-3 text-sm font-bold text-on-primary transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              style={{
                background: "linear-gradient(135deg, #003ec7, #0052ff)",
              }}
            >
              {loading ? (
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-5 rounded-md bg-container p-3 text-center">
            <p className="text-[11px] text-on-surface-variant">
              Demo credentials:{" "}
              <code className="font-mono font-semibold text-primary">
                admin / truthmesh123
              </code>
            </p>
            <p className="mt-0.5 text-[11px] text-on-surface-variant">
              or{" "}
              <code className="font-mono font-semibold text-primary">
                demo / demo123
              </code>
            </p>
          </div>

          <p className="mt-5 text-center text-[11px] text-outline">
            New here? Contact your administrator for access.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
