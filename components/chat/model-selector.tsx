"use client";

import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className="model-selector" ref={rootRef}>
      <button className="model-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox">
        <span>Nemotron 3 Ultra</span>
        <ChevronDown size={14} className={open ? "rotate" : ""} />
      </button>
      {open && (
        <div className="model-menu" role="listbox" aria-label="Model">
          <button role="option" aria-selected="true">
            <span className="model-icon"><Sparkles size={15} /></span>
            <span><strong>Nemotron 3 Ultra</strong><small>Advanced reasoning</small></span>
            <Check size={15} className="model-check" />
          </button>
          <p>More models will be available soon.</p>
        </div>
      )}
    </div>
  );
}
