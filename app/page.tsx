import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">BarWise</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          A local-only price-action annotation tool for ES 5-minute RTH bars.
          Open the local CSV data by day, label bars, then export a small dataset.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/sessions"
            className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Sessions
          </Link>
          <Link
            href="/demo"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            View demo
          </Link>
        </div>
      </div>
    </main>
  );
}
