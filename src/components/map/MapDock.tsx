"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Layers, PencilRuler, Trash2 } from "lucide-react";
import { LocationRegistry } from "./LocationRegistry";
import type { DrawMode, SignalMarker } from "./NexusMap";
import { useNexus } from "@/lib/store";
import { Badge, Button } from "@/components/ui/primitives";
import { bboxOf, cn } from "@/lib/format";

const NexusMap = dynamic(() => import("./NexusMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-abyss grid-ruled">
      <span className="font-mono text-micro uppercase text-ink-lo">
        Loading basemap…
      </span>
    </div>
  ),
});

export function MapDock({
  signalMarkers = [],
  onSelectSignal,
}: {
  signalMarkers?: SignalMarker[];
  onSelectSignal?: (id: string) => void;
}) {
  const {
    locations,
    geometries,
    selectedLocationId,
    selectLocation,
    aoi,
    setAoi,
  } = useNexus();
  const [drawMode, setDrawMode] = React.useState<DrawMode>("off");
  const [showRegistry, setShowRegistry] = React.useState(true);

  const regions = React.useMemo(
    () => locations.map((l) => geometries[l.id]).filter(Boolean),
    [locations, geometries],
  );

  const intensityByKey = React.useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l.intensity])),
    [locations],
  );

  const aoiBbox = aoi ? bboxOf(aoi) : null;

  return (
    <div className="relative flex h-full min-h-[420px] overflow-hidden rounded-xl border border-hair bg-abyss">
      <div className="relative flex-1">
        <NexusMap
          className="absolute inset-0"
          regions={regions}
          intensityByKey={intensityByKey}
          selectedKey={selectedLocationId}
          onSelectRegion={selectLocation}
          aoi={aoi}
          drawMode={drawMode}
          onAoiChange={setAoi}
          onDrawComplete={() => setDrawMode("off")}
          signalMarkers={signalMarkers}
          onSelectSignal={onSelectSignal}
        />

        {/* Map toolbar */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
          <div className="pointer-events-auto flex gap-1.5 rounded-xl border border-hair bg-panel/90 p-1.5 backdrop-blur">
            <Button
              size="sm"
              variant={drawMode === "drawing" ? "primary" : "ghost"}
              onClick={() =>
                setDrawMode((d) => (d === "drawing" ? "off" : "drawing"))
              }
              title="Draw an analysis area on the map"
            >
              <PencilRuler className="h-3.5 w-3.5" />
              {drawMode === "drawing" ? "Drawing" : "Draw area"}
            </Button>
            {aoi && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAoi(null)}
                title="Remove the drawn area"
              >
                <Trash2 className="h-3.5 w-3.5 text-critical" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowRegistry((s) => !s)}
              className="lg:hidden"
            >
              <Layers className="h-3.5 w-3.5" />
            </Button>
          </div>

          {aoiBbox && (
            <div className="pointer-events-auto rounded-xl border border-inferred/40 bg-panel/90 px-3 py-2 backdrop-blur">
              <div className="rule-label mb-1 text-inferred">Analysis area</div>
              <code className="font-mono text-[10.5px] text-ink-mid">
                {aoiBbox.map((n) => n.toFixed(3)).join(", ")}
              </code>
            </div>
          )}
        </div>

        {/* Intensity legend */}
        {regions.length > 0 && (
          <div className="pointer-events-none absolute bottom-16 left-3 z-10 rounded-xl border border-hair bg-panel/90 px-3 py-2.5 backdrop-blur sm:bottom-3">
            <div className="rule-label mb-1.5">Reported intensity</div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-ink-lo">1</span>
              <span
                className="h-1.5 w-24 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg,#1F5F70,#2A8FA0,#4CC9E8,#E2C766,#F0A63C,#FF6B4F,#FF3F5B)",
                }}
              />
              <span className="font-mono text-[10px] text-ink-lo">10</span>
            </div>
          </div>
        )}
      </div>

      {/* Registry side panel */}
      <aside
        className={cn(
          "w-[280px] shrink-0 border-l border-hair bg-hull/95 backdrop-blur",
          "absolute inset-y-0 right-0 z-20 lg:static lg:z-auto",
          showRegistry ? "block" : "hidden lg:block",
        )}
      >
        <LocationRegistry />
      </aside>
    </div>
  );
}

export function AoiSummary() {
  const { aoi, locations, geometries, selectedLocationId } = useNexus();
  const selected = locations.find((l) => l.id === selectedLocationId);
  if (aoi) {
    return <Badge tone="entered">Analysis area drawn on map</Badge>;
  }
  if (selected && geometries[selected.id]) {
    return <Badge tone="entered">Area from “{selected.district}” boundary</Badge>;
  }
  return <Badge tone="critical">No analysis area selected</Badge>;
}
