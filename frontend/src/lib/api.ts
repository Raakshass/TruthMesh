/* ── TruthMesh API Client ────────────────────────────────────────── */
import ky from "ky";
import type {
  QueryResponse,
  DashboardData,
  AuditData,
  SettingsData,
  User,
} from "./types";

const api = ky.create({
  prefixUrl: "/",
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = sessionStorage.getItem("tm_token");
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401 || response.status === 303) {
          sessionStorage.removeItem("tm_token");
          window.location.href = "/login";
        }
      },
    ],
  },
});

/* ── Auth ──────────────────────────────────────────────────────── */

export async function login(
  username: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const body = new URLSearchParams({ username, password });
  const res = await ky.post("token", { body });
  const data = await res.json<{ access_token: string; token_type: string }>();
  sessionStorage.setItem("tm_token", data.access_token);
  return data;
}

export async function getMe(): Promise<User> {
  return api.get("api/me").json<User>();
}

/* ── Dashboard ────────────────────────────────────────────────── */

export async function getDashboardData(): Promise<DashboardData> {
  return api.get("api/dashboard").json<DashboardData>();
}

export async function getTopography() {
  return api
    .get("api/topography")
    .json<{ topography: unknown[]; models: string[]; domains: string[] }>();
}

export async function submitQuery(query: string): Promise<QueryResponse> {
  return api.post("api/query", { json: { query } }).json<QueryResponse>();
}

export async function runSelfAudit() {
  return api.post("api/run-self-audit").json();
}

export async function getSelfAuditStats() {
  return api.get("api/self-audit").json();
}

/* ── Audit ────────────────────────────────────────────────────── */

export async function getAuditData(): Promise<AuditData> {
  return api.get("api/audit").json<AuditData>();
}

/* ── Settings ─────────────────────────────────────────────────── */

export async function getSettingsData(): Promise<SettingsData> {
  return api.get("api/settings").json<SettingsData>();
}

/* ── SSE Stream ───────────────────────────────────────────────── */

export function createVerifyStream(queryId: string): EventSource {
  return new EventSource(`/api/verify/${queryId}`);
}

/* ── Pipeline ─────────────────────────────────────────────────── */

export async function getRecentQuery() {
  return api.get("api/recent-query").json<{
    query_id: string | null;
    query?: string;
    domain?: string;
    model?: string;
    trust_score?: number;
    complete?: boolean;
    log?: { type: string; text: string }[];
  }>();
}

export default api;
