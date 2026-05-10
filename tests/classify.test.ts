import test from "node:test";
import assert from "node:assert/strict";
import { classifyInput } from "../api/classify";
import { installFakeAnthropic, okJsonResponse, resetFakeAnthropic } from "./_helpers";

test("classifyInput short-circuits to SAFETY_REVIEW on heuristic crisis without calling the LLM", async (t) => {
  const handle = installFakeAnthropic(() =>
    okJsonResponse({ severity: "none", categories: [], reason: "ok" }),
  );
  t.after(resetFakeAnthropic);

  const out = await classifyInput("I want to end my life. I can't keep going.");

  assert.equal(out.classification.primary_route, "SAFETY_REVIEW");
  assert.equal(out.short_circuited, true);
  assert.equal(out.safety.severity, "crisis");
  assert.equal(handle.callCount(), 0, "no LLM call for heuristic crisis");
});

test("classifyInput short-circuits to SAFETY_REVIEW when LLM pre-screen says concern", async (t) => {
  // Per prompts/safety.ts, concern means "a devotional plan alone would be
  // irresponsible without first surfacing crisis resources" (e.g., active
  // domestic violence). Both crisis AND concern must short-circuit.
  const handle = installFakeAnthropic((params, i) => {
    if (i === 0) {
      return okJsonResponse({
        severity: "concern",
        categories: ["abuse_or_violence"],
        reason: "user reports current domestic violence",
      });
    }
    return okJsonResponse({});
  });
  t.after(resetFakeAnthropic);

  const out = await classifyInput(
    "My partner has been hitting me again and I don't know what to do. Should I just keep praying?",
  );

  assert.equal(out.classification.primary_route, "SAFETY_REVIEW");
  assert.equal(out.short_circuited, true);
  assert.equal(out.safety.severity, "concern");
  assert.equal(handle.callCount(), 1, "classifier never called when concern short-circuits");
});

test("classifyInput escalates to SAFETY_REVIEW when LLM pre-screen says crisis", async (t) => {
  const handle = installFakeAnthropic((params, i) => {
    if (i === 0) {
      return okJsonResponse({
        severity: "crisis",
        categories: ["self_harm_or_suicide"],
        reason: "user describes wanting to disappear permanently",
      });
    }
    return okJsonResponse({});
  });
  t.after(resetFakeAnthropic);

  // Phrasing that the heuristic does NOT match but the LLM should.
  const out = await classifyInput(
    "I just want everything to stop forever and never come back. Done with all of it.",
  );

  assert.equal(out.classification.primary_route, "SAFETY_REVIEW");
  assert.equal(out.short_circuited, true);
  assert.equal(out.safety.severity, "crisis");
  // pre-screen call only; classifier call short-circuited.
  assert.equal(handle.callCount(), 1);
});

test("classifyInput proceeds to classifier when pre-screen is none", async (t) => {
  const handle = installFakeAnthropic((params, i) => {
    if (i === 0) return okJsonResponse({ severity: "none", categories: [], reason: "ok" });
    return okJsonResponse({
      primary_route: "SUFFERING_HARDSHIP",
      secondary_route: null,
      confidence: 0.82,
      themes: ["grief", "father"],
      needs_clarification: false,
    });
  });
  t.after(resetFakeAnthropic);

  const out = await classifyInput("I am grieving the death of my father.");

  assert.equal(out.classification.primary_route, "SUFFERING_HARDSHIP");
  assert.equal(out.short_circuited, false);
  assert.equal(out.used_fallback, false);
  assert.equal(handle.callCount(), 2, "pre-screen + classifier called");
});

test("classifyInput falls back to keyword classifier when LLM fails", async (t) => {
  installFakeAnthropic((params, i) => {
    if (i === 0) return okJsonResponse({ severity: "none", categories: [], reason: "ok" });
    // Subsequent calls return garbage that fails schema, exhausting retries.
    return { content: [{ type: "text" as const, text: "not json" }], usage: { input_tokens: 10, output_tokens: 5 } };
  });
  t.after(resetFakeAnthropic);

  const out = await classifyInput("My career feels meaningless and I am burned out.");
  assert.equal(out.used_fallback, true);
  assert.equal(out.classification.primary_route, "WORK_PURPOSE");
});

test("classifyInput with skipLLM uses keyword fallback directly", async () => {
  const out = await classifyInput("I'm trying to discern my vocation between marriage and religious life.", {
    skipLLM: true,
  });
  assert.equal(out.classification.primary_route, "VOCATION_DISCERNMENT");
  assert.equal(out.used_fallback, true);
  assert.equal(out.short_circuited, false);
});
