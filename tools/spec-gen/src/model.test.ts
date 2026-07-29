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
  ruleset: {
    id: "ruleset.test",
    version: "0.1.0",
    revision: 0,
    gameBuild: "test-build",
    rules: [
      {
        id: "rule.damage.copy",
        description: "copy test damage",
        phase: "damage.construct",
        eventKind: "damage.direct",
        reads: ["attack.base-damage"],
        writes: ["event.damage"],
        operation: {
          kind: "damage-vector.copy",
        },
        evidenceStatus: "experimental",
        evidenceIds: [],
      },
    ],
  },
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
            pattern: "scope_boundary",
            guarantee: "property-tested",
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

    expect(
      validateSpecDocument({
        ...validSpec,
        clauses: [
          {
            ...validClause,
            pattern: "critical_tier_probability_sum",
            maturity: "active",
            area: "mechanics",
          },
        ],
      }).clauses[0]?.maturity,
    ).toBe("active");
  });

  it("accepts the finite binary Critical roll phase and operation", () => {
    const binaryRule = {
      ...validSpec.ruleset.rules[0],
      id: "rule.critical.resolve-binary-roll",
      phase: "critical.roll",
      reads: ["attack.critical-chance", "event.critical-roll"],
      writes: [
        "event.critical-tier",
        "event.critical-tier-0-probability",
        "event.critical-tier-1-probability",
      ],
      operation: {
        kind: "critical-tier.resolve-binary-roll",
      },
    };

    expect(
      validateSpecDocument({
        ...validSpec,
        ruleset: {
          ...validSpec.ruleset,
          rules: [validSpec.ruleset.rules[0], binaryRule],
        },
      }).ruleset.rules[1],
    ).toEqual(binaryRule);
  });

  it.each([-1, 0.5, "1"])("rejects invalid Ruleset revision %s", (revision) => {
    expect(() =>
      validateSpecDocument({
        ...validSpec,
        ruleset: {
          ...validSpec.ruleset,
          revision,
        },
      }),
    ).toThrow("Invalid specification value at ruleset.revision");
  });

  it("accepts the finite active CLI vocabulary with registered independent oracles", () => {
    const patterns = [
      "cli_command_output_selection",
      "cli_deterministic_json",
      "cli_stream_exit_discipline",
      "cli_alias_equivalence",
      "cli_application_boundary",
      "cli_input_surface",
    ] as const;
    const clauses = patterns.map((pattern, index) => ({
      ...validClause,
      id: `CLI-00${index + 1}`,
      pattern,
      guarantee: "example-tested",
      maturity: "active",
      area: "cli",
    }));

    expect(
      validateSpecDocument({
        ...validSpec,
        clauses,
      }).clauses,
    ).toEqual(clauses);
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

  it("rejects unknown Rule operations and out-of-order phases", () => {
    expect(() =>
      validateSpecDocument({
        ...validSpec,
        ruleset: {
          ...validSpec.ruleset,
          rules: [
            {
              ...validSpec.ruleset.rules[0],
              operation: {
                kind: "run-javascript",
              },
            },
          ],
        },
      }),
    ).toThrow("Unknown Rule operation");

    expect(() =>
      validateSpecDocument({
        ...validSpec,
        ruleset: {
          ...validSpec.ruleset,
          rules: [
            {
              ...validSpec.ruleset.rules[0],
              id: "rule.armor",
              phase: "target.mitigate",
            },
            validSpec.ruleset.rules[0],
          ],
        },
      }),
    ).toThrow("ordered by execution phase");
  });
});
