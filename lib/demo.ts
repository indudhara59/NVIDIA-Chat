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

export function getDemoResponse(prompt: string): { reasoning: string; content: string } {
  return {
    reasoning: `I’m breaking the request into its core goal, constraints, and a practical next step. For this Stage 1 demo, the response is generated locally from the prompt: “${prompt}”.`,
    content: `## A practical starting point\n\nHere’s a clear way to approach **${prompt}**:\n\n1. Define the outcome and constraints.\n2. Break the work into small, testable pieces.\n3. Build the simplest complete version first.\n4. Review, measure, and iterate.\n\n> This is a simulated response for the frontend demo. No AI API has been called.\n\n\`\`\`tsx\nexport function FirstStep() {\n  return <p>Start small, then improve with evidence.</p>;\n}\n\`\`\`\n\n| Phase | Focus |\n| --- | --- |\n| Plan | Clarify the goal |\n| Build | Create a working slice |\n| Refine | Improve quality |\n\nYou can also review the [Next.js documentation](https://nextjs.org/docs) for implementation patterns.`,
  };
}
