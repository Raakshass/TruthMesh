/* ── Dashboard Page ───────────────────────────────────────────────── */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  GitBranch,
} from "lucide-react";
import { useEventStream } from "@/hooks/useEventStream";
import { submitQuery, getDashboardData, runSelfAudit } from "@/lib/api";
import type { PipelineStep, DashboardData, ClaimVerification } from "@/lib/types";

const DEMO_SCENARIOS = [
  {
    query: "What are the drug interactions between metformin and lisinopril?",
    icon: Stethoscope,
    label: "Medical",
    sub: "Drug Interaction Analysis",
    color: "#ba1a1a",
  },
  {
    query: "What are the key precedents in Indian contract law for force majeure?",
    icon: Scale,
    label: "Legal",
    sub: "Force Majeure Precedents",
    color: "#003ec7",
  },
  {
    query: "What is the current Basel III capital adequacy ratio requirement?",
    icon: Landmark,
    label: "Finance",
    sub: "Basel III Capital Ratios",
    color: "#005479",
  },
  {
    query: "What are the legal implications of AI-generated medical diagnoses in India?",
    icon: FlaskConical,
    label: "AI + Law",
    sub: "Cross-Domain Analysis",
    color: "#005479",
  },
  {
    query: "Is GPT-4 reliable for generating differential diagnoses in rare diseases?",
    icon: BookOpen,
    label: "AI Reliability",
    sub: "Hallucination Risk Assessment",
    color: "#515f74",
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

export default function DashboardPage() {
  const [queryText, setQueryText] = useState("");
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<Record<string, unknown> | null>(null);

  const stream = useEventStream();

  useEffect(() => {
    getDashboardData().then(setDashData).catch(console.error);
  }, []);

  const handleSubmit = useCallback(
    async (query: string) => {
      if (!query.trim() || submitting) return;
      setSubmitting(true);
      stream.reset();

      try {
        const res = await submitQuery(query);
        if (res.blocked) {
          alert("Query blocked by Shield Agent: " + res.shield?.reason);
          return;
        }
        stream.startStream(res.query_id);
      } catch (err) {
        console.error("Submit error:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, stream]
  );

  const handleAudit = async () => {
    setAuditRunning(true);
    try {
      const result = await runSelfAudit();
      setAuditResult(result as Record<string, unknown>);
    } finally {
      setAuditRunning(false);
    }
  };

  const trustScore = stream.overallTrust?.overall_score;
  const trustPct = trustScore != null ? Math.round(trustScore * 100) : null;
  const arcOffset = trustPct != null ? 351.8 - (351.8 * trustPct) / 100 : 351.8;

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-5">
      {/* ═══ LEFT: Query & Scenarios ═══ */}
      <aside className="col-span-12 space-y-4 lg:col-span-3">
        {/* Query Input */}
        <div className="rounded-xl bg-container-lowest p-5 shadow-ambient">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Analyze Query
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(queryText);
            }}
          >
            <textarea
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              rows={3}
              placeholder="Enter a claim or question to verify..."
              className="w-full resize-none rounded-lg border-[1.5px] border-outline-variant bg-surface p-3 text-sm text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-primary focus:ring-3 focus:ring-primary/12"
            />
            <button
              type="submit"
              disabled={submitting || stream.status === "streaming"}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-xs font-bold uppercase tracking-widest text-on-primary transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #003ec7, #0052ff)",
              }}
            >
              <Search size={14} />
              {submitting ? "Sending..." : "Analyze"}
            </button>
          </form>
        </div>

        {/* Demo Scenarios */}
        <div className="rounded-xl bg-container-lowest p-5 shadow-ambient">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Demo Scenarios
          </h3>
          <div className="space-y-1.5">
            {DEMO_SCENARIOS.map((scenario) => (
              <button
                key={scenario.label}
                onClick={() => {
                  setQueryText(scenario.query);
                  handleSubmit(scenario.query);
                }}
                className="flex w-full items-center gap-3 rounded-lg bg-container-low p-3 text-left transition-all hover:bg-container"
              >
                <scenario.icon size={18} style={{ color: scenario.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-on-surface">
                    {scenario.label}
                  </p>
                  <p className="text-[10px] text-outline">{scenario.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline Health */}
        <div
          className="relative overflow-hidden rounded-xl p-5 text-white"
          style={{
            background: "linear-gradient(135deg, #131b2e, #283044)",
          }}
        >
          <Shield
            size={64}
            className="absolute -right-2 -top-2 opacity-5"
          />
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-outline">
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
          <div className="absolute -right-20 -top-20 size-40 rounded-full bg-primary/5 blur-3xl" />
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
                  ✓ {stream.overallTrust.verified_claims}/{stream.overallTrust.total_claims} verified
                </span>
              </motion.div>
            )}
          </div>
          <div
            className="relative flex items-center justify-center"
            style={{ opacity: trustPct != null ? 1 : 0.3 }}
          >
            <svg className="-rotate-90" width="128" height="128">
              <circle
                cx="64" cy="64" r="56" fill="transparent"
                stroke="#eaedff" strokeWidth="8"
              />
              <circle
                cx="64" cy="64" r="56" fill="transparent"
                stroke="#003ec7" strokeWidth="8"
                strokeDasharray="351.8"
                strokeDashoffset={arcOffset}
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <span className="absolute text-2xl font-black text-on-surface">
              {trustPct != null ? `${trustPct}%` : "--%"}
            </span>
          </div>
        </div>

        {/* AI Response */}
        <AnimatePresence>
          {stream.responseText && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-container-lowest p-5 shadow-ambient"
            >
              <div className="mb-3 flex items-center gap-2">
                <Bot size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-on-surface">
                  AI Response
                </h3>
                <span className="ml-auto font-mono text-[10px] text-outline">
                  {stream.responseModel}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                {stream.responseText}
              </p>
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
              <h3 className="font-bold text-on-surface">
                Claim Verification Feed
              </h3>
              {stream.verifications.map((v: ClaimVerification, i: number) => (
                <motion.div
                  key={v.index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl bg-container-lowest p-4 shadow-ambient"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">
                      Claim {v.index + 1}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
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
                  <p className="text-sm text-on-surface-variant">{v.claim}</p>
                  <div className="mt-3 flex gap-2">
                    {v.sources.map((src, j) => (
                      <span
                        key={j}
                        className="rounded-md px-2 py-0.5 text-[9px] font-mono font-bold"
                        style={{
                          background:
                            src.verdict === "pass" ? "#dcfce7" : "#fee2e2",
                          color:
                            src.verdict === "pass" ? "#166534" : "#991b1b",
                        }}
                      >
                        {src.source}:{" "}
                        {Math.round(src.confidence * 100)}%
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ RIGHT: Heatmap & Audit ═══ */}
      <aside className="col-span-12 space-y-5 lg:col-span-3">
        {/* Hallucination Heatmap placeholder */}
        <div className="rounded-xl bg-container-lowest p-5 shadow-ambient">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Hallucination Heatmap
          </h3>
          <div className="flex h-[200px] items-center justify-center rounded-lg bg-container-low">
            <p className="text-xs text-outline">
              Heatmap renders after first query
            </p>
          </div>
        </div>

        {/* Self-Audit Engine */}
        <div className="rounded-xl bg-container-lowest p-5 shadow-ambient">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Self-Audit Engine
          </h3>
          <div className="space-y-3">
            {["Data Integrity", "Reasoning Consistency", "Source Diversity"].map(
              (label) => (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                    <span>{label}</span>
                    <span>--</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-container">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: "0%",
                        background:
                          "linear-gradient(90deg, #003ec7, #0052ff)",
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
          <button
            onClick={handleAudit}
            disabled={auditRunning}
            className="mt-4 w-full rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-inverse-surface/90 disabled:opacity-60"
            style={{ background: "#131b2e" }}
          >
            {auditRunning ? "Running..." : "Run Self-Audit"}
          </button>
          {auditResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 rounded-lg bg-container-low p-3 text-center"
            >
              <p className="text-3xl font-black text-on-surface">
                {(auditResult as any)?.accuracy
                  ? `${Math.round((auditResult as any).accuracy * 100)}%`
                  : "Done"}
              </p>
              <p className="mt-1 text-[10px] text-outline">
                Ground-truth claims verified
              </p>
            </motion.div>
          )}
        </div>

        {/* Real-time Entropy */}
        <div className="flex items-center gap-3 rounded-xl bg-container-high p-4">
          <Waves size={20} className="text-primary" />
          <div>
            <p className="text-[10px] font-bold uppercase text-outline">
              Real-time Entropy
            </p>
            <p className="text-lg font-bold text-on-surface">
              0.024 bits/claim
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
