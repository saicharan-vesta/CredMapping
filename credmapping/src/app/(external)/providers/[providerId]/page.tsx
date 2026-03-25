import { asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  EditProviderDialog,
  DeleteProviderDialog,
} from "~/components/providers/provider-actions";
import { ProviderProfileClient } from "~/components/providers/provider-profile-client";
import { requireRequestAuthContext } from "~/server/auth/request-context";
import { withUserDb } from "~/server/db";
import {
  agents,
  facilities,
  incidentLogs,
  providerFacilityCredentials,
  providerStateLicenses,
  providers,
  providerVestaPrivileges,
  workflowPhases,
} from "~/server/db/schema";

const formatDate = (value: Date | string | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const formatName = (provider: {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  degree: string | null;
}) => {
  const fullName = [provider.firstName, provider.middleName, provider.lastName]
    .filter(Boolean)
    .join(" ");
  if (!fullName) return "Unnamed Provider";
  return provider.degree ? `${fullName}, ${provider.degree}` : fullName;
};

const asDateInput = (value: Date | string | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const { user } = await requireRequestAuthContext();

  const { credentials, incidentRows, licenseRows, privilegeRows, provider, workflowRows } = await withUserDb({
    user,
    run: async (db) => {
      const [providerRow, licenseRows, privilegeRows, credentials] = await Promise.all([
        db
          .select({
            id: providers.id,
            firstName: providers.firstName,
            middleName: providers.middleName,
            lastName: providers.lastName,
            degree: providers.degree,
            email: providers.email,
            phone: providers.phone,
            createdAt: providers.createdAt,
            updatedAt: providers.updatedAt,
            notes: providers.notes,
          })
          .from(providers)
          .where(eq(providers.id, providerId))
          .limit(1),
        db
          .select()
          .from(providerStateLicenses)
          .where(eq(providerStateLicenses.providerId, providerId))
          .orderBy(desc(providerStateLicenses.expiresAt), desc(providerStateLicenses.createdAt)),
        db
          .select()
          .from(providerVestaPrivileges)
          .where(eq(providerVestaPrivileges.providerId, providerId))
          .orderBy(desc(providerVestaPrivileges.updatedAt)),
        db
          .select({
            id: providerFacilityCredentials.id,
            facilityName: facilities.name,
            facilityType: providerFacilityCredentials.facilityType,
            priority: providerFacilityCredentials.priority,
            decision: providerFacilityCredentials.decision,
            notes: providerFacilityCredentials.notes,
            privileges: providerFacilityCredentials.privileges,
            updatedAt: providerFacilityCredentials.updatedAt,
          })
          .from(providerFacilityCredentials)
          .leftJoin(facilities, eq(providerFacilityCredentials.facilityId, facilities.id))
          .where(eq(providerFacilityCredentials.providerId, providerId))
          .orderBy(desc(providerFacilityCredentials.updatedAt)),
      ]);

      const credentialIds = credentials.map((item) => item.id);
      const licenseIds = licenseRows.map((item) => item.id);
      const privilegeIds = privilegeRows.map((item) => item.id);
      const allRelatedIds = [...credentialIds, ...licenseIds, ...privilegeIds];
      const workflowRows =
        allRelatedIds.length === 0
          ? []
          : await db
              .select({
                id: workflowPhases.id,
                relatedId: workflowPhases.relatedId,
                workflowType: workflowPhases.workflowType,
                phaseName: workflowPhases.phaseName,
                status: workflowPhases.status,
                startDate: workflowPhases.startDate,
                dueDate: workflowPhases.dueDate,
                completedAt: workflowPhases.completedAt,
                updatedAt: workflowPhases.updatedAt,
                agentFirstName: agents.firstName,
                agentLastName: agents.lastName,
              })
              .from(workflowPhases)
              .leftJoin(agents, eq(workflowPhases.agentAssigned, agents.id))
              .where(
                inArray(workflowPhases.relatedId, allRelatedIds),
              )
              .orderBy(asc(workflowPhases.phaseName), desc(workflowPhases.updatedAt));

      const workflowIds = workflowRows.map((w) => w.id);
      const incidentRows =
        workflowIds.length === 0
          ? []
          : await db
              .select({
                id: incidentLogs.id,
                workflowID: incidentLogs.workflowID,
                dateIdentified: incidentLogs.dateIdentified,
                resolutionDate: incidentLogs.resolutionDate,
                subcategory: incidentLogs.subcategory,
                critical: incidentLogs.critical,
                incidentDescription: incidentLogs.incidentDescription,
                finalResolution: incidentLogs.finalResolution,
                discussed: incidentLogs.discussed,
                reporterFirstName: agents.firstName,
                reporterLastName: agents.lastName,
              })
              .from(incidentLogs)
              .leftJoin(agents, eq(incidentLogs.whoReported, agents.id))
              .where(inArray(incidentLogs.workflowID, workflowIds))
              .orderBy(desc(incidentLogs.dateIdentified));

      return {
        credentials,
        incidentRows,
        licenseRows,
        privilegeRows,
        provider: providerRow[0] ?? null,
        workflowRows,
      };
    },
  });

  if (!provider) notFound();

  const normalizedWorkflowRows = workflowRows.map((row) => ({
    id: row.id,
    relatedId: row.relatedId,
    workflowType: row.workflowType,
    phaseName: row.phaseName,
    status: row.status,
    startDate: asDateInput(row.startDate),
    dueDate: asDateInput(row.dueDate),
    completedAt: asDateInput(row.completedAt),
    updatedAt: formatDate(row.updatedAt),
    agentName:
      row.agentFirstName || row.agentLastName
        ? `${row.agentFirstName ?? ""} ${row.agentLastName ?? ""}`.trim()
        : null,
  }));

  return (
    <div className="space-y-4 pb-4">
      <section className="rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{formatName(provider)}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-muted-foreground text-sm">{provider.email ?? "No email"} · {provider.phone ?? "No phone"}</p>
              <span className="text-muted-foreground text-xs">Created {formatDate(provider.createdAt)}</span>
              <span className="text-muted-foreground text-xs">· Updated {formatDate(provider.updatedAt)}</span>
            </div>
            {provider.notes && (
              <p className="text-muted-foreground max-w-md truncate text-xs" title={provider.notes}>{provider.notes}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EditProviderDialog provider={provider} />
            <DeleteProviderDialog providerId={provider.id} providerName={formatName(provider)} />
          </div>
        </div>


      </section>

      <ProviderProfileClient
        providerId={providerId}
        licenseRows={licenseRows}
        privilegeRows={privilegeRows}
        credentials={credentials}
        workflows={normalizedWorkflowRows}
        incidents={incidentRows.map((r) => ({
          id: r.id,
          workflowID: r.workflowID,
          dateIdentified: r.dateIdentified,
          resolutionDate: r.resolutionDate,
          subcategory: r.subcategory,
          critical: r.critical,
          incidentDescription: r.incidentDescription,
          finalResolution: r.finalResolution,
          discussed: r.discussed,
          reporterName:
            r.reporterFirstName || r.reporterLastName
              ? `${r.reporterFirstName ?? ""} ${r.reporterLastName ?? ""}`.trim()
              : null,
        }))}
      />
    </div>
  );
}
