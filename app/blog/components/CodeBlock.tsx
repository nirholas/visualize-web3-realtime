"use client";

import { useState } from "react";

export function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0e0e1a] overflow-hidden mb-6">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e2e] bg-[#0c0c16]">
          <span className="text-xs text-[#6a6a8a] font-[family-name:var(--font-ibm-plex-mono)]">
            {filename}
          </span>
          {language && (
            <span className="text-xs text-[#4a4a6a]">{language}</span>
          )}
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-sm leading-relaxed font-[family-name:var(--font-ibm-plex-mono)] text-[#b0b0d0] !border-0 !m-0 !rounded-none">
          <code>{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 text-xs px-2 py-1 rounded border border-[#2a2a3a] text-[#6a6a8a] hover:text-[#d8d8e8] hover:border-[#3a3a5a] transition-colors bg-[#0e0e1a]"
          aria-label="Copy code"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
