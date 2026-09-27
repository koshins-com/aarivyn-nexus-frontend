"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createLocation,
  deleteLocation,
  listLocations,
  updateLocation,
} from "@/lib/api/locations";
import { describeError } from "@/lib/api/client";
import { locationLabel, locationQuery, resolveBoundary } from "@/lib/api/geocode";
import { useNexus } from "@/lib/store";
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  Textarea,
} from "@/components/ui/primitives";
import { cn, intensityColor, relativeTime } from "@/lib/format";
import type { LocationCreate, LocationRecord } from "@/lib/types";

const blank: LocationCreate = {
  state: "",
  district: "",
  city: "",
  intensity: 5,
  details: "",
  name: "",
};

/**
 * Full CRUD over `/api/v1/locations`. The record itself is name-based
 * (state / district / city); the polygon shown on the map is resolved from
 * those names, so editing a name re-draws the area.
 */
export function LocationRegistry() {
  const {
    locations,
    setLocations,
    selectedLocationId,
    selectLocation,
    putGeometry,
    geometries,
  } = useNexus();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<LocationRecord | "new" | null>(null);
  const [resolving, setResolving] = React.useState<string[]>([]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await listLocations();
      setLocations(res.items);
      setError(null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [setLocations]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  /* Resolve each record's boundary once. */
  React.useEffect(() => {
    const pending = locations.filter((l) => !geometries[l.id]);
    if (pending.length === 0) return;
    let alive = true;
    (async () => {
      setResolving(pending.map((p) => p.id));
      for (const loc of pending) {
        const g = await resolveBoundary(loc.id, locationQuery(loc), locationLabel(loc));
        if (!alive) return;
        if (g) putGeometry(g);
        setResolving((r) => r.filter((id) => id !== loc.id));
      }
    })();
    return () => {
      alive = false;
    };
  }, [locations, geometries, putGeometry]);

  const remove = async (loc: LocationRecord) => {
    if (
      !window.confirm(
        `Delete "${locationLabel(loc)}"? This removes the record from the backend.`,
      )
    )
      return;
    try {
      await deleteLocation(loc.id);
      if (selectedLocationId === loc.id) selectLocation(null);
      await refresh();
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-hair px-3.5 py-2.5">
        <div>
          <div className="rule-label">Location registry</div>
          <p className="text-[12px] text-ink-mid">
            {loading ? "Loading…" : `${locations.length} saved`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {error && <ErrorNote message={error} />}
        {loading && !locations.length && <Loading label="Fetching locations" />}

        {!loading && !error && locations.length === 0 && (
          <Empty
            title="No locations yet"
            body="Add the state and district you're responsible for. NEXUS draws its boundary on the map and uses it as the analysis area."
            action={
              <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
                Add the first location
              </Button>
            }
          />
        )}

        {locations.map((loc) => {
          const selected = loc.id === selectedLocationId;
          const geo = geometries[loc.id];
          const busy = resolving.includes(loc.id);
          return (
            <div
              key={loc.id}
              className={cn(
                "rounded-lg border bg-abyss/50 transition-colors",
                selected ? "border-observed" : "border-hair hover:border-hairlit",
              )}
            >
              <button
                type="button"
                onClick={() => selectLocation(selected ? null : loc.id)}
                className="flex w-full items-start gap-2.5 p-3 text-left"
              >
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: intensityColor(loc.intensity) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink-hi">
                    {locationLabel(loc)}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-mid">
                    {[loc.city, loc.district, loc.state].filter(Boolean).join(" · ")}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="entered">Intensity {loc.intensity}/10</Badge>
                    {busy && <Badge>Locating…</Badge>}
                    {!busy && !geo && <Badge tone="critical">No boundary found</Badge>}
                    <span className="font-mono text-micro text-ink-lo">
                      {relativeTime(loc.updated_at)}
                    </span>
                  </span>
                </span>
              </button>

              {loc.details && (
                <p className="border-t border-hair px-3 py-2 text-[11.5px] leading-relaxed text-ink-mid">
                  {loc.details}
                </p>
              )}

              <div className="flex justify-end gap-1 border-t border-hair px-2 py-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(loc)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(loc)}>
                  <Trash2 className="h-3.5 w-3.5 text-critical" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <LocationEditor
          record={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (saved) => {
            setEditing(null);
            await refresh();
            selectLocation(saved.id);
            const g = await resolveBoundary(
              saved.id,
              locationQuery(saved),
              locationLabel(saved),
            );
            if (g) putGeometry(g);
          }}
        />
      )}
    </div>
  );
}

function LocationEditor({
  record,
  onClose,
  onSaved,
}: {
  record: LocationRecord | null;
  onClose: () => void;
  onSaved: (r: LocationRecord) => void;
}) {
  const [form, setForm] = React.useState<LocationCreate>(
    record
      ? {
          state: record.state,
          district: record.district,
          city: record.city ?? "",
          intensity: record.intensity,
          details: record.details,
          name: record.name ?? "",
        }
      : blank,
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = <K extends keyof LocationCreate>(k: K, v: LocationCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.state.trim() && form.district.trim();

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const body: LocationCreate = {
      ...form,
      state: form.state.trim(),
      district: form.district.trim(),
      city: form.city?.trim() || null,
      name: form.name?.trim() || null,
      details: form.details ?? "",
    };
    try {
      const saved = record
        ? await updateLocation(record.id, body)
        : await createLocation(body);
      onSaved(saved);
    } catch (e) {
      setError(describeError(e));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-abyss/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={record ? "Edit location" : "Add location"}
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-t-2xl border border-hair bg-panel shadow-panel sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-hair px-4 py-3">
          <div>
            <div className="rule-label">Location record</div>
            <h3 className="font-display text-[15px] text-ink-hi">
              {record ? "Edit location" : "Add location"}
            </h3>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-3.5 p-4">
          {error && <ErrorNote message={error} />}

          <div className="grid grid-cols-2 gap-3">
            <Field label="State" required>
              <Input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="Madhya Pradesh"
              />
            </Field>
            <Field label="District" required>
              <Input
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                placeholder="Rewa"
              />
            </Field>
          </div>

          <Field label="City or block" hint="Optional. Narrows the boundary drawn on the map.">
            <Input
              value={form.city ?? ""}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Mauganj"
            />
          </Field>

          <Field label="Display label" hint="Optional. Shown on the map instead of the city name.">
            <Input
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Rewa — north blocks"
            />
          </Field>

          <Field
            label={`Intensity — ${form.intensity} of 10`}
            hint="How severe the problem is here, in your assessment."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={form.intensity}
                onChange={(e) => set("intensity", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-hair accent-observed"
                style={{
                  background: `linear-gradient(to right, ${intensityColor(
                    form.intensity,
                  )} ${(form.intensity / 10) * 100}%, #1E3554 ${(form.intensity / 10) * 100}%)`,
                }}
              />
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-[13px] text-abyss"
                style={{ background: intensityColor(form.intensity) }}
              >
                {form.intensity}
              </span>
            </div>
          </Field>

          <Field label="Details" hint="What you or your field officers have observed here.">
            <Textarea
              rows={3}
              value={form.details ?? ""}
              onChange={(e) => set("details", e.target.value)}
              placeholder="Hand pumps dry from March. Three villages tankering water."
            />
          </Field>
        </div>

        <footer className="flex justify-end gap-2 border-t border-hair px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!valid || saving} onClick={save}>
            {saving ? "Saving…" : record ? "Save changes" : "Add location"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
