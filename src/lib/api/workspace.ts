/** Module 1 — persona onboarding and workspace resolution. */
import { api } from "./client";
import type {
  OnboardingRequest,
  PersonaType,
  WorkspaceContext,
} from "@/lib/types";

export const submitOnboarding = (body: OnboardingRequest) =>
  api<WorkspaceContext>("/auth/onboarding", { method: "POST", body });

export const getWorkspace = (persona: PersonaType) =>
  api<WorkspaceContext>(
    `/workspace/current?persona=${encodeURIComponent(persona)}`,
  );
