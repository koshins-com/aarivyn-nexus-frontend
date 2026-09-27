"use client";

import { create } from "zustand";
import type {
  Brief,
  ContextSignal,
  FeasibilityFilterResponse,
  ImplementationPlan,
  InterventionCard,
  LocationRecord,
  NexusJobStatus,
  Portfolio,
  ResolvedGeometry,
} from "@/lib/types";

type DecisionRecordLike = {
  portfolioId: string;
  portfolioName: string;
  approvedBy: string;
  rationale: string;
  approvedAt: string;
  persisted: boolean;
};

export const STAGES = [
  { id: "intake", label: "Intake", verb: "DEFINE" },
  { id: "verify", label: "Verification", verb: "CONFIRM" },
  { id: "detect", label: "Abnormalities", verb: "DETECT" },
  { id: "gap", label: "Gap analysis", verb: "UNDERSTAND" },
  { id: "interventions", label: "Interventions", verb: "SELECT" },
  { id: "optimize", label: "Optimization", verb: "OPTIMIZE" },
  { id: "decide", label: "Decision", verb: "DECIDE" },
  { id: "monitor", label: "Monitoring", verb: "MONITOR" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

const today = new Date().toISOString().slice(0, 10);
const twoYearsAgo = new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10);

export const emptyBrief: Brief = {
  problem: "",
  geographyId: "",
  state: "",
  district: "",
  city: "",
  populationAffected: null,
  budgetInr: null,
  timeHorizonMonths: 36,
  maxRiskLevel: "MEDIUM",
  dateRangeStart: twoYearsAgo,
  dateRangeEnd: today,
  dataSources: ["Sentinel-2", "Sentinel-1", "Landsat"],
  constraints: [],
};

interface NexusState {
  stage: StageId;
  furthest: number;
  brief: Brief;
  briefConfirmed: boolean;

  locations: LocationRecord[];
  selectedLocationId: string | null;
  geometries: Record<string, ResolvedGeometry>;
  aoi: GeoJSON.Polygon | null;

  job: NexusJobStatus | null;
  signals: ContextSignal[];
  indicators: Record<string, number>;

  catalogue: InterventionCard[];
  feasibility: FeasibilityFilterResponse | null;
  excludedInterventionIds: string[];

  portfolios: Portfolio[];
  comparedPortfolioIds: string[];
  approvedPlan: ImplementationPlan | null;
  decision: DecisionRecordLike | null;

  goTo: (s: StageId) => void;
  setBrief: (patch: Partial<Brief>) => void;
  confirmBrief: (v: boolean) => void;
  setLocations: (l: LocationRecord[]) => void;
  selectLocation: (id: string | null) => void;
  putGeometry: (g: ResolvedGeometry) => void;
  setAoi: (p: GeoJSON.Polygon | null) => void;
  setJob: (j: NexusJobStatus | null) => void;
  setSignals: (s: ContextSignal[]) => void;
  setIndicators: (i: Record<string, number>) => void;
  setCatalogue: (c: InterventionCard[]) => void;
  setFeasibility: (f: FeasibilityFilterResponse | null) => void;
  toggleExclusion: (id: string) => void;
  setPortfolios: (p: Portfolio[]) => void;
  toggleCompare: (id: string) => void;
  setApprovedPlan: (p: ImplementationPlan | null) => void;
  setDecision: (d: DecisionRecordLike | null) => void;
  reset: () => void;
}

const stageIndex = (id: StageId) => STAGES.findIndex((s) => s.id === id);

export const useNexus = create<NexusState>((set) => ({
  stage: "intake",
  furthest: 0,
  brief: emptyBrief,
  briefConfirmed: false,

  locations: [],
  selectedLocationId: null,
  geometries: {},
  aoi: null,

  job: null,
  signals: [],
  indicators: {},

  catalogue: [],
  feasibility: null,
  excludedInterventionIds: [],

  portfolios: [],
  comparedPortfolioIds: [],
  approvedPlan: null,
  decision: null,

  goTo: (stage) =>
    set((s) => ({ stage, furthest: Math.max(s.furthest, stageIndex(stage)) })),
  setBrief: (patch) => set((s) => ({ brief: { ...s.brief, ...patch } })),
  confirmBrief: (briefConfirmed) => set({ briefConfirmed }),
  setLocations: (locations) => set({ locations }),
  selectLocation: (selectedLocationId) => set({ selectedLocationId }),
  putGeometry: (g) =>
    set((s) => ({ geometries: { ...s.geometries, [g.key]: g } })),
  setAoi: (aoi) => set({ aoi }),
  setJob: (job) => set({ job }),
  setSignals: (signals) => set({ signals }),
  setIndicators: (indicators) => set({ indicators }),
  setCatalogue: (catalogue) => set({ catalogue }),
  setFeasibility: (feasibility) => set({ feasibility }),
  toggleExclusion: (id) =>
    set((s) => ({
      excludedInterventionIds: s.excludedInterventionIds.includes(id)
        ? s.excludedInterventionIds.filter((x) => x !== id)
        : [...s.excludedInterventionIds, id],
    })),
  setPortfolios: (portfolios) => set({ portfolios }),
  toggleCompare: (id) =>
    set((s) => {
      const has = s.comparedPortfolioIds.includes(id);
      if (has)
        return {
          comparedPortfolioIds: s.comparedPortfolioIds.filter((x) => x !== id),
        };
      return {
        comparedPortfolioIds: [...s.comparedPortfolioIds, id].slice(-3),
      };
    }),
  setApprovedPlan: (approvedPlan) => set({ approvedPlan }),
  setDecision: (decision) => set({ decision }),
  reset: () =>
    set({
      stage: "intake",
      furthest: 0,
      brief: emptyBrief,
      briefConfirmed: false,
      job: null,
      signals: [],
      indicators: {},
      feasibility: null,
      excludedInterventionIds: [],
      portfolios: [],
      comparedPortfolioIds: [],
      approvedPlan: null,
      decision: null,
    }),
}));

export const stageNumber = (id: StageId) => stageIndex(id) + 1;
