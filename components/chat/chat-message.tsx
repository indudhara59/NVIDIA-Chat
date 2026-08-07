"use client";

import { Bot, Check, Copy, Pencil, RefreshCw, UserRound } from "lucide-react";
import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { MarkdownRenderer } from "./markdown-renderer";
import { ThinkingPanel } from "./thinking-panel";

type Props = {
  message: ChatMessageType;
  reasoningStreaming?: boolean;
  answerStreaming?: boolean;
  canEdit?: boolean;
  canRegenerate?: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
};

export function ChatMessage({ message, reasoningStreaming = false, answerStreaming = false, canEdit, canRegenerate, onEdit, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <article className={`message ${message.role}`} aria-label={`${message.role} message`}>
      <div className="message-avatar" aria-hidden="true">{message.role === "assistant" ? <Bot size={17} /> : <UserRound size={17} />}</div>
      <div className="message-body">
        <div className="message-name">{message.role === "assistant" ? "Nemotron" : "You"}</div>
        {message.role === "assistant" && <ThinkingPanel content={message.reasoning} streaming={reasoningStreaming} answerStarted={answerStreaming} />}
        {message.content ? <MarkdownRenderer content={message.content} /> : reasoningStreaming ? null : <span className="response-cursor" />}
        <div className="message-actions">
          {message.role === "assistant" && message.content && <button onClick={copy} aria-label="Copy assistant response" title="Copy response">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>}
          {canRegenerate && <button onClick={onRegenerate} aria-label="Regenerate response" title="Regenerate response"><RefreshCw size={14} />Regenerate</button>}
          {canEdit && <button onClick={onEdit} aria-label="Edit latest prompt" title="Edit prompt"><Pencil size={14} />Edit</button>}
        </div>
      </div>
    </article>
  );
}
