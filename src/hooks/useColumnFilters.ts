"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  ColumnFilterConfig,
  ColumnFilterState,
} from "@/components/ui/ColumnFilter";

export type ColumnFilterMap = Record<string, ColumnFilterState>;

/**
 * Manages per-column filter state.
 *
 * Returns the current filter map, a setter for individual columns,
 * the active filter count, and a reset-all helper.
 */
export function useColumnFilters() {
  const [filters, setFilters] = useState<ColumnFilterMap>({});

  const setColumnFilter = useCallback(
    (key: string, value: ColumnFilterState) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearAll = useCallback(() => setFilters({}), []);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const v of Object.values(filters)) {
      if (
        (v.text != null && v.text.length > 0) ||
        (v.selected != null && v.selected.size > 0)
      ) {
        count++;
      }
    }
    return count;
  }, [filters]);

  return { filters, setColumnFilter, clearAll, activeCount } as const;
}

/* ------------------------------------------------------------------ */
/*  Filter matching helpers                                            */
/* ------------------------------------------------------------------ */

/**
 * Returns true when the given value matches the active filter for a column.
 * If there is no active filter for the column, it passes through.
 */
export function matchesTextFilter(
  filterState: ColumnFilterState | undefined,
  value: string,
): boolean {
  if (!filterState?.text || filterState.text.length === 0) return true;
  return value.toLowerCase().includes(filterState.text.toLowerCase());
}

export function matchesSelectFilter(
  filterState: ColumnFilterState | undefined,
  value: string,
): boolean {
  if (!filterState?.selected || filterState.selected.size === 0) return true;
  return filterState.selected.has(value);
}

/**
 * For range / bucket filters the caller passes the bucket key the row falls in.
 * If no filter is active, all rows pass.
 */
export function matchesBucketFilter(
  filterState: ColumnFilterState | undefined,
  bucketKey: string,
): boolean {
  if (!filterState?.selected || filterState.selected.size === 0) return true;
  return filterState.selected.has(bucketKey);
}

/* ------------------------------------------------------------------ */
/*  Build unique-value options from data                               */
/* ------------------------------------------------------------------ */

export function uniqueOptions(
  values: string[],
): { label: string; value: string }[] {
  const seen = new Set<string>();
  const result: { label: string; value: string }[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      result.push({ label: v, value: v });
    }
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export type { ColumnFilterConfig, ColumnFilterState };
