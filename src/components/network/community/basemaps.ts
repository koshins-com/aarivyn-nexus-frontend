import type { StyleSpecification } from "maplibre-gl";

/**
 * Basemaps for the community workspace. All three are keyless raster sources,
 * so the map works with no configuration. Satellite is the default.
 */
export type BasemapId = "satellite" | "streets" | "terrain";

interface Basemap {
  id: BasemapId;
  label: string;
  style: StyleSpecification;
}

function rasterStyle(
  tiles: string[],
  attribution: string,
  opts: { opacity?: number; saturation?: number; brightnessMax?: number } = {},
): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      base: { type: "raster", tiles, tileSize: 256, maxzoom: 19, attribution },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#070D18" } },
      {
        id: "base",
        type: "raster",
        source: "base",
        paint: {
          "raster-opacity": opts.opacity ?? 1,
          "raster-saturation": opts.saturation ?? 0,
          "raster-brightness-max": opts.brightnessMax ?? 1,
          "raster-contrast": 0.05,
        },
      },
    ],
  };
}

export const BASEMAPS: Basemap[] = [
  {
    id: "satellite",
    label: "Satellite",
    style: rasterStyle(
      [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      "Imagery © Esri, Maxar, Earthstar Geographics",
      { opacity: 0.92, brightnessMax: 0.9 },
    ),
  },
  {
    id: "streets",
    label: "Streets",
    style: rasterStyle(
      ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "© OpenStreetMap contributors",
      { opacity: 0.55, saturation: -0.8, brightnessMax: 0.75 },
    ),
  },
  {
    id: "terrain",
    label: "Terrain",
    style: rasterStyle(
      ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
      "© OpenTopoMap, © OpenStreetMap contributors",
      { opacity: 0.7, saturation: -0.35, brightnessMax: 0.85 },
    ),
  },
];

export const basemapById = (id: BasemapId) =>
  BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];

export const INDIA_CENTER: [number, number] = [79.0, 22.5];
