"use client";

import { AlertCircle, Bot, Check, Copy, FileText, GitBranch, GitCompareArrows, Pencil, RefreshCw, UserRound, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { MarkdownRenderer } from "./markdown-renderer";
import { ThinkingPanel } from "./thinking-panel";

type Props = {
  message: ChatMessageType;
  reasoningStreaming?: boolean;
  answerStreaming?: boolean;
  showThinking?: boolean;
  actionsEnabled?: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onBranch?: () => void;
  onCompare?: () => void;
};

export function ChatMessage({ message, reasoningStreaming = false, answerStreaming = false, showThinking = true, actionsEnabled = true, onEdit, onRegenerate, onBranch, onCompare }: Props) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content.replace(/[`#*_>|]/g, ""));
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance); setSpeaking(true);
  };
  return (
    <article className={`message ${message.role}`} aria-label={`${message.role} message`}>
      <div className="message-avatar" aria-hidden="true">{message.role === "assistant" ? <Bot size={17} /> : <UserRound size={17} />}</div>
      <div className="message-body">
        <div className="message-name">{message.role === "assistant" ? "Nemotron" : "You"}</div>
        {message.role === "assistant" && showThinking && <ThinkingPanel content={message.reasoning} streaming={reasoningStreaming} answerStarted={answerStreaming} />}
        {message.content ? <MarkdownRenderer content={message.content} /> : (reasoningStreaming && showThinking) || message.error ? null : <span className="response-cursor" />}
        {message.attachments?.length ? <div className="message-attachments">{message.attachments.map((file) => <a key={file.id} href={`/api/attachments?id=${encodeURIComponent(file.id)}`} target="_blank" rel="noreferrer"><FileText size={14} /><span>{file.name}</span><small>{Math.max(1, Math.round(file.size / 1024))} KB</small></a>)}</div> : null}
        {message.error && <div className="message-error" role="alert"><AlertCircle size={16} /><span>{message.error}</span>{actionsEnabled && <button onClick={onRegenerate}>Retry</button>}</div>}
        <div className="message-actions">
          {message.content && <button onClick={copy} aria-label={`Copy ${message.role} message`} title="Copy message">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>}
          {message.role === "assistant" && message.content && <button onClick={speak} aria-label={speaking ? "Stop reading response" : "Read response aloud"} title={speaking ? "Stop reading" : "Read aloud"}>{speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}{speaking ? "Stop" : "Listen"}</button>}
          {message.role === "assistant" && actionsEnabled && <button onClick={onRegenerate} aria-label="Regenerate response" title="Regenerate response"><RefreshCw size={14} />Regenerate</button>}
          {message.role === "assistant" && actionsEnabled && <button onClick={onCompare} aria-label="Compare response mode" title="Compare with the other response mode"><GitCompareArrows size={14} />Compare</button>}
          {message.role === "user" && actionsEnabled && <button onClick={onEdit} aria-label="Edit prompt" title="Edit prompt"><Pencil size={14} />Edit</button>}
          {actionsEnabled && <button onClick={onBranch} aria-label="Branch conversation here" title="Branch conversation here"><GitBranch size={14} />Branch</button>}
        </div>
      </div>
    </article>
  );
}
