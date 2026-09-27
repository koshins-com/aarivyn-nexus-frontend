"use client";

import * as React from "react";
import { Check, Pencil } from "lucide-react";
import { StageHeader, StageNav } from "./StageHeader";
import { Badge, Button, Origin, Panel } from "@/components/ui/primitives";
import { useNexus } from "@/lib/store";
import { bboxOf, inr, months } from "@/lib/format";

/**
 * Verification restates the request as a request — the exact JSON body that
 * will be sent to `POST /api/v1/nexus/analyze`. Nothing is interpreted or
 * embellished, so there is no risk of the officer confirming something NEXUS
 * invented.
 */
export function Verify() {
  const {
    brief,
    aoi,
    geometries,
    selectedLocationId,
    locations,
    briefConfirmed,
    confirmBrief,
    goTo,
  } = useNexus();

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);
  const geom = selectedLocationId ? geometries[selectedLocationId] : undefined;
  const bbox = aoi ? bboxOf(aoi) : geom?.bbox;

  const rows: Array<{
    label: string;
    value: React.ReactNode;
    origin: "entered" | "observed";
    note?: string;
  }> = [
    { label: "Problem", value: brief.problem, origin: "entered" },
    {
      label: "Region",
      value: [brief.city, brief.district, brief.state].filter(Boolean).join(", "),
      origin: "entered",
    },
    {
      label: "Analysis area",
      value: bbox
        ? bbox.map((n) => n.toFixed(4)).join(", ")
        : "Not set",
      origin: aoi ? "entered" : "observed",
      note: aoi
        ? "Bounding box of the area you drew."
        : selectedLoc
          ? `Bounding box of the ${selectedLoc.district} administrative boundary.`
          : undefined,
    },
    { label: "Budget ceiling", value: inr(brief.budgetInr), origin: "entered" },
    {
      label: "Delivery window",
      value: months(brief.timeHorizonMonths),
      origin: "entered",
    },
    { label: "Risk accepted", value: brief.maxRiskLevel, origin: "entered" },
    {
      label: "Observation window",
      value: `${brief.dateRangeStart} → ${brief.dateRangeEnd}`,
      origin: "entered",
    },
    {
      label: "Satellite sources",
      value: brief.dataSources.join(", ") || "None selected",
      origin: "entered",
    },
    {
      label: "Constraints",
      value:
        brief.constraints.length > 0 ? brief.constraints.join(" · ") : "None recorded",
      origin: "entered",
      note:
        brief.constraints.length > 0
          ? "Held in this session for your reference. The current pipeline filters on budget, timeline and risk only."
          : undefined,
    },
  ];

  const payload = {
    geography_id: brief.geographyId || brief.district.toLowerCase(),
    bbox: bbox ?? [],
    date_range_start: brief.dateRangeStart,
    date_range_end: brief.dateRangeEnd,
    data_sources: brief.dataSources,
    budget_limit_inr: brief.budgetInr ?? 0,
    time_horizon_months: brief.timeHorizonMonths,
    max_risk_level: brief.maxRiskLevel,
  };

  return (
    <>
      <StageHeader
        id="verify"
        lede="This is exactly what NEXUS will analyse. Correct anything that is wrong before the pipeline runs — after this point the results are built on these numbers."
      >
        <Button variant="ghost" onClick={() => goTo("intake")}>
          <Pencil className="h-3.5 w-3.5" />
          Edit the brief
        </Button>
      </StageHeader>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel eyebrow="Restated" title="What NEXUS understood">
          <dl className="divide-y divide-hair">
            {rows.map((r) => (
              <div
                key={r.label}
                className="grid gap-1 py-2.5 sm:grid-cols-[150px_1fr] sm:gap-4"
              >
                <dt className="rule-label pt-0.5">{r.label}</dt>
                <dd>
                  <div className="text-[13px] leading-relaxed text-ink-hi">
                    {r.value}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Origin kind={r.origin} />
                    {r.note && (
                      <span className="text-[11px] text-ink-lo">{r.note}</span>
                    )}
                  </div>
                </dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel
          eyebrow="Request"
          title="Payload sent to the analysis API"
          actions={<Badge tone="observed">POST /api/v1/nexus/analyze</Badge>}
        >
          <pre className="overflow-x-auto rounded-lg border border-hair bg-abyss/70 p-3 font-mono text-[11.5px] leading-relaxed text-observed">
            {JSON.stringify(payload, null, 2)}
          </pre>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-mid">
            Population and constraints are not fields the current pipeline accepts.
            They stay on record here and shape how you read the results, but they do
            not silently influence the optimizer.
          </p>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-hair bg-abyss/50 p-3">
            <input
              type="checkbox"
              checked={briefConfirmed}
              onChange={(e) => confirmBrief(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-observed"
            />
            <span className="text-[12.5px] leading-relaxed text-ink-hi">
              I have checked these details and they describe the situation correctly.
            </span>
          </label>
        </Panel>
      </div>

      <StageNav
        back="intake"
        next="detect"
        nextLabel="Run the analysis"
        nextDisabled={!briefConfirmed || !bbox}
        nextBlockedReason={
          !bbox
            ? "An analysis area is required."
            : !briefConfirmed
              ? "Confirm the details to continue."
              : undefined
        }
      />

      {briefConfirmed && (
        <p className="mt-3 flex items-center gap-1.5 font-mono text-micro uppercase text-nominal">
          <Check className="h-3.5 w-3.5" /> Brief confirmed
        </p>
      )}
    </>
  );
}
