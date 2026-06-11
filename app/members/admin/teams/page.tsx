import AdminPage from "../_components/AdminPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="space-y-8">
      <AdminPage resourceKey="teams" />
      <AdminPage resourceKey="team-seasons" />
    </div>
  );
}
