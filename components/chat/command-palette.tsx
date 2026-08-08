"use client";

import { Brain, MessageSquarePlus, Moon, Search, Settings, Sun, WandSparkles, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Conversation } from "@/lib/types";

type Command = { id: string; label: string; hint: string; icon: React.ReactNode; run: () => void };

export function CommandPalette({ open, conversations, onClose, onNewChat, onSelectChat, onSettings, onFast, onDeep, onTheme, onMode }: { open: boolean; conversations: Conversation[]; onClose: () => void; onNewChat: () => void; onSelectChat: (id: string) => void; onSettings: () => void; onFast: () => void; onDeep: () => void; onTheme: (theme: "dark" | "light") => void; onMode: (mode: "chat" | "create" | "analyze") => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (open) queueMicrotask(() => setQuery("")); }, [open]);
  const closeRun = (run: () => void) => { run(); onClose(); };
  const commands = useMemo<Command[]>(() => [
    { id: "new", label: "New chat", hint: "Start a blank conversation", icon: <MessageSquarePlus size={16} />, run: onNewChat },
    { id: "fast", label: "Fast response", hint: "Disable deep reasoning", icon: <Zap size={16} />, run: onFast },
    { id: "deep", label: "Deep thinking", hint: "Enable visible reasoning", icon: <Brain size={16} />, run: onDeep },
    { id: "create", label: "Create mode", hint: "Produce a polished deliverable", icon: <WandSparkles size={16} />, run: () => onMode("create") },
    { id: "analyze", label: "Analyze mode", hint: "Examine assumptions and tradeoffs", icon: <Search size={16} />, run: () => onMode("analyze") },
    { id: "light", label: "Light theme", hint: "Switch appearance", icon: <Sun size={16} />, run: () => onTheme("light") },
    { id: "dark", label: "Dark theme", hint: "Switch appearance", icon: <Moon size={16} />, run: () => onTheme("dark") },
    { id: "settings", label: "Open settings", hint: "Preferences, memory, and account", icon: <Settings size={16} />, run: onSettings },
    ...conversations.slice(0, 20).map((chat) => ({ id: `chat-${chat.id}`, label: chat.title, hint: "Open conversation", icon: <Search size={16} />, run: () => onSelectChat(chat.id) })),
  ], [conversations, onNewChat, onFast, onDeep, onMode, onTheme, onSettings, onSelectChat]);
  const filtered = commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase()));
  if (!open) return null;
  return <div className="command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette"><div className="command-search"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands and chats…" /><button onClick={onClose} aria-label="Close"><X size={16} /></button></div><div className="command-results">{filtered.map((command) => <button key={command.id} onClick={() => closeRun(command.run)}><span>{command.icon}</span><span><strong>{command.label}</strong><small>{command.hint}</small></span></button>)}{filtered.length === 0 && <p>No matching commands.</p>}</div><footer><span>↵ Select</span><span>Esc Close</span></footer></section></div>;
}
