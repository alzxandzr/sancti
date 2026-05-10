import saintsData from "../data/saints.json";
import scriptureBooks from "../data/scripture_books.json";
import { citationSchema } from "./validator";
import type { Citation, Saint } from "../types";

const saints = saintsData as Saint[];
const saintIds: ReadonlySet<string> = new Set(saints.map((s) => s.id));
const allBooks: ReadonlySet<string> = new Set([
  ...scriptureBooks.old_testament,
  ...scriptureBooks.new_testament,
]);

export class CitationRejectedError extends Error {
  constructor(
    message: string,
    public readonly citation: unknown,
    public readonly reason: string,
  ) {
    super(message);
    this.name = "CitationRejectedError";
  }
}

const verseShape = new RegExp("^[0-9]{1,3}(?:[a-c])?(?:[–-][0-9]{1,3}(?:[a-c])?)?(?:,\\s?[0-9]{1,3}(?:[a-c])?(?:[–-][0-9]{1,3}(?:[a-c])?)?)*$");

export const validateCitation = (input: unknown): Citation => {
  const parsed = citationSchema.safeParse(input);
  if (!parsed.success) {
    throw new CitationRejectedError(
      "Citation failed schema validation.",
      input,
      parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
    );
  }
  const c = parsed.data;
  switch (c.kind) {
    case "catechism":
      // Range already enforced by schema (1..2865).
      return c;
    case "scripture":
      if (!allBooks.has(c.book)) {
        throw new CitationRejectedError(
          `Scripture citation references unknown book "${c.book}".`,
          c,
          "book-not-in-canon",
        );
      }
      if (!verseShape.test(c.verse)) {
        throw new CitationRejectedError(
          `Scripture citation has malformed verse "${c.verse}".`,
          c,
          "verse-shape",
        );
      }
      return c;
    case "saint_writing":
      if (!saintIds.has(c.saint_id)) {
        throw new CitationRejectedError(
          `Saint writing citation references unknown saint_id "${c.saint_id}".`,
          c,
          "unknown-saint",
        );
      }
      return c;
    case "liturgy":
      // Enum already enforced by schema.
      return c;
  }
};

export const assertAllCitationsValid = (citations: ReadonlyArray<unknown>): Citation[] => {
  if (citations.length === 0) {
    throw new CitationRejectedError(
      "At least one citation is required for every devotional prompt.",
      citations,
      "missing",
    );
  }
  return citations.map(validateCitation);
};

export const formatCitation = (c: Citation): string => {
  switch (c.kind) {
    case "catechism":
      return `CCC §${c.paragraph}`;
    case "scripture":
      return `${c.book} ${c.chapter}:${c.verse}`;
    case "saint_writing": {
      const saint = saints.find((s) => s.id === c.saint_id);
      const saintName = saint ? saint.name : c.saint_id;
      return `${saintName}, ${c.title}`;
    }
    case "liturgy":
      return c.source === "liturgy_of_the_hours" ? "Liturgy of the Hours" : "Roman Missal";
  }
};
