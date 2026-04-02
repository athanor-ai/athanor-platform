import clsx from "clsx";

type StatusVariant = "success" | "warning" | "error" | "info" | "neutral" | "accent";

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  error: "bg-error/15 text-error border-error/20",
  info: "bg-info/15 text-info border-info/20",
  neutral: "bg-surface-overlay text-text-secondary border-border",
  accent: "bg-accent-subtle text-accent border-accent/20",
};

// Map common status strings to variants
const statusToVariant: Record<string, StatusVariant> = {
  active: "success",
  completed: "success",
  published: "success",
  running: "info",
  pending: "neutral",
  draft: "neutral",
  failed: "error",
  cancelled: "warning",
  deprecated: "warning",
  archived: "neutral",
  // difficulties
  trivial: "neutral",
  easy: "success",
  medium: "warning",
  hard: "error",
  expert: "accent",
};

export function StatusBadge({
  status,
  variant,
  className,
}: {
  status: string;
  variant?: StatusVariant;
  className?: string;
}) {
  const resolvedVariant = variant ?? statusToVariant[status.toLowerCase()] ?? "neutral";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        variantStyles[resolvedVariant],
        className,
      )}
    >
      {status}
    </span>
  );
}
