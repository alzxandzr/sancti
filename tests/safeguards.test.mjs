// Source-level smoke tests for safety/citation invariants. Until Phase 0
// installs tsx, we verify that the sensitive *strings* are present in source
// rather than calling the TS functions directly. These regressions are still
// the ones that would matter most if accidentally removed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(here, rel), 'utf8');

const validatorSrc = read('../server/lib/validator.ts');
const safetySrc = read('../server/lib/safety.ts');
const citationsSrc = read('../server/lib/citations.ts');
const baseSrc = read('../server/prompts/base.ts');
const safetyPromptSrc = read('../server/prompts/safety.ts');
const classifierSrc = read('../server/prompts/classifier.ts');

test('output banlist still includes core impersonation triggers', () => {
  for (const phrase of [
    'i absolve you',
    'as your priest',
    'as your confessor',
    'as your spiritual director',
    'i am jesus',
    'i am christ',
    'i am mary',
    'i am god',
    'ego te absolvo',
    'i forgive your sins',
  ]) {
    assert.ok(validatorSrc.toLowerCase().includes(phrase),
      `validator banlist missing required term: ${phrase}`);
  }
});

test('citation schema covers all four allowed kinds', () => {
  for (const kind of ['catechism', 'scripture', 'saint_writing', 'liturgy']) {
    assert.ok(validatorSrc.includes(`"${kind}"`),
      `citationSchema missing kind literal "${kind}"`);
  }
});

test('catechism paragraph upper bound matches CCC corpus (2865)', () => {
  assert.ok(validatorSrc.includes('2865'),
    'catechism paragraph max should be 2865 (the last numbered paragraph in the CCC)');
});

test('plan day primitive is enforced (5–7 days)', () => {
  assert.ok(validatorSrc.includes('total_days'), 'devotionPlanV2 missing total_days');
  assert.ok(validatorSrc.includes('days: z.array'), 'devotionPlanV2 missing days array');
  // 5..7 day bounds.
  assert.ok(validatorSrc.includes('.min(5).max(7)'), 'plan day count range not bounded to 5..7');
});

test('safety pre-screen has heuristic crisis triggers for known phrases', () => {
  for (const phrase of [
    'i want to die',
    'kill myself',
    'end my life',
    'self harm',
    'better off dead',
    'suicidal',
  ]) {
    assert.ok(safetySrc.toLowerCase().includes(phrase),
      `heuristicSafetyScan missing crisis trigger: ${phrase}`);
  }
});

test('citation validator rejects unknown saint_id and book', () => {
  assert.ok(citationsSrc.includes('book-not-in-canon'),
    'citation validator missing scripture-book validation');
  assert.ok(citationsSrc.includes('unknown-saint'),
    'citation validator missing saint_id validation');
});

test('base system prompt enforces hard rules + citation requirement', () => {
  for (const required of [
    'Never impersonate',
    'Never simulate',
    'Never invent',
    'devotional reflection',
    'CITATIONS',
    '<user_text>',
  ]) {
    assert.ok(baseSrc.includes(required),
      `base prompt missing critical clause: ${required}`);
  }
});

test('safety pre-screen prompt defines crisis / concern / none levels', () => {
  for (const level of ['"crisis"', '"concern"', '"none"']) {
    assert.ok(safetyPromptSrc.includes(level),
      `safety pre-screen missing severity literal: ${level}`);
  }
});

test('classifier prompt enumerates all six routes', () => {
  for (const route of [
    'VOCATION_DISCERNMENT',
    'SUFFERING_HARDSHIP',
    'RELATIONSHIPS_FAMILY',
    'WORK_PURPOSE',
    'GENERAL_GUIDANCE',
    'SAFETY_REVIEW',
  ]) {
    assert.ok(classifierSrc.includes(route),
      `classifier prompt missing route: ${route}`);
  }
});

test('prompt-injection sanitizer covers role-control + chat-ML + control chars', () => {
  for (const marker of [
    'system|assistant|user|tool',
    'INST|SYS',
    'a-z_',
    'x00-',
  ]) {
    assert.ok(validatorSrc.includes(marker),
      `prompt-injection sanitizer missing pattern fragment: ${marker}`);
  }
});
