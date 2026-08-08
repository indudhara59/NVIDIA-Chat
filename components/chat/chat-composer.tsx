"use client";

import { ArrowUp, Brain, FileText, LoaderCircle, Mic, MicOff, Paperclip, Square, X, Zap } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { ChatAttachment } from "@/lib/types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  generating: boolean;
  disabled?: boolean;
  deepThinking: boolean;
  onToggleThinking: () => void;
  attachments: ChatAttachment[];
  uploading: boolean;
  onFiles: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
};

export function ChatComposer({ value, onChange, onSubmit, onStop, generating, disabled = false, deepThinking, onToggleThinking, attachments, uploading, onFiles, onRemoveAttachment }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const speechBaseRef = useRef("");
  const [listening, setListening] = useState(false);
  useEffect(() => {
    const area = textareaRef.current;
    if (!area) return;
    area.style.height = "0px";
    area.style.height = `${Math.min(area.scrollHeight, 176)}px`;
  }, [value]);
  useEffect(() => {
    if (!generating) textareaRef.current?.focus();
  }, [generating]);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleDictation = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    type RecognitionEvent = { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> };
    type Recognition = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: RecognitionEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };
    const RecognitionConstructor = (window as typeof window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!RecognitionConstructor) { window.alert("Voice dictation is not supported by this browser."); return; }
    const recognition = new RecognitionConstructor();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = navigator.language || "en-US"; speechBaseRef.current = value.trim();
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      onChange(`${speechBaseRef.current}${speechBaseRef.current ? " " : ""}${transcript}`);
    };
    recognition.onend = () => setListening(false); recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition; recognition.start(); setListening(true);
  };

  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(); };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); onSubmit(); }
  };

  return (
    <div className="composer-wrap">
      <form className="composer" onSubmit={submit}>
        {attachments.length > 0 && <div className="attachment-chips">{attachments.map((file) => <span key={file.id}><FileText size={14} /><span>{file.name}</span><button type="button" onClick={() => onRemoveAttachment(file.id)} aria-label={`Remove ${file.name}`}><X size={13} /></button></span>)}</div>}
        <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={keyDown} placeholder="Message Nemotron…" rows={1} disabled={disabled} aria-label="Message Nemotron" />
        <div className="composer-tools">
          <input ref={fileRef} className="file-input" type="file" multiple accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp" onChange={(event) => { if (event.target.files?.length) onFiles(event.target.files); event.target.value = ""; }} />
          <button type="button" className="attach-button" aria-label="Attach file" title="Attach file" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}>{uploading ? <LoaderCircle className="spin" size={17} /> : <Paperclip size={18} />}</button>
          <button type="button" className={`mode-button ${deepThinking ? "deep" : ""}`} onClick={onToggleThinking} disabled={generating} aria-label={`Switch to ${deepThinking ? "fast response" : "deep thinking"}`} title={deepThinking ? "Deep thinking enabled" : "Fast response enabled"}>{deepThinking ? <Brain size={15} /> : <Zap size={15} />}<span>{deepThinking ? "Deep" : "Fast"}</span></button>
          <button type="button" className={`voice-button ${listening ? "listening" : ""}`} onClick={toggleDictation} disabled={disabled} aria-label={listening ? "Stop dictation" : "Start dictation"} title={listening ? "Stop dictation" : "Dictate message"}>{listening ? <MicOff size={15} /> : <Mic size={15} />}</button>
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
