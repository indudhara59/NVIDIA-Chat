"use client";

import { Menu, PanelLeftOpen, Share2 } from "lucide-react";
import { ModelSelector } from "./model-selector";

type HeaderProps = { sidebarCollapsed: boolean; onOpenSidebar: () => void };

export function Header({ sidebarCollapsed, onOpenSidebar }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-leading">
        <button className="icon-button mobile-menu" onClick={onOpenSidebar} aria-label="Open sidebar" title="Open sidebar"><Menu size={20} /></button>
        {sidebarCollapsed && <button className="icon-button desktop-sidebar-open" onClick={onOpenSidebar} aria-label="Expand sidebar" title="Expand sidebar"><PanelLeftOpen size={19} /></button>}
        <ModelSelector />
      </div>
      <button className="share-button" aria-label="Share conversation" title="Share conversation" disabled>
        <Share2 size={16} /><span>Share</span>
      </button>
    </header>
  );
}
