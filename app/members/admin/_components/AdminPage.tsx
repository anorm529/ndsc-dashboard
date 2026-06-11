import { getResource } from "@/src/lib/admin-config";
import { listRows } from "@/src/lib/admin-db";
import AdminResourceClient from "./AdminResourceClient";

export default async function AdminPage({ resourceKey }: { resourceKey: string }) {
  const resource = getResource(resourceKey);
  if (!resource) {
    return <div className="text-rose-700">Unknown admin resource.</div>;
  }

  try {
    const data = await listRows(resource.key);
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">{resource.title}</h1>
          <p className="mt-2 text-slate-600">{resource.description}</p>
        </div>
        <AdminResourceClient
          resource={resource}
          columns={data.columns}
          primaryKey={data.primaryKey}
          rows={data.rows}
        />
      </section>
    );
  } catch (error) {
    return (
      <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
        <h1 className="text-xl font-semibold">{resource.title}</h1>
        <p className="mt-2">
          {error instanceof Error ? error.message : "Could not load this admin section."}
        </p>
      </section>
    );
  }
}
