"use client";

import { Check, Code2, Copy, Download, Eye, X } from "lucide-react";
import { useMemo, useState } from "react";

export type Artifact = { language: string; code: string };

export function ArtifactPanel({ artifact, onChange, onClose }: { artifact: Artifact; onChange: (code: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"preview" | "code">(artifact.language === "html" || artifact.language === "svg" ? "preview" : "code");
  const [copied, setCopied] = useState(false);
  const previewable = artifact.language === "html" || artifact.language === "svg";
  const source = useMemo(() => {
    const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:">`;
    if (artifact.language === "svg") return `${policy}<style>body{margin:0;display:grid;place-items:center;min-height:100vh}</style>${artifact.code}`;
    return /<head[\s>]/i.test(artifact.code) ? artifact.code.replace(/<head([^>]*)>/i, `<head$1>${policy}`) : `${policy}${artifact.code}`;
  }, [artifact]);
  const copy = async () => { await navigator.clipboard.writeText(artifact.code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  const download = () => {
    const extension = artifact.language || "txt";
    const url = URL.createObjectURL(new Blob([artifact.code], { type: "text/plain" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `nemotron-artifact.${extension}`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <aside className="artifact-panel" aria-label="Artifact canvas">
    <header><div><strong>Artifact</strong><small>{artifact.language || "text"}</small></div><div className="artifact-tabs">{previewable && <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}><Eye size={14} />Preview</button>}<button className={tab === "code" ? "active" : ""} onClick={() => setTab("code")}><Code2 size={14} />Code</button></div><button className="icon-button" onClick={onClose} aria-label="Close artifact"><X size={18} /></button></header>
    <div className="artifact-toolbar"><span>Editable workspace</span><button onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button><button onClick={download}><Download size={14} />Download</button></div>
    {tab === "preview" && previewable ? <iframe title="Artifact preview" sandbox="allow-scripts" srcDoc={source} /> : <textarea value={artifact.code} onChange={(event) => onChange(event.target.value)} spellCheck="false" aria-label="Artifact code" />}
  </aside>;
}
