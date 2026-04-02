"use client";

import { useState, useCallback } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      data-testid="copy-button"
      className="absolute top-2 right-2 rounded-sm border border-border bg-surface-overlay px-2 py-1 font-mono text-[10px] text-text-secondary transition-colors hover:border-accent hover:text-accent"
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
