import Link from "next/link";
import { adminResources } from "@/src/lib/admin-config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Link href="/members/admin/database" className="block text-lg font-bold">
              NDSC Admin
            </Link>
            <nav className="mt-4 space-y-1">
              <Link href="/members/admin/database" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100">
                Database
              </Link>
              {adminResources
                .filter((resource) => resource.key !== "team-seasons" && resource.key !== "player-team-seasons" && resource.key !== "archived-eos-stats")
                .map((resource) => (
                  <Link
                    key={resource.key}
                    href={`/members/admin/${resource.key}`}
                    className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    {resource.title}
                  </Link>
                ))}
              <Link href="/members/admin/uploads" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100">
                Uploads
              </Link>
            </nav>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
