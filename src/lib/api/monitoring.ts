/**
 * Monitoring boundary — planned vs actual outcome tracking.
 *
 * The backend does not yet expose an outcome-observation endpoint. This module
 * defines the contract the Monitoring stage consumes so that wiring it up later
 * is a one-file change: replace the bodies with `api(...)` calls and delete
 * `NotConnectedError`. Nothing here fabricates readings.
 */
import type { ImplementationPlan } from "@/lib/types";

export class NotConnectedError extends Error {
  constructor(readonly endpoint: string) {
    super(`No backend endpoint yet for ${endpoint}`);
    this.name = "NotConnectedError";
  }
}

export interface OutcomeReading {
  indicator: string;
  unit: string;
  period: string;
  planned: number;
  actual: number;
  source: string;
}

/** Planned trajectory is derived locally from the approved plan the backend
 *  returned — it is a restatement of backend data, not new data. */
export function plannedTrajectory(plan: ImplementationPlan) {
  let elapsed = 0;
  let spent = 0;
  const points = [{ month: 0, plannedSpendInr: 0, plannedInterventions: 0 }];
  plan.intervention_sequence.forEach((step, i) => {
    elapsed += step.duration_months;
    spent += step.estimated_cost_inr;
    points.push({
      month: elapsed,
      plannedSpendInr: spent,
      plannedInterventions: i + 1,
    });
  });
  return points;
}

/** Wire to `GET /api/v1/monitoring/{plan_id}/outcomes` when it ships. */
export async function fetchActualOutcomes(
  planId: string,
): Promise<OutcomeReading[]> {
  throw new NotConnectedError(`/api/v1/monitoring/${planId}/outcomes`);
}

/** Wire to `POST /api/v1/nexus/analyze` with updated observations when the
 *  re-optimization trigger endpoint ships. */
export async function requestReoptimization(
  planId: string,
): Promise<{ job_id: string }> {
  throw new NotConnectedError(`/api/v1/monitoring/${planId}/reoptimize`);
}
