import Link from "next/link";
import { adminResources, tableViews } from "@/src/lib/admin-config";
import { listTablesAndViews } from "@/src/lib/admin-db";

export const dynamic = "force-dynamic";

export default async function DatabasePage() {
  const existing = await listTablesAndViews().catch(() => []);
  const existingNames = new Set(existing.map((item) => item.table_name));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Neon Database</h1>
        <p className="mt-2 text-slate-600">
          Overview of configured admin tables and website views.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminResources.map((resource) => (
          <Link
            key={resource.key}
            href={`/members/admin/${resource.key}`}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-300"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{resource.title}</h2>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  existingNames.has(resource.table)
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {existingNames.has(resource.table) ? "found" : "missing"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{resource.table}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Website Views</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {tableViews.map((view) => (
            <div key={view} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span>{view}</span>
              <span className={existingNames.has(view) ? "text-emerald-700" : "text-amber-700"}>
                {existingNames.has(view) ? "found" : "missing"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
