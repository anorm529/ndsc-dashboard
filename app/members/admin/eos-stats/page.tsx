import AdminPage from "../_components/AdminPage";
import StatsActionsClient from "../_components/StatsActionsClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="space-y-8">
      <StatsActionsClient />
      <AdminPage resourceKey="eos-stats" />
      <AdminPage resourceKey="archived-eos-stats" />
    </div>
  );
}
