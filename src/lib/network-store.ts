"use client";

import { create } from "zustand";
import type { RoleId } from "@/lib/roles";
import type {
  CommunityFeedback,
  FundingCommitment,
  InterestRecord,
} from "@/lib/api/network";
import type { WorkspaceContext } from "@/lib/types";

/** Profile shapes mirror the backend onboarding payloads exactly. */
export interface NgoProfile {
  organization: string;
  operating_regions: string[];
  communities_served: string;
  focus_areas: string[];
  implementation_capacity: string;
}

export interface CsrProfile {
  organization: string;
  funding_program: string;
  available_budget_inr: number | null;
  focus_areas: string[];
  target_geography: string;
  time_horizon_years: number | null;
}

export interface AcademicProfile {
  name: string;
  institution: string;
  region_of_interest: string;
  level: "student" | "researcher";
}

export interface CommunityProfile {
  location_name: string;
  problem_category: string;
}

interface NetworkState {
  role: RoleId | null;
  workspace: WorkspaceContext | null;

  ngo: NgoProfile | null;
  csr: CsrProfile | null;
  academic: AcademicProfile | null;
  community: CommunityProfile | null;

  interests: InterestRecord[];
  commitments: FundingCommitment[];
  feedback: CommunityFeedback[];

  setRole: (r: RoleId | null) => void;
  setWorkspace: (w: WorkspaceContext | null) => void;
  setNgo: (p: NgoProfile | null) => void;
  setCsr: (p: CsrProfile | null) => void;
  setAcademic: (p: AcademicProfile | null) => void;
  setCommunity: (p: CommunityProfile | null) => void;
  addInterest: (r: InterestRecord) => void;
  removeInterest: (id: string) => void;
  addCommitment: (r: FundingCommitment) => void;
  addFeedback: (r: CommunityFeedback) => void;
}

export const useNetwork = create<NetworkState>((set) => ({
  role: null,
  workspace: null,
  ngo: null,
  csr: null,
  academic: null,
  community: null,
  interests: [],
  commitments: [],
  feedback: [],

  setRole: (role) => set({ role }),
  setWorkspace: (workspace) => set({ workspace }),
  setNgo: (ngo) => set({ ngo }),
  setCsr: (csr) => set({ csr }),
  setAcademic: (academic) => set({ academic }),
  setCommunity: (community) => set({ community }),
  addInterest: (r) => set((s) => ({ interests: [...s.interests, r] })),
  removeInterest: (id) =>
    set((s) => ({ interests: s.interests.filter((i) => i.id !== id) })),
  addCommitment: (r) => set((s) => ({ commitments: [...s.commitments, r] })),
  addFeedback: (r) => set((s) => ({ feedback: [...s.feedback, r] })),
}));

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Sectors offered across NGO and CSR profiles. Drawn from the domains the
 *  intervention catalogue actually uses. */
export const SECTORS = [
  "Water",
  "Sanitation",
  "Agriculture",
  "Livelihoods",
  "Health",
  "Environment",
  "Education",
  "Infrastructure",
];

export const SDGS = [
  "SDG 1 — No poverty",
  "SDG 2 — Zero hunger",
  "SDG 3 — Good health",
  "SDG 6 — Clean water",
  "SDG 8 — Decent work",
  "SDG 11 — Sustainable cities",
  "SDG 13 — Climate action",
  "SDG 15 — Life on land",
];
