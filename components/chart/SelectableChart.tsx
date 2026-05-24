"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Chart, type ChartBar } from "@/components/chart/Chart";

export function SelectableChart({ bars }: { bars: ChartBar[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectBar = useCallback(
    (bar: ChartBar) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("bar", String(bar.barNumber));
      router.replace(`${pathname}?${nextParams.toString()}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return <Chart bars={bars} onSelectBar={selectBar} />;
}
