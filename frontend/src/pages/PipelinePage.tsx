/* ── Pipeline Page ────────────────────────────────────────────────── */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Layers,
  GitBranch,
  Bot,
  Scissors,
  Search,
  Scale,
  BarChart3,
  Terminal,
  Activity,
} from "lucide-react";
import { useEventStream } from "@/hooks/useEventStream";
import { getRecentQuery, getTopography, submitQuery } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PipelineStep, TopographyEntry } from "@/lib/types";

const STEPS: { key: PipelineStep; label: string; icon: typeof Shield; desc: string }[] = [
  { key: "shield", label: "Shield Agent", icon: Shield, desc: "Content safety & input sanitization" },
  { key: "classify", label: "Domain Classifier", icon: Layers, desc: "Multi-label classification" },
  { key: "route", label: "Smart Router", icon: GitBranch, desc: "Model selection & optimization" },
  { key: "llm", label: "LLM Processing", icon: Bot, desc: "Response generation" },
  { key: "decompose", label: "Decomposition", icon: Scissors, desc: "Atomic claim extraction" },
  { key: "verify", label: "Multi-Source Verify", icon: Search, desc: "Cross-reference validation" },
  { key: "consensus", label: "Consensus Engine", icon: Scale, desc: "Weighted agreement scoring" },
  { key: "profile", label: "Topography", icon: BarChart3, desc: "Reliability profiling" },
];

export default function PipelinePage() {
  const [topography, setTopography] = useState<TopographyEntry[]>([]);
  const [recentQuery, setRecentQuery] = useState<string>("");
  const [queryInput, setQueryInput] = useState("");
  const stream = useEventStream();

  useEffect(() => {
    getTopography()
      .then((d) => setTopography(d.topography as TopographyEntry[]))
      .catch(console.error);
    getRecentQuery()
      .then((d) => {
        if (d.query) setRecentQuery(d.query);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async () => {
    const q = queryInput.trim();
    if (!q) return;
    stream.reset();
    try {
      const res = await submitQuery(q);
      if (!res.blocked) stream.startStream(res.query_id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-on-surface">
            Verification Pipeline
          </h1>
          <p className="mt-0.5 text-sm text-outline">
            Real-time 8-step verification with live status tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5",
              stream.status === "streaming"
                ? "bg-primary/10 text-primary"
                : stream.status === "done"
                  ? "bg-trust-pass/10 text-trust-pass"
                  : "bg-container-high text-outline"
            )}
          >
            <div
              className={cn(
                "size-2 rounded-full",
                stream.status === "streaming"
                  ? "animate-pulse bg-primary"
                  : stream.status === "done"
                    ? "bg-trust-pass"
                    : "bg-outline"
              )}
            />
            <span className="text-xs font-bold uppercase tracking-wider">
              {stream.status === "streaming"
                ? "Processing"
                : stream.status === "done"
                  ? "Complete"
                  : "Idle"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick query bar */}
      <div className="flex gap-3 rounded-xl bg-container-lowest p-3 shadow-ambient">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Quick verify: Enter a claim or question..."
          className="flex-1 rounded-lg bg-container-low px-4 py-2.5 text-sm text-on-surface outline-none placeholder:text-outline-variant focus:bg-container"
        />
        <button
          onClick={handleSubmit}
          disabled={stream.status === "streaming"}
          className="rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #003ec7, #0052ff)" }}
        >
          Verify
        </button>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* ═══ Pipeline Steps ═══ */}
        <div className="col-span-12 space-y-3 lg:col-span-8">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Pipeline Steps
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STEPS.map(({ key, label, icon: Icon, desc }, i) => {
              const isDone = stream.completedSteps.has(key);
              const isActive = stream.activeSteps.has(key);

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "relative overflow-hidden rounded-xl border-[1.5px] p-4 transition-all duration-500",
                    isDone
                      ? "border-primary/30 bg-container-lowest shadow-glow-sm"
                      : isActive
                        ? "border-primary/20 bg-container-lowest shadow-ambient"
                        : "border-transparent bg-container-low"
                  )}
                >
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"
                    />
                  )}
                  <div className="relative flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-500",
                        isDone
                          ? "bg-primary text-white"
                          : isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-container text-outline"
                      )}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-on-surface">
                          {label}
                        </p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                            isDone
                              ? "bg-primary/10 text-primary"
                              : isActive
                                ? "bg-trust-medium/10 text-trust-medium"
                                : "bg-container text-outline"
                          )}
                        >
                          {isDone ? "Done" : isActive ? "Active" : "Pending"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-outline">{desc}</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-container">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: "0%" }}
                      animate={{
                        width: isDone ? "100%" : isActive ? "60%" : "0%",
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{
                        background:
                          "linear-gradient(90deg, #003ec7, #0052ff)",
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Live Terminal */}
          <div className="mt-4 rounded-xl bg-[#0f172a] p-4 shadow-ambient-lg">
            <div className="mb-3 flex items-center gap-2">
              <Terminal size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Live Terminal
              </span>
              <div className="ml-auto flex gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500/60" />
                <span className="size-2.5 rounded-full bg-yellow-500/60" />
                <span className="size-2.5 rounded-full bg-green-500/60" />
              </div>
            </div>
            <div className="h-[200px] overflow-y-auto font-mono text-xs">
              <AnimatePresence>
                {stream.status === "idle" && !recentQuery && (
                  <p className="text-slate-600">
                    {">"} Waiting for query input...
                  </p>
                )}
                {stream.status === "idle" && recentQuery && (
                  <p className="text-slate-500">
                    {">"} Last query: {recentQuery}
                  </p>
                )}
                {Array.from(stream.completedSteps).map((step) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 py-0.5"
                  >
                    <span className="text-green-400">✓</span>
                    <span className="text-slate-400">
                      [{step.toUpperCase()}]
                    </span>
                    <span className="text-slate-300">completed</span>
                  </motion.div>
                ))}
                {Array.from(stream.activeSteps).map((step) => (
                  <motion.div
                    key={`active-${step}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex gap-2 py-0.5"
                  >
                    <span className="text-blue-400">⟳</span>
                    <span className="text-blue-300">
                      [{step.toUpperCase()}]
                    </span>
                    <span className="text-blue-200">processing...</span>
                  </motion.div>
                ))}
                {stream.overallTrust && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 border-t border-slate-700 pt-2"
                  >
                    <p className="text-emerald-400">
                      ✓ Trust Score:{" "}
                      {Math.round(stream.overallTrust.overall_score * 100)}%
                    </p>
                    <p className="text-slate-500">
                      {">"} {stream.overallTrust.verified_claims}/
                      {stream.overallTrust.total_claims} claims verified
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ═══ Right: Decision Matrix + Topography ═══ */}
        <div className="col-span-12 space-y-5 lg:col-span-4">
          {/* Decision Matrix */}
          <div className="rounded-xl bg-container-lowest p-5 shadow-ambient">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Decision Matrix
            </h3>
            <AnimatePresence>
              {stream.responseModel ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="rounded-lg bg-container-low p-3">
                    <p className="text-[10px] font-bold uppercase text-outline">
                      Selected Model
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">
                      {stream.responseModel}
                    </p>
                  </div>
                  {stream.overallTrust && (
                    <div className="rounded-lg bg-container-low p-3">
                      <p className="text-[10px] font-bold uppercase text-outline">
                        Confidence
                      </p>
                      <p className="mt-1 text-sm font-bold text-on-surface">
                        {Math.round(
                          stream.overallTrust.average_confidence * 100
                        )}
                        %
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg bg-container-low">
                  <p className="text-xs text-outline">
                    Run a query to see decisions
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Topography Map */}
          <div className="rounded-xl bg-container-lowest p-5 shadow-ambient">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                Domain Reliability
              </h3>
            </div>
            <div className="space-y-2.5">
              {topography.length > 0 ? (
                topography.slice(0, 6).map((entry, i) => (
                  <motion.div
                    key={`${entry.domain}-${entry.model}`}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-on-surface">
                        {entry.domain}
                      </span>
                      <span className="font-mono text-outline">
                        {Math.round(entry.reliability_score * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-container">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${entry.reliability_score * 100}%`,
                        }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        style={{
                          background:
                            entry.reliability_score >= 0.8
                              ? "linear-gradient(90deg, #003ec7, #0052ff)"
                              : entry.reliability_score >= 0.5
                                ? "linear-gradient(90deg, #ca8a04, #eab308)"
                                : "linear-gradient(90deg, #dc2626, #ef4444)",
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[9px] text-outline">
                      {entry.model} · {entry.total_queries} queries
                    </p>
                  </motion.div>
                ))
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg bg-container-low">
                  <p className="text-xs text-outline">No topography data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
