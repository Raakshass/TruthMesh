/* ── SSE Event Stream Store (Zustand) ────────────────────────────── */
import { create } from "zustand";
import type {
  PipelineStep,
  ClaimVerification,
  OverallTrust,
  Claim,
} from "@/lib/types";

export type StreamStatus = "idle" | "connecting" | "streaming" | "done" | "error";

interface StreamState {
  status: StreamStatus;
  activeSteps: Set<PipelineStep>;
  completedSteps: Set<PipelineStep>;
  responseText: string | null;
  responseModel: string | null;
  claims: Claim[];
  verifications: ClaimVerification[];
  overallTrust: OverallTrust | null;
  error: string | null;
  startStream: (queryId: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  status: "idle" as StreamStatus,
  activeSteps: new Set<PipelineStep>(),
  completedSteps: new Set<PipelineStep>(),
  responseText: null,
  responseModel: null,
  claims: [],
  verifications: [],
  overallTrust: null,
  error: null,
};

let esRef: EventSource | null = null;

export const useEventStream = create<StreamState>((set) => ({
  ...INITIAL_STATE,

  reset: () => {
    esRef?.close();
    esRef = null;
    set(INITIAL_STATE);
  },

  startStream: (queryId: string) => {
    esRef?.close();
    set({ ...INITIAL_STATE, status: "connecting" });

    const es = new EventSource(`/api/verify/${queryId}`);
    esRef = es;

    es.onopen = () => {
      set({ status: "streaming" });
    };

    // Pipeline step events
    const stepHandler = (stepName: PipelineStep) => (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      set((s) => {
        const completed = new Set(s.completedSteps);
        const active = new Set(s.activeSteps);

        if (data.status === "done") {
          completed.add(stepName);
          active.delete(stepName);
        } else if (data.status === "active") {
          active.add(stepName);
        }

        return { completedSteps: completed, activeSteps: active };
      });
    };

    const pipelineSteps: PipelineStep[] = [
      "shield", "classify", "route", "llm",
      "decompose", "verify", "consensus", "profile",
    ];

    for (const step of pipelineSteps) {
      es.addEventListener(step, stepHandler(step));
    }

    // Response
    es.addEventListener("response", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      set({
        responseText: data.response_text,
        responseModel: data.model,
      });
    });

    // Claims
    es.addEventListener("claims", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      set({ claims: data.claims });
    });

    // Individual verification
    es.addEventListener("verification", (e: MessageEvent) => {
      const data: ClaimVerification = JSON.parse(e.data);
      set((s) => ({
        verifications: [...s.verifications, data],
      }));
    });

    // Overall trust score
    es.addEventListener("overall_trust", (e: MessageEvent) => {
      const data: OverallTrust = JSON.parse(e.data);
      set({ overallTrust: data });
    });

    // Done
    es.addEventListener("done", () => {
      set({ status: "done" });
      es.close();
    });

    // Custom application error event from server
    es.addEventListener("error", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        set({
          status: "error",
          error: data.error || "Stream error",
        });
      } catch {
        set({
          status: "error",
          error: "Unknown stream error",
        });
      }
      es.close();
    });

    es.onerror = () => {
      // Native EventSource error — connection dropped
      if (es.readyState === EventSource.CLOSED) {
        set((s) => {
          if (s.status === "streaming" || s.status === "connecting") {
            // Stream was in progress; treat as done if we had data, error otherwise
            if (s.verifications.length > 0 || s.overallTrust) {
              return { status: "done" };
            }
            return { status: "error", error: "Connection lost. Please retry." };
          }
          return {};
        });
      }
    };
  },
}));
