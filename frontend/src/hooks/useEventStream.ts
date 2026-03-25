/* ── SSE Event Stream Hook ───────────────────────────────────────── */
import { useCallback, useRef, useState } from "react";
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
}

const INITIAL_STATE: StreamState = {
  status: "idle",
  activeSteps: new Set(),
  completedSteps: new Set(),
  responseText: null,
  responseModel: null,
  claims: [],
  verifications: [],
  overallTrust: null,
  error: null,
};

export function useEventStream() {
  const [state, setState] = useState<StreamState>(INITIAL_STATE);
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const startStream = useCallback((queryId: string) => {
    esRef.current?.close();
    setState({
      ...INITIAL_STATE,
      status: "connecting",
    });

    const es = new EventSource(`/api/verify/${queryId}`);
    esRef.current = es;

    es.onopen = () => {
      setState((s) => ({ ...s, status: "streaming" }));
    };

    // Pipeline step events
    const stepHandler = (stepName: PipelineStep) => (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((s) => {
        const completed = new Set(s.completedSteps);
        const active = new Set(s.activeSteps);

        if (data.status === "done") {
          completed.add(stepName);
          active.delete(stepName);
        } else if (data.status === "active") {
          active.add(stepName);
        }

        return { ...s, completedSteps: completed, activeSteps: active };
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
      setState((s) => ({
        ...s,
        responseText: data.response_text,
        responseModel: data.model,
      }));
    });

    // Claims
    es.addEventListener("claims", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((s) => ({ ...s, claims: data.claims }));
    });

    // Individual verification
    es.addEventListener("verification", (e: MessageEvent) => {
      const data: ClaimVerification = JSON.parse(e.data);
      setState((s) => ({
        ...s,
        verifications: [...s.verifications, data],
      }));
    });

    // Overall trust score
    es.addEventListener("overall_trust", (e: MessageEvent) => {
      const data: OverallTrust = JSON.parse(e.data);
      setState((s) => ({ ...s, overallTrust: data }));
    });

    // Done
    es.addEventListener("done", () => {
      setState((s) => ({ ...s, status: "done" }));
      es.close();
    });

    // Error
    es.addEventListener("error", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((s) => ({
        ...s,
        status: "error",
        error: data.error || "Stream error",
      }));
      es.close();
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setState((s) => {
          if (s.status === "streaming") {
            return { ...s, status: "done" };
          }
          return { ...s, status: "error", error: "Connection lost" };
        });
      }
    };
  }, []);

  return { ...state, startStream, reset };
}
