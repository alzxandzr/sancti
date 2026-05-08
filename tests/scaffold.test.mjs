import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const saints = JSON.parse(readFileSync(resolve(here, '../data/saints.json'), 'utf8'));
const situations = JSON.parse(readFileSync(resolve(here, '../data/situations.json'), 'utf8'));

test('seed data meets minimum counts', () => {
  assert.ok(Array.isArray(saints));
  assert.ok(Array.isArray(situations));
  assert.ok(saints.length >= 20, 'saints.json must include at least 20 saints');
  assert.ok(situations.length >= 25, 'situations.json must include at least 25 situations');
});

test('saints include required starter names', () => {
  const names = new Set(saints.map((saint) => saint.name));
  [
    'St. Joseph',
    'St. Monica',
    'St. Augustine',
    'St. Thérèse of Lisieux',
    'St. Ignatius of Loyola',
    'Bl. Carlo Acutis',
  ].forEach((name) => assert.ok(names.has(name), `missing ${name}`));
});
