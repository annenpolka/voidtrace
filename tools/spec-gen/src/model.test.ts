import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validateSpecDocument } from "./model.ts";

const validClause = {
  id: "ENG-001",
  pattern: "deterministic_replay",
  desc: "same inputs replay identically",
  guarantee: "property-tested",
  maturity: "planned",
  area: "kernel",
};

const validSpec = {
  title: "VoidTrace test specification",
  schemaVersion: "0.1.0",
  clauses: [validClause],
};

describe("validateSpecDocument", () => {
  it("accepts and canonicalizes a valid specification", () => {
    expect(validateSpecDocument(validSpec)).toEqual(validSpec);
  });

  it("rejects duplicate Clause IDs", () => {
    expect(() =>
      validateSpecDocument({
        ...validSpec,
        clauses: [validClause, validClause],
      }),
    ).toThrow("Duplicate Clause ID: ENG-001");
  });

  it("rejects an unknown finite-vocabulary pattern", () => {
    expect(() =>
      validateSpecDocument({
        ...validSpec,
        clauses: [
          {
            ...validClause,
            pattern: "free_form_assertion",
          },
        ],
      }),
    ).toThrow("Unknown value at clauses[0].pattern");
  });

  it("rejects active machine-verified Clauses without an independent oracle", () => {
    expect(() =>
      validateSpecDocument({
        ...validSpec,
        clauses: [
          {
            ...validClause,
            maturity: "active",
          },
        ],
      }),
    ).toThrow("Clause ENG-001 cannot be active");
  });

  it("canonicalizes arbitrary unique Clause order", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 999 }), { minLength: 1 }), (numbers) => {
        const clauses = numbers.map((number) => ({
          ...validClause,
          id: `ENG-${number.toString().padStart(3, "0")}`,
        }));
        const actual = validateSpecDocument({
          ...validSpec,
          clauses,
        }).clauses.map((clause) => clause.id);
        expect(actual).toEqual([...actual].toSorted());
      }),
    );
  });
});
