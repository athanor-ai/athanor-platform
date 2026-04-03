"use client";

import { useState, useCallback } from "react";

/**
 * Code block with one-click copy-to-clipboard button.
 * Used in Quick Start, docs, and anywhere code snippets appear.
 */
export function CopyBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative group">
      <pre className="bg-surface-primary border border-border-primary rounded-lg p-4 pr-12 text-sm font-mono overflow-x-auto whitespace-pre">
        {language && (
          <span className="absolute top-2 left-3 text-[10px] text-text-tertiary uppercase">
            {language}
          </span>
        )}
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-medium
                   bg-surface-secondary border border-border-primary text-text-secondary
                   hover:bg-surface-tertiary hover:text-text-primary
                   transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Copy to clipboard"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
