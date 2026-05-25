import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import type { BarTagMarker, ChartBar } from "@/components/chart/Chart";
import { BarKeyboardNav } from "@/components/chart/BarKeyboardNav";
import { SelectableChart } from "@/components/chart/SelectableChart";
import { BarSelectionPanel } from "@/components/label-panel/BarSelectionPanel";
import { ensureLocalEsRthData } from "@/lib/data/local-es";
import { listBarsForSession } from "@/lib/repo/bars";
import { listActiveDictionaryItems } from "@/lib/repo/dictionary";
import {
  listBarTagsForSession,
  listContextTagsForSession,
  listSegmentTagsForSession,
} from "@/lib/repo/labels";
import { getAdjacentSessions, getSession } from "@/lib/repo/sessions";

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
  const { previous, next } = getAdjacentSessions(session);

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
  const barLabelOptions = listActiveDictionaryItems("bar");
  const contextLabelOptions = listActiveDictionaryItems("context");
  const segmentLabelOptions = listActiveDictionaryItems("segment");
  const barTags = listBarTagsForSession(session.id);
  const contextTags = listContextTagsForSession(session.id);
  const segmentTags = listSegmentTagsForSession(session.id);
  const barTagMarkers: BarTagMarker[] = Array.from(
    barTags.reduce<Map<number, number>>((counts, tag) => {
      counts.set(tag.bar_number, (counts.get(tag.bar_number) ?? 0) + 1);
      return counts;
    }, new Map()),
    ([barNumber, count]) => ({ barNumber, count }),
  );

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
          <div className="flex items-center gap-2">
            {previous ? (
              <Link
                href={`/sessions/${previous.id}`}
                className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              >
                Prev
              </Link>
            ) : (
              <span className="rounded border border-zinc-800 px-3 py-1.5 text-sm text-zinc-600">
                Prev
              </span>
            )}
            {next ? (
              <Link
                href={`/sessions/${next.id}`}
                className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              >
                Next
              </Link>
            ) : (
              <span className="rounded border border-zinc-800 px-3 py-1.5 text-sm text-zinc-600">
                Next
              </span>
            )}
            <Link
              href="/sessions"
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
            >
              Sessions
            </Link>
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <SelectableChart bars={bars} barTagMarkers={barTagMarkers} />
        </div>
      </section>

      <aside className="min-h-0 border-l border-zinc-900 bg-zinc-950 p-5">
        <BarSelectionPanel
          bars={bars}
          barTags={barTags}
          contextTags={contextTags}
          segmentTags={segmentTags}
          barTagOptions={barLabelOptions}
          contextTagOptions={contextLabelOptions}
          segmentTagOptions={segmentLabelOptions}
          sessionId={session.id}
        />
      </aside>
      {bars.length > 0 ? (
        <BarKeyboardNav
          minBarNumber={bars[0].barNumber}
          maxBarNumber={bars[bars.length - 1].barNumber}
        />
      ) : null}
    </main>
  );
}
