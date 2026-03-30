/* ── Settings Page — Premium Interactive Controls ─────────────── */
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Cpu,
  Database,
  Globe,
  Gauge,
  Save,
  Check,
} from "lucide-react";
import { getSettings, updateSettings, getTopography } from "@/lib/api";

const TABS = [
  { key: "trust", label: "Trust Threshold", icon: Gauge },
  { key: "pipeline", label: "Pipeline Components", icon: Cpu },
  { key: "models", label: "Model Performance", icon: Database },
  { key: "sources", label: "Source Weights", icon: Globe },
];

/* ── Custom Toggle Switch ─────────────────────────────────────── */
function Toggle({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="group flex items-center gap-3"
      title={`Toggle ${label}`}
    >
      <div
        className="relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300"
        style={{
          background: active
            ? "linear-gradient(135deg, #003ec7, #0052ff)"
            : "var(--color-container)",
        }}
      >
        <motion.div
          className="absolute size-4 rounded-full bg-white shadow-md"
          animate={{ x: active ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      </div>
      <span className="text-xs font-bold text-on-surface-variant group-hover:text-on-surface">
        {label}
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("trust");
  const [threshold, setThreshold] = useState(0.6);
  
  const [sourceWeights, setSourceWeights] = useState<Record<string, Record<string, number>>>({
    Medical: { ai_search: 0.0, pubmed: 0.4, wikidata: 0.1, factcheck: 0.1, wolfram: 0.1, bing: 0.15, cross_model: 0.15 },
    Legal: { ai_search: 0.0, pubmed: 0.05, wikidata: 0.15, factcheck: 0.15, wolfram: 0.05, bing: 0.3, cross_model: 0.3 },
    Finance: { ai_search: 0.0, pubmed: 0.05, wikidata: 0.1, factcheck: 0.15, wolfram: 0.3, bing: 0.2, cross_model: 0.2 },
    General: { ai_search: 0.0, pubmed: 0.1, wikidata: 0.3, factcheck: 0.25, wolfram: 0.15, bing: 0.1, cross_model: 0.1 }
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* Pipeline component toggles */
  const [components, setComponents] = useState({
    shield: true,
    classifier: true,
    router: true,
    decomposer: true,
    verifier: true,
    consensus: true,
    profiler: true,
  });

  /* Model performance data */
  const [models, setModels] = useState<
    { model: string; domains: { domain: string; score: number }[] }[]
  >([]);

  useEffect(() => {
    getSettings()
      .then((s) => {
        const sRecord = s as Record<string, unknown>;
        if (typeof sRecord?.trust_threshold === "number") {
          setThreshold(sRecord.trust_threshold);
        }
        if (sRecord?.source_weights) {
          setSourceWeights(sRecord.source_weights as Record<string, Record<string, number>>);
        }
      })
      .catch(console.error);

    getTopography()
      .then((res) => {
        const modelMap: Record<string, { domain: string; score: number }[]> = {};
        (res.topography as { model: string; domain: string; reliability_score: number }[]).forEach(
          (entry) => {
            if (!modelMap[entry.model]) modelMap[entry.model] = [];
            modelMap[entry.model].push({
              domain: entry.domain,
              score: entry.reliability_score,
            });
          }
        );
        setModels(
          Object.entries(modelMap).map(([model, domains]) => ({ model, domains }))
        );
      })
      .catch(console.error);
  }, []);

  /* Impact analysis */
  const impactText = useMemo(() => {
    if (threshold >= 0.85) return { text: "Very Strict — Only highest-confidence claims pass", color: "#ef4444" };
    if (threshold >= 0.7) return { text: "Conservative — Balanced precision and recall", color: "#eab308" };
    if (threshold >= 0.5) return { text: "Moderate — Reasonable confidence required", color: "#003ec7" };
    return { text: "Permissive — Low bar for claim acceptance", color: "#22c55e" };
  }, [threshold]);

  /* Weight sum validation */
  const weightErrors = useMemo(() => {
    const errors: Record<string, number> = {};
    for (const [domain, weights] of Object.entries(sourceWeights)) {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.01) {
        errors[domain] = Math.round(sum * 100) / 100;
      }
    }
    return errors;
  }, [sourceWeights]);

  const hasWeightErrors = Object.keys(weightErrors).length > 0;

  const handleSave = async () => {
    if (hasWeightErrors) {
      toast.error("Source weights must sum to 1.0 for each domain");
      return;
    }
    setSaving(true);
    try {
      await updateSettings({ trust_threshold: threshold, components, source_weights: sourceWeights });
      setSaved(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-on-surface">
            Settings
          </h1>
          <p className="text-xs text-outline">
            Configure verification thresholds, pipeline components, and model preferences
          </p>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-on-primary transition-all hover:shadow-glow disabled:opacity-60 gradient-primary"
        >
          {saved ? (
            <Check size={14} />
          ) : saving ? (
            <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Save size={14} />
          )}
          {saved ? "Saved!" : saving ? "Saving..." : "Save"}
        </motion.button>
      </div>

      {/* Tab Switcher */}
      <div className="relative flex gap-1 rounded-xl bg-container-low p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="relative z-10 flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors"
            style={{
              color:
                activeTab === tab.key
                  ? "var(--color-primary)"
                  : "var(--color-outline)",
            }}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="settings-tab-indicator"
                className="absolute inset-0 rounded-lg bg-container-lowest shadow-sm"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <tab.icon size={14} />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl bg-container-lowest p-6 shadow-ambient"
      >
        {/* ── Trust Threshold ─────────────────────────────────── */}
        {activeTab === "trust" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                Trust Score Threshold
              </h3>
              <p className="text-xs text-outline">
                Claims scoring below this threshold will be flagged as potentially unreliable
              </p>
            </div>

            {/* Premium Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-on-surface">
                  {Math.round(threshold * 100)}%
                </span>
                <motion.span
                  key={impactText.text}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ background: impactText.color }}
                >
                  {impactText.text.split("—")[0].trim()}
                </motion.span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(threshold * 100)}
                  onChange={(e) => setThreshold(parseInt(e.target.value) / 100)}
                  className="slider-custom w-full"
                />
                {/* Tick marks */}
                <div className="flex justify-between mt-1 px-1">
                  {[0, 25, 50, 75, 100].map((tick) => (
                    <span key={tick} className="text-[8px] font-mono text-outline">
                      {tick}%
                    </span>
                  ))}
                </div>
              </div>

              <motion.div
                key={impactText.text}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-outline-variant/20 bg-surface p-4"
              >
                <p className="text-xs font-bold" style={{ color: impactText.color }}>
                  Impact Analysis
                </p>
                <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">
                  {impactText.text}
                </p>
              </motion.div>
            </div>
          </div>
        )}

        {/* ── Pipeline Components ─────────────────────────────── */}
        {activeTab === "pipeline" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                Pipeline Components
              </h3>
              <p className="text-xs text-outline">
                Enable or disable individual verification pipeline stages
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(components).map(([key, active], i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-lg border border-outline-variant/15 bg-surface p-4"
                >
                  <div>
                    <p className="text-sm font-bold capitalize text-on-surface">
                      {key}
                    </p>
                    <p className="text-[10px] text-outline">
                      {key === "shield" && "Content safety filter"}
                      {key === "classifier" && "Domain classification engine"}
                      {key === "router" && "Intelligent model routing"}
                      {key === "decomposer" && "Atomic claim extraction"}
                      {key === "verifier" && "Multi-source verification"}
                      {key === "consensus" && "Weighted score aggregation"}
                      {key === "profiler" && "Bayesian reliability tracking"}
                    </p>
                  </div>
                  <Toggle
                    active={active}
                    onToggle={() =>
                      setComponents((c) => ({ ...c, [key]: !c[key as keyof typeof c] }))
                    }
                    label=""
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Model Performance ───────────────────────────────── */}
        {activeTab === "models" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                Model Performance by Domain
              </h3>
              <p className="text-xs text-outline">
                Bayesian reliability scores per model across verification domains
              </p>
            </div>
            {models.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Cpu size={24} className="text-outline-variant mb-2 animate-float" />
                <p className="text-xs font-bold text-on-surface-variant">
                  No performance data yet
                </p>
                <p className="text-[10px] text-outline">
                  Run verification queries to build model profiles
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {models.map((m) => (
                  <div
                    key={m.model}
                    className="rounded-lg border border-outline-variant/15 bg-surface p-4"
                  >
                    <p className="mb-3 text-sm font-bold text-on-surface">
                      {m.model}
                    </p>
                    <div className="space-y-2">
                      {m.domains.map((d) => {
                        const pct = Math.round(d.score * 100);
                        return (
                          <div key={d.domain} className="flex items-center gap-3">
                            <span className="w-16 text-right text-[10px] font-bold text-outline">
                              {d.domain}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-container">
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                style={{
                                  background:
                                    pct >= 80
                                      ? "linear-gradient(90deg, #22c55e, #4ade80)"
                                      : pct >= 50
                                        ? "linear-gradient(90deg, #eab308, #facc15)"
                                        : "linear-gradient(90deg, #ef4444, #f87171)",
                                }}
                              />
                            </div>
                            <span className="w-8 text-[10px] font-bold text-on-surface">
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Source Weights ───────────────────────────────────── */}
        {activeTab === "sources" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                Source Weights
              </h3>
              <p className="text-xs text-outline">
                Domain-specific weighted consensus configuration
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-outline-variant/15">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-container-low">
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-outline">
                      Source
                    </th>
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-outline">
                      Medical
                    </th>
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-outline">
                      Legal
                    </th>
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-outline">
                      Finance
                    </th>
                    <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-outline">
                      General
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "pubmed", label: "PubMed" },
                    { key: "wikidata", label: "Wikidata" },
                    { key: "factcheck", label: "Google Fact Check" },
                    { key: "wolfram", label: "Wolfram Alpha" },
                    { key: "bing", label: "Bing Search" },
                    { key: "cross_model", label: "NLI Engine" },
                  ].map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-outline-variant/10 transition-colors hover:bg-container-low/50"
                    >
                      <td className="px-4 py-2 font-bold text-on-surface">
                        {row.label}
                      </td>
                      {["Medical", "Legal", "Finance", "General"].map((domain) => {
                        const w = sourceWeights[domain]?.[row.key] || 0;
                        return (
                          <td key={domain} className="px-4 py-2 font-mono text-on-surface-variant">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              max="1"
                              value={w}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setSourceWeights((prev) => ({
                                  ...prev,
                                  [domain]: { ...prev[domain], [row.key]: val },
                                }));
                              }}
                              className="w-16 bg-transparent text-on-surface text-[10px] p-1 border border-outline-variant/30 rounded focus:border-primary focus:outline-none"
                              style={{
                                background:
                                  w >= 0.25
                                    ? "rgba(0,62,199,0.1)"
                                    : w >= 0.15
                                      ? "rgba(0,62,199,0.05)"
                                      : "transparent",
                                fontWeight: w >= 0.25 ? 700 : 500,
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-outline text-center">
              Customizable domain-specific consensus scoring (saved dynamically to DB)
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
