// Data-corpus integrity tests. Until Phase 0 wires a TS-aware test runner,
// these run via `node --test` against the JSON files directly so we still
// catch the highest-leverage regressions on every commit.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(here, rel), 'utf8'));

const saints = load('../data/saints.json');
const mappings = load('../data/mappings.json');
const situations = load('../data/situations.json');
const crisis = load('../data/crisis_resources.json');
const scripture = load('../data/scripture_books.json');

const ROUTES = [
  'VOCATION_DISCERNMENT',
  'SUFFERING_HARDSHIP',
  'RELATIONSHIPS_FAMILY',
  'WORK_PURPOSE',
  'GENERAL_GUIDANCE',
  'SAFETY_REVIEW',
];

test('every mapping references an existing saint', () => {
  const ids = new Set(saints.map((s) => s.id));
  for (const m of mappings) {
    assert.ok(ids.has(m.saint_id), `mapping references unknown saint_id: ${m.saint_id}`);
    assert.ok(ROUTES.includes(m.route), `mapping has invalid route: ${m.route}`);
    assert.ok(Array.isArray(m.themes) && m.themes.length > 0, `mapping has empty themes`);
    assert.ok(typeof m.weight === 'number' && m.weight >= 0 && m.weight <= 100,
      `mapping has invalid weight: ${m.weight}`);
  }
});

test('every route has at least 3 mapped saints (so match-saints can return 3)', () => {
  for (const route of ROUTES) {
    const count = mappings.filter((m) => m.route === route).length;
    assert.ok(count >= 3, `${route} has only ${count} mapped saints, need ≥3`);
  }
});

test('every saint has all required fields populated', () => {
  for (const saint of saints) {
    assert.ok(typeof saint.id === 'string' && saint.id.length > 0, `saint missing id`);
    assert.ok(typeof saint.name === 'string' && saint.name.length > 0, `${saint.id} missing name`);
    assert.ok(typeof saint.feast_day === 'string', `${saint.id} missing feast_day`);
    assert.ok(typeof saint.short_bio === 'string' && saint.short_bio.length >= 40,
      `${saint.id} bio too short`);
    assert.ok(Array.isArray(saint.themes) && saint.themes.length > 0,
      `${saint.id} has no themes`);
    assert.ok(Array.isArray(saint.source_links) && saint.source_links.length >= 1,
      `${saint.id} missing source_links`);
    for (const url of saint.source_links) {
      assert.ok(/^https?:\/\//.test(url), `${saint.id} has non-URL source: ${url}`);
    }
  }
});

test('saint ids are unique', () => {
  const ids = saints.map((s) => s.id);
  const set = new Set(ids);
  assert.equal(set.size, ids.length, `duplicate saint id detected`);
});

test('situations have valid categories', () => {
  for (const sit of situations) {
    assert.ok(ROUTES.includes(sit.category), `situation ${sit.id} has invalid category: ${sit.category}`);
    assert.ok(typeof sit.label === 'string' && sit.label.length > 0, `situation ${sit.id} missing label`);
  }
});

test('crisis_resources covers core regions and includes an international fallback', () => {
  const regions = new Set(crisis.map((r) => r.region));
  assert.ok(regions.has('US'), 'crisis_resources missing US entries');
  assert.ok(regions.has('INT'), 'crisis_resources missing INT (international fallback) entries');
  for (const r of crisis) {
    assert.ok(typeof r.contact === 'string' && r.contact.length > 0,
      `crisis resource missing contact: ${r.name}`);
    assert.ok(typeof r.hours === 'string' && r.hours.length > 0,
      `crisis resource missing hours: ${r.name}`);
  }
});

test('scripture books cover the full Catholic canon (73 books)', () => {
  const all = [...scripture.old_testament, ...scripture.new_testament];
  // Catholic canon is 73 books (46 OT + 27 NT). Allow flexibility for split books
  // but assert a reasonable lower bound and presence of key books.
  assert.ok(all.length >= 73, `expected ≥73 books, got ${all.length}`);
  for (const required of ['Genesis', 'Exodus', 'Psalms', 'Isaiah', 'Matthew', 'John', 'Romans', 'Revelation', 'Tobit', 'Wisdom']) {
    assert.ok(all.includes(required), `scripture canon missing: ${required}`);
  }
});

test('mapped saint themes are lowercase + hyphen format', () => {
  for (const m of mappings) {
    for (const t of m.themes) {
      assert.ok(typeof t === 'string' && /^[a-z0-9-]+$/.test(t),
        `mapping theme not in canonical kebab-case: "${t}" (saint=${m.saint_id})`);
    }
  }
});
