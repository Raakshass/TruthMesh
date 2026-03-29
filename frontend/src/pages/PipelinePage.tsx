/* ── Pipeline Page — Premium Visualization ────────────────────── */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  Terminal,
  Zap,
  Activity,
  ChevronRight,
} from "lucide-react";
import { useEventStream } from "@/hooks/useEventStream";
import { submitQuery } from "@/lib/api";
import type { PipelineStep } from "@/lib/types";

const STEPS: { key: PipelineStep; label: string; desc: string }[] = [
  { key: "shield", label: "Shield Agent", desc: "Content safety & input validation" },
  { key: "classify", label: "Domain Classification", desc: "Identify domain context" },
  { key: "route", label: "Intelligent Routing", desc: "Select optimal model" },
  { key: "llm", label: "LLM Generation", desc: "Generate response" },
  { key: "decompose", label: "Claim Decomposition", desc: "Extract atomic sub-claims" },
  { key: "verify", label: "Multi-Source Verification", desc: "Cross-reference sources" },
  { key: "consensus", label: "Weighted Consensus", desc: "Aggregate trust scores" },
  { key: "profile", label: "Bayesian Profiling", desc: "Update model reliability" },
];

export default function PipelinePage() {
  const [queryText, setQueryText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const stream = useEventStream();

  /* Derive terminal logs from step state */
  const terminalLogs: string[] = useMemo(() => {
    const logs: string[] = [];
    const allSteps: PipelineStep[] = ["shield", "classify", "route", "llm", "decompose", "verify", "consensus", "profile"];
    for (const step of allSteps) {
      if (stream.completedSteps.has(step)) {
        logs.push(`[DONE] ${step} completed`);
      } else if (stream.activeSteps.has(step)) {
        logs.push(`[INFO] Processing ${step}...`);
      }
    }
    if (stream.error) logs.push(`[ERROR] ${stream.error}`);
    if (stream.status === "done") logs.push("[SUCCESS] Pipeline complete");
    return logs;
  }, [stream.completedSteps, stream.activeSteps, stream.error, stream.status]);

  /* Auto-scroll terminal */
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const handleSubmit = useCallback(
    async (q: string) => {
      if (!q.trim() || submitting) return;
      setSubmitting(true);
      stream.reset();
      try {
        const res = await submitQuery(q);
        if (res.blocked) {
          toast.error("Query blocked by Shield Agent", {
            description: res.shield?.reason || "Content safety violation",
          });
          return;
        }
        toast.info("Pipeline initiated");
        stream.startStream(res.query_id);
      } catch {
        toast.error("Failed to submit query");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, stream]
  );

  const getStepStatus = (key: PipelineStep) => {
    if (stream.completedSteps.has(key)) return "done";
    if (stream.activeSteps.has(key)) return "active";
    return "pending";
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-on-surface">
            Verification Pipeline
          </h1>
          <p className="text-xs text-outline">
            Real-time 8-stage hallucination detection workflow
          </p>
        </div>
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {stream.status === "streaming" && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative flex size-2"
            >
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </motion.span>
          )}
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase"
            style={{
              background:
                stream.status === "streaming"
                  ? "var(--color-container-high)"
                  : stream.status === "done"
                    ? "#dcfce7"
                    : "var(--color-container)",
              color:
                stream.status === "streaming"
                  ? "var(--color-primary)"
                  : stream.status === "done"
                    ? "#166534"
                    : "var(--color-outline)",
            }}
          >
            {stream.status === "streaming"
              ? "Processing"
              : stream.status === "done"
                ? "Complete"
                : "Idle"}
          </span>
        </div>
      </div>

      {/* Query Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(queryText);
        }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Enter a claim or hypothesis to verify..."
            className="w-full rounded-lg border-[1.5px] border-outline-variant bg-container-lowest py-2.5 pl-10 pr-16 text-sm text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-primary focus:ring-3 focus:ring-primary/12 focus:shadow-glow-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-outline-variant">
            {queryText.length}
          </span>
        </div>
        <button
          type="submit"
          disabled={submitting || stream.status === "streaming"}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-on-primary transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-60 gradient-primary"
        >
          <Play size={14} />
          Run
        </button>
      </form>

      <div className="grid grid-cols-12 gap-5">
        {/* ── Pipeline Steps ────────────────────────────────── */}
        <div className="col-span-12 space-y-0 lg:col-span-5">
          {STEPS.map((step, i) => {
            const status = getStepStatus(step.key);
            return (
              <div key={step.key}>
                {/* Connector Line */}
                {i > 0 && (
                  <div className="ml-5 flex h-5 items-center">
                    <div
                      className={
                        status === "done" || getStepStatus(STEPS[i - 1].key) === "done"
                          ? "connector-line-active h-full"
                          : "connector-line h-full"
                      }
                    />
                  </div>
                )}

                {/* Step Card */}
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex items-center gap-3 rounded-xl p-3 transition-all card-hover"
                  style={{
                    background:
                      status === "active"
                        ? "var(--color-container-high)"
                        : status === "done"
                          ? "var(--color-container-lowest)"
                          : "transparent",
                    border:
                      status === "active"
                        ? "1.5px solid var(--color-primary)"
                        : "1.5px solid transparent",
                    ...(status === "active"
                      ? { boxShadow: "var(--shadow-glow-sm)" }
                      : {}),
                  }}
                >
                  {/* Step icon */}
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background:
                        status === "done"
                          ? "#dcfce7"
                          : status === "active"
                            ? "var(--color-primary)"
                            : "var(--color-container)",
                    }}
                  >
                    {status === "done" ? (
                      <CheckCircle2 size={18} className="text-green-700" />
                    ) : status === "active" ? (
                      <Loader2
                        size={18}
                        className="animate-spin text-on-primary"
                      />
                    ) : (
                      <Clock size={16} className="text-outline" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-bold"
                        style={{
                          color:
                            status === "done"
                              ? "var(--color-on-surface)"
                              : status === "active"
                                ? "var(--color-primary)"
                                : "var(--color-on-surface-variant)",
                        }}
                      >
                        {step.label}
                      </span>
                      <span className="rounded-full bg-container px-1.5 text-[8px] font-mono font-bold text-outline">
                        {i + 1}/8
                      </span>
                    </div>
                    <p className="text-[10px] text-outline">{step.desc}</p>
                  </div>

                  {status === "active" && (
                    <motion.div
                      animate={{ x: [0, 3, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      <ChevronRight size={14} className="text-primary" />
                    </motion.div>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* ── Terminal + Results ─────────────────────────────── */}
        <div className="col-span-12 space-y-5 lg:col-span-7">
          {/* Live Terminal */}
          <div className="overflow-hidden rounded-xl border border-slate-700/50 shadow-ambient-lg">
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-red-500/60" />
                <div className="size-2.5 rounded-full bg-yellow-500/60" />
                <div className="size-2.5 rounded-full bg-green-500/60" />
              </div>
              <Terminal size={12} className="ml-2 text-slate-400" />
              <span className="text-[10px] font-mono font-bold text-slate-400">
                truthmesh-pipeline
              </span>
              {stream.status === "streaming" && (
                <span className="ml-auto text-[9px] font-mono text-green-400 animate-pulse">
                  ● LIVE
                </span>
              )}
            </div>
            <div
              ref={termRef}
              className="terminal-body h-64 overflow-y-auto p-4 text-[11px] leading-relaxed font-mono"
            >
              {terminalLogs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-500">
                  <Activity size={14} className="mr-2 animate-pulse" />
                  Awaiting pipeline execution...
                </div>
              ) : (
                <>
                  {terminalLogs.map((log: string, i: number) => (
                    <div key={i} className="flex gap-3 py-0.5 hover:bg-white/[0.02] rounded">
                      <span className="w-6 shrink-0 text-right text-slate-600 select-none">
                        {i + 1}
                      </span>
                      <span
                        className={
                          log.includes("[ERROR]")
                            ? "terminal-line-error"
                            : log.includes("[DONE]") || log.includes("[SUCCESS]")
                              ? "terminal-line-success"
                              : log.includes("Processing") || log.includes("[INFO]")
                                ? "terminal-line-processing"
                                : "terminal-line-info"
                        }
                      >
                        {log}
                      </span>
                    </div>
                  ))}
                  {stream.status === "streaming" && (
                    <div className="flex gap-3 py-0.5">
                      <span className="w-6 shrink-0 text-right text-slate-600 select-none">
                        {terminalLogs.length + 1}
                      </span>
                      <span className="terminal-cursor" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Decision Matrix */}
          <AnimatePresence>
            {stream.overallTrust && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-container-lowest p-5 shadow-ambient"
              >
                <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <Zap size={12} className="text-primary" />
                  Decision Matrix
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Overall Trust", value: `${Math.round(stream.overallTrust.overall_score * 100)}%`, accent: "#003ec7" },
                    { label: "Verified Claims", value: `${stream.overallTrust.verified_claims}/${stream.overallTrust.total_claims}`, accent: "#22c55e" },
                    {
                      label: "Avg Confidence",
                      value: stream.verifications.length > 0
                        ? `${Math.round((stream.verifications.reduce((s, v) => s + v.consensus.confidence, 0) / stream.verifications.length) * 100)}%`
                        : "--",
                      accent: "#eab308",
                    },
                    {
                      label: "Agreement Ratio",
                      value: stream.verifications.length > 0
                        ? `${Math.round((stream.verifications.reduce((s, v) => s + v.consensus.agreement_ratio, 0) / stream.verifications.length) * 100)}%`
                        : "--",
                      accent: "#0052ff",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-outline-variant/15 bg-surface p-4 text-center"
                    >
                      <p className="text-2xl font-black text-on-surface">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-outline">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Domain Reliability */}
          <AnimatePresence>
            {stream.verifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-container-lowest p-5 shadow-ambient"
              >
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Source Reliability
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const sourceScores: Record<string, { total: number; count: number }> = {};
                    stream.verifications.forEach((v) => {
                      v.sources.forEach((s) => {
                        if (!sourceScores[s.source]) {
                          sourceScores[s.source] = { total: 0, count: 0 };
                        }
                        sourceScores[s.source].total += s.confidence;
                        sourceScores[s.source].count += 1;
                      });
                    });
                    return Object.entries(sourceScores).map(([src, { total, count }]) => {
                      const avg = Math.round((total / count) * 100);
                      return (
                        <div key={src}>
                          <div className="flex justify-between text-xs font-bold text-on-surface-variant mb-1">
                            <span>{src}</span>
                            <span>{avg}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-container">
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${avg}%` }}
                              transition={{ duration: 0.6, delay: 0.1 }}
                              style={{
                                background:
                                  avg >= 75
                                    ? "linear-gradient(90deg, #22c55e, #4ade80)"
                                    : avg >= 45
                                      ? "linear-gradient(90deg, #eab308, #facc15)"
                                      : "linear-gradient(90deg, #ef4444, #f87171)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
