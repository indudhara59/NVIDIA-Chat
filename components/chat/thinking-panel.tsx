"use client";

import { Brain, ChevronDown } from "lucide-react";
import { useState } from "react";

export function ThinkingPanel({ content, streaming = false }: { content?: string; streaming?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!content && !streaming) return null;

  return (
    <div className={`thinking-panel ${streaming ? "is-streaming" : ""}`}>
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Brain size={16} />
        <span>{streaming ? "Thinking…" : "Thinking"}</span>
        {streaming && <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>}
        <ChevronDown size={15} className={open ? "rotate" : ""} />
      </button>
      {open && <div className="thinking-content">{content || "Working through the request…"}</div>}
    </div>
  );
}
