"use client";

import { Check, Folder, FolderPlus, GitBranch, LayoutList, LogOut, MessageSquare, MoreHorizontal, PanelLeftClose, Plus, Search, Settings, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { ChatHistoryGroup, ChatProject, Conversation } from "@/lib/types";
import { BrandMark } from "@/components/ui/brand-mark";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  conversations: Conversation[];
  activeId: string | null;
  user: { name: string; email: string; image: string | null };
  projects: ChatProject[];
  activeProjectId: string | null;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onOpenSettings: () => void;
  onCreateProject: () => void;
  onSelectProject: (id: string | null) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
};

function startOfDay(time: number) {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function groupChats(chats: Conversation[]): ChatHistoryGroup[] {
  const day = 86_400_000;
  const today = startOfDay(Date.now());
  const groups = [
    { label: "Today", min: today },
    { label: "Yesterday", min: today - day },
    { label: "Previous 7 Days", min: today - 7 * day },
    { label: "Previous 30 Days", min: today - 30 * day },
    { label: "Older", min: Number.NEGATIVE_INFINITY },
  ];
  return groups.map((group, index) => ({
    label: group.label,
    chats: chats.filter((chat) => chat.updatedAt >= group.min && (index === 0 || chat.updatedAt < groups[index - 1].min)),
  })).filter((group) => group.chats.length > 0);
}

export function Sidebar({ collapsed, mobileOpen, conversations, activeId, user, projects, activeProjectId, onCloseMobile, onCollapse, onNewChat, onSelect, onRename, onDelete, onClear, onOpenSettings, onCreateProject, onSelectProject, onRenameProject, onDeleteProject }: SidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [projectMenuId, setProjectMenuId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((chat) => chat.title.toLowerCase().includes(term) || chat.messages.some((message) => message.content.toLowerCase().includes(term)));
  }, [conversations, query]);
  const grouped = useMemo(() => groupChats(filtered), [filtered]);

  const finishRename = (id: string) => {
    const value = renameValue.trim();
    if (value) onRename(id, value.slice(0, 60));
    setRenamingId(null); setMenuId(null);
  };

  return (
    <>
      <button className={`sidebar-scrim ${mobileOpen ? "visible" : ""}`} onClick={onCloseMobile} aria-label="Close sidebar" />
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`} aria-label="Chat sidebar">
        <div className="sidebar-top">
          <a href="#" className="brand" aria-label="Nemotron Chat home" onClick={(event) => { event.preventDefault(); onNewChat(); }}><BrandMark /><span>Nemotron Chat</span></a>
          <button className="icon-button close-mobile" onClick={onCloseMobile} aria-label="Close sidebar"><X size={19} /></button>
          <button className="icon-button collapse-desktop" onClick={onCollapse} aria-label="Collapse sidebar" title="Collapse sidebar"><PanelLeftClose size={19} /></button>
        </div>
        <nav className="sidebar-actions" aria-label="Chat actions">
          <button className="new-chat" onClick={onNewChat}><Plus size={17} />New chat</button>
          {searchOpen ? <div className="chat-search"><Search size={16} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" aria-label="Search chats" /><button onClick={() => { setQuery(""); setSearchOpen(false); }} aria-label="Close search"><X size={15} /></button></div> : <button className="sidebar-action" onClick={() => { setSearchOpen(true); window.setTimeout(() => searchRef.current?.focus(), 0); }}><Search size={17} />Search chats <kbd>⌘ K</kbd></button>}
        </nav>
        <section className="project-list" aria-labelledby="projects-title">
          <div className="project-heading"><h2 id="projects-title">Projects</h2><button onClick={onCreateProject} aria-label="Create project" title="Create project"><FolderPlus size={15} /></button></div>
          <div className={`project-item ${activeProjectId === null ? "active" : ""}`}><button onClick={() => onSelectProject(null)}><LayoutList size={14} /><span>All chats</span></button></div>
          {projects.map((project) => <div className={`project-item ${activeProjectId === project.id ? "active" : ""}`} key={project.id}><button onClick={() => onSelectProject(project.id)}><Folder size={14} /><span>{project.name}</span></button><button className="project-more" onClick={() => setProjectMenuId(projectMenuId === project.id ? null : project.id)} aria-label={`Options for ${project.name}`}><MoreHorizontal size={14} /></button>{projectMenuId === project.id && <div className="history-menu project-menu"><button onClick={() => { const name = window.prompt("Rename project", project.name)?.trim(); if (name) onRenameProject(project.id, name); setProjectMenuId(null); }}>Rename</button><button className="danger" onClick={() => { if (window.confirm(`Delete “${project.name}”? Chats will move to All chats.`)) onDeleteProject(project.id); setProjectMenuId(null); }}>Delete</button></div>}</div>)}
        </section>
        <div className="chat-history">
          {grouped.map((group) => (
            <section key={group.label} aria-labelledby={`history-${group.label.replaceAll(" ", "-")}`}>
              <h2 id={`history-${group.label.replaceAll(" ", "-")}`}>{group.label}</h2>
              {group.chats.map((chat) => (
                <div className={`history-item ${activeId === chat.id ? "active" : ""}`} key={chat.id}>
                  {renamingId === chat.id ? <form onSubmit={(event) => { event.preventDefault(); finishRename(chat.id); }}><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onBlur={() => finishRename(chat.id)} aria-label="Conversation title" /><button type="submit" aria-label="Save title"><Check size={14} /></button></form> : <button className="history-select" onClick={() => onSelect(chat.id)}>{chat.parentConversationId ? <GitBranch size={14} /> : <MessageSquare size={14} />}<span>{chat.title}</span></button>}
                  {renamingId !== chat.id && <button className="history-more" onClick={() => setMenuId(menuId === chat.id ? null : chat.id)} aria-label={`Options for ${chat.title}`}><MoreHorizontal size={15} /></button>}
                  {menuId === chat.id && <div className="history-menu"><button onClick={() => { setRenameValue(chat.title); setRenamingId(chat.id); setMenuId(null); }}>Rename</button><button className="danger" onClick={() => { if (window.confirm(`Delete “${chat.title}”?`)) onDelete(chat.id); setMenuId(null); }}>Delete</button></div>}
                </div>
              ))}
            </section>
          ))}
          {conversations.length > 0 && filtered.length === 0 && <p className="history-empty">No matching chats.</p>}
          {conversations.length === 0 && <p className="history-empty">Your conversations will appear here.</p>}
        </div>
        <div className="sidebar-footer">
          {conversations.length > 0 && <button className="clear-chats" onClick={() => { if (window.confirm("Delete all conversations? This cannot be undone.")) onClear(); }}><Trash2 size={17} /><span><strong>Clear chats</strong></span></button>}
          <button onClick={onOpenSettings}><Settings size={18} /><span><strong>Settings</strong><small>Model and appearance</small></span></button>
          <div className="user-profile"><span className="user-initial" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span><button onClick={() => void signOut({ callbackUrl: "/" })} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button></div>
        </div>
      </aside>
    </>
  );
}
