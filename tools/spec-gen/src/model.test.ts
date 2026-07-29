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
  contracts: [
    {
      id: "example",
      typeName: "Example",
      schemaId: "urn:voidtrace:schema:example:1.0.0",
      version: "1.0.0",
      description: "test contract",
      root: {
        kind: "object",
        fields: [
          {
            name: "kind",
            description: "discriminator",
            required: true,
            schema: {
              kind: "literal",
              value: "example",
            },
          },
        ],
      },
    },
  ],
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

  it("rejects unhandled top-level and Clause fields", () => {
    expect(() =>
      validateSpecDocument({
        ...validSpec,
        futureSection: [],
      }),
    ).toThrow("Unknown specification key at root: futureSection");

    expect(() =>
      validateSpecDocument({
        ...validSpec,
        clauses: [
          {
            ...validClause,
            futureConstraint: true,
          },
        ],
      }),
    ).toThrow("Unknown specification key at clauses[0]: futureConstraint");
  });

  it("rejects active machine-verified Clauses without an independent oracle", () => {
    expect(() =>
      validateSpecDocument({
        ...validSpec,
        clauses: [
          {
            ...validClause,
            pattern: "unsupported_mechanic_rejected",
            maturity: "active",
          },
        ],
      }),
    ).toThrow("Clause ENG-001 cannot be active");
  });

  it("accepts active machine-verified Clauses with registered independent oracles", () => {
    expect(
      validateSpecDocument({
        ...validSpec,
        clauses: [
          {
            ...validClause,
            pattern: "event_time_monotonic",
            maturity: "active",
          },
        ],
      }).clauses[0]?.maturity,
    ).toBe("active");
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
