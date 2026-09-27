"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "./TopBar";
import { PipelineRail, PipelineStrip } from "./PipelineRail";
import { MapDock } from "@/components/map/MapDock";
import { scatterInside, type SignalMarker } from "@/components/map/NexusMap";
import { Intake } from "@/components/stages/Intake";
import { Verify } from "@/components/stages/Verify";
import { Detect } from "@/components/stages/Detect";
import { Gap } from "@/components/stages/Gap";
import { Interventions } from "@/components/stages/Interventions";
import { Optimize } from "@/components/stages/Optimize";
import { Decide } from "@/components/stages/Decide";
import { Monitor } from "@/components/stages/Monitor";
import { useNexus } from "@/lib/store";
import { cn } from "@/lib/format";

/**
 * Two-column command layout: the map holds context on the left and never
 * unmounts, so the officer keeps their bearings while the analysis moves
 * through its stages on the right.
 */
export function Workspace() {
  const { stage, signals, aoi, geometries, selectedLocationId } = useNexus();
  const [focusedSignal, setFocusedSignal] = React.useState<string | null>(null);

  /* Abnormality pins are placed inside the analysis area. Their positions are
     indicative layout, not surveyed coordinates — the backend returns signals
     for the area as a whole, not point locations. */
  const signalMarkers: SignalMarker[] = React.useMemo(() => {
    const geom =
      aoi ?? (selectedLocationId ? geometries[selectedLocationId]?.geometry : null);
    if (!geom || signals.length === 0) return [];
    const pts = scatterInside(geom, signals.length);
    return signals.map((signal, i) => ({ signal, lngLat: pts[i] }));
  }, [signals, aoi, geometries, selectedLocationId]);

  const mapProminent = stage === "intake" || stage === "detect";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-abyss">
      <TopBar />
      <PipelineStrip />

      <div className="flex min-h-0 flex-1">
        <PipelineRail />

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 xl:flex-row">
          {/* Map column */}
          <div
            className={cn(
              "shrink-0 transition-all duration-500",
              mapProminent
                ? "h-[52vh] xl:h-auto xl:w-[52%]"
                : "h-[34vh] xl:h-auto xl:w-[34%]",
            )}
          >
            <div className="h-full min-h-[320px]">
              <MapDock
                signalMarkers={signalMarkers}
                onSelectSignal={setFocusedSignal}
              />
            </div>
          </div>

          {/* Stage column */}
          <div className="min-w-0 flex-1 xl:overflow-y-auto xl:pr-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                {stage === "intake" && <Intake />}
                {stage === "verify" && <Verify />}
                {stage === "detect" && <Detect />}
                {stage === "gap" && <Gap />}
                {stage === "interventions" && <Interventions />}
                {stage === "optimize" && <Optimize />}
                {stage === "decide" && <Decide />}
                {stage === "monitor" && <Monitor />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {focusedSignal && (
        <FocusToast
          title={
            signals.find((s) => s.id === focusedSignal)?.title ?? focusedSignal
          }
          onClose={() => setFocusedSignal(null)}
        />
      )}
    </div>
  );
}

function FocusToast({ title, onClose }: { title: string; onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-inferred/50 bg-panel/95 px-4 py-2.5 shadow-panel backdrop-blur"
    >
      <div className="rule-label mb-0.5 text-inferred">Abnormality</div>
      <div className="text-[13px] text-ink-hi">{title}</div>
    </motion.div>
  );
}
