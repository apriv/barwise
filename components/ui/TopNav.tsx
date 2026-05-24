"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/sessions", label: "Sessions" },
  { href: "/demo", label: "Demo" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-6 py-2">
      <Link href="/" className="mr-4 text-sm font-semibold tracking-tight text-zinc-100">
        BarWise
      </Link>
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "rounded px-3 py-1 text-sm transition-colors " +
              (active
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
