/**
 * Types mirror the FastAPI schemas in `backend/app/schemas.py` and
 * `backend/app/mapdata/location_schemas.py`. Nothing here is invented —
 * every field corresponds to a field the backend actually returns.
 */

/* ── Locations (mapdata/location_schemas.py) ─────────────────────────────── */

export interface LocationRecord {
  id: string;
  name: string | null;
  state: string;
  district: string;
  city: string | null;
  /** 1–10 */
  intensity: number;
  details: string;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  state: string;
  district: string;
  city?: string | null;
  intensity: number;
  details?: string;
  name?: string | null;
}

export interface LocationListResponse {
  count: number;
  items: LocationRecord[];
}

/* ── Water intelligence / context ─────────────────────────────────────────── */

export type ProvenanceTag =
  | "REAL_DATA"
  | "REAL_STAC_METADATA"
  | "REAL_RASTER"
  | "MODELLED_SATELLITE_PROXY"
  | "SYNTHETIC_TEST"
  | "CACHED_DATA"
  | "LIVE"
  | "RECENT"
  | "HISTORICAL"
  | "SYNTHETIC_MODELED";

export type Severity = "CRITICAL" | "ELEVATED" | "MODERATE" | "LOW" | string;

export interface ContextSignal {
  id: string;
  title: string;
  domain: string;
  severity: Severity;
  description: string;
  underlying_data_citation: string;
  provenance_tag: ProvenanceTag;
  affected_villages_count: number;
  measurement_type: string;
  direct_measurement: boolean;
  source: string;
  limitations: string;
}

export interface Indicator {
  location_id: string;
  timestamp: string;
  indicator_name: string;
  value: number;
  unit: string;
  source: string;
  provider?: string;
  acquisition_time?: string | null;
  processing_method?: string;
  measurement_type: string;
  direct_measurement: boolean;
  confidence?: number;
  limitations?: string | null;
  pedigree: ProvenanceTag;
  disclaimer?: string | null;
}

export interface Observation {
  id?: string | null;
  source: string;
  satellite: string;
  acquisition_time: string;
  cloud_quality?: number | null;
  geometry_reference?: number[] | null;
  processing_status: string;
}

export interface WaterAnalyzeRequest {
  geography_id: string;
  bbox: number[];
  date_range_start: string;
  date_range_end: string;
  data_sources: string[];
  budget_inr: number;
  time_horizon_months: number;
  risk_tolerance: string;
}

export interface WaterAnalyzeResponse {
  geography_id: string;
  water_indicators: Indicator[];
  detected_signals: ContextSignal[];
  problem_categories: string[];
  evidence_used: Record<string, unknown>[];
  relevant_observations: Observation[];
  confidence_metadata: Record<string, unknown>;
}

export interface DerivedIndicatorsResponse {
  geography_id: string;
  water_stress_index: number;
  vegetation_condition_index: number;
  flood_risk_score: number;
  groundwater_drawdown_rate_m_yr: number;
  signals: ContextSignal[];
}

/* ── Interventions & feasibility ──────────────────────────────────────────── */

export interface InterventionCard {
  id: string;
  name: string;
  domain: string;
  category: string;
  description: string;
  cost_inr: number;
  water_security_score: number;
  sdg_alignments: string[];
  jobs_created: number;
  co_benefits: string[];
  applicable_conditions: Record<string, unknown>;
  implementation_time_months: number;
  technology_maturity_lvl: number;
  risk_level: string;
  dependencies: string[];
  compatible_with: string[];
  status: string;
}

export interface InterventionFilterResult {
  intervention_id: string;
  intervention_name: string;
  passed_all: boolean;
  geographic_filter_pass: boolean;
  budget_filter_pass: boolean;
  time_filter_pass: boolean;
  risk_filter_pass: boolean;
  failure_reasons: string[];
}

export interface FeasibilityFilterResponse {
  total_candidates: number;
  viable_candidates_count: number;
  viable_interventions: InterventionCard[];
  filter_matrix: InterventionFilterResult[];
}

/* ── Optimizer & portfolios ───────────────────────────────────────────────── */

export interface Portfolio {
  id: string;
  name: string;
  focus: string;
  total_cost_inr: number;
  cost_crores: number;
  water_security_score: number;
  jobs_created: number;
  sdg_alignments: string[];
  sdg_count: number;
  intervention_count: number;
  interventions: InterventionCard[];
  co_benefits: string[];
  applicable_conditions: Record<string, unknown>;
  provenance: Record<string, unknown>;
}

export interface OptimizeRunResponse {
  status: string;
  budget_inr: number;
  pareto_solutions_count: number;
  portfolios: Portfolio[];
}

export interface PlanStep {
  phase: number;
  phase_name: string;
  intervention_id: string;
  intervention_name: string;
  duration_months: number;
  estimated_cost_inr: number;
  responsible_stakeholder: string;
  dependencies: string[];
  key_milestones: string[];
}

export interface ImplementationPlan {
  portfolio_id: string;
  portfolio_name: string;
  total_cost_inr: number;
  total_duration_months: number;
  stakeholder_allocation: Record<string, number>;
  intervention_sequence: PlanStep[];
  monitoring_indicators: Record<string, unknown>[];
  created_at: string;
}

export interface ProvenanceAudit {
  portfolio_id: string;
  portfolio_name: string;
  optimizer_engine: string;
  objective_weights_applied: Record<string, unknown>;
  feasibility_filter_audit: Record<string, unknown>[];
  knowledge_graph_chain_sources: Record<string, unknown>[];
  earth_observation_scene_ids: string[];
  satellite_stac_provenance: Record<string, unknown>;
  confidence_score: string;
}

/* ── Master orchestration ─────────────────────────────────────────────────── */

export interface NexusAnalyzeRequest {
  geography_id: string;
  bbox: number[];
  date_range_start: string;
  date_range_end: string;
  data_sources: string[];
  budget_limit_inr: number;
  time_horizon_months: number;
  max_risk_level: string;
}

export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface NexusJobStatus {
  job_id: string;
  status: JobStatus;
  progress_percent: number;
  stage: string;
  created_at: string;
  updated_at: string;
  error_message?: string | null;
  result?: NexusJobResult | null;
}

/** Shape assembled in `services/job_service.py::execute_nexus_pipeline`. */
export interface NexusJobResult {
  orchestration_id: string;
  geography_id: string;
  earth_observation?: {
    observations_count: number;
    indicators: Indicator[];
    confidence: Record<string, unknown>;
  };
  water_intelligence?: {
    detected_signals: ContextSignal[];
    problem_categories: string[];
    evidence: Record<string, unknown>[];
  };
  intervention_graph?: {
    discovered_nodes_count: number;
    discovered_edges_count: number;
  };
  feasibility?: {
    total_candidates: number;
    viable_candidates_count: number;
    filter_matrix: InterventionFilterResult[];
  };
  optimization?: {
    pareto_solutions_count: number;
    portfolios?: Portfolio[];
  };
  implementation_plan?: ImplementationPlan | null;
  no_solution_reason?: string | null;
  [k: string]: unknown;
}

/* ── System ───────────────────────────────────────────────────────────────── */

export interface SystemStatus {
  status: string;
  api_status: string;
  database_status: string;
  eo_provider_status: string;
  intelligence_engine_status: string;
  optimizer_status: string;
  background_worker_status: string;
  timestamp: string;
  application_version: string;
}

/* ── Frontend-only (never sent as fabricated backend data) ────────────────── */

/** The officer's brief. Held in the client until it is mapped onto real
 *  backend request bodies. */
export interface Brief {
  problem: string;
  geographyId: string;
  state: string;
  district: string;
  city: string;
  populationAffected: number | null;
  budgetInr: number | null;
  timeHorizonMonths: number;
  maxRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  dateRangeStart: string;
  dateRangeEnd: string;
  dataSources: string[];
  constraints: string[];
}

export interface ResolvedGeometry {
  /** Location record id, or "aoi" for a hand-drawn area. */
  key: string;
  displayName: string;
  geometry: GeoJSON.Geometry;
  bbox: [number, number, number, number];
}

/* ── Persona onboarding (backend/app/schemas.py, Module 1) ───────────────── */

export type PersonaType =
  | "GOVERNMENT"
  | "CSR_FUNDER"
  | "NGO"
  | "STUDENT"
  | "RESEARCHER"
  | "COMMUNITY";

export interface WorkspaceContext {
  user_id: number;
  persona: PersonaType;
  geography_name: string;
  bbox: number[];
  center: number[];
  zoom: number;
  permission_scope: Record<string, unknown>;
}

export interface NgoOnboarding {
  organization: string;
  operating_regions: string[];
  communities_served: string;
  focus_areas: string[];
  implementation_capacity: string;
}

export interface CsrOnboarding {
  organization: string;
  funding_program: string;
  available_budget_inr?: number | null;
  focus_areas: string[];
  target_geography: string;
  time_horizon_years?: number | null;
}

export interface AcademicOnboarding {
  name: string;
  institution: string;
  region_of_interest: string;
}

export interface CommunityOnboarding {
  location_name?: string | null;
  problem_category: string;
}

export interface OnboardingRequest {
  persona: PersonaType;
  ngo?: NgoOnboarding;
  csr_funder?: CsrOnboarding;
  student?: AcademicOnboarding;
  researcher?: AcademicOnboarding;
  community?: CommunityOnboarding;
}

/* ── Ingested datasets (backend/app/mapdata/schemas.py) ──────────────────── */

export type DatasetRepresentation =
  | "vector_geojson"
  | "raster"
  | "point_cloud"
  | "tabular"
  | "document"
  | "unsupported";

export interface DatasetRecord {
  id: string;
  name: string;
  category: string;
  usage: string;
  representation?: DatasetRepresentation;
  created_at?: string;
  [k: string]: unknown;
}
