import clsx from "clsx";
import {
  ColumnFilter,
  type ColumnFilterConfig,
  type ColumnFilterState,
} from "@/components/ui/ColumnFilter";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  sortable?: boolean;
  /** When provided, a filter dropdown icon is rendered in the column header. */
  filterConfig?: ColumnFilterConfig;
  render: (item: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  onHeaderClick,
  sortKey,
  sortDir,
  filters,
  onFilterChange,
  emptyMessage = "No data available",
  className,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  onHeaderClick?: (key: string) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  /** Current per-column filter state keyed by column key. */
  filters?: Record<string, ColumnFilterState>;
  /** Called when a column filter changes. */
  onFilterChange?: (key: string, state: ColumnFilterState) => void;
  emptyMessage?: string;
  className?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
        <div className="text-sm">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={clsx("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  "pb-2 pr-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary",
                  col.className,
                )}
              >
                <span className="inline-flex items-center gap-0.5">
                  {col.sortable && onHeaderClick ? (
                    <button
                      onClick={() => onHeaderClick(col.key)}
                      className="cursor-pointer hover:text-text-primary"
                    >
                      {col.header}{" "}
                      {sortKey === col.key
                        ? sortDir === "asc"
                          ? "\u2191"
                          : "\u2193"
                        : ""}
                    </button>
                  ) : (
                    col.header
                  )}

                  {col.filterConfig && onFilterChange && (
                    <ColumnFilter
                      config={col.filterConfig}
                      value={filters?.[col.key] ?? {}}
                      onChange={(next) => onFilterChange(col.key, next)}
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className={clsx(
                "border-b border-border-subtle transition-colors",
                onRowClick && "cursor-pointer hover:bg-surface-overlay",
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx("py-2.5 pr-4", col.className)}
                >
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
