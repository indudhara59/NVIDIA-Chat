"use client";

import { ArrowDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatStreamEvent, ModelMessage } from "@/lib/chat-protocol";
import { createTitle, DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/chat-storage";
import type { ChatMessage as ChatMessageType, ChatSettings, Conversation, GenerationState } from "@/lib/types";
import { ChatComposer } from "./chat-composer";
import { ChatMessage } from "./chat-message";
import { EmptyState } from "./empty-state";
import { Header } from "./header";
import { SettingsDialog } from "./settings-dialog";
import { Sidebar } from "./sidebar";

const currentTime = () => Date.now();

export function ChatShell({ user }: { user: { name: string; email: string; image: string | null } }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [generation, setGeneration] = useState<GenerationState>("idle");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/conversations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load your conversations.");
        return response.json() as Promise<{ conversations: Conversation[] }>;
      })
      .then((data) => { if (active) setConversations(data.conversations); })
      .catch(() => { if (active) setStorageError("Could not load your conversations. Please refresh to retry."); })
      .finally(() => {
        if (!active) return;
        setSettings(loadSettings());
        setHydrated(true);
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!hydrated || !activeId) return;
    const conversation = conversations.find((chat) => chat.id === activeId);
    if (!conversation) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/conversations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(conversation) })
        .then((response) => { if (!response.ok) throw new Error(); setStorageError(null); })
        .catch(() => setStorageError("Changes could not be saved. Check your connection."));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [conversations, activeId, hydrated]);
  useEffect(() => { if (hydrated) saveSettings(settings); }, [settings, hydrated]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
    nearBottomRef.current = true;
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (!nearBottomRef.current) return;
    const frame = requestAnimationFrame(() => scrollToBottom(generation === "idle" ? "smooth" : "auto"));
    return () => cancelAnimationFrame(frame);
  }, [messages, generation, scrollToBottom]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && abortRef.current) abortRef.current.abort(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGeneration("idle");
  }, []);

  const commitMessages = useCallback((chatId: string, updater: (current: ChatMessageType[]) => ChatMessageType[]) => {
    if (activeIdRef.current === chatId) setMessages(updater);
    setConversations((current) => current.map((chat) => chat.id === chatId ? { ...chat, messages: updater(chat.messages), updatedAt: currentTime() } : chat).sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const newChat = () => {
    stop(); activeIdRef.current = null; setActiveId(null); setMessages([]); setInput(""); setMobileOpen(false); nearBottomRef.current = true;
  };
  const selectChat = (id: string) => {
    stop();
    const chat = conversations.find((item) => item.id === id);
    if (!chat) return;
    activeIdRef.current = id; setActiveId(id); setMessages(chat.messages); setMobileOpen(false); nearBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  };

  const streamConversation = async (chatId: string, nextMessages: ChatMessageType[]) => {
    const assistantId = crypto.randomUUID();
    const withPlaceholder = [...nextMessages, { id: assistantId, role: "assistant", content: "", createdAt: currentTime() + 1 } satisfies ChatMessageType];
    commitMessages(chatId, () => withPlaceholder);
    setInput(""); setGeneration("thinking"); nearBottomRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const modelMessages: ModelMessage[] = nextMessages.map(({ role, content }) => ({ role, content }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: modelMessages, config: { temperature: settings.temperature, maxTokens: settings.maxTokens, reasoningBudget: settings.reasoningBudget } }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "Unable to connect to the model.");
      }
      if (!response.body) throw new Error("Connection lost while generating the response.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: ChatStreamEvent;
          try { event = JSON.parse(line) as ChatStreamEvent; } catch { throw new Error("Connection lost while generating the response."); }
          if (event.type === "reasoning") commitMessages(chatId, (current) => current.map((message) => message.id === assistantId ? { ...message, reasoning: (message.reasoning || "") + event.text } : message));
          else if (event.type === "content") { setGeneration("answering"); commitMessages(chatId, (current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + event.text } : message)); }
          else if (event.type === "error") throw new Error(event.message);
          else if (event.type === "done") { done = true; break; }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const message = error instanceof Error ? error.message : "Connection lost while generating the response.";
        commitMessages(chatId, (current) => current.map((item) => item.id === assistantId ? { ...item, error: message } : item));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setGeneration("idle");
    }
  };

  const submit = () => {
    const prompt = input.trim();
    if (!prompt || generation !== "idle" || abortRef.current) return;
    const chatId = activeId || crypto.randomUUID();
    const userMessage: ChatMessageType = { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: currentTime() };
    const nextMessages = [...messages, userMessage];
    if (!activeId) {
      const now = currentTime();
      activeIdRef.current = chatId; setActiveId(chatId);
      setConversations((current) => [{ id: chatId, title: createTitle(prompt), messages: [], createdAt: now, updatedAt: now }, ...current]);
    }
    void streamConversation(chatId, nextMessages);
  };

  const regenerate = (assistantId: string) => {
    if (generation !== "idle" || !activeId) return;
    const index = messages.findIndex((message) => message.id === assistantId);
    const nextMessages = messages.slice(0, index);
    if (index < 1 || nextMessages.at(-1)?.role !== "user") return;
    void streamConversation(activeId, nextMessages);
  };
  const editMessage = (messageId: string) => {
    if (generation !== "idle" || !activeId) return;
    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0 || messages[index].role !== "user") return;
    setInput(messages[index].content);
    commitMessages(activeId, (current) => current.slice(0, index));
  };
  const updateSettings = (value: ChatSettings) => setSettings(value);
  const renameChat = (id: string, title: string) => {
    setConversations((current) => current.map((chat) => chat.id === id ? { ...chat, title, updatedAt: currentTime() } : chat).sort((a, b) => b.updatedAt - a.updatedAt));
    void fetch("/api/conversations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, title }) }).then((response) => { if (!response.ok) setStorageError("The conversation could not be renamed."); });
  };
  const deleteChat = (id: string) => {
    setConversations((current) => current.filter((chat) => chat.id !== id)); if (activeId === id) newChat();
    void fetch(`/api/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then((response) => { if (!response.ok) setStorageError("The conversation could not be deleted."); });
  };
  const clearChats = () => {
    stop(); setConversations([]); newChat();
    void fetch("/api/conversations", { method: "DELETE" }).then((response) => { if (!response.ok) setStorageError("Conversations could not be cleared."); });
  };
  const onScroll = () => {
    const element = scrollRef.current; if (!element) return;
    const near = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    nearBottomRef.current = near; setShowScrollButton(!near && messages.length > 0);
  };

  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} conversations={conversations} activeId={activeId} user={user} onCloseMobile={() => setMobileOpen(false)} onCollapse={() => setSidebarCollapsed(true)} onNewChat={newChat} onSelect={selectChat} onRename={renameChat} onDelete={deleteChat} onClear={clearChats} onOpenSettings={() => setSettingsOpen(true)} />
      <section className="main-panel">
        <Header sidebarCollapsed={sidebarCollapsed} onOpenSidebar={() => { if (window.innerWidth < 768) setMobileOpen(true); else setSidebarCollapsed(false); }} />
        <div className="conversation-scroll" ref={scrollRef} onScroll={onScroll}>
          {messages.length === 0 ? <EmptyState onSelect={setInput} /> : <div className="message-list">{messages.map((message) => <ChatMessage key={message.id} message={message} reasoningStreaming={message.id === lastAssistantId && generation === "thinking"} answerStreaming={message.id === lastAssistantId && generation === "answering"} showThinking={settings.showThinking} actionsEnabled={generation === "idle"} onEdit={() => editMessage(message.id)} onRegenerate={() => regenerate(message.id)} />)}</div>}
        </div>
        {showScrollButton && <button className="scroll-bottom" onClick={() => scrollToBottom()} aria-label="Scroll to bottom"><ArrowDown size={18} /></button>}
        {storageError && <div className="storage-error" role="status">{storageError}<button onClick={() => setStorageError(null)} aria-label="Dismiss">×</button></div>}
        <ChatComposer value={input} onChange={setInput} onSubmit={submit} onStop={stop} generating={generation !== "idle"} disabled={generation !== "idle"} />
      </section>
      <SettingsDialog open={settingsOpen} settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
