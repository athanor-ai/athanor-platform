import clsx from "clsx";

export function Card({
  children,
  className,
  padding = "md",
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-md border border-border bg-surface-raised",
        {
          "p-0": padding === "none",
          "p-3": padding === "sm",
          "p-4": padding === "md",
          "p-6": padding === "lg",
        },
        hover && "transition-colors duration-150 hover:border-accent/30 hover:bg-surface-overlay",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-3 flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={clsx("text-sm font-medium text-text-primary", className)}>
      {children}
    </h3>
  );
}
