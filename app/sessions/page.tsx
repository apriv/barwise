import Link from "next/link";

import { ensureDatabase } from "@/lib/db/ensure";
import { listSessionsWithStats } from "@/lib/repo/sessions";

function formatDateTime(unixSeconds: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixSeconds * 1000));
}

export default function SessionsPage() {
  ensureDatabase();
  const sessions = listSessionsWithStats();

  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <section className="w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Sessions
            </h1>
            <p className="text-sm text-zinc-400">
              ES daily chart sessions from local CSV data.
            </p>
          </div>
          <Link
            href="/import"
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            Import
          </Link>
        </div>

        <div className="overflow-hidden rounded border border-zinc-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Bars</th>
                <th className="px-4 py-3 text-right font-medium">Labeled</th>
                <th className="px-4 py-3 font-medium">Imported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-zinc-900/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/sessions/${session.id}`}
                      className="font-medium text-zinc-100 hover:text-white"
                    >
                      {session.session_date}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {session.session_type}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {session.bar_count}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {session.labeled_bar_count} / {session.bar_count}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatDateTime(session.imported_at)}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    No sessions imported yet.
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
