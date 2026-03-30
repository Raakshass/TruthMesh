/* ── TruthMesh Shared TypeScript Interfaces ─────────────────────── */

export interface User {
  username: string;
  role: "Admin" | "Analyst" | "Auditor" | "Viewer";
  user_id: number;
}

export interface DomainVector {
  [domain: string]: number;
}

export interface RoutingDecision {
  selected_model: string;
  reason: string;
  primary_domain: string;
  primary_domain_prob: number;
}

export interface QueryResponse {
  query_id: string;
  blocked: boolean;
  cached: boolean;
  domain_vector: DomainVector;
  routing: RoutingDecision;
  response_text?: string;
  claims?: Claim[];
  shield?: { safe: boolean; reason?: string };
}

export interface Claim {
  claim: string;
  type: string;
  confidence?: number;
}

export interface VerificationSource {
  source: string;
  source_detail: string;
  verdict: "pass" | "fail" | "inconclusive";
  confidence: number;
}

export interface ClaimConsensus {
  final_verdict: "pass" | "fail" | "inconclusive" | "partial";
  final_confidence: number;
  verdict_distribution?: Record<string, number>;
  weights_used?: Record<string, number>;
}

export interface ClaimVerification {
  index: number;
  claim: string;
  consensus: ClaimConsensus;
  sources: VerificationSource[];
}

export interface OverallTrust {
  overall_score: number;
  claim_count: number;
  pass_count: number;
  partial_count: number;
  fail_count: number;
}

export interface TopographyEntry {
  domain: string;
  model: string;
  reliability_score: number;
  total_queries: number;
}

export interface AuditEntry {
  query_id: string;
  timestamp: string;
  query: string;
  domain: string;
  model: string;
  trust_score: number;
  verification_complete: boolean;
  routing_reason: string;
}

export interface AuditData {
  audit_data: AuditEntry[];
  avg_trust: number;
  hallucination_rate: number;
}

export interface DashboardData {
  topography: TopographyEntry[];
  audit_stats: Record<string, unknown>;
  recent_queries: Record<string, unknown>[];
  demo_queries: DemoQuery[];
  models: string[];
  domains: string[];
  demo_mode: boolean;
}

export interface DemoQuery {
  query: string;
  domain: string;
  icon: string;
  label: string;
}

export interface SettingsData {
  models: ModelConfig[];
  threshold: number;
}

export interface ModelConfig {
  name: string;
  description: string;
}

export type PipelineStep =
  | "shield"
  | "classify"
  | "route"
  | "llm"
  | "decompose"
  | "verify"
  | "consensus"
  | "profile";

export interface PipelineStepEvent {
  step: PipelineStep;
  status: "done" | "active" | "pending";
  model?: string;
}

export interface SSEEvent {
  event: string;
  data: string;
}
