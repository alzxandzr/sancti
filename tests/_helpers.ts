// Shared test helpers for the LLM / handler tests.
// Builds a minimal fake Gemini client compatible with the surface our
// `callJSON` actually uses: client.models.generateContent() returning
// { text, usageMetadata } (or the candidate-array form).

import { __setLlmForTest, type LlmClient } from "../lib/llm";
import { __resetEnvCache } from "../lib/env";

/** Satisfies `isLlmConfigured()` so routes enter the LLM branches while the SDK is stubbed. */
const DUMMY_GEMINI_KEY_FOR_TESTS = "AIzaSy_test_dummy_key_for_unit_tests_only";

let injectedDummyKey = false;

export interface FakeResponse {
  text?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
}

export type FakeResponder = (params: unknown, callIndex: number) => FakeResponse;

export interface FakeClientHandle {
  client: LlmClient;
  callCount: () => number;
  lastParams: () => unknown;
  allParams: () => unknown[];
}

/**
 * Build a fake Gemini client that returns canned responses produced by
 * `responder`. `responder` is called with the raw generateContent() params
 * and the 0-indexed call number (so tests can return different shapes per
 * attempt).
 */
export const installFakeLlm = (responder: FakeResponder): FakeClientHandle => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length < 20) {
    process.env.GEMINI_API_KEY = DUMMY_GEMINI_KEY_FOR_TESTS;
    injectedDummyKey = true;
    __resetEnvCache();
  }

  let calls = 0;
  const seen: unknown[] = [];

  const client: LlmClient = {
    models: {
      generateContent: async (params) => {
        const index = calls;
        calls += 1;
        seen.push(params);
        return responder(params, index);
      },
    },
  };

  __setLlmForTest(client, {
    classify: "test-flash",
    safety: "test-flash",
    plan: "test-flash",
    planFallback: "test-flash-lite",
  });

  return {
    client,
    callCount: () => calls,
    lastParams: () => seen[seen.length - 1],
    allParams: () => seen,
  };
};

export const resetFakeLlm = (): void => {
  __setLlmForTest(null, null);
  if (injectedDummyKey) {
    delete process.env.GEMINI_API_KEY;
    injectedDummyKey = false;
  }
  __resetEnvCache();
};

/**
 * Convenience: respond with valid JSON for the requested kind.
 * Reusable across classify and plan tests.
 */
export const okJsonResponse = (json: unknown): FakeResponse => ({
  text: JSON.stringify(json),
  usageMetadata: {
    promptTokenCount: 180, // includes cached portion
    candidatesTokenCount: 50,
    cachedContentTokenCount: 80,
  },
});

export const rawTextResponse = (text: string): FakeResponse => ({
  text,
  usageMetadata: {
    promptTokenCount: 100,
    candidatesTokenCount: 50,
    cachedContentTokenCount: 0,
  },
});
