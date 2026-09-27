/**
 * Decision boundary — plan approval and audit trail.
 *
 * The backend has no approval endpoint yet, so approvals are held in the
 * session only and clearly labelled as unsaved in the UI. When
 * `POST /api/v1/decisions` ships, swap the body of `approvePlan` for an
 * `api(...)` call; the calling component needs no change.
 */
import { NotConnectedError } from "./monitoring";

export interface DecisionRecord {
  portfolioId: string;
  portfolioName: string;
  approvedBy: string;
  rationale: string;
  approvedAt: string;
  persisted: boolean;
}

export async function persistDecision(
  record: DecisionRecord,
): Promise<DecisionRecord> {
  throw new NotConnectedError("/api/v1/decisions");
}
