import Link from "next/link";
import { connection } from "next/server";

import { ensureLocalEsRthData } from "@/lib/data/local-es";
import { listSessionsWithStats } from "@/lib/repo/sessions";

function formatDateTime(unixSeconds: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixSeconds * 1000));
}

export default async function SessionsPage() {
  await connection();
  await ensureLocalEsRthData();
  const sessions = listSessionsWithStats({ sessionType: "RTH" });

  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <section className="w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              Sessions
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ES RTH sessions from data/samples/es_5m.csv.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Bars</th>
                <th className="px-4 py-3 text-right font-medium">Labeled</th>
                <th className="px-4 py-3 font-medium">Loaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/sessions/${session.id}`}
                      className="font-medium text-zinc-950 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-white"
                    >
                      {session.session_date}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {session.session_type}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {session.bar_count}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {session.labeled_bar_count} / {session.bar_count}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(session.imported_at)}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    No RTH sessions found in the local CSV.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
