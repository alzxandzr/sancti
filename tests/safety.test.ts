import test from "node:test";
import assert from "node:assert/strict";
import { crisisResourcesForLocale, heuristicSafetyScan } from "../server/lib/safety";

test("heuristicSafetyScan reason field never includes the verbatim user phrase", () => {
  // PII: heuristic reason flows into recordSafetyEvent and is logged/persisted.
  // It must be a category code, never the matched substring.
  const crisis = heuristicSafetyScan("I want to die. I have a plan.");
  assert.equal(crisis.severity, "crisis");
  assert.ok(!/want to die/i.test(crisis.reason), "must not echo user phrase");
  assert.match(crisis.reason, /^heuristic_match_/);

  const concern = heuristicSafetyScan("My husband is abusive and I'm scared.");
  assert.equal(concern.severity, "concern");
  assert.ok(!/abusive/i.test(concern.reason), "must not echo user phrase");
  assert.match(concern.reason, /^heuristic_match_/);

  const none = heuristicSafetyScan("I am thinking about a career change.");
  assert.equal(none.severity, "none");
  assert.equal(none.reason, "no_heuristic_match");
});

test("crisisResourcesForLocale appends INT to every regional match", () => {
  // Regression: previously a recognized non-US locale (e.g. en-GB) returned
  // ONLY regional resources, dropping the international "dial your country's
  // emergency number" + "trusted priest" guidance that lives under region INT.
  // Result: non-US users got fewer resources than users with no locale at all.
  const ukResources = crisisResourcesForLocale("en-GB");
  assert.ok(
    ukResources.some((r) => r.region === "GB"),
    "GB locale should include GB-specific resources",
  );
  assert.ok(
    ukResources.some((r) => r.region === "INT"),
    "GB locale must also include INT international fallback",
  );
});

test("crisisResourcesForLocale returns US + INT when no locale provided", () => {
  const noLocale = crisisResourcesForLocale(null);
  assert.ok(noLocale.some((r) => r.region === "US"), "no-locale fallback includes US");
  assert.ok(noLocale.some((r) => r.region === "INT"), "no-locale fallback includes INT");
});

test("crisisResourcesForLocale returns US + INT for an unrecognized locale", () => {
  // "xx-ZZ" — region ZZ not in the directory; falls back to US + INT.
  const fallback = crisisResourcesForLocale("xx-ZZ");
  assert.ok(fallback.some((r) => r.region === "US"));
  assert.ok(fallback.some((r) => r.region === "INT"));
  assert.ok(!fallback.some((r) => r.region === "ZZ"), "no fake region leaks through");
});

test("crisisResourcesForLocale accepts en_US, en-US, EN, US locale formats", () => {
  for (const loc of ["en-US", "en_US", "US", "us"]) {
    const out = crisisResourcesForLocale(loc);
    assert.ok(out.some((r) => r.region === "US"), `loc=${loc} should match US`);
    assert.ok(out.some((r) => r.region === "INT"), `loc=${loc} should include INT`);
  }
});
