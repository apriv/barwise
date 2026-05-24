"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type BarKeyboardNavProps = {
  minBarNumber: number;
  maxBarNumber: number;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function BarKeyboardNav({
  minBarNumber,
  maxBarNumber,
}: BarKeyboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key;
      if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Escape") {
        return;
      }

      const params = new URLSearchParams(searchParams);
      const currentRaw = params.get("bar");
      const current = currentRaw === null ? null : Number(currentRaw);

      if (key === "Escape") {
        if (currentRaw === null) return;
        event.preventDefault();
        params.delete("bar");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        return;
      }

      event.preventDefault();
      let nextBar: number;
      if (current === null || !Number.isInteger(current)) {
        nextBar = key === "ArrowLeft" ? maxBarNumber : minBarNumber;
      } else {
        const step = key === "ArrowLeft" ? -1 : 1;
        nextBar = current + step;
        if (nextBar < minBarNumber) nextBar = minBarNumber;
        if (nextBar > maxBarNumber) nextBar = maxBarNumber;
        if (nextBar === current) return;
      }

      params.set("bar", String(nextBar));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [maxBarNumber, minBarNumber, pathname, router, searchParams]);

  return null;
}
