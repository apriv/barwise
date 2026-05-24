import { redirect } from "next/navigation";

import { importCsvAction } from "@/lib/actions/import";

async function importAndRedirect(formData: FormData) {
  "use server";

  await importCsvAction(formData);
  redirect("/sessions");
}

export default function ImportPage() {
  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <section className="w-full max-w-3xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Import CSV
          </h1>
          <p className="text-sm text-zinc-400">
            Load ES 5-minute bars from a CSV with datetime, open, high, low, close,
            and optional volume columns.
          </p>
        </div>

        <form
          action={importAndRedirect}
          className="space-y-6 rounded border border-zinc-800 bg-zinc-950 p-6"
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">CSV file</span>
            <input
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-200">
                Instrument
              </span>
              <input
                name="instrumentSymbol"
                defaultValue="ES"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-200">
                Source timezone
              </span>
              <input
                name="sourceTimezone"
                defaultValue="America/Chicago"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-200">
                Session
              </span>
              <select
                name="sessionType"
                defaultValue="RTH"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              >
                <option value="RTH">RTH</option>
                <option value="ETH">ETH</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
            >
              Import
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
