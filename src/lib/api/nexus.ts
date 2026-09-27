/** Master orchestration + per-module endpoints. */
import { api } from "./client";
import type {
  DerivedIndicatorsResponse,
  FeasibilityFilterResponse,
  ImplementationPlan,
  InterventionCard,
  NexusAnalyzeRequest,
  NexusJobStatus,
  OptimizeRunResponse,
  Portfolio,
  ProvenanceAudit,
  SystemStatus,
  WaterAnalyzeRequest,
  WaterAnalyzeResponse,
} from "@/lib/types";

/* Master pipeline: EO → signals → graph → feasibility → NSGA-II → plan */
export const submitAnalysis = (body: NexusAnalyzeRequest) =>
  api<NexusJobStatus>("/api/v1/nexus/analyze", { method: "POST", body });

export const getJob = (jobId: string) =>
  api<NexusJobStatus>(`/api/v1/nexus/jobs/${encodeURIComponent(jobId)}`);

/** Poll a job to completion. `onTick` fires on every status update. */
export async function pollJob(
  jobId: string,
  onTick: (s: NexusJobStatus) => void,
  { intervalMs = 1500, signal }: { intervalMs?: number; signal?: AbortSignal } = {},
): Promise<NexusJobStatus> {
  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const s = await getJob(jobId);
    onTick(s);
    if (s.status === "COMPLETED" || s.status === "FAILED") return s;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/* Module 3 — water intelligence & derived signals */
export const analyzeWater = (body: WaterAnalyzeRequest) =>
  api<WaterAnalyzeResponse>("/api/v1/water/analyze", { method: "POST", body });

export const getContextSignals = (geographyId: string) =>
  api<DerivedIndicatorsResponse>(
    `/context/${encodeURIComponent(geographyId)}/signals`,
  );

/* Module 4/5 — intervention catalogue & feasibility */
export const listInterventions = () =>
  api<InterventionCard[]>("/graph/interventions");

export const filterFeasibility = (body: {
  candidate_intervention_ids: string[];
  geography_id: string;
  budget_limit_inr: number;
  time_horizon_months: number;
  max_risk_level: string;
}) =>
  api<FeasibilityFilterResponse>("/feasibility/filter", {
    method: "POST",
    body,
  });

/* Module 6 — NSGA-II */
export const runOptimizer = (body: {
  geography_id: string;
  budget_limit_inr: number;
  time_horizon_months: number;
  objective_weights?: Record<string, number>;
}) =>
  api<OptimizeRunResponse>("/api/v1/optimize/run", {
    method: "POST",
    body,
    timeoutMs: 120_000,
  });

export const getParetoPortfolios = () =>
  api<{ status: string; portfolios: Portfolio[] }>("/api/v1/portfolio/pareto", {
    timeoutMs: 120_000,
  });

/* Module 7 — implementation plan & provenance */
export const createImplementationPlan = (portfolioId: string) =>
  api<ImplementationPlan>(
    `/api/v1/portfolio/${encodeURIComponent(portfolioId)}/implementation-plan`,
    { method: "POST", timeoutMs: 120_000 },
  );

export const getProvenance = (portfolioId: string) =>
  api<ProvenanceAudit>(`/provenance/${encodeURIComponent(portfolioId)}`);

/* Telemetry */
export const getSystemStatus = () =>
  api<SystemStatus>("/api/v1/system/status", { timeoutMs: 8000 });
