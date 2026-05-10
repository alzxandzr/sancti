// Shared test helpers for the LLM / handler tests.
// Builds a minimal fake Anthropic client compatible with the surface our
// `callJSON` actually uses: client.messages.create() returning { content, usage }.

import type Anthropic from "@anthropic-ai/sdk";
import { __setAnthropicForTest } from "../lib/anthropic";

export interface FakeMessage {
  content: Array<{ type: "text"; text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export type FakeResponder = (params: unknown, callIndex: number) => FakeMessage;

export interface FakeClientHandle {
  client: Anthropic;
  callCount: () => number;
  lastParams: () => unknown;
  allParams: () => unknown[];
}

/**
 * Build a fake Anthropic client that returns canned responses produced by
 * `responder`. `responder` is called with the raw create() params and the
 * 0-indexed call number (so tests can return different shapes per attempt).
 */
export const installFakeAnthropic = (responder: FakeResponder): FakeClientHandle => {
  let calls = 0;
  const seen: unknown[] = [];

  const client = {
    messages: {
      create: async (params: unknown) => {
        const index = calls;
        calls += 1;
        seen.push(params);
        return responder(params, index);
      },
    },
  } as unknown as Anthropic;

  __setAnthropicForTest(client, {
    classify: "test-haiku",
    safety: "test-haiku",
    plan: "test-sonnet",
  });

  return {
    client,
    callCount: () => calls,
    lastParams: () => seen[seen.length - 1],
    allParams: () => seen,
  };
};

export const resetFakeAnthropic = (): void => {
  __setAnthropicForTest(null, null);
};

/**
 * Convenience: respond with valid JSON for the requested kind.
 * Reusable across classify and plan tests.
 */
export const okJsonResponse = (json: unknown): FakeMessage => ({
  content: [{ type: "text", text: JSON.stringify(json) }],
  usage: {
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 80,
    cache_creation_input_tokens: 0,
  },
});

export const rawTextResponse = (text: string): FakeMessage => ({
  content: [{ type: "text", text }],
  usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
});
