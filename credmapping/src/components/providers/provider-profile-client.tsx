"use client";

import * as React from "react";
import { Activity, Building2, ShieldCheck } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { CollapsibleSection } from "~/components/ui/collapsible-section";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import {
  WorkflowDetailDrawer,
  type WorkflowRow,
  type IncidentRow,
} from "~/components/workflows/workflow-detail-drawer";
import { ActivityTimeline } from "~/components/audit-log/ActivityTimeline";

/* ─── types matching server-side data ─── */

export interface LicenseRow {
  id: string;
  state: string | null;
  status: string | null;
  number: string | null;
  startsAt: Date | string | null;
  expiresAt: Date | string | null;
}

export interface PrivilegeRow {
  id: string;
  privilegeTier: string | null;
  currentPrivInitDate: Date | string | null;
  currentPrivEndDate: Date | string | null;
  termDate: Date | string | null;
  termReason: string | null;
}

export interface PfcRow {
  id: string;
  facilityName: string | null;
  facilityType: string | null;
  priority: string | null;
  decision: string | null;
  notes: string | null;
  privileges: string | null;
  updatedAt: Date | string | null;
}

export interface NormalizedWorkflow {
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

interface ProviderProfileClientProps {
  providerId: string;
  licenseRows: LicenseRow[];
  privilegeRows: PrivilegeRow[];
  credentials: PfcRow[];
  workflows: NormalizedWorkflow[];
  incidents: IncidentRow[];
}

/* ─── helpers ─── */

const formatDate = (value: Date | string | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const getLicenseStatusTone = (value: Date | string | null) => {
  if (!value) return "text-muted-foreground";
  const expiry = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(expiry.getTime())) return "text-muted-foreground";
  const days = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "text-red-600 dark:text-red-400";
  if (days <= 90) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
};

const getPrivilegeTone = (tier: string | null) => {
  const normalized = tier?.toLowerCase() ?? "";
  if (normalized.includes("inactive"))
    return "border-zinc-500/60 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
  if (normalized.includes("progress"))
    return "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (normalized.includes("temp"))
    return "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (normalized.includes("full"))
    return "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "text-muted-foreground border-border";
};

const getDecisionTone = (decision: string | null) => {
  const d = decision?.toLowerCase() ?? "";
  if (d.includes("approved") || d.includes("active"))
    return "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300";
};

/** Returns true if any workflow for this entity has a due date that is NOT in the past */
const hasActiveWorkflows = (relatedId: string, workflows: NormalizedWorkflow[]) => {
  const related = workflows.filter((w) => w.relatedId === relatedId);
  if (related.length === 0) return true; // no workflows = show by default
  return related.some((w) => {
    if (!w.dueDate) return true;
    return new Date(w.dueDate).getTime() >= Date.now();
  });
};

/* ─── component ─── */

export function ProviderProfileClient({
  providerId,
  licenseRows,
  privilegeRows,
  credentials,
  workflows,
  incidents,
}: ProviderProfileClientProps) {
  const [showOnlyActive, setShowOnlyActive] = React.useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerTitle, setDrawerTitle] = React.useState("");
  const [drawerDescription, setDrawerDescription] = React.useState<string | undefined>();
  const [drawerDetails, setDrawerDetails] = React.useState<{ label: string; value: React.ReactNode }[]>([]);
  const [drawerWorkflows, setDrawerWorkflows] = React.useState<WorkflowRow[]>([]);
  const [drawerIncidents, setDrawerIncidents] = React.useState<IncidentRow[]>([]);

  const openDrawer = (
    title: string,
    description: string | undefined,
    details: { label: string; value: React.ReactNode }[],
    relatedWorkflows: WorkflowRow[],
  ) => {
    setDrawerTitle(title);
    setDrawerDescription(description);
    setDrawerDetails(details);
    setDrawerWorkflows(relatedWorkflows);
    // Filter incidents for the workflow phases being shown
    const wfIds = new Set(relatedWorkflows.map((w) => w.id));
    setDrawerIncidents(incidents.filter((inc) => wfIds.has(inc.workflowID)));
    setDrawerOpen(true);
  };

  // Build workflow maps by relatedId
  const workflowsByRelated = React.useMemo(() => {
    const map = new Map<string, NormalizedWorkflow[]>();
    for (const w of workflows) {
      const current = map.get(w.relatedId) ?? [];
      current.push(w);
      map.set(w.relatedId, current);
    }
    return map;
  }, [workflows]);

  // Filtered lists based on toggle
  const filteredLicenses = showOnlyActive
    ? licenseRows.filter((l) => hasActiveWorkflows(l.id, workflows))
    : licenseRows;

  const filteredPrivileges = showOnlyActive
    ? privilegeRows.filter((p) => hasActiveWorkflows(p.id, workflows))
    : privilegeRows;

  const filteredCredentials = showOnlyActive
    ? credentials.filter((c) => hasActiveWorkflows(c.id, workflows))
    : credentials;

  return (
    <>
      {/* In-progress toggle */}
      <div className="flex items-center justify-end gap-2 px-1">
        <Label htmlFor="active-toggle" className="text-xs text-muted-foreground cursor-pointer">
          Show only in-progress
        </Label>
        <Switch
          id="active-toggle"
          checked={showOnlyActive}
          onCheckedChange={setShowOnlyActive}
        />
      </div>

      {/* ── Vesta privileges ── */}
      <CollapsibleSection
        title={<span className="flex items-center gap-2"><Activity className="size-4" /> Vesta privileges history</span>}
        badge={filteredPrivileges.length}
        maxHeight="20rem"
      >
        {filteredPrivileges.length === 0 ? (
          <p className="text-muted-foreground text-sm">No Vesta privilege records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="py-1 pr-3">Tier</th>
                  <th className="py-1 pr-3">Init date</th>
                  <th className="py-1 pr-3">Exp date</th>
                  <th className="py-1 pr-3">Term date</th>
                  <th className="py-1 pr-3">Term reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrivileges.map((privilege) => {
                  const relatedWfs = (workflowsByRelated.get(privilege.id) ?? []) as WorkflowRow[];
                  return (
                    <tr
                      key={privilege.id}
                      className="border-t cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() =>
                        openDrawer(
                          `${privilege.privilegeTier ?? "Unknown"} Privilege`,
                          undefined,
                          [
                            { label: "Tier", value: privilege.privilegeTier ?? "—" },
                            { label: "Init Date", value: formatDate(privilege.currentPrivInitDate) },
                            { label: "Exp Date", value: formatDate(privilege.currentPrivEndDate) },
                            { label: "Term Date", value: formatDate(privilege.termDate) },
                            { label: "Term Reason", value: privilege.termReason ?? "—" },
                          ],
                          relatedWfs,
                        )
                      }
                    >
                      <td className="py-1 pr-3">
                        <Badge className={getPrivilegeTone(privilege.privilegeTier)} variant="outline">
                          {privilege.privilegeTier ?? "Unspecified"}
                        </Badge>
                      </td>
                      <td className="py-1 pr-3">{formatDate(privilege.currentPrivInitDate)}</td>
                      <td className={`py-1 pr-3 ${getLicenseStatusTone(privilege.currentPrivEndDate)}`}>
                        {formatDate(privilege.currentPrivEndDate)}
                      </td>
                      <td className="py-1 pr-3">{formatDate(privilege.termDate)}</td>
                      <td className="py-1 pr-3">{privilege.termReason ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* ── Metric cards (affected by toggle) ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2">
          <p className="text-xs text-blue-700 dark:text-blue-300">State licenses</p>
          <p className="text-lg font-semibold">{filteredLicenses.length}</p>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">Privilege records</p>
          <p className="text-lg font-semibold">{filteredPrivileges.length}</p>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-300">Facility workflows</p>
          <p className="text-lg font-semibold">{filteredCredentials.length}</p>
        </div>
      </div>

      {/* ── Vesta privileges ── */}
      <CollapsibleSection
        title={<span className="flex items-center gap-2"><ShieldCheck className="size-4" /> State licenses</span>}
        badge={filteredLicenses.length}
        maxHeight="20rem"
      >
        {filteredLicenses.length === 0 ? (
          <p className="text-muted-foreground text-sm">No state licenses found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="py-1 pr-3">State</th>
                  <th className="py-1 pr-3">Status</th>
                  <th className="py-1 pr-3">Number</th>
                  <th className="py-1 pr-3">Starts</th>
                  <th className="py-1 pr-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.map((license) => {
                  const relatedWfs = (workflowsByRelated.get(license.id) ?? []) as WorkflowRow[];
                  return (
                    <tr
                      key={license.id}
                      className="border-t cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() =>
                        openDrawer(
                          `${license.state ?? "Unknown"} License`,
                          `License #${license.number ?? "—"}`,
                          [
                            { label: "State", value: license.state ?? "—" },
                            { label: "Status", value: license.status ?? "—" },
                            { label: "Number", value: license.number ?? "—" },
                            { label: "Starts", value: formatDate(license.startsAt) },
                            { label: "Expires", value: formatDate(license.expiresAt) },
                          ],
                          relatedWfs,
                        )
                      }
                    >
                      <td className="py-1 pr-3">{license.state ?? "—"}</td>
                      <td className="py-1 pr-3">{license.status ?? "—"}</td>
                      <td className="py-1 pr-3">{license.number ?? "—"}</td>
                      <td className="py-1 pr-3">{formatDate(license.startsAt)}</td>
                      <td className={`py-1 pr-3 ${getLicenseStatusTone(license.expiresAt)}`}>
                        {formatDate(license.expiresAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* ── PFC Section ── */}
      <CollapsibleSection
        title={<span className="flex items-center gap-2"><Building2 className="size-4" /> Provider facility credentials</span>}
        badge={filteredCredentials.length}
        maxHeight="32rem"
      >
        {filteredCredentials.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No provider facility credentials exist for this provider.
          </p>
        ) : (
          <div className="space-y-1">
            {filteredCredentials.map((credential) => {
              const relatedWfs = (workflowsByRelated.get(credential.id) ?? []) as WorkflowRow[];
              const isApproved = (credential.decision ?? "").toLowerCase().includes("approved");

              return (
                <div
                  key={credential.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors hover:bg-muted/40 ${
                    isApproved
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-blue-500/40 bg-blue-500/5"
                  }`}
                  onClick={() =>
                    openDrawer(
                      credential.facilityName ?? "Unknown Facility",
                      credential.notes ?? undefined,
                      [
                        { label: "Priority", value: credential.priority ?? "—" },
                        {
                          label: "Decision",
                          value: (
                            <Badge className={getDecisionTone(credential.decision)} variant="outline">
                              {credential.decision ?? "—"}
                            </Badge>
                          ),
                        },
                        { label: "Privileges", value: credential.privileges ?? "—" },
                        { label: "Facility Type", value: credential.facilityType ?? "—" },
                        { label: "Updated", value: formatDate(credential.updatedAt) },
                      ],
                      relatedWfs,
                    )
                  }
                >
                  <span className="text-sm font-medium">
                    {credential.facilityName ?? "Unknown Facility"}
                  </span>
                  <Badge
                    className={`text-[11px] ${getDecisionTone(credential.decision)}`}
                    variant="outline"
                  >
                    {isApproved ? "Approved" : credential.decision ?? "In Progress"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* ── Activity Log ── */}
      <CollapsibleSection
        title={<span className="flex items-center gap-2"><Activity className="size-5" /> Activity Log</span>}
        defaultOpen={false}
      >
        <ActivityTimeline entityType="provider" entityId={providerId} />
      </CollapsibleSection>

      {/* Shared drawer */}
      <WorkflowDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={drawerTitle}
        description={drawerDescription}
        details={drawerDetails}
        workflows={drawerWorkflows}
        incidents={drawerIncidents}
      />
    </>
  );
}
