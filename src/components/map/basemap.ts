import type { StyleSpecification } from "maplibre-gl";

/**
 * Default basemap: OSM raster tiles, desaturated at runtime to sit under the
 * data layers. No API key required. Set NEXT_PUBLIC_MAP_STYLE_URL to use a
 * vector style (MapTiler, Mapbox, self-hosted) instead.
 */
export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#070D18" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.42,
        "raster-saturation": -0.85,
        "raster-contrast": 0.12,
        "raster-brightness-max": 0.72,
      },
    },
  ],
};

export const MAP_STYLE: string | StyleSpecification =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || FALLBACK_STYLE;

/** Centre of India — the opening view before any region is chosen. */
export const INDIA_CENTER: [number, number] = [79.0, 22.5];
