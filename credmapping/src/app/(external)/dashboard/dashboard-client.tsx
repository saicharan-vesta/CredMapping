"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

type ViewKey = "providerFacility" | "facilityProvider" | "facilityPrelive" | "providerLicense";

type ProviderFacilityRow = {
  id: string;
  providerId: string | null;
  providerName: string;
  providerDegree: string | null;
  facilityId: string | null;
  facilityName: string;
  facilityState: string | null;
  priority: string | null;
  privileges: string | null;
  decision: string | null;
  facilityType: string | null;
  applicationRequired: boolean | null;
  updatedAt: string | null;
};

type FacilityPreliveRow = {
  id: string;
  facilityId: string | null;
  facilityName: string;
  facilityState: string | null;
  priority: string | null;
  goLiveDate: string | null;
  credentialingDueDate: string | null;
  boardMeetingDate: string | null;
  tempsPossible: boolean | null;
  payorEnrollmentRequired: boolean | null;
  rolesNeeded: string[];
  updatedAt: string | null;
};

type ProviderLicenseRow = {
  id: string;
  providerId: string | null;
  providerName: string;
  providerDegree: string | null;
  state: string | null;
  priority: string | null;
  status: string | null;
  path: string | null;
  initialOrRenewal: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
};

type DashboardClientProps = {
  providerFacilityRows: ProviderFacilityRow[];
  facilityPreliveRows: FacilityPreliveRow[];
  providerLicenseRows: ProviderLicenseRow[];
};

type GroupedRows<T> = {
  key: string;
  label: string;
  subtitle?: string;
  rows: T[];
};

const viewButtons: Array<{ key: ViewKey; label: string }> = [
  { key: "providerFacility", label: "Provider-Level Facility Credentials" },
  { key: "facilityProvider", label: "Facility-Level Provider Credentials" },
  { key: "facilityPrelive", label: "Facility Pre-Live Details" },
  { key: "providerLicense", label: "Provider-Level State License Overview" },
];

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const statusTone = (value: string | null) => {
  const normalized = normalize(value);
  if (normalized.includes("approved")) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/50";
  if (normalized.includes("awaiting") || normalized.includes("pending")) {
    return "bg-blue-500/15 text-blue-200 border-blue-500/50";
  }
  if (normalized.includes("missing") || normalized.includes("hold") || normalized.includes("ineligible")) {
    return "bg-violet-500/15 text-violet-200 border-violet-500/50";
  }
  return "bg-muted text-foreground border-border";
};

const priorityTone = (value: string | null) => {
  const normalized = normalize(value);
  if (normalized.includes("top")) return "bg-red-500/15 text-red-200 border-red-500/50";
  if (normalized.includes("super stat") || normalized.includes("stat")) {
    return "bg-blue-500/15 text-blue-200 border-blue-500/50";
  }
  if (normalized.includes("high")) return "bg-orange-500/15 text-orange-200 border-orange-500/50";
  if (normalized.includes("medium")) return "bg-amber-500/15 text-amber-100 border-amber-500/50";
  if (normalized.includes("low")) return "bg-yellow-500/15 text-yellow-100 border-yellow-500/50";
  return "bg-muted text-foreground border-border";
};

function groupBy<T>(
  rows: T[],
  keyFn: (row: T) => string,
  labelFn: (row: T) => string,
  subtitleFn?: (row: T) => string | undefined,
): GroupedRows<T>[] {
  const map = new Map<string, GroupedRows<T>>();
  for (const row of rows) {
    const key = keyFn(row);
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    map.set(key, { key, label: labelFn(row), subtitle: subtitleFn?.(row), rows: [row] });
  }
  return Array.from(map.values());
}

function rowsMatchSearch(rows: ProviderFacilityRow[] | FacilityPreliveRow[] | ProviderLicenseRow[], query: string) {
  const q = normalize(query);
  if (!q) return rows;

  return rows.filter((row) => {
    if ("providerName" in row && "facilityName" in row) {
      return [
        row.providerName,
        row.facilityName,
        row.facilityState ?? "",
        row.priority ?? "",
        row.privileges ?? "",
        row.decision ?? "",
        row.facilityType ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    }

    if ("facilityName" in row && "rolesNeeded" in row) {
      return [row.facilityName, row.facilityState ?? "", row.priority ?? "", row.rolesNeeded.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    }

    return [
      row.providerName,
      row.state ?? "",
      row.priority ?? "",
      row.path ?? "",
      row.status ?? "",
      row.initialOrRenewal ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

export function DashboardClient({
  providerFacilityRows,
  facilityPreliveRows,
  providerLicenseRows,
}: DashboardClientProps) {
  const [view, setView] = useState<ViewKey>("providerFacility");
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("updated_desc");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const allPriorities = useMemo(() => {
    const values = new Set<string>();
    for (const row of providerFacilityRows) if (row.priority) values.add(row.priority);
    for (const row of facilityPreliveRows) if (row.priority) values.add(row.priority);
    for (const row of providerLicenseRows) if (row.priority) values.add(row.priority);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [facilityPreliveRows, providerFacilityRows, providerLicenseRows]);

  const allStatuses = useMemo(() => {
    const values = new Set<string>();
    for (const row of providerFacilityRows) if (row.decision) values.add(row.decision);
    for (const row of providerLicenseRows) if (row.status) values.add(row.status);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [providerFacilityRows, providerLicenseRows]);

  const filteredProviderFacility = useMemo(() => {
    const rows = providerFacilityRows.filter((row) => {
      const matchesPriority =
        priorityFilter === "all" || normalize(row.priority) === normalize(priorityFilter);
      const matchesStatus =
        statusFilter === "all" || normalize(row.decision) === normalize(statusFilter);
      return matchesPriority && matchesStatus;
    });

    return [...rows].sort((a, b) => {
      if (sort === "name_asc") return a.providerName.localeCompare(b.providerName);
      if (sort === "name_desc") return b.providerName.localeCompare(a.providerName);
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return sort === "updated_asc" ? aTime - bTime : bTime - aTime;
    });
  }, [priorityFilter, providerFacilityRows, sort, statusFilter]);

  const filteredPrelive = useMemo(() => {
    const rows = facilityPreliveRows.filter((row) =>
      priorityFilter === "all" || normalize(row.priority) === normalize(priorityFilter),
    );

    return [...rows].sort((a, b) => {
      if (sort === "name_asc") return a.facilityName.localeCompare(b.facilityName);
      if (sort === "name_desc") return b.facilityName.localeCompare(a.facilityName);
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return sort === "updated_asc" ? aTime - bTime : bTime - aTime;
    });
  }, [facilityPreliveRows, priorityFilter, sort]);

  const filteredLicenses = useMemo(() => {
    const rows = providerLicenseRows.filter((row) => {
      const matchesPriority =
        priorityFilter === "all" || normalize(row.priority) === normalize(priorityFilter);
      const matchesStatus =
        statusFilter === "all" || normalize(row.status) === normalize(statusFilter);
      return matchesPriority && matchesStatus;
    });

    return [...rows].sort((a, b) => {
      if (sort === "name_asc") return a.providerName.localeCompare(b.providerName);
      if (sort === "name_desc") return b.providerName.localeCompare(a.providerName);
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return sort === "updated_asc" ? aTime - bTime : bTime - aTime;
    });
  }, [priorityFilter, providerLicenseRows, sort, statusFilter]);

  const providerGroups = useMemo(
    () =>
      groupBy(
        filteredProviderFacility,
        (row) => row.providerId ?? row.providerName,
        (row) => row.providerName,
        (row) => row.providerDegree ?? undefined,
      ),
    [filteredProviderFacility],
  );

  const facilityGroups = useMemo(
    () =>
      groupBy(
        filteredProviderFacility,
        (row) => row.facilityId ?? row.facilityName,
        (row) => row.facilityName,
        (row) => row.facilityState ?? undefined,
      ),
    [filteredProviderFacility],
  );

  const preliveGroups = useMemo(
    () =>
      groupBy(
        filteredPrelive,
        (row) => row.facilityId ?? row.facilityName,
        (row) => row.facilityName,
        (row) => row.facilityState ?? undefined,
      ),
    [filteredPrelive],
  );

  const licenseGroups = useMemo(
    () =>
      groupBy(
        filteredLicenses,
        (row) => row.providerId ?? row.providerName,
        (row) => row.providerName,
        (row) => row.providerDegree ?? undefined,
      ),
    [filteredLicenses],
  );

  const groupsForView = useMemo(() => {
    if (view === "providerFacility") return providerGroups;
    if (view === "facilityProvider") return facilityGroups;
    if (view === "facilityPrelive") return preliveGroups;
    return licenseGroups;
  }, [facilityGroups, licenseGroups, preliveGroups, providerGroups, view]);

  const activeGroups = useMemo(() => {
    const q = normalize(leftSearch);
    if (!q) return groupsForView;
    return groupsForView.filter((group) =>
      `${group.label} ${group.subtitle ?? ""}`.toLowerCase().includes(q),
    );
  }, [groupsForView, leftSearch]);

  useEffect(() => {
    if (activeGroups.length === 0) {
      setSelectedKey(null);
      return;
    }

    if (!selectedKey || !activeGroups.some((group) => group.key === selectedKey)) {
      setSelectedKey(activeGroups[0]?.key ?? null);
    }
  }, [activeGroups, selectedKey]);

  const selectedGroup = useMemo(
    () => activeGroups.find((group) => group.key === selectedKey) ?? null,
    [activeGroups, selectedKey],
  );

  const selectedRows = useMemo(() => {
    if (!selectedGroup) return [];
    return rowsMatchSearch(
      selectedGroup.rows,
      rightSearch,
    );
  }, [rightSearch, selectedGroup]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/70">
      <div className="border-b border-border/70 p-3">
        <div className="flex flex-wrap gap-2">
          {viewButtons.map((button) => (
            <Button
              key={button.key}
              size="sm"
              variant={view === button.key ? "default" : "outline"}
              onClick={() => {
                setView(button.key);
                setSelectedKey(null);
                setLeftSearch("");
                setRightSearch("");
              }}
            >
              {button.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {allPriorities.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {allStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_desc">Date: Newest First</SelectItem>
              <SelectItem value="updated_asc">Date: Oldest First</SelectItem>
              <SelectItem value="name_asc">Name: A to Z</SelectItem>
              <SelectItem value="name_desc">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[330px_1fr]">
        <div className="flex min-h-0 flex-col border-r border-border/60 p-3">
          <Input
            placeholder={
              view === "providerFacility" || view === "providerLicense"
                ? "Search providers"
                : "Search facilities"
            }
            value={leftSearch}
            onChange={(event) => setLeftSearch(event.target.value)}
            className="mb-3"
          />
          <div className="min-h-0 flex-1 overflow-auto">
            {activeGroups.length === 0 ? (
              <div className="rounded-md border border-border/50 p-4 text-sm text-muted-foreground">
                No records match the current filters.
              </div>
            ) : (
              <div className="space-y-1">
                {activeGroups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setSelectedKey(group.key)}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left transition",
                      selectedGroup?.key === group.key
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/50 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium">{group.label}</div>
                      <div className="text-xs text-muted-foreground">{group.rows.length}</div>
                    </div>
                    {group.subtitle && (
                      <div className="mt-1 text-xs text-muted-foreground">{group.subtitle}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col p-3">
          <Input
            placeholder="Search selected details"
            value={rightSearch}
            onChange={(event) => setRightSearch(event.target.value)}
            className="mb-3"
          />
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60">
            {!selectedGroup ? (
              <div className="p-4 text-sm text-muted-foreground">Select an item to view details.</div>
            ) : (
              <>
                {selectedRows.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No rows match that detail search.</div>
                ) : null}

                {view === "providerFacility" && selectedRows.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left font-medium">Facility</th>
                        <th className="p-2 text-left font-medium">Priority</th>
                        <th className="p-2 text-left font-medium">Privileges</th>
                        <th className="p-2 text-left font-medium">Status</th>
                        <th className="p-2 text-left font-medium">Type</th>
                        <th className="p-2 text-left font-medium">Application</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRows as ProviderFacilityRow[]).map((row) => (
                        <tr key={row.id} className="border-t border-border/40">
                          <td className="p-2">{row.facilityName}</td>
                          <td className="p-2">
                            <Badge variant="outline" className={cn(priorityTone(row.priority))}>
                              {row.priority ?? "—"}
                            </Badge>
                          </td>
                          <td className="p-2">{row.privileges ?? "—"}</td>
                          <td className="p-2">
                            <Badge variant="outline" className={cn(statusTone(row.decision))}>
                              {row.decision ?? "—"}
                            </Badge>
                          </td>
                          <td className="p-2">{row.facilityType ?? "—"}</td>
                          <td className="p-2">
                            {row.applicationRequired === null ? "—" : row.applicationRequired ? "Yes" : "No"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {view === "facilityProvider" && selectedRows.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left font-medium">Provider</th>
                        <th className="p-2 text-left font-medium">Priority</th>
                        <th className="p-2 text-left font-medium">Privileges</th>
                        <th className="p-2 text-left font-medium">Status</th>
                        <th className="p-2 text-left font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRows as ProviderFacilityRow[]).map((row) => (
                        <tr key={row.id} className="border-t border-border/40">
                          <td className="p-2">{row.providerName}</td>
                          <td className="p-2">
                            <Badge variant="outline" className={cn(priorityTone(row.priority))}>
                              {row.priority ?? "—"}
                            </Badge>
                          </td>
                          <td className="p-2">{row.privileges ?? "—"}</td>
                          <td className="p-2">
                            <Badge variant="outline" className={cn(statusTone(row.decision))}>
                              {row.decision ?? "—"}
                            </Badge>
                          </td>
                          <td className="p-2">{row.facilityType ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {view === "facilityPrelive" && selectedRows.length > 0 && (
                  <div className="space-y-2 p-2">
                    {(selectedRows as FacilityPreliveRow[]).map((row) => (
                      <div key={row.id} className="rounded-md border border-border/50 p-2">
                        <div className="grid gap-2 md:grid-cols-5">
                          <div>
                            <div className="text-xs text-muted-foreground">Priority</div>
                            <Badge variant="outline" className={cn("mt-1", priorityTone(row.priority))}>
                              {row.priority ?? "—"}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Go Live Date</div>
                            <div className="mt-1 text-sm">{formatDate(row.goLiveDate)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Credentialing Due</div>
                            <div className="mt-1 text-sm">{formatDate(row.credentialingDueDate)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Board Meeting</div>
                            <div className="mt-1 text-sm">{formatDate(row.boardMeetingDate)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Temps Possible</div>
                            <div className="mt-1 text-sm">
                              {row.tempsPossible === null ? "—" : row.tempsPossible ? "Yes" : "No"}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <div className="text-xs text-muted-foreground">Payor Enrollment Required</div>
                            <div className="mt-1 text-sm">
                              {row.payorEnrollmentRequired === null
                                ? "—"
                                : row.payorEnrollmentRequired
                                  ? "Yes"
                                  : "No"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Roles Needed</div>
                            <div className="mt-1 text-sm">
                              {row.rolesNeeded.length ? row.rolesNeeded.join(", ") : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {view === "providerLicense" && selectedRows.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left font-medium">State</th>
                        <th className="p-2 text-left font-medium">Priority</th>
                        <th className="p-2 text-left font-medium">Path</th>
                        <th className="p-2 text-left font-medium">Status</th>
                        <th className="p-2 text-left font-medium">Initial / Renewal</th>
                        <th className="p-2 text-left font-medium">Requested</th>
                        <th className="p-2 text-left font-medium">Final Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRows as ProviderLicenseRow[]).map((row) => (
                        <tr key={row.id} className="border-t border-border/40">
                          <td className="p-2">{row.state ?? "—"}</td>
                          <td className="p-2">
                            <Badge variant="outline" className={cn(priorityTone(row.priority))}>
                              {row.priority ?? "—"}
                            </Badge>
                          </td>
                          <td className="p-2">{row.path ?? "—"}</td>
                          <td className="p-2">
                            <Badge variant="outline" className={cn(statusTone(row.status))}>
                              {row.status ?? "—"}
                            </Badge>
                          </td>
                          <td className="p-2">{row.initialOrRenewal ?? "—"}</td>
                          <td className="p-2">{formatDate(row.startsAt)}</td>
                          <td className="p-2">{formatDate(row.expiresAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
