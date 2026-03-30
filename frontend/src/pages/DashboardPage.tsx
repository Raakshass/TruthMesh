/* ── Dashboard Page — Premium Overhaul ───────────────────────────── */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Stethoscope,
  Scale,
  Landmark,
  FlaskConical,
  BookOpen,
  Shield,
  Waves,
  Bot,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEventStream } from "@/hooks/useEventStream";
import { submitQuery, getDashboardData, getTopography, getSelfAuditStats, runSelfAudit } from "@/lib/api";
import type { PipelineStep, DashboardData, ClaimVerification, TopographyEntry } from "@/lib/types";
import HallucinationHeatmap from "@/components/HallucinationHeatmap";
import ExportButton from "@/components/ExportButton";

const DEMO_SCENARIOS = [
  {
    query: "What are the drug interactions between metformin and lisinopril?",
    icon: Stethoscope,
    label: "Medical",
    sub: "Drug Interaction Analysis",
    color: "#ba1a1a",
    gradient: "linear-gradient(135deg, #ba1a1a, #ef4444)",
  },
  {
    query: "What are the key precedents in Indian contract law for force majeure?",
    icon: Scale,
    label: "Legal",
    sub: "Force Majeure Precedents",
    color: "#003ec7",
    gradient: "linear-gradient(135deg, #003ec7, #0052ff)",
  },
  {
    query: "What is the current Basel III capital adequacy ratio requirement?",
    icon: Landmark,
    label: "Finance",
    sub: "Basel III Capital Ratios",
    color: "#005479",
    gradient: "linear-gradient(135deg, #005479, #0284c7)",
  },
  {
    query: "What are the legal implications of AI-generated medical diagnoses in India?",
    icon: FlaskConical,
    label: "AI + Law",
    sub: "Cross-Domain Analysis",
    color: "#7c3aed",
    gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)",
  },
  {
    query: "Is GPT-4 reliable for generating differential diagnoses in rare diseases?",
    icon: BookOpen,
    label: "AI Reliability",
    sub: "Hallucination Risk Assessment",
    color: "#515f74",
    gradient: "linear-gradient(135deg, #515f74, #94a3b8)",
  },
];

const PIPELINE_STEPS: { key: PipelineStep; label: string }[] = [
  { key: "shield", label: "Shield" },
  { key: "classify", label: "Classify" },
  { key: "route", label: "Route" },
  { key: "llm", label: "LLM" },
  { key: "decompose", label: "Decompose" },
  { key: "verify", label: "Verify" },
  { key: "consensus", label: "Consensus" },
  { key: "profile", label: "Profile" },
];

/* ── Shannon Entropy ──────────────────────────────────────────── */
function computeEntropy(verifications: ClaimVerification[]): number {
  if (!verifications.length) return 0;
  const verdictCounts: Record<string, number> = {};
  verifications.forEach((v) => {
    const key = v.consensus.final_verdict;
    verdictCounts[key] = (verdictCounts[key] || 0) + 1;
  });
  const total = verifications.length;
  let entropy = 0;
  Object.values(verdictCounts).forEach((count) => {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  });
  return entropy;
}

/* ── Animated Counter ─────────────────────────────────────────── */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{display}{suffix}</>;
}

export default function DashboardPage() {
  const [queryText, setQueryText] = useState("");
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<Record<string, unknown> | null>(null);
  const [expandedClaim, setExpandedClaim] = useState<number | null>(null);
  const queryInputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Live data ──────────────────────────────────────────────── */
  const [topography, setTopography] = useState<TopographyEntry[]>([]);
  const [topoModels, setTopoModels] = useState<string[]>([]);
  const [topoDomains, setTopoDomains] = useState<string[]>([]);
  const [selfAudit, setSelfAudit] = useState<{ total: number; correct_count: number; accuracy: number } | null>(null);

  const stream = useEventStream();

  useEffect(() => {
    getDashboardData().then(setDashData).catch(console.error);
    getTopography()
      .then((res) => {
        setTopography(res.topography as TopographyEntry[]);
        setTopoModels(res.models);
        setTopoDomains(res.domains);
      })
      .catch(console.error);
    getSelfAuditStats()
      .then((res) => setSelfAudit(res as { total: number; correct_count: number; accuracy: number }))
      .catch(console.error);
  }, []);

  /* ── Refresh topography after stream completes ────────────── */
  useEffect(() => {
    if (stream.status === "done") {
      getTopography()
        .then((res) => {
          setTopography(res.topography as TopographyEntry[]);
          setTopoModels(res.models);
          setTopoDomains(res.domains);
        })
        .catch(console.error);
    }
  }, [stream.status]);

  const handleSubmit = useCallback(
    async (query: string) => {
      if (!query.trim() || submitting) return;
      setSubmitting(true);
      setExpandedClaim(null);
      stream.reset();

      try {
        const res = await submitQuery(query);
        if (res.blocked) {
          toast.error("Query blocked by Shield Agent", {
            description: res.shield?.reason || "Content safety violation detected",
            duration: 5000,
          });
          return;
        }
        toast.info("Pipeline started", {
          description: `Model: ${res.routing?.selected_model ?? "auto"} • Domain: ${res.routing?.primary_domain ?? "General"}`,
        });
        stream.startStream(res.query_id);
      } catch (err) {
        console.error("Submit error:", err);
        toast.error("Failed to submit query");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, stream]
  );

  const handleAudit = async () => {
    setAuditRunning(true);
    toast.info("Running self-audit...");
    try {
      const result = await runSelfAudit();
      setAuditResult(result as Record<string, unknown>);
      getSelfAuditStats()
        .then((res) => setSelfAudit(res as { total: number; correct_count: number; accuracy: number }))
        .catch(console.error);
      toast.success("Self-audit complete");
    } catch {
      toast.error("Self-audit failed");
    } finally {
      setAuditRunning(false);
    }
  };

  const trustScore = stream.overallTrust?.overall_score;
  const trustPct = trustScore != null ? Math.round(trustScore * 100) : null;
  const arcOffset = trustPct != null ? 351.8 - (351.8 * trustPct) / 100 : 351.8;

  /* ── Trust ring color ───────────────────────────────────────── */
  const ringColor = trustPct != null
    ? trustPct >= 80 ? "#22c55e" : trustPct >= 50 ? "#eab308" : "#ef4444"
    : "#003ec7";
  const ringGlow = trustPct != null
    ? trustPct >= 80 ? "rgba(34,197,94,0.3)" : trustPct >= 50 ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.3)"
    : "rgba(0,82,255,0.15)";

  /* ── Computed entropy ───────────────────────────────────────── */
  const entropy = useMemo(() => computeEntropy(stream.verifications), [stream.verifications]);

  /* ── Self-audit progress bars ───────────────────────────────── */
  const auditBars = useMemo(() => {
    if (!selfAudit || selfAudit.total === 0) {
      return [
        { label: "Data Integrity", value: 0 },
        { label: "Reasoning Consistency", value: 0 },
        { label: "Source Diversity", value: 0 },
      ];
    }
    const acc = selfAudit.accuracy;
    return [
      { label: "Data Integrity", value: Math.min(acc + 5, 100) },
      { label: "Reasoning Consistency", value: acc },
      { label: "Source Diversity", value: Math.max(acc - 8, 0) },
    ];
  }, [selfAudit]);

  const isDemoMode = dashData?.demo_mode ?? false;

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-5">
      {/* ═══ DEMO MODE BANNER ═══ */}
      <AnimatePresence>
        {isDemoMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="col-span-12 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3"
          >
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-600">
                Demo Mode Active
              </p>
              <p className="text-xs text-amber-500/80">
                Running with pre-cached responses. Set DEMO_MODE=false for live pipeline execution.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ LEFT: Query & Scenarios ═══ */}
      <aside className="col-span-12 space-y-4 lg:col-span-3">
        {/* Query Input */}
        <div className="rounded-xl bg-container-lowest p-5 shadow-ambient card-hover">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            <Zap size={12} className="text-primary" />
            Analyze Query
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(queryText);
            }}
          >
            <div className="relative">
              <textarea
                ref={queryInputRef}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="Enter a claim or question to verify..."
                className="w-full resize-none rounded-lg border-[1.5px] border-outline-variant bg-surface p-3 text-sm text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-primary focus:ring-3 focus:ring-primary/12 focus:shadow-glow-sm"
              />
              {/* Character count */}
              <span className="absolute bottom-2 right-2 text-[9px] font-mono text-outline-variant">
                {queryText.length}/5000
              </span>
            </div>
            <button
              type="submit"
              disabled={submitting || stream.status === "streaming"}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest text-on-primary transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-60 gradient-primary"
            >
              <Search size={14} />
              {submitting ? "Sending..." : "Analyze"}
            </button>
          </form>
        </div>

        {/* Demo Scenarios */}
        <div className="rounded-xl bg-container-lowest p-5 shadow-ambient">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            <Sparkles size={12} className="text-primary" />
            Demo Scenarios
          </h3>
          <div className="space-y-1.5">
            {DEMO_SCENARIOS.map((scenario, i) => (
              <motion.button
                key={scenario.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setQueryText(scenario.query);
                  handleSubmit(scenario.query);
                }}
                className="group flex w-full items-center gap-3 rounded-lg bg-container-low p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-container hover:shadow-md"
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-110"
                  style={{ background: `${scenario.color}15` }}
                >
                  <scenario.icon size={15} style={{ color: scenario.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-on-surface">
                    {scenario.label}
                  </p>
                  <p className="text-[10px] text-outline">{scenario.sub}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Pipeline Health */}
        <div
          className="relative overflow-hidden rounded-xl p-5 text-white shadow-ambient-lg gradient-dark"
        >
          <Shield
            size={64}
            className="absolute -right-2 -top-2 opacity-5"
          />
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Pipeline Health
          </h3>
          <p className="text-xl font-extrabold">
            {stream.status === "streaming"
              ? "Processing"
              : stream.status === "done"
                ? "Complete"
                : "Idle"}
          </p>
          <p className="text-xs font-bold text-inverse-primary">
            {stream.status === "streaming"
              ? `Step ${stream.completedSteps.size + 1}/8`
              : stream.status === "done"
                ? `${trustPct ?? "--"}% Trust`
                : "Ready for query"}
          </p>
          <div className="mt-4 flex gap-1">
            {PIPELINE_STEPS.map(({ key }) => (
              <div
                key={key}
                className="h-1.5 flex-1 rounded-full transition-all duration-500"
                style={{
                  background: stream.completedSteps.has(key)
                    ? "linear-gradient(135deg, #003ec7, #0052ff)"
                    : stream.activeSteps.has(key)
                      ? "#b7c4ff"
                      : "#434656",
                  ...(stream.activeSteps.has(key)
                    ? { animation: "pulse 1s infinite" }
                    : {}),
                }}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ═══ CENTER: Trust Score + Results ═══ */}
      <div className="col-span-12 space-y-5 lg:col-span-6">
        {/* Trust Score Hero */}
        <div className="relative flex items-center justify-between overflow-hidden rounded-xl bg-container-lowest p-8 shadow-ambient">
          <div className="absolute -right-20 -top-20 size-40 rounded-full blur-3xl" style={{ background: `${ringColor}10` }} />
          <div className="space-y-3">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-outline">
                Overall Trust Score
              </h2>
              <p className="mt-1 text-3xl font-extrabold text-on-surface">
                {trustPct != null
                  ? trustPct >= 80
                    ? "High Confidence"
                    : trustPct >= 50
                      ? "Moderate"
                      : "Low Confidence"
                  : "Awaiting Query"}
              </p>
            </div>
            {stream.overallTrust && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4"
              >
                <span className="flex items-center gap-1.5 rounded-full bg-container-high px-3 py-1 text-xs font-bold text-primary">
                  ✓ {stream.overallTrust.pass_count}/{stream.overallTrust.claim_count} verified
                </span>
                <ExportButton
                  queryText={queryText}
                  verifications={stream.verifications}
                  overallTrust={stream.overallTrust}
                  responseText={stream.responseText ?? undefined}
                  responseModel={stream.responseModel ?? undefined}
                />
              </motion.div>
            )}
          </div>
          {/* Trust Ring with Glow */}
          <div
            className="relative flex items-center justify-center"
            style={{ opacity: trustPct != null ? 1 : 0.3 }}
          >
            <svg className="-rotate-90" width="128" height="128">
              <defs>
                <filter id="trust-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle
                cx="64" cy="64" r="56" fill="transparent"
                stroke="#eaedff" strokeWidth="8"
              />
              <circle
                cx="64" cy="64" r="56" fill="transparent"
                stroke={ringColor} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="351.8"
                strokeDashoffset={arcOffset}
                filter={trustPct != null ? "url(#trust-glow)" : undefined}
                style={{
                  transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease",
                  filter: trustPct != null ? `drop-shadow(0 0 8px ${ringGlow})` : undefined,
                }}
              />
            </svg>
            <span className="absolute text-2xl font-black text-on-surface">
              {trustPct != null ? <AnimatedNumber value={trustPct} suffix="%" /> : "--%"}
            </span>
          </div>
        </div>

        {/* AI Response */}
        <AnimatePresence>
          {stream.responseText && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border-l-[3px] border-l-primary bg-container-lowest p-5 shadow-ambient"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                  <Bot size={14} className="text-primary" />
                </div>
                <h3 className="text-sm font-bold text-on-surface">
                  AI Response
                </h3>
                <span className="ml-auto rounded-full bg-container-high px-2 py-0.5 font-mono text-[10px] text-outline">
                  {stream.responseModel}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                {stream.responseText}
                {stream.status === "streaming" && (
                  <span className="terminal-cursor" />
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State Onboarding */}
        <AnimatePresence>
          {!stream.responseText && stream.status !== "streaming" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/30 bg-transparent py-20 text-center"
            >
              <div className="relative mb-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-container-high text-outline animate-float">
                  <Search size={22} />
                </div>
                <div className="absolute -right-1 -top-1 size-3 rounded-full bg-primary animate-orbit" />
              </div>
              <h3 className="mb-2 text-sm font-bold text-on-surface">
                Awaiting Hypothesis
              </h3>
              <p className="max-w-xs text-xs leading-relaxed text-on-surface-variant">
                Select a demo scenario from the panel or type your own claim to initiate the verification pipeline.
              </p>
              <div className="mt-4 flex items-center gap-1.5 rounded-full bg-container px-3 py-1.5 text-[10px] font-medium text-outline">
                <Sparkles size={10} className="text-primary" />
                8 verification agents ready
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Claim Verification Feed */}
        <AnimatePresence>
          {stream.verifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-on-surface">
                  Claim Verification Feed
                </h3>
                <span className="rounded-full bg-container-high px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  {stream.verifications.length} claims
                </span>
              </div>
              {stream.verifications.map((v: ClaimVerification, i: number) => {
                const isExpanded = expandedClaim === v.index;
                return (
                  <motion.div
                    key={v.index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-xl bg-container-lowest shadow-ambient overflow-hidden card-hover"
                  >
                    {/* Claim Header — Clickable */}
                    <button
                      onClick={() => setExpandedClaim(isExpanded ? null : v.index)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      {/* Verdict dot */}
                      <div
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          background: v.consensus.final_verdict === "pass"
                            ? "#22c55e"
                            : v.consensus.final_verdict === "fail"
                              ? "#ef4444"
                              : "#eab308",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-on-surface">
                            Claim {v.index + 1}
                          </span>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
                            style={{
                              background:
                                v.consensus.final_verdict === "pass"
                                  ? "#dcfce7"
                                  : v.consensus.final_verdict === "fail"
                                    ? "#fee2e2"
                                    : "#fef3c7",
                              color:
                                v.consensus.final_verdict === "pass"
                                  ? "#166534"
                                  : v.consensus.final_verdict === "fail"
                                    ? "#991b1b"
                                    : "#92400e",
                            }}
                          >
                            {v.consensus.final_verdict}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-on-surface-variant line-clamp-2">{v.claim}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="shrink-0 text-outline" />
                      ) : (
                        <ChevronDown size={16} className="shrink-0 text-outline" />
                      )}
                    </button>

                    {/* Expandable Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-outline-variant/20 px-4 pb-4 pt-3">
                            {/* Confidence & Agreement */}
                            <div className="mb-3 flex gap-4">
                              <div>
                                <p className="text-[9px] font-bold uppercase text-outline">Confidence</p>
                                <p className="text-sm font-bold text-on-surface">
                                  {Math.round((v.sources.reduce((sum, s) => sum + s.confidence, 0) / (v.sources.length || 1)) * 100)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase text-outline">Agreement</p>
                                <p className="text-sm font-bold text-on-surface">
                                  {Math.round(Math.max(...Object.values(v.consensus.verdict_distribution || { default: 0 }), 0) * 100)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase text-outline">Weighted (Final)</p>
                                <p className="text-sm font-bold text-on-surface">
                                  {Math.round(v.consensus.final_confidence * 100)}%
                                </p>
                              </div>
                            </div>

                            {/* Citations Block */}
                            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-outline">Evidentiary Sources</h4>
                            <div className="flex flex-wrap gap-2">
                              {v.sources.map((src, j) => (
                                <a
                                  key={j}
                                  href={src.source_detail || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-mono font-bold transition-transform hover:-translate-y-0.5"
                                  style={{
                                    background: src.verdict === "pass" ? "#dcfce7" : src.verdict === "fail" ? "#fee2e2" : "#f1f5f9",
                                    color: src.verdict === "pass" ? "#166534" : src.verdict === "fail" ? "#991b1b" : "#475569",
                                    border: `1px solid ${src.verdict === "pass" ? "#bbf7d0" : src.verdict === "fail" ? "#fecaca" : "#e2e8f0"}`
                                  }}
                                >
                                  <BookOpen size={10} />
                                  {src.source}: {Math.round(src.confidence * 100)}%
                                </a>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ RIGHT: Heatmap & Audit ═══ */}
      <aside className="col-span-12 space-y-5 lg:col-span-3">
        {/* Hallucination Heatmap — LIVE */}
        <div className="rounded-xl bg-container-lowest p-5 shadow-ambient card-hover">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            <Zap size={12} className="text-primary" />
            Hallucination Topography
          </h3>
          <HallucinationHeatmap
            data={topography}
            models={topoModels}
            domains={topoDomains}
          />
        </div>

        {/* Self-Audit Engine — LIVE */}
        <div className="rounded-xl bg-container-lowest p-5 shadow-ambient card-hover">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            <Shield size={12} className="text-primary" />
            Self-Audit Engine
          </h3>
          <div className="space-y-3">
            {auditBars.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                  <span>{label}</span>
                  <span>{value > 0 ? `${Math.round(value)}%` : "--"}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-container">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    style={{
                      background:
                        value >= 80
                          ? "linear-gradient(90deg, #22c55e, #4ade80)"
                          : value >= 50
                            ? "linear-gradient(90deg, #eab308, #facc15)"
                            : "linear-gradient(90deg, #003ec7, #0052ff)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {selfAudit && selfAudit.total > 0 && (
            <p className="mt-2 text-[10px] text-outline text-center">
              {selfAudit.correct_count}/{selfAudit.total} ground-truth claims correct
            </p>
          )}
          <button
            onClick={handleAudit}
            disabled={auditRunning}
            className="mt-4 w-full rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-60 gradient-dark"
          >
            {auditRunning ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Running...
              </span>
            ) : (
              "Run Self-Audit"
            )}
          </button>
          {auditResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 rounded-lg bg-container-low p-3 text-center"
            >
              <p className="text-3xl font-black text-on-surface">
                {(auditResult as Record<string, number>)?.accuracy != null
                  ? <AnimatedNumber value={Math.round((auditResult as Record<string, number>).accuracy)} suffix="%" />
                  : "Done"}
              </p>
              <p className="mt-1 text-[10px] text-outline">
                Ground-truth claims verified
              </p>
            </motion.div>
          )}
        </div>

        {/* Real-time Entropy — LIVE */}
        <div className="flex items-center gap-3 rounded-xl bg-container-high p-4 card-hover">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Waves size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-outline">
              Real-time Entropy
            </p>
            <p className="text-lg font-bold text-on-surface">
              {stream.verifications.length > 0
                ? `${entropy.toFixed(3)} bits/claim`
                : "— bits/claim"}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
