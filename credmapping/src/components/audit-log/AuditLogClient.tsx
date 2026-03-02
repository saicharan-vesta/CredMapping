"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuditLogRow } from "~/components/audit-log/AuditLogRow";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollIndicatorContainer } from "~/components/ui/scroll-indicator-container";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { type auditLog } from "~/server/db/schema";

type AuditLogRecord = typeof auditLog.$inferSelect;

type SortDirection = "asc" | "desc";
type SortField = "timestamp" | "user" | "action" | "tableName" | "recordId" | "changes";

interface FormattedAuditLog {
  id: string;
  timestamp: Date;
  user: string | null;
  action: "insert" | "update" | "delete";
  tableName: string;
  recordId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

const ACTION_VALUES = ["insert", "update", "delete"] as const;

function toAuditAction(action: string | null | undefined): "insert" | "update" | "delete" {
  return ACTION_VALUES.includes(action as (typeof ACTION_VALUES)[number])
    ? (action as "insert" | "update" | "delete")
    : "update";
}

function formatAuditLogRecord(record: AuditLogRecord): FormattedAuditLog {
  return {
    id: record.id,
    timestamp: record.createdAt,
    user: record.actorEmail,
    action: toAuditAction(record.action),
    tableName: record.tableName,
    recordId: record.recordId ? String(record.recordId) : null,
    oldData: (record.oldData as Record<string, unknown>) || null,
    newData: (record.newData as Record<string, unknown>) || null,
  };
}

function computeChangedFieldCount(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): number {
  if (!oldData && !newData) {
    return 0;
  }

  const oldValues = oldData ?? {};
  const newValues = newData ?? {};
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

  let count = 0;

  allKeys.forEach((key) => {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      count += 1;
    }
  });

  return count;
}

function SortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = sortField === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      {isActive ? (
        sortDirection === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-60" />
      )}
    </button>
  );
}

export function AuditLogClient() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const PAGE_SIZE = 50;

  const [user, setUser] = useState("");
  const [action, setAction] = useState<"all" | "insert" | "update" | "delete">("all");
  const [tableName, setTableName] = useState("");
  const [recordId, setRecordId] = useState("");
  const [dataContent, setDataContent] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(sevenDaysAgo);
  const [toDate, setToDate] = useState(today);

  const {
    data: result,
    isLoading,
    error,
    refetch,
  } = api.auditLog.list.useQuery(
    {
      fromDate: fromDate ?? undefined,
      toDate: toDate ?? undefined,
      action: action !== "all" ? action : undefined,
      tableName: tableName ?? undefined,
      actorEmail: user ?? undefined,
      recordId: recordId ?? undefined,
      dataContent: dataContent ?? undefined,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    },
    {
      enabled: false,
    },
  );

  const auditLogs = useMemo(() => result?.rows ?? [], [result?.rows]);
  const totalCount = result?.total ?? 0;

  useEffect(() => {
    void refetch();
  }, [currentPage, refetch]);

  const handleToggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    setCurrentPage(1);
    setUser("");
    setAction("all");
    setTableName("");
    setRecordId("");
    setDataContent("");
    setFromDate(sevenDaysAgo);
    setToDate(today);
    setExpandedRows(new Set());
  };

  const handleLoad = () => {
    setCurrentPage(1);
    setExpandedRows(new Set());
    void refetch();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const sortedAuditLogs = useMemo(() => {
    const formatted = auditLogs.map(formatAuditLogRecord);

    return [...formatted].sort((a, b) => {
      const directionMultiplier = sortDirection === "asc" ? 1 : -1;

      const compare = (valueA: string | number, valueB: string | number) => {
        if (valueA < valueB) return -1 * directionMultiplier;
        if (valueA > valueB) return 1 * directionMultiplier;
        return 0;
      };

      switch (sortField) {
        case "timestamp":
          return compare(a.timestamp.getTime(), b.timestamp.getTime());
        case "user":
          return compare((a.user ?? "").toLowerCase(), (b.user ?? "").toLowerCase());
        case "action":
          return compare(a.action, b.action);
        case "tableName":
          return compare(a.tableName.toLowerCase(), b.tableName.toLowerCase());
        case "recordId":
          return compare((a.recordId ?? "").toLowerCase(), (b.recordId ?? "").toLowerCase());
        case "changes":
          return compare(computeChangedFieldCount(a.oldData, a.newData), computeChangedFieldCount(b.oldData, b.newData));
        default:
          return 0;
      }
    });
  }, [auditLogs, sortDirection, sortField]);

  if (error) {
    return (
      <Card className="flex h-full min-h-0 items-center justify-center p-6 text-center">
        <div>
          <p className="text-destructive">Error loading audit logs</p>
          <Button onClick={handleLoad} variant="outline" size="sm" className="mt-3">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-full max-w-md flex-col gap-0 p-0">
            <SheetHeader className="px-5 py-4">
              <SheetTitle>Audit log filters</SheetTitle>
            </SheetHeader>
            <Separator />
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 hide-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">User</label>
                <Input placeholder="Search by user email..." value={user} onChange={(e) => setUser(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Action</label>
                <Select value={action} onValueChange={(value) => setAction(value as "all" | "insert" | "update" | "delete")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="insert">Insert</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Table</label>
                <Select value={tableName || "all"} onValueChange={(value) => setTableName(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Tables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tables</SelectItem>
                    <SelectItem value="facilities">facilities</SelectItem>
                    <SelectItem value="providers">providers</SelectItem>
                    <SelectItem value="comm_logs">comm_logs</SelectItem>
                    <SelectItem value="certifications">certifications</SelectItem>
                    <SelectItem value="doctor_facility_assignments">doctor_facility_assignments</SelectItem>
                    <SelectItem value="agents">agents</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Record ID</label>
                <Input placeholder="Search by record ID..." value={recordId} onChange={(e) => setRecordId(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Data content</label>
                <Input placeholder="Search within data content..." value={dataContent} onChange={(e) => setDataContent(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">From</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">To</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 p-5">
              <Button onClick={handleLoad} disabled={isLoading}>
                {isLoading ? "Loading..." : "Load"}
              </Button>
              <Button variant="outline" onClick={handleClearAll} disabled={isLoading}>
                Reset filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="text-xs text-muted-foreground">
          Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isLoading ? (
          <div className="space-y-0">
            <div className="grid grid-cols-[180px_220px_110px_160px_240px_1fr] gap-4 border-b border-border bg-muted px-4 py-2">
              {[
                "Timestamp",
                "User",
                "Action",
                "Table",
                "Record ID",
                "Changes",
              ].map((column) => (
                <div key={column} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {column}
                </div>
              ))}
            </div>
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[180px_220px_110px_160px_240px_1fr] gap-4 border-b border-border px-4 py-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : sortedAuditLogs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <span className="text-3xl opacity-30">🔍</span>
            <p className="text-sm">No audit log entries found for the selected filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[180px_220px_110px_160px_240px_1fr] gap-4 border-b border-border bg-muted px-4 py-2">
              <SortHeader label="Timestamp" field="timestamp" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              <SortHeader label="User" field="user" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              <SortHeader label="Action" field="action" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              <SortHeader label="Table" field="tableName" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              <SortHeader label="Record ID" field="recordId" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              <SortHeader label="Changes" field="changes" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
            </div>

            <ScrollIndicatorContainer className="min-h-0 flex-1" viewportClassName="hide-scrollbar">
              <div className="divide-y divide-border">
                {sortedAuditLogs.map((formatted) => (
                  <AuditLogRow
                    key={formatted.id}
                    timestamp={formatted.timestamp}
                    user={formatted.user}
                    action={formatted.action}
                    tableName={formatted.tableName}
                    recordId={formatted.recordId}
                    oldData={formatted.oldData}
                    newData={formatted.newData}
                    isExpanded={expandedRows.has(formatted.id)}
                    onToggleExpand={() => handleToggleExpand(formatted.id)}
                  />
                ))}
              </div>
            </ScrollIndicatorContainer>
          </>
        )}

        {!isLoading && sortedAuditLogs.length > 0 && (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/50 px-4 py-3">
            <Button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1 || isLoading}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage((page) => Math.min(Math.ceil(totalCount / PAGE_SIZE), page + 1))}
              disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) || isLoading}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
