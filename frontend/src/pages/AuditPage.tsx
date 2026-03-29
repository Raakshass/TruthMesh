/* ── Audit Page — Premium Data Density ────────────────────────── */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  BarChart3,
  FileText,
  Shield,
  TrendingUp,
} from "lucide-react";
import { getAuditLog } from "@/lib/api";
import type { AuditEntry } from "@/lib/types";

/* ── Animated Counter ─────────────────────────────────────────── */
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{display}</>;
}

const DOMAINS = ["All", "medical", "legal", "finance", "general", "scientific"];
const PAGE_SIZE = 20;

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<"timestamp" | "trust_score">("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [domainFilter, setDomainFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    getAuditLog()
      .then((data) => setEntries(data as AuditEntry[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let f = entries;
    if (domainFilter !== "All") {
      f = f.filter((e) => e.domain === domainFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      f = f.filter((e) => e.query.toLowerCase().includes(q) || e.model.toLowerCase().includes(q));
    }
    f.sort((a, b) => {
      const aVal = sortField === "timestamp" ? new Date(a.timestamp).getTime() : a.trust_score;
      const bVal = sortField === "timestamp" ? new Date(b.timestamp).getTime() : b.trust_score;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return f;
  }, [entries, domainFilter, searchTerm, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── Stats ──────────────────────────────────────────────────── */
  const avgTrust = useMemo(
    () =>
      entries.length > 0
        ? entries.reduce((s, e) => s + e.trust_score, 0) / entries.length
        : 0,
    [entries]
  );
  const highTrust = useMemo(() => entries.filter((e) => e.trust_score >= 0.8).length, [entries]);

  const stats = [
    {
      label: "Total Queries",
      value: entries.length,
      icon: FileText,
      gradient: "linear-gradient(135deg, #003ec7, #0052ff)",
    },
    {
      label: "Avg Trust",
      value: Math.round(avgTrust * 100),
      suffix: "%",
      icon: BarChart3,
      gradient: "linear-gradient(135deg, #22c55e, #4ade80)",
    },
    {
      label: "High Confidence",
      value: highTrust,
      icon: Shield,
      gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    },
    {
      label: "Unique Models",
      value: new Set(entries.map((e) => e.model)).size,
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #005479, #0284c7)",
    },
  ];

  const toggleSort = (field: "timestamp" | "trust_score") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-on-surface">
          Audit Log
        </h1>
        <p className="text-xs text-outline">
          Complete verification history with claim-level detail
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="relative overflow-hidden rounded-xl bg-container-lowest p-4 shadow-ambient card-hover"
          >
            <div
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg opacity-15"
              style={{ background: stat.gradient }}
            >
              <stat.icon size={16} className="text-white" />
            </div>
            <p className="text-2xl font-black text-on-surface">
              <CountUp value={stat.value} />
              {(stat as { suffix?: string }).suffix || ""}
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-outline">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Domain Chips */}
        <div className="flex flex-wrap gap-1.5">
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => {
                setDomainFilter(d);
                setPage(0);
              }}
              className="rounded-full px-3 py-1 text-xs font-bold transition-all"
              style={{
                background:
                  domainFilter === d
                    ? "var(--color-primary)"
                    : "var(--color-container-low)",
                color:
                  domainFilter === d
                    ? "var(--color-on-primary)"
                    : "var(--color-on-surface-variant)",
              }}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            placeholder="Search queries or models..."
            className="w-full rounded-lg border border-outline-variant/30 bg-container-lowest py-2 pl-8 pr-3 text-xs text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/12"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-outline-variant/15 bg-container-lowest shadow-ambient">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/15">
              {[
                { key: "timestamp" as const, label: "Timestamp" },
                { key: null, label: "Query" },
                { key: null, label: "Model" },
                { key: null, label: "Domain" },
                { key: "trust_score" as const, label: "Trust Score" },
                { key: null, label: "" },
              ].map((col, ci) => (
                <th
                  key={ci}
                  onClick={col.key ? () => toggleSort(col.key!) : undefined}
                  className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-outline transition-colors hover:text-on-surface-variant select-none"
                  style={{ cursor: col.key ? "pointer" : "default" }}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.key && sortField === col.key && (
                      <ArrowUpDown size={10} className="text-primary" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-outline-variant/10">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="skeleton h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardCheck
                      size={28}
                      className="text-outline-variant animate-float"
                    />
                    <p className="text-sm font-bold text-on-surface-variant">
                      No audit entries found
                    </p>
                    <p className="text-xs text-outline">
                      Run a verification query to generate audit records
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((entry) => {
                const isExpanded = expandedRow === entry.query_id;
                const trustPct = Math.round(entry.trust_score * 100);
                return (
                  <motion.tbody key={entry.query_id} layout>
                    <motion.tr
                      layout
                      className="border-b border-outline-variant/10 transition-colors hover:bg-container-low/50"
                    >
                      <td className="px-4 py-3 font-mono text-[10px] text-outline whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-xs font-medium text-on-surface">
                          {entry.query}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-container px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">
                          {entry.model}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-container-high px-2 py-0.5 text-[10px] font-bold text-primary">
                          {entry.domain}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              background:
                                trustPct >= 80
                                  ? "#22c55e"
                                  : trustPct >= 50
                                    ? "#eab308"
                                    : "#ef4444",
                            }}
                          />
                          <div className="flex w-20 items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-container">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${trustPct}%`,
                                  background:
                                    trustPct >= 80
                                      ? "linear-gradient(90deg, #22c55e, #4ade80)"
                                      : trustPct >= 50
                                        ? "linear-gradient(90deg, #eab308, #facc15)"
                                        : "linear-gradient(90deg, #ef4444, #f87171)",
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-on-surface">
                              {trustPct}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : entry.query_id)}
                          className="rounded-md p-1 hover:bg-container"
                        >
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-outline" />
                          ) : (
                            <ChevronDown size={14} className="text-outline" />
                          )}
                        </button>
                      </td>
                    </motion.tr>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-container-low/30"
                        >
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                              {/* Query ID */}
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">
                                  Query ID
                                </p>
                                <p className="font-mono text-[10px] text-on-surface-variant break-all">
                                  {entry.query_id}
                                </p>
                              </div>
                              {/* Routing Reason */}
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">
                                  Routing Reason
                                </p>
                                <p className="text-xs text-on-surface-variant">
                                  {entry.routing_reason || "Default routing"}
                                </p>
                              </div>
                              {/* Verification Status */}
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">
                                  Status
                                </p>
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                                  style={{
                                    background: entry.verification_complete
                                      ? "rgba(34,197,94,0.12)"
                                      : "rgba(234,179,8,0.12)",
                                    color: entry.verification_complete
                                      ? "#22c55e"
                                      : "#eab308",
                                  }}
                                >
                                  <div
                                    className="size-1.5 rounded-full"
                                    style={{
                                      background: entry.verification_complete
                                        ? "#22c55e"
                                        : "#eab308",
                                    }}
                                  />
                                  {entry.verification_complete ? "Verified" : "Pending"}
                                </span>
                              </div>
                            </div>
                            {/* Full query text */}
                            <div className="mt-3 rounded-lg bg-container-lowest p-3 border border-outline-variant/15">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">
                                Full Query
                              </p>
                              <p className="text-xs text-on-surface leading-relaxed">
                                {entry.query}
                              </p>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </motion.tbody>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:bg-container disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-outline">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:bg-container disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
