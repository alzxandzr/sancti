import test from "node:test";
import assert from "node:assert/strict";
import {
  CitationRejectedError,
  assertAllCitationsValid,
  formatCitation,
  validateCitation,
} from "../server/lib/citations";
import type { Citation } from "../server/types";

test("validateCitation accepts valid catechism in [1, 2865]", () => {
  const c: Citation = { kind: "catechism", paragraph: 1700, label: "Dignity of the human person" };
  const out = validateCitation(c);
  assert.equal(out.kind, "catechism");
});

test("validateCitation rejects catechism out of range", () => {
  assert.throws(
    () => validateCitation({ kind: "catechism", paragraph: 9999, label: "fabricated" }),
    CitationRejectedError,
  );
  assert.throws(
    () => validateCitation({ kind: "catechism", paragraph: 0, label: "zero" }),
    CitationRejectedError,
  );
});

test("validateCitation accepts canonical scripture book + verse forms", () => {
  for (const verse of ["18", "1-7", "16-22", "5"]) {
    const out = validateCitation({
      kind: "scripture",
      book: "Psalms",
      chapter: 23,
      verse,
      label: "Shepherd",
    });
    assert.equal(out.kind, "scripture");
  }
});

test("validateCitation rejects scripture book outside the canon", () => {
  assert.throws(
    () =>
      validateCitation({
        kind: "scripture",
        book: "The Gospel of Thomas",
        chapter: 1,
        verse: "1",
        label: "fabricated",
      }),
    (e: unknown) => e instanceof CitationRejectedError && e.reason === "book-not-in-canon",
  );
});

test("validateCitation rejects malformed verse", () => {
  assert.throws(
    () =>
      validateCitation({
        kind: "scripture",
        book: "Romans",
        chapter: 8,
        verse: "twenty-eight",
        label: "bad form",
      }),
    (e: unknown) => e instanceof CitationRejectedError && e.reason === "verse-shape",
  );
});

test("validateCitation accepts saint_writing only when saint_id is in corpus", () => {
  const ok = validateCitation({
    kind: "saint_writing",
    saint_id: "st-ignatius",
    title: "Spiritual Exercises",
    label: "First Principle and Foundation",
  });
  assert.equal(ok.kind, "saint_writing");

  assert.throws(
    () =>
      validateCitation({
        kind: "saint_writing",
        saint_id: "st-fabricated",
        title: "Made Up",
        label: "Fake",
      }),
    (e: unknown) => e instanceof CitationRejectedError && e.reason === "unknown-saint",
  );
});

test("validateCitation accepts liturgy from the enum only", () => {
  const ok = validateCitation({
    kind: "liturgy",
    source: "liturgy_of_the_hours",
    label: "Office of Readings",
  });
  assert.equal(ok.kind, "liturgy");

  // Invalid liturgy source -> schema-level rejection (CitationRejectedError).
  assert.throws(
    () =>
      validateCitation({
        kind: "liturgy",
        source: "made_up_book",
        label: "fake",
      }),
    CitationRejectedError,
  );
});

test("assertAllCitationsValid rejects empty arrays", () => {
  assert.throws(
    () => assertAllCitationsValid([]),
    (e: unknown) => e instanceof CitationRejectedError && e.reason === "missing",
  );
});

test("assertAllCitationsValid validates each entry", () => {
  const cs: Citation[] = [
    { kind: "catechism", paragraph: 1500, label: "Sickness" },
    { kind: "scripture", book: "Matthew", chapter: 11, verse: "28-30", label: "Come to me" },
  ];
  const out = assertAllCitationsValid(cs);
  assert.equal(out.length, 2);
});

test("validateCitation with allowedSaintIds rejects saints outside the per-call set", () => {
  const allowed = new Set(["st-ignatius"]);

  // In-set: passes.
  const ok = validateCitation(
    {
      kind: "saint_writing",
      saint_id: "st-ignatius",
      title: "Spiritual Exercises",
      label: "Suscipe",
    },
    { allowedSaintIds: allowed },
  );
  assert.equal(ok.kind, "saint_writing");

  // Exists in the global corpus but not in the per-call set: rejected.
  assert.throws(
    () =>
      validateCitation(
        {
          kind: "saint_writing",
          saint_id: "st-therese",
          title: "Story of a Soul",
          label: "Little way",
        },
        { allowedSaintIds: allowed },
      ),
    (e: unknown) => e instanceof CitationRejectedError && e.reason === "saint-not-in-allowlist",
  );
});

test("assertAllCitationsValid forwards allowedSaintIds to each item", () => {
  const allowed = new Set(["st-ignatius"]);
  assert.throws(
    () =>
      assertAllCitationsValid(
        [
          {
            kind: "scripture",
            book: "Psalms",
            chapter: 23,
            verse: "1-6",
            label: "Shepherd",
          },
          {
            kind: "saint_writing",
            saint_id: "st-therese",
            title: "Story of a Soul",
            label: "Little way",
          },
        ],
        { allowedSaintIds: allowed },
      ),
    (e: unknown) => e instanceof CitationRejectedError && e.reason === "saint-not-in-allowlist",
  );
});

test("formatCitation produces human-readable strings", () => {
  assert.equal(formatCitation({ kind: "catechism", paragraph: 1700, label: "x" }), "CCC §1700");
  assert.equal(
    formatCitation({ kind: "scripture", book: "Psalms", chapter: 23, verse: "1-6", label: "x" }),
    "Psalms 23:1-6",
  );
  assert.equal(
    formatCitation({
      kind: "saint_writing",
      saint_id: "st-ignatius",
      title: "Spiritual Exercises",
      label: "x",
    }),
    "St. Ignatius of Loyola, Spiritual Exercises",
  );
  assert.equal(
    formatCitation({ kind: "liturgy", source: "liturgy_of_the_hours", label: "x" }),
    "Liturgy of the Hours",
  );
});
