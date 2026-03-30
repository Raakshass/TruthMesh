/* ── Topography Engine Page — Premium UX ─────────────────────────── */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Zap, Layers, Network, Activity, Crosshair, BarChart4 } from "lucide-react";
import { getTopography } from "@/lib/api";
import type { TopographyEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function TopographyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TopographyEntry[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ model: string; domain: string } | null>(null);

  useEffect(() => {
    getTopography()
      .then((res) => {
        setData(res.topography as TopographyEntry[]);
        setModels(res.models);
        setDomains(res.domains);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getHeatmapColor = (model: string, domain: string) => {
    const entry = data.find((d) => d.model === model && d.domain === domain);
    const score = entry ? entry.reliability_score * 100 : 0;
    if (score >= 80) return "rgba(34, 197, 94, 0.9)"; // Green
    if (score >= 50) return "rgba(234, 179, 8, 0.9)";  // Yellow
    return "rgba(239, 68, 68, 0.9)";                  // Red
  };

  const getActiveEntry = () => {
    if (!selectedCell) return null;
    return data.find(
      (d) => d.model === selectedCell.model && d.domain === selectedCell.domain
    );
  };

  const activeEntry = getActiveEntry();

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <div className="size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary shadow-glow" />
        <p className="font-mono text-sm tracking-widest text-primary uppercase">Mapping Terrain...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ═══ Header Section ═══ */}
      <header className="relative overflow-hidden rounded-2xl bg-container-lowest p-8 shadow-ambient-lg">
        <div className="absolute -right-20 -top-40 size-96 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-indigo-500/10 blur-[80px]" />
        
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 shadow-inner">
                <Map size={24} className="text-primary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-on-surface">
                Hallucination Topography
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Interact with TruthMesh's cross-disciplinary trust matrix. We compute continuous 
              empirical entropy across models to isolate domain-specific hallucination decay.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="rounded-xl border border-outline-variant/30 bg-surface/50 px-5 py-3 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Models Tracked</p>
              <p className="mt-1 text-2xl font-black text-on-surface">{models.length}</p>
            </div>
            <div className="rounded-xl border border-outline-variant/30 bg-surface/50 px-5 py-3 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Domains Mapped</p>
              <p className="mt-1 text-2xl font-black text-on-surface">{domains.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Visual Matrix ── */}
        <div className="rounded-2xl bg-container-lowest p-8 shadow-ambient lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
              <Network size={16} className="text-primary" />
              Trust Score Terrain
            </h2>
            <div className="flex items-center gap-3 rounded-full bg-surface px-4 py-1.5 text-[10px] font-bold tracking-wider text-outline border border-outline-variant/20">
              <span className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-error" /> &lt; 50%</span>
              <span className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-amber-500" /> 50-79%</span>
              <span className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-trust-pass" /> 80%+</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="min-w-[600px]">
              {/* Domain Headers */}
              <div className="mb-4 flex pl-28">
                {domains.map((domain) => (
                  <div key={domain} className="flex-1 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-outline">
                      {domain.substring(0, 4)}
                    </span>
                    <p className="mt-0.5 text-[8px] text-outline-variant uppercase">{domain}</p>
                  </div>
                ))}
              </div>

              {/* Matrix Rows */}
              <div className="space-y-4">
                {models.map((model, idx) => (
                  <motion.div
                    key={model}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group flex items-center"
                  >
                    {/* Model Label */}
                    <div className="w-28 shrink-0 pr-4 text-right">
                      <span className="font-mono text-xs font-bold text-on-surface-variant transition-colors group-hover:text-primary">
                        {model}
                      </span>
                    </div>

                    {/* Cells */}
                    <div className="flex flex-1 gap-2">
                      {domains.map((domain) => {
                        const cellColor = getHeatmapColor(model, domain);
                        const isSelected = selectedCell?.model === model && selectedCell?.domain === domain;
                        const ds = data.find((d) => d.model === model && d.domain === domain);
                        
                        return (
                          <motion.button
                            key={`${model}-${domain}`}
                            onClick={() => setSelectedCell({ model, domain })}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "relative h-14 flex-1 rounded-xl border border-white/5 transition-all",
                              isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-container-lowest shadow-glow" : "hover:shadow-md"
                            )}
                            style={{ background: cellColor }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                              <span className="rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                                {ds ? Math.round(ds.reliability_score * 100) : 0}%
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Deep Dive Sidebar ── */}
        <div className="lg:col-span-4 rounded-2xl bg-container-lowest p-6 shadow-ambient">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            <Crosshair size={16} className="text-secondary" />
            Cell Diagnostics
          </h2>

          <AnimatePresence mode="wait">
            {!selectedCell || !activeEntry ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/30 text-center px-4"
              >
                <Layers size={32} className="mb-3 text-outline-variant opacity-50" />
                <p className="text-sm font-bold text-on-surface">No Cell Selected</p>
                <p className="mt-1 text-xs text-outline">Click any matrix coordinate to view specific hallucination mechanics.</p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Metric Header */}
                <div className="rounded-xl bg-surface p-5 shadow-sm border border-outline-variant/10">
                  <div className="mb-4 flex items-center justify-between border-b border-outline-variant/10 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Model</span>
                      <p className="font-mono text-sm font-black text-on-surface">{activeEntry.model}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Domain</span>
                      <p className="font-mono text-sm font-black text-on-surface">{activeEntry.domain}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Reliability Score</p>
                      <p className="text-3xl font-black text-on-surface">
                        {Math.round(activeEntry.reliability_score * 100)}%
                      </p>
                    </div>
                    <div className="size-12 rounded-full shadow-glow-sm" style={{ background: getHeatmapColor(activeEntry.model, activeEntry.domain) }} />
                  </div>
                </div>

                {/* Sub-metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-container-low p-4">
                    <Activity size={14} className="mb-2 text-amber-500" />
                    <p className="text-[10px] font-bold uppercase text-outline line-clamp-1">Analyzed Queries</p>
                    <p className="text-lg font-bold text-on-surface">{activeEntry.total_queries}</p>
                  </div>
                  <div className="rounded-xl bg-container-low p-4">
                    <BarChart4 size={14} className="mb-2 text-trust-pass" />
                    <p className="text-[10px] font-bold uppercase text-outline line-clamp-1">Validation Pass</p>
                    <p className="text-lg font-bold text-on-surface">
                       {Math.round(activeEntry.reliability_score * activeEntry.total_queries)}
                    </p>
                  </div>
                </div>

                {/* Dynamic AI Insight */}
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-transparent p-5 border border-primary/20">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                    <Zap size={12} />
                    Engine Insight
                  </h4>
                  <p className="text-xs leading-relaxed text-on-surface-variant">
                    {activeEntry.reliability_score >= 0.8
                      ? `The ${activeEntry.model} model demonstrates exceptionally robust grounding in ${activeEntry.domain}. Factual trajectory is stable.`
                      : activeEntry.reliability_score >= 0.5
                      ? `Caution: Moderate entropy detected for ${activeEntry.model} in ${activeEntry.domain}. Cross-validation is heavily advised before deploying to production.`
                      : `Critical hallucination risk. ${activeEntry.model} frequently fabricates ${activeEntry.domain} assertions. Unsafe for unsanitized use.`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
