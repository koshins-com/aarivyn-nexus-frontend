import type { PersonaType } from "@/lib/types";

export type RoleId = "government" | "ngo" | "csr" | "research" | "community";

export interface RoleDef {
  id: RoleId;
  /** Backend PersonaType this role maps onto. */
  persona: PersonaType;
  title: string;
  /** The one job this role does. Shown everywhere as the mode banner. */
  verb: string;
  blurb: string;
  /** Accent used for this role's chrome, drawn from the shared palette. */
  accent: string;
  actions: string[];
}

export const ROLES: RoleDef[] = [
  {
    id: "government",
    persona: "GOVERNMENT",
    title: "Government / Decision Maker",
    verb: "Plan & decide",
    blurb:
      "Define a problem, see what the satellite record shows, weigh feasible plans and approve one you can defend.",
    accent: "#4CC9E8",
    actions: [
      "Run the full analysis pipeline",
      "Compare optimizer plans",
      "Approve a plan and set a baseline",
    ],
  },
  {
    id: "ngo",
    persona: "NGO",
    title: "NGO / Implementation Partner",
    verb: "Implement & contribute",
    blurb:
      "Register what your organisation can deliver and where, then find the work that matches it.",
    accent: "#3FD79A",
    actions: [
      "Publish your capability profile",
      "Find matching interventions",
      "Express interest and track involvement",
    ],
  },
  {
    id: "csr",
    persona: "CSR_FUNDER",
    title: "CSR / Funding Partner",
    verb: "Fund & monitor impact",
    blurb:
      "Set your funding envelope and sectors, then look at what your money would actually buy.",
    accent: "#F0A63C",
    actions: [
      "Set budget, sectors and geography",
      "Compare projects on impact and risk",
      "Commit funding and follow outcomes",
    ],
  },
  {
    id: "research",
    persona: "RESEARCHER",
    title: "Student / Researcher",
    verb: "Explore & use data",
    blurb:
      "Work with the underlying observations, indices and detected abnormalities, with their provenance attached.",
    accent: "#9B8CF5",
    actions: [
      "Browse and download regional datasets",
      "Inspect abnormalities and their evidence",
      "Read the methodology behind every figure",
    ],
  },
  {
    id: "community",
    persona: "COMMUNITY",
    title: "Community",
    verb: "Report & verify",
    blurb:
      "Tell NEXUS what is going wrong where you live, and see what is planned for your area.",
    accent: "#FF8A6B",
    actions: [
      "Report a local problem on the map",
      "See interventions planned nearby",
      "Give feedback on what was delivered",
    ],
  },
];

export const roleById = (id: string): RoleDef | undefined =>
  ROLES.find((r) => r.id === id);

export const NETWORK_ROLES = ROLES.filter((r) => r.id !== "government");
