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
    <div className="relative flex min-h-screen items-center justify-center bg-[#020617] p-4 lg:p-8">
      {/* Full Background 3D Network Graph */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <NetworkScene className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/50" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
        
        {/* Hero Text - Always Visible */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 text-center lg:text-left pt-12 lg:pt-0"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-semibold uppercase tracking-widest text-primary shadow-[0_0_15px_rgba(0,82,255,0.2)]">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Live Verification Node
          </div>
          <h1 className="text-5xl lg:text-[4rem] font-black leading-[1.1] tracking-tight text-white drop-shadow-lg">
            Truth<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052ff] to-[#4ade80]">Mesh</span>
          </h1>
          <p className="mt-4 text-xl lg:text-2xl font-medium text-slate-300 drop-shadow-md">
            Self-Auditing Hallucination<br className="hidden lg:block"/> Topography Engine
          </p>
          <p className="mt-6 max-w-[480px] mx-auto lg:mx-0 text-sm leading-relaxed text-slate-400">
            Real-time LLM verification leveraging Domain-Aware Routing and multi-source consensus scoring. Built for high-stakes AI applications where accuracy is mercilessly enforced.
          </p>
        </motion.div>

        {/* Login Form Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-[400px] rounded-2xl border border-white/5 bg-[#0a0f1a]/80 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(0,82,255,0.15)]"
        >
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Access Portal
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Establish secure connection to Identity Core
          </p>

          {(localError || error) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-xs font-medium text-red-400"
            >
              {localError || error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Operative ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-primary focus:bg-primary/5 focus:ring-4 focus:ring-primary/10"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Passkey
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-primary focus:bg-primary/5 focus:ring-4 focus:ring-primary/10"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,82,255,0.4)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: "linear-gradient(135deg, #0052ff, #4ade80)",
              }}
            >
              {loading ? (
                <span className="inline-block size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Initialize Session"
              )}
            </button>
          </form>

          <div className="mt-8 rounded-lg border border-white/5 bg-white/5 p-4 text-center">
            <p className="text-[11px] text-slate-400">
              Demo credentials: <br className="lg:hidden"/>
              <code className="font-mono mt-1 inline-block font-semibold text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded">
                demo / demo
              </code>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
