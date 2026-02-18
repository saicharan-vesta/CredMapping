import { desc, inArray } from "drizzle-orm";
import { Badge } from "~/components/ui/badge";
import { VirtualScrollContainer } from "~/components/ui/virtual-scroll-container";
import { db } from "~/server/db";
import {
  providerFacilityCredentials,
  providers,
  providerVestaPrivileges,
  stateLicenses,
} from "~/server/db/schema";

const formatDate = (value: Date | string | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const formatProviderName = (provider: {
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

export default async function ProvidersPage() {
  const providerRows = await db
    .select()
    .from(providers)
    .orderBy(desc(providers.updatedAt), desc(providers.createdAt))
    .limit(100);

  const providerIds = providerRows.map((provider) => provider.id);

  const [licenseRows, privilegeRows, credentialRows] =
    providerIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(stateLicenses)
            .where(inArray(stateLicenses.providerId, providerIds))
            .orderBy(desc(stateLicenses.expiresAt), desc(stateLicenses.createdAt)),
          db
            .select()
            .from(providerVestaPrivileges)
            .where(inArray(providerVestaPrivileges.providerId, providerIds))
            .orderBy(desc(providerVestaPrivileges.updatedAt)),
          db
            .select()
            .from(providerFacilityCredentials)
            .where(inArray(providerFacilityCredentials.providerId, providerIds))
            .orderBy(desc(providerFacilityCredentials.updatedAt)),
        ])
      : [[], [], []];

  const licensesByProvider = new Map<string, typeof licenseRows>();
  for (const license of licenseRows) {
    const providerId = license.providerId;
    if (!providerId) continue;
    const current = licensesByProvider.get(providerId) ?? [];
    current.push(license);
    licensesByProvider.set(providerId, current);
  }

  const privilegesByProvider = new Map<string, typeof privilegeRows>();
  for (const privilege of privilegeRows) {
    const providerId = privilege.providerId;
    if (!providerId) continue;
    const current = privilegesByProvider.get(providerId) ?? [];
    current.push(privilege);
    privilegesByProvider.set(providerId, current);
  }

  const credentialsByProvider = new Map<string, typeof credentialRows>();
  for (const credential of credentialRows) {
    const providerId = credential.providerId;
    if (!providerId) continue;
    const current = credentialsByProvider.get(providerId) ?? [];
    current.push(credential);
    credentialsByProvider.set(providerId, current);
  }

  const pfcStatusBreakdown = credentialRows.reduce<Record<string, number>>((acc, credential) => {
    const key = credential.status?.trim() ?? "Unspecified";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2 border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
        <p className="text-sm text-muted-foreground">
          Unified provider records with direct access to licenses, Vesta privileges, and PFC status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Provider records</p>
          <p className="mt-2 text-2xl font-semibold">{providerRows.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">State licenses</p>
          <p className="mt-2 text-2xl font-semibold">{licenseRows.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Vesta privilege records</p>
          <p className="mt-2 text-2xl font-semibold">{privilegeRows.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">PFC records</p>
          <p className="mt-2 text-2xl font-semibold">{credentialRows.length}</p>
        </div>
      </div>

      {Object.keys(pfcStatusBreakdown).length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            PFC status distribution
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(pfcStatusBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <Badge key={status} variant="secondary" className="font-medium">
                  {status}: {count}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {providerRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          No providers found.
        </div>
      ) : (
        <VirtualScrollContainer>
          <div className="space-y-4 p-4">
            {providerRows.map((provider) => {
              const providerLicenses = licensesByProvider.get(provider.id) ?? [];
              const providerPrivileges = privilegesByProvider.get(provider.id) ?? [];
              const providerCredentials = credentialsByProvider.get(provider.id) ?? [];

              return (
                <section key={provider.id} className="rounded-lg border bg-card">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                    <div>
                      <h2 className="text-lg font-semibold">{formatProviderName(provider)}</h2>
                      <p className="text-xs text-muted-foreground">Provider profile</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{provider.email ?? "No email"}</p>
                      <p>{provider.phone ?? "No phone"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 lg:grid-cols-4">
                    <div className="rounded-md border p-3">
                      <p className="text-xs uppercase text-muted-foreground">General</p>
                      <dl className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt>Created</dt>
                          <dd>{formatDate(provider.createdAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Updated</dt>
                          <dd>{formatDate(provider.updatedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Notes</dt>
                          <dd className="line-clamp-3 text-foreground">{provider.notes ?? "—"}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-md border p-3 lg:col-span-3">
                      <p className="text-xs uppercase text-muted-foreground">State Licenses</p>
                      {providerLicenses.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">No linked state licenses.</p>
                      ) : (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs text-muted-foreground uppercase">
                              <tr>
                                <th className="py-1 pr-3">state</th>
                                <th className="py-1 pr-3">status</th>
                                <th className="py-1 pr-3">issued</th>
                                <th className="py-1 pr-3">expires</th>
                              </tr>
                            </thead>
                            <tbody>
                              {providerLicenses.map((license) => (
                                <tr key={license.id} className="border-t">
                                  <td className="py-1 pr-3">{license.state ?? "—"}</td>
                                  <td className="py-1 pr-3">{license.status ?? "—"}</td>
                                  <td className="py-1 pr-3">{formatDate(license.issuedAt)}</td>
                                  <td className="py-1 pr-3">{formatDate(license.expiresAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border p-3 lg:col-span-2">
                      <p className="text-xs uppercase text-muted-foreground">Vesta Privileges</p>
                      {providerPrivileges.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">No linked Vesta privileges.</p>
                      ) : (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs text-muted-foreground uppercase">
                              <tr>
                                <th className="py-1 pr-3">tier</th>
                                <th className="py-1 pr-3">initial approved</th>
                                <th className="py-1 pr-3">initial expires</th>
                                <th className="py-1 pr-3">term date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {providerPrivileges.map((privilege) => (
                                <tr key={privilege.id} className="border-t">
                                  <td className="py-1 pr-3">{privilege.privilegeTier ?? "—"}</td>
                                  <td className="py-1 pr-3">{formatDate(privilege.initialApprovedAt)}</td>
                                  <td className="py-1 pr-3">{formatDate(privilege.initialExpiresAt)}</td>
                                  <td className="py-1 pr-3">{formatDate(privilege.termDate)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border p-3 lg:col-span-2">
                      <p className="text-xs uppercase text-muted-foreground">PFC Statuses</p>
                      {providerCredentials.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">No linked PFC records.</p>
                      ) : (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs text-muted-foreground uppercase">
                              <tr>
                                <th className="py-1 pr-3">priority</th>
                                <th className="py-1 pr-3">status</th>
                                <th className="py-1 pr-3">decision</th>
                                <th className="py-1 pr-3">requested</th>
                              </tr>
                            </thead>
                            <tbody>
                              {providerCredentials.map((credential) => (
                                <tr key={credential.id} className="border-t">
                                  <td className="py-1 pr-3">{credential.priority ?? "—"}</td>
                                  <td className="py-1 pr-3">{credential.status ?? "—"}</td>
                                  <td className="py-1 pr-3">{credential.decision ?? "—"}</td>
                                  <td className="py-1 pr-3">{formatDate(credential.requestedAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </VirtualScrollContainer>
      )}
    </div>
  );
}
