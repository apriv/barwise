"use client";

import { useId, useState } from "react";

type GroupFieldProps = {
  defaultValue?: string;
  groups: string[];
};

export function GroupField({ defaultValue = "", groups }: GroupFieldProps) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="space-y-2 text-sm">
      <label className="space-y-1">
        <span className="text-xs font-medium uppercase text-zinc-500">
          Group
        </span>
        <input
          required
          name="groupName"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          list={listId}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono dark:border-zinc-800 dark:bg-zinc-950"
        />
      </label>
      <datalist id={listId}>
        {groups.map((group) => (
          <option key={group} value={group} />
        ))}
      </datalist>
      {groups.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setValue(group)}
              className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {group}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
