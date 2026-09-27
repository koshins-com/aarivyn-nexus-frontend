"use client";

import * as React from "react";
import { X } from "lucide-react";
import { StageHeader, StageNav } from "./StageHeader";
import { AoiSummary } from "@/components/map/MapDock";
import {
  Badge,
  Button,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { useNexus } from "@/lib/store";
import { inr } from "@/lib/format";

const SOURCES = ["Sentinel-2", "Sentinel-1", "Landsat"];

export function Intake() {
  const { brief, setBrief, locations, selectedLocationId, aoi, confirmBrief } =
    useNexus();
  const [constraint, setConstraint] = React.useState("");

  /* Keep the brief's geography in step with whatever is selected on the map. */
  React.useEffect(() => {
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (!loc) return;
    setBrief({
      state: loc.state,
      district: loc.district,
      city: loc.city ?? "",
      geographyId: brief.geographyId || loc.district.toLowerCase().replace(/\s+/g, "-"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId, locations]);

  const hasArea = Boolean(aoi || selectedLocationId);
  const ready =
    brief.problem.trim().length > 8 &&
    brief.district.trim() &&
    brief.budgetInr !== null &&
    brief.budgetInr > 0 &&
    hasArea;

  const addConstraint = () => {
    const v = constraint.trim();
    if (!v) return;
    setBrief({ constraints: [...brief.constraints, v] });
    setConstraint("");
  };

  return (
    <>
      <StageHeader
        id="intake"
        lede="Describe the problem in your own words and set the limits you're planning within. Everything on this screen is your input — NEXUS adds nothing to it."
      >
        <Badge tone="entered">Your input</Badge>
      </StageHeader>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Panel eyebrow="Problem" title="What are you trying to fix?">
          <div className="space-y-4">
            <Field
              label="Problem statement"
              required
              hint="Plain language. What is going wrong, for whom, and since when."
            >
              <Textarea
                rows={4}
                value={brief.problem}
                onChange={(e) => setBrief({ problem: e.target.value })}
                placeholder="Hand pumps across the northern blocks are running dry from March onward. Around forty villages are relying on tanker supply through the pre-monsoon months."
              />
            </Field>

            <Field label="Constraints" hint="Anything that rules options in or out.">
              <div className="flex gap-2">
                <Input
                  value={constraint}
                  onChange={(e) => setConstraint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addConstraint();
                    }
                  }}
                  placeholder="No land acquisition in reserved forest"
                />
                <Button variant="outline" onClick={addConstraint}>
                  Add
                </Button>
              </div>
            </Field>

            {brief.constraints.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {brief.constraints.map((c, i) => (
                  <li key={`${c}-${i}`}>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-entered/30 bg-entered/10 px-2 py-1 text-[11.5px] text-entered">
                      {c}
                      <button
                        type="button"
                        aria-label={`Remove constraint ${c}`}
                        onClick={() =>
                          setBrief({
                            constraints: brief.constraints.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel eyebrow="Region" title="Where does this apply?">
            <div className="space-y-3">
              <div className="rounded-lg border border-hair bg-abyss/50 p-3">
                <div className="rule-label mb-1.5">Analysis area</div>
                <AoiSummary />
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mid">
                  Select a saved location in the registry on the map, or use{" "}
                  <strong className="text-ink-hi">Draw area</strong> to outline the
                  exact extent. The outline becomes the bounding box sent for
                  Earth-observation analysis.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="State" required>
                  <Input
                    value={brief.state}
                    onChange={(e) => setBrief({ state: e.target.value })}
                  />
                </Field>
                <Field label="District" required>
                  <Input
                    value={brief.district}
                    onChange={(e) => setBrief({ district: e.target.value })}
                  />
                </Field>
                <Field label="City / block">
                  <Input
                    value={brief.city}
                    onChange={(e) => setBrief({ city: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Envelope" title="Budget, timeline and risk">
            <div className="space-y-3">
              <Field
                label="Budget"
                required
                hint={
                  brief.budgetInr
                    ? `That is ${inr(brief.budgetInr)}.`
                    : "Enter the amount in rupees."
                }
              >
                <Input
                  type="number"
                  min={0}
                  step={100000}
                  value={brief.budgetInr ?? ""}
                  onChange={(e) =>
                    setBrief({
                      budgetInr: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="200000000"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Timeline" hint="Months available to deliver.">
                  <Input
                    type="number"
                    min={1}
                    max={240}
                    value={brief.timeHorizonMonths}
                    onChange={(e) =>
                      setBrief({ timeHorizonMonths: Number(e.target.value) || 1 })
                    }
                  />
                </Field>
                <Field label="Risk you will accept">
                  <Select
                    value={brief.maxRiskLevel}
                    onChange={(e) =>
                      setBrief({
                        maxRiskLevel: e.target.value as typeof brief.maxRiskLevel,
                      })
                    }
                  >
                    <option value="LOW">Low — proven methods only</option>
                    <option value="MEDIUM">Medium — some novel approaches</option>
                    <option value="HIGH">High — include unproven options</option>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Observations from" hint="Start of the satellite record.">
                  <Input
                    type="date"
                    value={brief.dateRangeStart}
                    onChange={(e) => setBrief({ dateRangeStart: e.target.value })}
                  />
                </Field>
                <Field label="Observations to">
                  <Input
                    type="date"
                    value={brief.dateRangeEnd}
                    onChange={(e) => setBrief({ dateRangeEnd: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Satellite sources">
                <div className="flex flex-wrap gap-1.5">
                  {SOURCES.map((s) => {
                    const on = brief.dataSources.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setBrief({
                            dataSources: on
                              ? brief.dataSources.filter((x) => x !== s)
                              : [...brief.dataSources, s],
                          })
                        }
                        className={`rounded-lg border px-2.5 py-1 font-mono text-tiny transition-colors ${
                          on
                            ? "border-observed bg-observed/15 text-observed"
                            : "border-hair text-ink-lo hover:border-hairlit"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </Panel>
        </div>
      </div>

      <StageNav
        next="verify"
        nextLabel="Review what NEXUS understood"
        nextDisabled={!ready}
        nextBlockedReason={
          !hasArea
            ? "Select or draw an analysis area first."
            : !brief.problem.trim()
              ? "Describe the problem first."
              : !brief.budgetInr
                ? "Enter a budget first."
                : undefined
        }
        onNext={() => confirmBrief(false)}
      />
    </>
  );
}
