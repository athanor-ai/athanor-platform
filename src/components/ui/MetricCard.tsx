import clsx from "clsx";
import { Card } from "./Card";

export function MetricCard({
  label,
  value,
  subtext,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  className?: string;
}) {
  return (
    <Card padding="md" className={className}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
        {value}
      </div>
      {(subtext || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {subtext && <span className="text-text-secondary">{subtext}</span>}
          {trend && (
            <span
              className={clsx(
                "font-medium",
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-error",
                trend.direction === "flat" && "text-text-tertiary",
              )}
            >
              {trend.direction === "up" ? "\u2191" : trend.direction === "down" ? "\u2193" : "\u2192"}{" "}
              {trend.label}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
