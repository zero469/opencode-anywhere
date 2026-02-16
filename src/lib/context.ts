import type { SessionMessage, ProvidersResponse } from "@/types";

export interface ContextUsage {
  tokens: number;
  percentage: number | null;
  formatted: string;
}

export function calculateContextUsage(
  messages: SessionMessage[],
  providers: ProvidersResponse | null
): ContextUsage | null {
  const lastAssistant = [...messages].reverse().find(
    (m) => m.info.role === "assistant" && m.info.tokens && m.info.tokens.output > 0
  );

  if (!lastAssistant || !lastAssistant.info.tokens) return null;

  const tokens = lastAssistant.info.tokens;
  const total =
    tokens.input +
    tokens.output +
    tokens.reasoning +
    tokens.cache.read +
    tokens.cache.write;

  let percentage: number | null = null;
  if (providers && lastAssistant.info.providerID && lastAssistant.info.modelID) {
    const provider = providers.all.find((p) => p.id === lastAssistant.info.providerID);
    const modelID = lastAssistant.info.modelID;
    const model = provider 
      ? (provider.models[modelID] || Object.values(provider.models).find(m => m.id === modelID))
      : undefined;
    if (model?.limit?.context) {
      percentage = Math.round((total / model.limit.context) * 100);
    }
  }

  return {
    tokens: total,
    percentage,
    formatted: total.toLocaleString(),
  };
}
