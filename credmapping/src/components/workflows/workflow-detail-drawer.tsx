"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { Badge } from "~/components/ui/badge";

export interface WorkflowRow {
  id: string;
  relatedId: string;
  workflowType: string;
  phaseName: string;
  status: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  updatedAt: string;
  agentName: string | null;
}

export interface IncidentRow {
  id: string;
  workflowID: string;
  dateIdentified: string | null;
  resolutionDate: string | null;
  subcategory: string;
  critical: boolean;
  incidentDescription: string | null;
  finalResolution: string | null;
  discussed: boolean;
  reporterName: string | null;
}

interface WorkflowDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  details?: { label: string; value: React.ReactNode }[];
  workflows: WorkflowRow[];
  incidents?: IncidentRow[];
}

const getDueDateTone = (value: string | null) => {
  if (!value) return "text-muted-foreground";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "text-muted-foreground";
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "text-red-600 dark:text-red-400";
  if (days <= 30) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
};

export function WorkflowDetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  details,
  workflows,
  incidents = [],
}: WorkflowDetailDrawerProps) {
  // Group incidents by workflowID for inline display
  const incidentsByWorkflow = new Map<string, IncidentRow[]>();
  for (const inc of incidents) {
    const current = incidentsByWorkflow.get(inc.workflowID) ?? [];
    current.push(inc);
    incidentsByWorkflow.set(inc.workflowID, current);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        {/* Detail fields */}
        {details && details.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 text-sm">
            {details.map((d) => (
              <div key={d.label}>
                <p className="text-muted-foreground text-xs">{d.label}</p>
                <div className="font-medium">{d.value ?? "—"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Workflow phases */}
        <div className="px-4 pb-2">
          <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Workflow Phases ({workflows.length})
          </h4>
          {workflows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No workflow phases linked.</p>
          ) : (
            <div className="space-y-2">
              {workflows.map((wf) => {
                const wfIncidents = incidentsByWorkflow.get(wf.id) ?? [];
                return (
                  <div key={wf.id} className="rounded-md border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{wf.phaseName}</span>
                      <Badge variant="outline" className="text-[11px]">
                        {wf.status ?? "—"}
                      </Badge>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block text-[10px] uppercase">Start</span>
                        {wf.startDate ?? "—"}
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase">Due</span>
                        <span className={getDueDateTone(wf.dueDate)}>{wf.dueDate ?? "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase">Completed</span>
                        {wf.completedAt ?? "—"}
                      </div>
                    </div>
                    {wf.agentName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Agent: {wf.agentName}
                      </p>
                    )}
                    {/* Incidents for this workflow phase */}
                    {wfIncidents.length > 0 && (
                      <div className="mt-2 space-y-1.5 border-t pt-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Incidents ({wfIncidents.length})
                        </p>
                        {wfIncidents.map((inc) => (
                          <div
                            key={inc.id}
                            className={`rounded border px-2 py-1.5 text-xs ${
                              inc.critical
                                ? "border-red-500/40 bg-red-500/5"
                                : "border-amber-500/40 bg-amber-500/5"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{inc.subcategory}</span>
                              <div className="flex items-center gap-1">
                                {inc.critical && (
                                  <Badge variant="outline" className="text-[10px] border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300">
                                    Critical
                                  </Badge>
                                )}
                                {inc.discussed && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Discussed
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {inc.incidentDescription && (
                              <p className="mt-1 text-muted-foreground line-clamp-2">{inc.incidentDescription}</p>
                            )}
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span>Identified: {inc.dateIdentified ?? "—"}</span>
                              <span>Resolved: {inc.resolutionDate ?? "—"}</span>
                              {inc.reporterName && <span>Reporter: {inc.reporterName}</span>}
                            </div>
                            {inc.finalResolution && (
                              <p className="mt-1 text-muted-foreground">
                                <span className="font-medium text-foreground">Resolution:</span> {inc.finalResolution}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Standalone incidents not matched to a displayed workflow */}
        {incidents.length > 0 && (
          <div className="px-4 pb-4">
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              All Incidents ({incidents.length})
            </h4>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
