import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          404 · not yet
        </p>
        <h2 className="text-xl font-semibold text-zinc-100">This page hasn&apos;t shipped yet</h2>
        <p className="text-sm text-zinc-400">
          The nav link is here so the structure is visible, but the page
          arrives in a later milestone. See{" "}
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
            docs/ROADMAP.md
          </code>
          .
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="text-sm text-zinc-300 underline-offset-4 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
