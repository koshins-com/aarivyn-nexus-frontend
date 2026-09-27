export function inr(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function crore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${(value / 1e7).toFixed(2)} Cr`;
}

export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-IN", { notation: "compact" }).format(n);
}

export function months(n: number | null | undefined): string {
  if (!n && n !== 0) return "—";
  if (n < 12) return `${n} mo`;
  const y = Math.floor(n / 12);
  const m = n % 12;
  return m ? `${y}y ${m}m` : `${y} yr`;
}

export function pct(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function severityRank(s: string): number {
  return { CRITICAL: 3, ELEVATED: 2, MODERATE: 1 }[s.toUpperCase()] ?? 0;
}

export function severityColor(s: string): string {
  switch (s.toUpperCase()) {
    case "CRITICAL":
      return "#FF5C6C";
    case "ELEVATED":
      return "#FF9A47";
    case "MODERATE":
      return "#F5D160";
    default:
      return "#3FD79A";
  }
}

export function riskColor(r: string): string {
  switch (r.toUpperCase()) {
    case "HIGH":
      return "#FF5C6C";
    case "MEDIUM":
      return "#F5D160";
    default:
      return "#3FD79A";
  }
}

/** Intensity 1–10 → the map's sequential ramp (deep teal → alarm coral). */
export function intensityColor(i: number): string {
  const ramp = [
    "#1F5F70", "#22758A", "#2A8FA0", "#4CC9E8", "#8FD08A",
    "#E2C766", "#F0A63C", "#FF8A3D", "#FF6B4F", "#FF3F5B",
  ];
  return ramp[Math.min(9, Math.max(1, Math.round(i)) - 1)];
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export function bboxOf(geometry: GeoJSON.Geometry): [number, number, number, number] {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const walk = (coords: unknown): void => {
    if (typeof (coords as number[])[0] === "number") {
      const [x, y] = coords as number[];
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return;
    }
    (coords as unknown[]).forEach(walk);
  };
  if ("coordinates" in geometry) walk(geometry.coordinates);
  return [minX, minY, maxX, maxY];
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
