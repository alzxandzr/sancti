import test from 'node:test';
import assert from 'node:assert/strict';
import saints from '../data/saints.json' with { type: 'json' };
import situations from '../data/situations.json' with { type: 'json' };

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
