import clsx from "clsx";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data available",
  className,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
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
                {col.header}
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
                <td key={col.key} className={clsx("py-2.5 pr-4", col.className)}>
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
