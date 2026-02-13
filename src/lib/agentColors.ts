const AGENT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getAgentColor(
  agentName: string | undefined,
  agents: Array<{ name: string; color?: string }>
): string {
  if (!agentName) return AGENT_COLORS[0];

  const agent = agents.find(a => a.name === agentName);
  if (agent?.color) return agent.color;

  const index = hashString(agentName) % AGENT_COLORS.length;
  return AGENT_COLORS[index];
}

export function capitalizeAgentName(name: string | null | undefined): string {
  if (!name) return "Default";
  // Capitalize first letter of each word (e.g., "atlas" -> "Atlas", "my-agent" -> "My-Agent")
  return name.replace(/\b\w/g, char => char.toUpperCase());
}

export { AGENT_COLORS };
