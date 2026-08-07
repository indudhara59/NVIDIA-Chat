"use client";

import { Brain, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ThinkingPanel({ content, streaming = false, answerStarted = false }: { content?: string; streaming?: boolean; answerStarted?: boolean }) {
  const [open, setOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const wasStreaming = useRef(false);

  useEffect(() => {
    if (streaming && !wasStreaming.current) {
      startedAt.current = Date.now();
      setElapsed(0);
      setOpen(true);
    }
    if (answerStarted && wasStreaming.current) setOpen(false);
    wasStreaming.current = streaming;
  }, [streaming, answerStarted]);

  useEffect(() => {
    if (!streaming) return;
    const update = () => setElapsed(Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000));
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [streaming]);

  if (!content && !streaming) return null;

  return (
    <div className={`thinking-panel ${streaming ? "is-streaming" : ""}`}>
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Brain size={16} />
        <span>{streaming ? `Thinking… ${elapsed}s` : elapsed ? `Thought for ${elapsed}s` : "Thinking complete"}</span>
        {streaming && <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>}
        <ChevronDown size={15} className={open ? "rotate" : ""} />
      </button>
      {open && <div className="thinking-content">{content || "Working through the request…"}</div>}
    </div>
  );
}
