import { Bot, UserRound } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { MarkdownRenderer } from "./markdown-renderer";
import { ThinkingPanel } from "./thinking-panel";

type Props = { message: ChatMessageType; reasoningStreaming?: boolean };

export function ChatMessage({ message, reasoningStreaming = false }: Props) {
  return (
    <article className={`message ${message.role}`} aria-label={`${message.role} message`}>
      <div className="message-avatar" aria-hidden="true">{message.role === "assistant" ? <Bot size={17} /> : <UserRound size={17} />}</div>
      <div className="message-body">
        <div className="message-name">{message.role === "assistant" ? "Nemotron" : "You"}</div>
        {message.role === "assistant" && <ThinkingPanel content={message.reasoning} streaming={reasoningStreaming} />}
        {message.content ? <MarkdownRenderer content={message.content} /> : reasoningStreaming ? null : <span className="response-cursor" />}
      </div>
    </article>
  );
}
