"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ui/ThemeToggle";

const ITEMS = [
  { href: "/sessions", label: "Sessions" },
  { href: "/tags", label: "Tags" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 border-b border-zinc-200 bg-white px-6 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/" className="mr-4 text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
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
                ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100")
            }
          >
            {item.label}
          </Link>
        );
      })}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </nav>
  );
}
