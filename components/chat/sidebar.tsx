"use client";

import { MessageSquare, PanelLeftClose, Plus, Search, Settings, X } from "lucide-react";
import { chatHistory } from "@/lib/demo";
import { BrandMark } from "@/components/ui/brand-mark";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onNewChat: () => void;
};

export function Sidebar({ collapsed, mobileOpen, onCloseMobile, onCollapse, onNewChat }: SidebarProps) {
  return (
    <>
      <button className={`sidebar-scrim ${mobileOpen ? "visible" : ""}`} onClick={onCloseMobile} aria-label="Close sidebar" />
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`} aria-label="Chat sidebar">
        <div className="sidebar-top">
          <a href="#" className="brand" aria-label="Nemotron Chat home" onClick={(event) => { event.preventDefault(); onNewChat(); }}>
            <BrandMark />
            <span>Nemotron Chat</span>
          </a>
          <button className="icon-button close-mobile" onClick={onCloseMobile} aria-label="Close sidebar"><X size={19} /></button>
          <button className="icon-button collapse-desktop" onClick={onCollapse} aria-label="Collapse sidebar" title="Collapse sidebar"><PanelLeftClose size={19} /></button>
        </div>
        <nav className="sidebar-actions" aria-label="Chat actions">
          <button className="new-chat" onClick={onNewChat}><Plus size={17} />New chat</button>
          <button className="sidebar-action"><Search size={17} />Search chats <kbd>⌘ K</kbd></button>
        </nav>
        <div className="chat-history">
          {chatHistory.map((group) => (
            <section key={group.label} aria-labelledby={`history-${group.label.replaceAll(" ", "-")}`}>
              <h2 id={`history-${group.label.replaceAll(" ", "-")}`}>{group.label}</h2>
              {group.chats.map((chat) => <button key={chat.id}><MessageSquare size={14} /><span>{chat.title}</span></button>)}
            </section>
          ))}
        </div>
        <div className="sidebar-footer">
          <button><Settings size={18} /><span><strong>Settings</strong><small>Preferences and appearance</small></span></button>
        </div>
      </aside>
    </>
  );
}
