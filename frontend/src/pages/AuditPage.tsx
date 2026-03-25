/* ── Audit Log Page ───────────────────────────────────────────────── */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { getAuditData } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/lib/types";

type SortField = "timestamp" | "domain" | "model" | "trust_score";
type SortDir = "asc" | "desc";

export default function AuditPage() {
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [avgTrust, setAvgTrust] = useState(0);
  const [hallRate, setHallRate] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAuditData()
      .then((d) => {
        setAudit(d.audit_data);
        setAvgTrust(d.avg_trust);
        setHallRate(d.hallucination_rate);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const domains = useMemo(
    () => ["All", ...new Set(audit.map((a) => a.domain))],
    [audit]
  );

  const filtered = useMemo(() => {
    let data = [...audit];
    if (domainFilter !== "All") {
      data = data.filter((a) => a.domain === domainFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(
        (a) =>
          a.query.toLowerCase().includes(q) ||
          a.domain.toLowerCase().includes(q) ||
          a.model.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [audit, domainFilter, searchTerm, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === "asc" ? (
        <ChevronUp size={12} />
      ) : (
        <ChevronDown size={12} />
      )
    ) : null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-3 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-on-surface">
          Audit Log
        </h1>
        <p className="mt-0.5 text-sm text-outline">
          Complete verification history with trust score analytics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-container-lowest p-5 shadow-ambient"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-outline">
                Total Queries
              </p>
              <p className="text-2xl font-extrabold text-on-surface">
                {audit.length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl bg-container-lowest p-5 shadow-ambient"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-trust-pass/10">
              <TrendingUp size={18} className="text-trust-pass" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-outline">
                Avg Trust Score
              </p>
              <p className="text-2xl font-extrabold text-on-surface">
                {Math.round(avgTrust * 100)}%
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-container-lowest p-5 shadow-ambient"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-error/10">
              <AlertTriangle size={18} className="text-error" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-outline">
                Hallucination Rate
              </p>
              <p className="text-2xl font-extrabold text-on-surface">
                {Math.round(hallRate * 100)}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search queries, domains, models..."
            className="w-full rounded-lg bg-container-lowest py-2.5 pl-9 pr-4 text-sm text-on-surface shadow-ambient outline-none placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="rounded-lg bg-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface shadow-ambient outline-none"
        >
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-container-lowest shadow-ambient">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {(
                  [
                    ["timestamp", "Timestamp"],
                    ["domain", "Domain"],
                    ["model", "Model"],
                    ["trust_score", "Trust Score"],
                  ] as [SortField, string][]
                ).map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
                    className="cursor-pointer whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-outline select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      {label} <SortIcon field={field} />
                    </span>
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-outline">
                  Query
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-outline">
                    No audit entries found
                  </td>
                </tr>
              ) : (
                filtered.map((entry, i) => {
                  const trustPct = Math.round(entry.trust_score * 100);
                  return (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      className="border-b border-outline-variant/10 transition-colors hover:bg-container-low"
                    >
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-outline">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-container-high px-2.5 py-0.5 text-xs font-bold text-on-surface">
                          {entry.domain}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">
                        {entry.model}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-container">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${trustPct}%`,
                                background:
                                  trustPct >= 80
                                    ? "linear-gradient(90deg, #003ec7, #0052ff)"
                                    : trustPct >= 50
                                      ? "linear-gradient(90deg, #ca8a04, #eab308)"
                                      : "linear-gradient(90deg, #dc2626, #ef4444)",
                              }}
                            />
                          </div>
                          <span
                            className={cn(
                              "font-mono text-xs font-bold",
                              trustPct >= 80
                                ? "text-primary"
                                : trustPct >= 50
                                  ? "text-trust-medium"
                                  : "text-trust-low"
                            )}
                          >
                            {trustPct}%
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[300px] truncate px-5 py-3 text-xs text-on-surface-variant">
                        {entry.query}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
