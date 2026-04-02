export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="mt-3 text-xs text-text-tertiary">{message}</p>
    </div>
  );
}
