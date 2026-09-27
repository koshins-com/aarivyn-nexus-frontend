/**
 * Ingested map data — backend/app/mapdata/maps_routes.py.
 * These are the files an operator has uploaded into NEXUS: vector layers,
 * rasters, tabular field observations, point clouds and documents.
 */
import { API_URL, api } from "./client";
import type { DatasetRecord } from "@/lib/types";

const BASE = "/api/v1/maps";

export const listDatasets = () => api<DatasetRecord[]>(BASE);

export const getDataset = (id: string) =>
  api<DatasetRecord>(`${BASE}/${encodeURIComponent(id)}`);

export const getDatasetGeoJSON = (id: string) =>
  api<GeoJSON.FeatureCollection>(`${BASE}/${encodeURIComponent(id)}/geojson`);

/** Direct URL for a browser download — no fetch, so large files stream. */
export const datasetGeoJSONUrl = (id: string) =>
  `${API_URL}${BASE}/${encodeURIComponent(id)}/geojson`;
