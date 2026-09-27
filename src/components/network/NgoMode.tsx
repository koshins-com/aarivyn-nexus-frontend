"use client";

import * as React from "react";
import { Handshake, Save } from "lucide-react";
import { NetworkShell } from "./NetworkShell";
import { ChipSelect, MatchBadge, TokenInput, UnsavedNotice, matchScore } from "./common";
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  Origin,
  Panel,
  Select,
  Stat,
  Textarea,
} from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import { listInterventions } from "@/lib/api/nexus";
import { listLocations } from "@/lib/api/locations";
import { submitOnboarding } from "@/lib/api/workspace";
import { submitInterest, type InterestRecord } from "@/lib/api/network";
import { NotConnectedError } from "@/lib/api/monitoring";
import { SECTORS, uid, useNetwork, type NgoProfile } from "@/lib/network-store";
import { roleById } from "@/lib/roles";
import { inr, intensityColor, months, riskColor } from "@/lib/format";
import type { InterventionCard, LocationRecord } from "@/lib/types";

const ROLE = roleById("ngo")!;

const CAPACITY = [
  "Small — under 5 sites at a time",
  "Medium — 5 to 20 sites",
  "Large — 20+ sites, multi-district",
];

export function NgoMode() {
  const [tab, setTab] = React.useState("profile");
  return (
    <NetworkShell
      role={ROLE}
      active={tab}
      onTab={setTab}
      tabs={[
        { id: "profile", label: "Organisation" },
        { id: "opportunities", label: "Find work" },
        { id: "tracking", label: "My involvement" },
      ]}
    >
      {tab === "profile" && <Profile onDone={() => setTab("opportunities")} />}
      {tab === "opportunities" && <Opportunities />}
      {tab === "tracking" && <Tracking />}
    </NetworkShell>
  );
}

/* ── Organisation profile ─────────────────────────────────────────────────── */

function Profile({ onDone }: { onDone: () => void }) {
  const { ngo, setNgo, setWorkspace } = useNetwork();
  const [form, setForm] = React.useState<NgoProfile>(
    ngo ?? {
      organization: "",
      operating_regions: [],
      communities_served: "",
      focus_areas: [],
      implementation_capacity: CAPACITY[1],
    },
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const set = <K extends keyof NgoProfile>(k: K, v: NgoProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.organization.trim() &&
    form.operating_regions.length > 0 &&
    form.focus_areas.length > 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const ctx = await submitOnboarding({ persona: "NGO", ngo: form });
      setWorkspace(ctx);
      setNgo(form);
      setSaved(true);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Header
        title="Your organisation"
        lede="What you can deliver and where. This sets your workspace scope on the backend and is what opportunity matching runs against."
      />

      <Panel eyebrow="Profile" title="Capability and coverage">
        <div className="space-y-4">
          {error && <ErrorNote message={error} />}

          <Field label="Organisation name" required>
            <Input
              value={form.organization}
              onChange={(e) => set("organization", e.target.value)}
              placeholder="Sujal Gramin Vikas Sanstha"
            />
          </Field>

          <Field
            label="Areas of expertise"
            required
            hint="What your teams are actually good at delivering."
          >
            <ChipSelect
              options={SECTORS}
              value={form.focus_areas}
              onChange={(v) => set("focus_areas", v)}
              accent={ROLE.accent}
            />
          </Field>

          <TokenInput
            label="Regions you operate in"
            hint="District or block names. Press Enter to add each one."
            placeholder="Rewa"
            value={form.operating_regions}
            onChange={(v) => set("operating_regions", v)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Implementation capacity">
              <Select
                value={form.implementation_capacity}
                onChange={(e) => set("implementation_capacity", e.target.value)}
              >
                {CAPACITY.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Communities served"
              hint="Who you work with, in your own words."
            >
              <Input
                value={form.communities_served}
                onChange={(e) => set("communities_served", e.target.value)}
                placeholder="Smallholder farming households, 40 villages"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={!valid || saving} onClick={save}>
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save profile"}
            </Button>
            {saved && (
              <>
                <Badge tone="ok">Profile active</Badge>
                <Button variant="ghost" onClick={onDone}>
                  Find matching work
                </Button>
              </>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ── Opportunities ────────────────────────────────────────────────────────── */

function Opportunities() {
  const { ngo, interests, addInterest } = useNetwork();
  const [cards, setCards] = React.useState<InterventionCard[]>([]);
  const [places, setPlaces] = React.useState<LocationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [onlyMatches, setOnlyMatches] = React.useState(true);
  const [applying, setApplying] = React.useState<InterventionCard | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, l] = await Promise.all([listInterventions(), listLocations()]);
        if (!alive) return;
        setCards(c);
        setPlaces(l.items);
      } catch (e) {
        if (alive) setError(describeError(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const focus = ngo?.focus_areas ?? [];
  const scored = cards
    .map((c) => ({ card: c, score: matchScore(focus, [c.domain, c.category]) }))
    .sort((a, b) => b.score - a.score);
  const shown = onlyMatches && focus.length ? scored.filter((s) => s.score > 0) : scored;

  const hotspots = [...places].sort((a, b) => b.intensity - a.intensity).slice(0, 5);

  return (
    <div className="space-y-4">
      <Header
        title="Work you could take on"
        lede="Interventions from the NEXUS knowledge graph, ranked against your stated expertise. The need signal comes from what officers and communities have reported."
      />

      {!ngo && (
        <Empty
          title="No profile yet"
          body="Fill in your organisation profile first — matching runs against your areas of expertise."
        />
      )}

      {loading && <Loading label="Loading interventions and reported needs" />}
      {error && <ErrorNote message={error} />}

      {hotspots.length > 0 && (
        <Panel
          eyebrow="Where the need is"
          title="Highest-intensity reported locations"
          actions={<Origin kind="entered" />}
        >
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {hotspots.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-hair bg-abyss/50 p-3"
                style={{ boxShadow: `inset 2px 0 0 0 ${intensityColor(p.intensity)}` }}
              >
                <div className="text-[13px] font-medium text-ink-hi">
                  {p.name || p.district}
                </div>
                <div className="text-[11.5px] text-ink-mid">
                  {[p.city, p.district, p.state].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-1.5">
                  <Badge tone="critical">Intensity {p.intensity}/10</Badge>
                </div>
                {p.details && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-lo">
                    {p.details}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {cards.length > 0 && (
        <Panel
          eyebrow="Opportunities"
          title={`${shown.length} interventions`}
          actions={
            focus.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOnlyMatches((o) => !o)}
              >
                {onlyMatches ? "Show all" : "Only my sectors"}
              </Button>
            )
          }
        >
          {shown.length === 0 ? (
            <Empty
              title="Nothing matches your sectors"
              body="Widen your areas of expertise, or switch to viewing all interventions."
            />
          ) : (
            <ul className="grid gap-2.5 lg:grid-cols-2">
              {shown.map(({ card, score }) => {
                const already = interests.some((i) => i.targetId === card.id);
                return (
                  <li
                    key={card.id}
                    className="rounded-lg border border-hair bg-abyss/50 p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[13.5px] font-medium text-ink-hi">
                        {card.name}
                      </h3>
                      <Badge>{card.domain}</Badge>
                      {focus.length > 0 && <MatchBadge score={score} />}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mid">
                      {card.description}
                    </p>
                    <dl className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <Cell label="Cost" value={inr(card.cost_inr)} />
                      <Cell
                        label="Duration"
                        value={months(card.implementation_time_months)}
                      />
                      <Cell
                        label="Risk"
                        value={card.risk_level}
                        color={riskColor(card.risk_level)}
                      />
                    </dl>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant={already ? "ghost" : "outline"}
                        disabled={already || !ngo}
                        onClick={() => setApplying(card)}
                      >
                        <Handshake className="h-3.5 w-3.5" />
                        {already ? "Interest registered" : "Express interest"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      {applying && ngo && (
        <InterestDialog
          card={applying}
          organization={ngo.organization}
          capacity={ngo.implementation_capacity}
          onClose={() => setApplying(null)}
          onSubmit={(r) => {
            addInterest(r);
            setApplying(null);
          }}
        />
      )}
    </div>
  );
}

function InterestDialog({
  card,
  organization,
  capacity,
  onClose,
  onSubmit,
}: {
  card: InterventionCard;
  organization: string;
  capacity: string;
  onClose: () => void;
  onSubmit: (r: InterestRecord) => void;
}) {
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    const record: InterestRecord = {
      id: uid(),
      targetId: card.id,
      targetName: card.name,
      organization,
      note: note.trim(),
      capacityOffered: capacity,
      submittedAt: new Date().toISOString(),
      persisted: false,
    };
    try {
      onSubmit(await submitInterest(record));
    } catch (e) {
      if (e instanceof NotConnectedError) onSubmit(record);
      else setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-abyss/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-hair bg-panel shadow-panel">
        <header className="border-b border-hair px-4 py-3">
          <div className="rule-label">Express interest</div>
          <h3 className="font-display text-[15px] text-ink-hi">{card.name}</h3>
        </header>
        <div className="space-y-3 p-4">
          {error && <ErrorNote message={error} />}
          <Field
            label="What you would bring"
            hint="Teams, prior work in the area, equipment you already have."
          >
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Six field teams already working in the northern blocks; existing rapport with panchayats."
            />
          </Field>
          <UnsavedNotice endpoint="/api/v1/network/interest" />
        </div>
        <footer className="flex justify-end gap-2 border-t border-hair px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} onClick={send}>
            Register interest
          </Button>
        </footer>
      </div>
    </div>
  );
}

/* ── Tracking ─────────────────────────────────────────────────────────────── */

function Tracking() {
  const { interests, removeInterest, ngo } = useNetwork();
  return (
    <div className="space-y-4">
      <Header
        title="What you have put your name to"
        lede="Interventions you have expressed interest in, and where each one stands."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Interests registered" value={interests.length} origin="entered" />
        <Stat
          label="Sectors covered"
          value={ngo?.focus_areas.length ?? 0}
          origin="entered"
        />
        <Stat
          label="Regions declared"
          value={ngo?.operating_regions.length ?? 0}
          origin="entered"
        />
      </div>

      <Panel eyebrow="Involvement" title="Registered interests">
        {interests.length === 0 ? (
          <Empty
            title="Nothing registered yet"
            body="Find work that matches your expertise and express interest — it will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {interests.map((i) => (
              <li
                key={i.id}
                className="rounded-lg border border-hair bg-abyss/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink-hi">
                    {i.targetName}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge tone="critical">Awaiting review</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeInterest(i.id)}
                    >
                      Withdraw
                    </Button>
                  </div>
                </div>
                <div className="mt-1 font-mono text-micro uppercase text-ink-lo">
                  {i.organization} · {i.capacityOffered}
                </div>
                {i.note && (
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mid">
                    {i.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {interests.length > 0 && (
          <div className="mt-3">
            <UnsavedNotice endpoint="/api/v1/network/interest" />
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ── Shared bits ──────────────────────────────────────────────────────────── */

export function Header({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="mb-1">
      <h1 className="font-display text-[21px] font-medium leading-tight text-ink-hi">
        {title}
      </h1>
      <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-mid">
        {lede}
      </p>
    </div>
  );
}

export function Cell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded border border-hair bg-hull/50 px-2 py-1.5">
      <dt className="rule-label">{label}</dt>
      <dd
        className="tabular-nums text-ink-hi"
        style={color ? { color } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
