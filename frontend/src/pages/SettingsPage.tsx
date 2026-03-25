/* ── Settings Page ────────────────────────────────────────────────── */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Brain,
  Cpu,
  SlidersHorizontal,
  Gauge,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_COMPONENTS = [
  {
    icon: Bot,
    label: "Shield Agent",
    desc: "Azure Content Safety API with multi-category analysis",
    status: "Active",
    color: "#22c55e",
  },
  {
    icon: Cpu,
    label: "Domain Classifier",
    desc: "GPT-4o-mini zero-shot multi-label classification",
    status: "Active",
    color: "#22c55e",
  },
  {
    icon: Brain,
    label: "Smart Router",
    desc: "Entropy-weighted model selection with domain-aware scoring",
    status: "Active",
    color: "#22c55e",
  },
  {
    icon: Bot,
    label: "Verification Engine",
    desc: "Bing + cross-LLM multi-source consensus",
    status: "Active",
    color: "#22c55e",
  },
];

const MODELS = [
  {
    name: "GPT-4o",
    desc: "High accuracy, slower. Best for Medical, Legal, Science.",
    tier: "Primary",
    domains: ["Medical", "Legal", "Science"],
  },
  {
    name: "GPT-4o-mini",
    desc: "Fast, cost-efficient. Good for Finance, History, General.",
    tier: "Secondary",
    domains: ["Finance", "History", "General"],
  },
  {
    name: "Claude-3.5-Sonnet",
    desc: "Cross-LLM verification. Used as secondary validator.",
    tier: "Verification",
    domains: ["Cross-validation"],
  },
];

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(0.7);
  const [activeTab, setActiveTab] = useState<"pipeline" | "models" | "config">("pipeline");

  const thresholdPct = Math.round(threshold * 100);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-on-surface">
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-outline">
          Pipeline configuration and model management
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-container-low p-1">
        {(
          [
            ["pipeline", "Pipeline"],
            ["models", "Models"],
            ["config", "Configuration"],
          ] as ["pipeline" | "models" | "config", string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === key
                ? "bg-container-lowest text-primary shadow-ambient"
                : "text-outline hover:text-on-surface"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pipeline Tab */}
      {activeTab === "pipeline" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {PIPELINE_COMPONENTS.map((comp, i) => (
            <motion.div
              key={comp.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-container-lowest p-5 shadow-ambient"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <comp.icon size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-on-surface">
                      {comp.label}
                    </h3>
                    <span
                      className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                      style={{
                        background: `${comp.color}15`,
                        color: comp.color,
                      }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: comp.color }}
                      />
                      {comp.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-outline">{comp.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Models Tab */}
      {activeTab === "models" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {MODELS.map((model, i) => (
            <motion.div
              key={model.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-container-lowest p-5 shadow-ambient"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-lg"
                    style={{
                      background:
                        "linear-gradient(135deg, #003ec7, #0052ff)",
                    }}
                  >
                    <Bot size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">
                      {model.name}
                    </h3>
                    <p className="text-xs text-outline">{model.desc}</p>
                  </div>
                </div>
                <span className="rounded-full bg-container-high px-3 py-1 text-[10px] font-bold text-primary">
                  {model.tier}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {model.domains.map((d) => (
                  <span
                    key={d}
                    className="rounded-md bg-container-low px-2 py-0.5 text-[10px] font-medium text-on-surface-variant"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Configuration Tab */}
      {activeTab === "config" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Trust Threshold */}
          <div className="rounded-xl bg-container-lowest p-6 shadow-ambient">
            <div className="flex items-center gap-2 mb-4">
              <Gauge size={18} className="text-primary" />
              <h3 className="text-sm font-bold text-on-surface">
                Trust Score Threshold
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-outline">
                  Minimum acceptable trust score
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-extrabold",
                    thresholdPct >= 80
                      ? "bg-primary/10 text-primary"
                      : thresholdPct >= 50
                        ? "bg-trust-medium/10 text-trust-medium"
                        : "bg-trust-low/10 text-trust-low"
                  )}
                >
                  {thresholdPct}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={thresholdPct}
                onChange={(e) => setThreshold(Number(e.target.value) / 100)}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] font-medium text-outline">
                <span>Low (risky)</span>
                <span>Moderate</span>
                <span>Strict</span>
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="rounded-xl bg-container-lowest p-6 shadow-ambient">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal size={18} className="text-primary" />
              <h3 className="text-sm font-bold text-on-surface">
                Impact Analysis
              </h3>
            </div>
            <div className="rounded-lg bg-container-low p-4">
              <div className="flex items-start gap-2">
                <Info size={14} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-medium text-on-surface">
                    At {thresholdPct}% threshold:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-on-surface-variant">
                    <li>
                      • Claims scoring below {thresholdPct}% will be flagged
                    </li>
                    <li>
                      •{" "}
                      {thresholdPct >= 80
                        ? "Strict mode: Most claims will require manual review"
                        : thresholdPct >= 50
                          ? "Balanced: Moderate false-positive rate"
                          : "Relaxed: Higher risk of missed hallucinations"}
                    </li>
                    <li>
                      • Estimated{" "}
                      {thresholdPct >= 80
                        ? "60-80%"
                        : thresholdPct >= 50
                          ? "30-50%"
                          : "10-20%"}{" "}
                      of claims flagged for review
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
