import { Sidebar } from "~/components/layout/sidebar";
import { Header } from "~/components/layout/header";
import { createClient } from "~/utils/supabase/server";
import { getAppRole } from "~/server/auth/domain";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/");

  // impossible to be super admin here, change later?
  const appRole = getAppRole({ email: user.email });

  const userRole = "admin"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userRole={userRole} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}