import type { ChatHistoryGroup } from "@/lib/types";

export const suggestions = [
  { title: "Build a React dashboard", description: "Plan components and data flow" },
  { title: "Explain quantum computing", description: "Make a complex idea feel simple" },
  { title: "Help me debug some code", description: "Find the issue step by step" },
  { title: "Create a startup launch plan", description: "Turn an idea into milestones" },
];

export const chatHistory: ChatHistoryGroup[] = [
  {
    label: "Today",
    chats: [
      { id: "design-system", title: "Design system planning" },
      { id: "api-patterns", title: "API architecture patterns" },
    ],
  },
  {
    label: "Previous 7 Days",
    chats: [
      { id: "typescript", title: "TypeScript generics" },
      { id: "launch", title: "Product launch checklist" },
      { id: "database", title: "Database schema review" },
    ],
  },
];
