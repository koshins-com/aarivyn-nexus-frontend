"use client";

import * as React from "react";
import { MapPin, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { intensityColor, relativeTime } from "@/lib/format";
import type { ContextSignal, LocationRecord } from "@/lib/types";

/**
 * Area intelligence for one reported location. Only fields the backend
 * actually returns are rendered — anything absent is omitted rather than
 * shown as a placeholder.
 */
export function DetailSheet({
  record,
  signals,
  onClose,
  onViewOnMap,
  onEdit,
  onDelete,
  onFeedback,
}: {
  record: LocationRecord;
  signals: ContextSignal[];
  onClose: () => void;
  onViewOnMap: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFeedback: () => void;
}) {
  const color = intensityColor(record.intensity);

  const rows: Array<[string, React.ReactNode]> = [
    [
      "Location",
      [record.city, record.district, record.state].filter(Boolean).join(", "),
    ],
    ["Severity", `${record.intensity} of 10`],
    ["Reported", `${new Date(record.created_at).toLocaleString("en-IN")} · ${relativeTime(record.created_at)}`],
  ];
  if (record.updated_at !== record.created_at) {
    rows.push(["Last updated", relativeTime(record.updated_at)]);
  }
  if (record.details) rows.push(["Account", record.details]);
  rows.push(["Record ID", <code key="id" className="font-mono text-[11px] text-observed">{record.id}</code>]);

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-2xl border border-hair bg-panel/95 backdrop-blur-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[400px] sm:rounded-none sm:rounded-l-2xl"
      role="dialog"
      aria-label="Area intelligence"
    >
      <header
        className="flex items-start justify-between gap-3 border-b border-hair px-4 py-3"
        style={{ boxShadow: `inset 3px 0 0 0 ${color}` }}
      >
        <div className="min-w-0">
          <div className="rule-label">Area intelligence</div>
          <h2 className="font-display text-[16px] text-ink-hi">
            {record.name || record.district}
          </h2>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="critical">Severity {record.intensity}/10</Badge>
          <Badge tone="entered">Community report</Badge>
        </div>

        <dl className="divide-y divide-hair">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-0.5 py-2 sm:grid-cols-[104px_1fr] sm:gap-3">
              <dt className="rule-label pt-0.5">{k}</dt>
              <dd className="text-[12.5px] leading-relaxed text-ink-hi">{v}</dd>
            </div>
          ))}
        </dl>

        {signals.length > 0 && (
          <section>
            <div className="rule-label mb-2">Satellite findings for this area</div>
            <ul className="space-y-2">
              {signals.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-hair bg-abyss/50 p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12.5px] font-medium text-ink-hi">
                      {s.title}
                    </span>
                    <Badge tone="critical">{s.severity}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-mid">
                    {s.description}
                  </p>
                  <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-lo">
                    {s.affected_villages_count} villages · {s.underlying_data_citation}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-hair pt-3">
          <Button size="sm" variant="outline" onClick={onViewOnMap}>
            <MapPin className="h-3.5 w-3.5" />
            View on map
          </Button>
          <Button size="sm" variant="outline" onClick={onFeedback}>
            <MessageSquare className="h-3.5 w-3.5" />
            Give feedback
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit report
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-critical" />
            Delete
          </Button>
        </div>
      </div>
    </aside>
  );
}
