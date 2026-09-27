/** Locations CRUD — backend/app/mapdata/location_routes.py */
import { api } from "./client";
import type {
  LocationCreate,
  LocationListResponse,
  LocationRecord,
} from "@/lib/types";

const BASE = "/api/v1/locations";

export const listLocations = () => api<LocationListResponse>(BASE);

export const getLocation = (id: string) =>
  api<LocationRecord>(`${BASE}/${encodeURIComponent(id)}`);

export const createLocation = (body: LocationCreate) =>
  api<LocationRecord>(BASE, { method: "POST", body });

export const updateLocation = (id: string, body: LocationCreate) =>
  api<LocationRecord>(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
  });

export const deleteLocation = (id: string) =>
  api<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
