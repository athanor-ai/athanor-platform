import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md font-medium transition-all duration-150",
        {
          "bg-accent text-background hover:bg-accent-muted active:scale-[0.98]": variant === "primary",
          "border border-border bg-surface-raised text-text-primary hover:bg-surface-overlay hover:border-border": variant === "secondary",
          "text-text-secondary hover:text-text-primary hover:bg-surface-overlay": variant === "ghost",
          "border border-error/30 bg-error/10 text-error hover:bg-error/20": variant === "danger",
        },
        {
          "gap-1.5 px-2.5 py-1.5 text-xs": size === "sm",
          "gap-2 px-3.5 py-2 text-sm": size === "md",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
