/* ── Export Button — Premium ───────────────────────────────────── */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Check, FileDown } from "lucide-react";
import type { ClaimVerification, OverallTrust } from "@/lib/types";

interface Props {
  queryText: string;
  verifications: ClaimVerification[];
  overallTrust: OverallTrust | null;
  responseText?: string;
  responseModel?: string;
}

export default function ExportButton({
  queryText,
  verifications,
  overallTrust,
  responseText,
  responseModel,
}: Props) {
  const [done, setDone] = useState(false);

  const handleExport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      query: queryText,
      model: responseModel ?? "unknown",
      response: responseText ?? "",
      overall_trust: overallTrust,
      claims: verifications.map((v) => ({
        index: v.index,
        claim: v.claim,
        verdict: v.consensus.final_verdict,
        final_confidence: v.consensus.final_confidence,
        agreement: Math.max(...Object.values(v.consensus.verdict_distribution || { default: 0 }), 0),
        sources: v.sources.map((s) => ({
          source: s.source,
          verdict: s.verdict,
          confidence: s.confidence,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `truthmesh-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  const sizeEstimate = new Blob([JSON.stringify({ verifications })]).size;
  const sizeStr = sizeEstimate > 1024 ? `~${(sizeEstimate / 1024).toFixed(1)}KB` : `~${sizeEstimate}B`;

  return (
    <motion.button
      onClick={handleExport}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      title={`Export report (${sizeStr})`}
      className="group flex items-center gap-1.5 rounded-full bg-container-high px-3 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:bg-container-highest hover:text-primary"
    >
      <AnimatePresence mode="wait">
        {done ? (
          <motion.span
            key="check"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Check size={14} className="text-trust-pass" />
          </motion.span>
        ) : (
          <motion.span
            key="download"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="transition-transform group-hover:-translate-y-0.5"
          >
            <FileDown size={14} />
          </motion.span>
        )}
      </AnimatePresence>
      {done ? "Saved" : "Export"}
    </motion.button>
  );
}
