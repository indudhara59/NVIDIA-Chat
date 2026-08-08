"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import { DEFAULT_SETTINGS } from "@/lib/chat-storage";
import type { ChatSettings } from "@/lib/types";

const presets = [2048, 4096, 8192, 16384] as const;

export function SettingsDialog({ open, settings, onChange, onClose }: { open: boolean; settings: ChatSettings; onChange: (settings: ChatSettings) => void; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header><div><h2 id="settings-title">Settings</h2><p>Customize your chat experience.</p></div><button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={19} /></button></header>
        <div className="setting-row"><div><strong>Deep thinking</strong><small>Enable visible reasoning for harder tasks. Turning this off is faster.</small></div><button className={`toggle ${settings.showThinking ? "on" : ""}`} role="switch" aria-checked={settings.showThinking} onClick={() => onChange({ ...settings, showThinking: !settings.showThinking })}><span /></button></div>
        <label className="setting-field"><span><strong>Temperature</strong><small>{settings.temperature.toFixed(1)} · Lower is focused, higher is more varied.</small></span><input type="range" min="0" max="2" step="0.1" value={settings.temperature} onChange={(event) => onChange({ ...settings, temperature: Number(event.target.value) })} /></label>
        <label className="setting-field"><span><strong>Maximum output tokens</strong><small>Maximum length of the final response.</small></span><select value={settings.maxTokens} onChange={(event) => onChange({ ...settings, maxTokens: Number(event.target.value) as ChatSettings["maxTokens"] })}>{presets.map((value) => <option key={value} value={value}>{value.toLocaleString()}</option>)}</select></label>
        <label className="setting-field"><span><strong>Reasoning budget</strong><small>Maximum tokens available for internal reasoning.</small></span><select value={settings.reasoningBudget} onChange={(event) => onChange({ ...settings, reasoningBudget: Number(event.target.value) as ChatSettings["reasoningBudget"] })}>{presets.map((value) => <option key={value} value={value}>{value.toLocaleString()}</option>)}</select></label>
        <footer><button onClick={() => onChange(DEFAULT_SETTINGS)}><RotateCcw size={14} />Reset defaults</button><button className="done-button" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  );
}
