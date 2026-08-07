"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDemoResponse } from "@/lib/demo";
import type { ChatMessage as ChatMessageType, GenerationState } from "@/lib/types";
import { ChatComposer } from "./chat-composer";
import { ChatMessage } from "./chat-message";
import { EmptyState } from "./empty-state";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function ChatShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [generation, setGeneration] = useState<GenerationState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setGeneration("idle");
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, generation]);

  const newChat = () => { stop(); setMessages([]); setInput(""); setMobileOpen(false); };
  const submit = () => {
    const prompt = input.trim();
    if (!prompt || generation !== "idle") return;
    const userMessage: ChatMessageType = { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: Date.now() };
    const assistantId = crypto.randomUUID();
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() + 1 }]);
    setInput("");
    setGeneration("thinking");
    timerRef.current = setTimeout(() => {
      const response = getDemoResponse(prompt);
      setGeneration("answering");
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, reasoning: response.reasoning } : message));
      timerRef.current = setTimeout(() => {
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: response.content } : message));
        setGeneration("idle");
        timerRef.current = null;
      }, 650);
    }, 900);
  };

  const selectSuggestion = (prompt: string) => setInput(prompt);
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} onCollapse={() => setSidebarCollapsed(true)} onNewChat={newChat} />
      <section className="main-panel">
        <Header sidebarCollapsed={sidebarCollapsed} onOpenSidebar={() => { if (window.innerWidth < 768) setMobileOpen(true); else setSidebarCollapsed(false); }} />
        <div className="conversation-scroll" ref={scrollRef}>
          {messages.length === 0 ? <EmptyState onSelect={selectSuggestion} /> : (
            <div className="message-list">
              {messages.map((message) => <ChatMessage key={message.id} message={message} reasoningStreaming={message.id === lastAssistantId && generation === "thinking"} />)}
            </div>
          )}
        </div>
        <ChatComposer value={input} onChange={setInput} onSubmit={submit} onStop={stop} generating={generation !== "idle"} disabled={generation !== "idle"} />
      </section>
    </main>
  );
}
