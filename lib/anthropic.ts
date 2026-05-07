export interface AnthropicClientConfig {
  apiKey: string;
  model: string;
}

export const getAnthropicClientConfig = (): AnthropicClientConfig => {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  return {
    apiKey,
    model: "claude-3-5-sonnet-latest",
  };
};

export const generateDevotionalText = async (prompt: string): Promise<string> => {
  if (!prompt.trim()) {
    throw new Error("Prompt is required.");
  }

  return `Devotional reflection draft: ${prompt}`;
};
