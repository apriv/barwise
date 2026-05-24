import { redirect } from "next/navigation";

import { syncLocalEsCsv } from "@/lib/actions/import";

async function syncAndRedirect() {
  "use server";

  await syncLocalEsCsv();
  redirect("/sessions");
}

export default function ImportPage() {
  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <section className="w-full max-w-3xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Sync Local Data
          </h1>
          <p className="text-sm text-zinc-400">
            Read ES 5-minute bars from data/samples/es_5m.csv and split them
            into one chart session per local trading day.
          </p>
        </div>

        <form
          action={syncAndRedirect}
          className="space-y-6 rounded border border-zinc-800 bg-zinc-950 p-6"
        >
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-zinc-500">Source</dt>
              <dd className="font-mono text-zinc-200">data/samples/es_5m.csv</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-zinc-500">Instrument</dt>
              <dd className="font-mono text-zinc-200">ES</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-zinc-500">Split</dt>
              <dd className="font-mono text-zinc-200">1 local day</dd>
            </div>
          </dl>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
            >
              Sync
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
