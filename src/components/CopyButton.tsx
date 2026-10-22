"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="rounded-md border border-edge px-3 py-1.5 text-xs font-semibold text-bone hover:border-bone/60"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
