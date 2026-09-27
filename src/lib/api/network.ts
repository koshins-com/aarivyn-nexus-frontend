/**
 * NEXUS Network boundaries — participation, funding and feedback.
 *
 * The backend has no endpoints for these yet. Each function throws
 * `NotConnectedError` so the interface can say so plainly rather than
 * pretending an application was filed. Records the user creates are held in
 * the session and labelled as unsaved.
 *
 * Wiring these up means replacing the function bodies with `api(...)` calls;
 * no calling component changes.
 */
import { NotConnectedError } from "./monitoring";

export interface InterestRecord {
  id: string;
  targetId: string;
  targetName: string;
  organization: string;
  note: string;
  capacityOffered: string;
  submittedAt: string;
  persisted: boolean;
}

export interface FundingCommitment {
  id: string;
  portfolioId: string;
  portfolioName: string;
  organization: string;
  amountInr: number;
  note: string;
  committedAt: string;
  persisted: boolean;
}

export interface CommunityFeedback {
  id: string;
  locationId: string;
  subject: string;
  body: string;
  sentiment: "working" | "partial" | "not_working";
  submittedAt: string;
  persisted: boolean;
}

export async function submitInterest(
  _record: InterestRecord,
): Promise<InterestRecord> {
  throw new NotConnectedError("/api/v1/network/interest");
}

export async function commitFunding(
  _record: FundingCommitment,
): Promise<FundingCommitment> {
  throw new NotConnectedError("/api/v1/network/funding");
}

export async function submitFeedback(
  _record: CommunityFeedback,
): Promise<CommunityFeedback> {
  throw new NotConnectedError("/api/v1/network/feedback");
}

/** Wire to a literature endpoint when one exists. Until then the research
 *  workspace shows only documents actually ingested via /api/v1/maps. */
export async function searchLiterature(_query: string): Promise<never> {
  throw new NotConnectedError("/api/v1/research/literature");
}
