import UploadClient from "../_components/UploadClient";

export default function Page() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Uploads</h1>
        <p className="mt-2 text-slate-600">
          Import CSV data for players, game stats, league standings and fixtures/results.
        </p>
      </div>
      <UploadClient />
    </section>
  );
}
