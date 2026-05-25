"use client";

import { useFormStatus } from "react-dom";

import { clearAllSessionTags } from "@/lib/actions/label";

type ClearSessionTagsFormProps = {
  sessionId: number;
  totalTags: number;
};

function SubmitButton({ totalTags }: { totalTags: number }) {
  const { pending } = useFormStatus();
  const disabled = pending || totalTags === 0;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
    >
      {pending ? "Clearing..." : "Clear today"}
    </button>
  );
}

export function ClearSessionTagsForm({
  sessionId,
  totalTags,
}: ClearSessionTagsFormProps) {
  return (
    <form
      action={clearAllSessionTags}
      onSubmit={(event) => {
        if (totalTags === 0) {
          event.preventDefault();
          return;
        }

        if (
          !window.confirm(
            `Clear all ${totalTags} tag(s) in this session? This cannot be undone.`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <SubmitButton totalTags={totalTags} />
    </form>
  );
}
