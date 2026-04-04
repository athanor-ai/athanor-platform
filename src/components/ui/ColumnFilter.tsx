"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { PiCaretDown, PiFunnel } from "react-icons/pi";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterType = "text" | "select" | "range";

export interface ColumnFilterConfig {
  type: FilterType;
  /** Available options for select/range filters */
  options?: FilterOption[];
  /** Placeholder text for text-type filters */
  placeholder?: string;
}

export interface ColumnFilterState {
  /** For text filters: the search string */
  text?: string;
  /** For select/range filters: set of selected values */
  selected?: Set<string>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ColumnFilter({
  config,
  value,
  onChange,
}: {
  config: ColumnFilterConfig;
  value: ColumnFilterState;
  onChange: (next: ColumnFilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isActive =
    (value.text != null && value.text.length > 0) ||
    (value.selected != null && value.selected.size > 0);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleClear() {
    onChange({ text: undefined, selected: undefined });
    setOpen(false);
  }

  function toggleOption(val: string) {
    const next = new Set(value.selected ?? []);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    onChange({ ...value, selected: next });
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={clsx(
          "ml-1 inline-flex items-center rounded-sm p-0.5 transition-colors hover:text-text-primary",
          isActive ? "text-accent" : "text-text-tertiary",
        )}
        aria-label="Filter column"
      >
        {isActive ? (
          <PiFunnel className="h-3 w-3" />
        ) : (
          <PiCaretDown className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border bg-surface-raised shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {config.type === "text" && (
            <TextFilter
              value={value.text ?? ""}
              placeholder={config.placeholder ?? "Search..."}
              onChange={(text) => onChange({ ...value, text })}
              onClear={handleClear}
            />
          )}

          {(config.type === "select" || config.type === "range") && (
            <SelectFilter
              options={config.options ?? []}
              selected={value.selected ?? new Set()}
              onToggle={toggleOption}
              onClear={handleClear}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TextFilter({
  value,
  placeholder,
  onChange,
  onClear,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="p-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full rounded-sm border border-border bg-background px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
      {value.length > 0 && (
        <button
          onClick={onClear}
          className="mt-1.5 text-[10px] text-text-tertiary hover:text-accent"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function SelectFilter({
  options,
  selected,
  onToggle,
  onClear,
}: {
  options: FilterOption[];
  selected: Set<string>;
  onToggle: (val: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="max-h-[240px] overflow-y-auto p-1.5">
      {selected.size > 0 && (
        <button
          onClick={onClear}
          className="mb-1 w-full rounded-sm px-2 py-1 text-left text-[10px] text-text-tertiary hover:text-accent"
        >
          Clear all
        </button>
      )}
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface-overlay"
        >
          <input
            type="checkbox"
            checked={selected.has(opt.value)}
            onChange={() => onToggle(opt.value)}
            className="h-3 w-3 rounded-sm border-border accent-accent"
          />
          <span className="truncate">{opt.label}</span>
        </label>
      ))}
      {options.length === 0 && (
        <div className="px-2 py-1 text-[10px] text-text-tertiary">
          No options
        </div>
      )}
    </div>
  );
}
