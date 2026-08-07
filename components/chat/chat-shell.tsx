"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage as ChatMessageType, GenerationState } from "@/lib/types";
import type { ChatStreamEvent, ModelMessage } from "@/lib/chat-protocol";
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
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGeneration("idle");
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, generation]);

  const newChat = () => { stop(); setMessages([]); setInput(""); setMobileOpen(false); };
  const generate = async (conversation: ChatMessageType[], prompt: string) => {
    const userMessage: ChatMessageType = { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: Date.now() };
    const assistantId = crypto.randomUUID();
    const nextMessages = [...conversation, userMessage];
    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() + 1 }]);
    setInput("");
    setGeneration("thinking");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const modelMessages: ModelMessage[] = nextMessages.map(({ role, content }) => ({ role, content }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: modelMessages }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "Unable to connect to the model.");
      }
      if (!response.body) throw new Error("The model returned an empty response.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: ChatStreamEvent;
          try { event = JSON.parse(line) as ChatStreamEvent; }
          catch { throw new Error("The model returned an unreadable response."); }
          if (event.type === "reasoning") {
            setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, reasoning: (message.reasoning || "") + event.text } : message));
          } else if (event.type === "content") {
            setGeneration("answering");
            setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + event.text } : message));
          } else if (event.type === "error") {
            throw new Error(event.message);
          } else if (event.type === "done") {
            done = true;
            break;
          }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const message = error instanceof Error ? error.message : "Unable to connect to the model.";
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: item.content || `> ${message}` } : item));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setGeneration("idle");
    }
  };

  const submit = () => {
    const prompt = input.trim();
    if (!prompt || generation !== "idle") return;
    void generate(messages, prompt);
  };

  const regenerate = () => {
    if (generation !== "idle") return;
    const assistantIndex = messages.findLastIndex((message) => message.role === "assistant");
    if (assistantIndex < 1) return;
    const userMessage = messages[assistantIndex - 1];
    if (userMessage.role !== "user") return;
    void generate(messages.slice(0, assistantIndex - 1), userMessage.content);
  };

  const editLatest = () => {
    if (generation !== "idle") return;
    const userIndex = messages.findLastIndex((message) => message.role === "user");
    if (userIndex < 0) return;
    setInput(messages[userIndex].content);
    setMessages(messages.slice(0, userIndex));
  };

  const selectSuggestion = (prompt: string) => setInput(prompt);
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  const lastUserId = [...messages].reverse().find((message) => message.role === "user")?.id;

  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} onCollapse={() => setSidebarCollapsed(true)} onNewChat={newChat} />
      <section className="main-panel">
        <Header sidebarCollapsed={sidebarCollapsed} onOpenSidebar={() => { if (window.innerWidth < 768) setMobileOpen(true); else setSidebarCollapsed(false); }} />
        <div className="conversation-scroll" ref={scrollRef}>
          {messages.length === 0 ? <EmptyState onSelect={selectSuggestion} /> : (
            <div className="message-list">
              {messages.map((message) => <ChatMessage key={message.id} message={message} reasoningStreaming={message.id === lastAssistantId && generation === "thinking"} answerStreaming={message.id === lastAssistantId && generation === "answering"} canEdit={message.id === lastUserId && generation === "idle"} canRegenerate={message.id === lastAssistantId && generation === "idle"} onEdit={editLatest} onRegenerate={regenerate} />)}
            </div>
          )}
        </div>
        <ChatComposer value={input} onChange={setInput} onSubmit={submit} onStop={stop} generating={generation !== "idle"} disabled={generation !== "idle"} />
      </section>
    </main>
  );
}
