/* ── Hallucination Heatmap — Premium ──────────────────────────── */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Grid3x3 } from "lucide-react";
import type { TopographyEntry } from "@/lib/types";

interface Props {
  data: TopographyEntry[];
  models: string[];
  domains: string[];
}

export default function HallucinationHeatmap({ data, models, domains }: Props) {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [tooltip, setTooltip] = useState<{
    model: string;
    domain: string;
    score: number;
    x: number;
    y: number;
  } | null>(null);

  const grid = useMemo(() => {
    const g: (number | null)[][] = models.map(() => domains.map(() => null));
    data.forEach((entry) => {
      const ri = models.indexOf(entry.model);
      const ci = domains.indexOf(entry.domain);
      if (ri >= 0 && ci >= 0) {
        g[ri][ci] = entry.reliability_score;
      }
    });
    return g;
  }, [data, models, domains]);

  const getColor = (score: number | null): string => {
    if (score === null) return "#f1f5f9";
    if (score >= 0.8) return "#22c55e";
    if (score >= 0.6) return "#4ade80";
    if (score >= 0.4) return "#eab308";
    if (score >= 0.2) return "#f97316";
    return "#ef4444";
  };

  if (models.length === 0 || domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-container-high animate-float">
          <Grid3x3 size={18} className="text-outline" />
        </div>
        <p className="text-xs font-bold text-on-surface-variant">
          No topography data yet
        </p>
        <p className="text-[10px] text-outline">
          Run a verification query to populate the heatmap
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Column headers */}
      <div className="mb-1 flex pl-16">
        {domains.map((d, i) => (
          <p
            key={d}
            className="flex-1 text-center text-[8px] font-bold uppercase tracking-widest transition-colors"
            style={{
              color:
                hoverCell?.col === i
                  ? "var(--color-primary)"
                  : "var(--color-outline)",
            }}
          >
            {d.slice(0, 4)}
          </p>
        ))}
      </div>

      {/* Grid */}
      {grid.map((row, ri) => (
        <div key={ri} className="flex items-center gap-1 mb-1">
          {/* Row label */}
          <p
            className="w-16 truncate text-right text-[8px] font-bold uppercase tracking-wider pr-1 transition-colors"
            style={{
              color:
                hoverCell?.row === ri
                  ? "var(--color-primary)"
                  : "var(--color-outline)",
            }}
            title={models[ri]}
          >
            {models[ri]?.split("/").pop()?.slice(0, 8) ?? models[ri]}
          </p>
          {row.map((score, ci) => (
            <motion.div
              key={ci}
              className="relative flex-1 cursor-pointer rounded-sm"
              style={{
                aspectRatio: "1",
                background: getColor(score),
                outline:
                  hoverCell?.row === ri && hoverCell.col === ci
                    ? "2px solid var(--color-primary)"
                    : "none",
                outlineOffset: "1px",
                opacity:
                  hoverCell &&
                  hoverCell.row !== ri &&
                  hoverCell.col !== ci
                    ? 0.4
                    : 1,
              }}
              whileHover={{ scale: 1.15 }}
              onMouseEnter={(e) => {
                setHoverCell({ row: ri, col: ci });
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  model: models[ri],
                  domain: domains[ci],
                  score: score ?? 0,
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                });
              }}
              onMouseLeave={() => {
                setHoverCell(null);
                setTooltip(null);
              }}
            />
          ))}
        </div>
      ))}

      {/* Tooltip — Fixed Position (no clipping) */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="pointer-events-none fixed z-[100] rounded-lg bg-inverse-surface px-3 py-2 text-xs text-inverse-on-surface shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-bold">{tooltip.model}</p>
            <p className="text-[10px] opacity-80">
              {tooltip.domain}: {Math.round(tooltip.score * 100)}% reliability
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-2 justify-center">
        <span className="text-[8px] text-outline">Low</span>
        {["#ef4444", "#f97316", "#eab308", "#4ade80", "#22c55e"].map((c) => (
          <div
            key={c}
            className="size-2.5 rounded-sm"
            style={{ background: c }}
          />
        ))}
        <span className="text-[8px] text-outline">High</span>
      </div>
    </div>
  );
}
