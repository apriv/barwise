import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">BarWise</h1>
        <p className="text-zinc-400">
          A local-only price-action annotation tool for ES 5-minute bars. Import
          historical CSV data, label individual bars, segments, and market context,
          then export an annotated dataset.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/sessions"
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            Sessions
          </Link>
          <Link
            href="/import"
            className="rounded border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900"
          >
            Import CSV
          </Link>
          <Link
            href="/demo"
            className="rounded border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            View demo
          </Link>
        </div>
      </div>
    </main>
  );
}
