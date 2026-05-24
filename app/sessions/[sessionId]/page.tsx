import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Chart, type ChartBar } from "@/components/chart/Chart";
import { ensureLocalEsRthData } from "@/lib/data/local-es";
import { listBarsForSession } from "@/lib/repo/bars";
import { getSession } from "@/lib/repo/sessions";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPage({ params }: PageProps) {
  await connection();
  await ensureLocalEsRthData();

  const { sessionId } = await params;
  const id = Number(sessionId);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const session = getSession(id, { sessionType: "RTH" });
  if (!session) {
    notFound();
  }

  const bars: ChartBar[] = listBarsForSession(session.id).map((bar) => ({
    id: bar.id,
    barNumber: bar.bar_number,
    time: bar.ts,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex min-h-0 flex-col border-r border-zinc-800">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              {session.session_date} {session.session_type}
            </h1>
            <p className="text-sm text-zinc-500">
              {session.bar_count} bars
              {session.source_file ? ` from ${session.source_file}` : ""}
            </p>
          </div>
          <Link
            href="/sessions"
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
          >
            Sessions
          </Link>
        </header>
        <div className="min-h-0 flex-1">
          <Chart bars={bars} />
        </div>
      </section>

      <aside className="min-h-0 border-l border-zinc-900 bg-zinc-950 p-5">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-100">Label Panel</h2>
          <p className="text-sm text-zinc-500">
            Bar selection and label forms are next on the roadmap.
          </p>
        </div>
      </aside>
    </main>
  );
}
