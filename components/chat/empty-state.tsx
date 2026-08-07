import { ArrowUpRight, Bug, ChartNoAxesCombined, Lightbulb, Orbit } from "lucide-react";
import { suggestions } from "@/lib/demo";
import { BrandMark } from "@/components/ui/brand-mark";

const icons = [ChartNoAxesCombined, Orbit, Bug, Lightbulb];

export function EmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="empty-state">
      <BrandMark className="empty-mark" />
      <h1>Nemotron Chat</h1>
      <p>Powered by NVIDIA Nemotron 3 Ultra</p>
      <div className="suggestion-grid">
        {suggestions.map((suggestion, index) => {
          const Icon = icons[index];
          return (
            <button key={suggestion.title} onClick={() => onSelect(suggestion.title)}>
              <span className="suggestion-icon"><Icon size={18} /></span>
              <span><strong>{suggestion.title}</strong><small>{suggestion.description}</small></span>
              <ArrowUpRight className="suggestion-arrow" size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
