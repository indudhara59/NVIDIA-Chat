"use client";

import { ArrowUp, Paperclip, Square } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  generating: boolean;
  disabled?: boolean;
};

export function ChatComposer({ value, onChange, onSubmit, onStop, generating, disabled = false }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const area = textareaRef.current;
    if (!area) return;
    area.style.height = "0px";
    area.style.height = `${Math.min(area.scrollHeight, 176)}px`;
  }, [value]);
  useEffect(() => {
    if (!generating) textareaRef.current?.focus();
  }, [generating]);

  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(); };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); onSubmit(); }
  };

  return (
    <div className="composer-wrap">
      <form className="composer" onSubmit={submit}>
        <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={keyDown} placeholder="Message Nemotron…" rows={1} disabled={disabled} aria-label="Message Nemotron" />
        <div className="composer-tools">
          <button type="button" className="attach-button" aria-label="Attach file" title="Attachments coming soon" disabled><Paperclip size={18} /></button>
          <span className="composer-hint">Shift + Enter for new line</span>
          {generating ? (
            <button type="button" className="send-button stop" onClick={onStop} aria-label="Stop generating" title="Stop generating"><Square size={13} fill="currentColor" /></button>
          ) : (
            <button type="submit" className="send-button" disabled={disabled || !value.trim()} aria-label="Send message" title="Send message"><ArrowUp size={19} /></button>
          )}
        </div>
      </form>
      <p className="disclaimer">AI responses may contain mistakes.</p>
    </div>
  );
}
