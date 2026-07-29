import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseContracts } from "./contract-model.ts";

function stringNode(): Record<string, unknown> {
  return {
    kind: "string",
    pattern: null,
    values: null,
    minLength: 1,
  };
}

function contract(id: string, target?: string): Record<string, unknown> {
  return {
    id,
    typeName: id
      .split("-")
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(""),
    schemaId: `urn:voidtrace:schema:${id}:1.0.0`,
    version: "1.0.0",
    description: `${id} contract`,
    root: {
      kind: "object",
      fields: [
        {
          name: "value",
          description: "test value",
          required: true,
          schema: target ? { kind: "ref", target, expectedKind: null } : stringNode(),
        },
      ],
    },
  };
}

function firstField(definition: Record<string, unknown>): Record<string, unknown> {
  const root = definition.root as { fields?: unknown[] };
  const field = root.fields?.[0];
  if (typeof field !== "object" || field === null || Array.isArray(field)) {
    throw new Error("test fixture is missing a field");
  }
  return field as Record<string, unknown>;
}

describe("parseContracts", () => {
  it("sorts valid Contracts and resolves cross-schema references", () => {
    expect(parseContracts([contract("second", "first"), contract("first")])).toMatchObject([
      { id: "first" },
      { id: "second" },
    ]);
  });

  it("rejects duplicate IDs and unresolved references", () => {
    expect(() => parseContracts([contract("same"), contract("same")])).toThrow(
      "Duplicate Contract ID: same",
    );
    expect(() => parseContracts([contract("orphan", "missing")])).toThrow(
      "references unknown Contract: missing",
    );
  });

  it("rejects invalid regular expressions and inverted bounds", () => {
    const invalidPattern = contract("pattern");
    const patternSchema = firstField(invalidPattern).schema as Record<string, unknown>;
    patternSchema.pattern = "[";
    expect(() => parseContracts([invalidPattern])).toThrow("Invalid regular expression");

    const invalidBounds = contract("bounds");
    firstField(invalidBounds).schema = {
      kind: "integer",
      minimum: 10,
      maximum: 1,
    };
    expect(() => parseContracts([invalidBounds])).toThrow("Minimum exceeds maximum");
  });

  it("validates regular expressions and enum lengths with Unicode semantics", () => {
    const unicode = contract("unicode");
    firstField(unicode).schema = {
      kind: "string",
      pattern: "^.$",
      values: ["😀"],
      minLength: 1,
    };
    expect(parseContracts([unicode])).toHaveLength(1);

    const invalidUnicodeLength = structuredClone(unicode);
    (firstField(invalidUnicodeLength).schema as Record<string, unknown>).minLength = 2;
    expect(() => parseContracts([invalidUnicodeLength])).toThrow(
      "String enum at contracts[0].root.fields[0].schema.values violates",
    );

    const legacyOnlyPattern = contract("legacy-pattern");
    (firstField(legacyOnlyPattern).schema as Record<string, unknown>).pattern = "\\8";
    expect(() => parseContracts([legacyOnlyPattern])).toThrow("Invalid regular expression");
  });

  it("rejects unsafe integer bounds and integer literals", () => {
    const unsafeBound = contract("unsafe-bound");
    firstField(unsafeBound).schema = {
      kind: "integer",
      minimum: Number.MAX_SAFE_INTEGER + 1,
      maximum: null,
    };
    expect(() => parseContracts([unsafeBound])).toThrow("expected safe integer");

    const unsafeNumberBound = contract("unsafe-number-bound");
    firstField(unsafeNumberBound).schema = {
      kind: "number",
      minimum: Number.MAX_SAFE_INTEGER + 1,
      maximum: null,
    };
    expect(() => parseContracts([unsafeNumberBound])).toThrow(
      "finite number with safe integer values",
    );

    const unsafeArrayBound = contract("unsafe-array-bound");
    firstField(unsafeArrayBound).schema = {
      kind: "array",
      items: stringNode(),
      minItems: Number.MAX_SAFE_INTEGER + 1,
      maxItems: null,
    };
    expect(() => parseContracts([unsafeArrayBound])).toThrow("expected safe integer");

    const unsafeLiteral = contract("unsafe-literal");
    firstField(unsafeLiteral).schema = {
      kind: "literal",
      value: Number.MAX_SAFE_INTEGER + 1,
    };
    expect(() => parseContracts([unsafeLiteral])).toThrow("expected safe integer");
  });

  it("parses Artifact kind refinements and record key schemas", () => {
    const artifactRef = contract("artifact-ref");
    const consumer = contract("consumer");
    firstField(consumer).schema = {
      kind: "object",
      fields: [
        {
          name: "scenarioRef",
          description: "typed artifact reference",
          required: true,
          schema: {
            kind: "ref",
            target: "artifact-ref",
            expectedKind: "voidtrace.scenario",
          },
        },
        {
          name: "metrics",
          description: "stable metric map",
          required: true,
          schema: {
            kind: "record",
            values: {
              kind: "number",
              minimum: null,
              maximum: null,
            },
            keySchema: {
              kind: "string",
              pattern: "^[a-z][a-z0-9.-]*$",
              values: null,
              minLength: 1,
            },
          },
        },
      ],
    };

    expect(parseContracts([consumer, artifactRef])).toMatchObject([
      { id: "artifact-ref" },
      {
        id: "consumer",
        root: {
          fields: [
            {
              schema: {
                fields: [
                  {
                    schema: {
                      expectedKind: "voidtrace.scenario",
                    },
                  },
                  {
                    schema: {
                      keySchema: {
                        pattern: "^[a-z][a-z0-9.-]*$",
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);

    const wrongTarget = contract("wrong-target", "consumer");
    (firstField(wrongTarget).schema as Record<string, unknown>).expectedKind = "voidtrace.scenario";
    expect(() => parseContracts([artifactRef, consumer, wrongTarget])).toThrow(
      "requires target artifact-ref",
    );

    const invalidKeySchema = contract("invalid-key-schema");
    firstField(invalidKeySchema).schema = {
      kind: "record",
      values: stringNode(),
      keySchema: {
        kind: "number",
        minimum: null,
        maximum: null,
      },
    };
    expect(() => parseContracts([invalidKeySchema])).toThrow("must be a string node");
  });

  it("rejects unknown keys on Contracts, Fields, and every node kind", () => {
    const unknownContractKey = {
      ...contract("unknown-contract"),
      unexpected: true,
    };
    expect(() => parseContracts([unknownContractKey])).toThrow(
      "Unknown contract key at contracts[0]: unexpected",
    );

    const unknownFieldKey = contract("unknown-field");
    firstField(unknownFieldKey).unexpected = true;
    expect(() => parseContracts([unknownFieldKey])).toThrow(
      "Unknown contract key at contracts[0].root.fields[0]: unexpected",
    );

    const nodeFixtures: Array<[string, Record<string, unknown>, Record<string, unknown>[]]> = [
      ["string", stringNode(), []],
      ["integer", { kind: "integer", minimum: null, maximum: null }, []],
      ["number", { kind: "number", minimum: null, maximum: null }, []],
      ["boolean", { kind: "boolean" }, []],
      ["null", { kind: "null" }, []],
      ["literal", { kind: "literal", value: "value" }, []],
      ["array", { kind: "array", items: stringNode(), minItems: null, maxItems: null }, []],
      ["record", { kind: "record", values: stringNode(), keySchema: null }, []],
      ["object", { kind: "object", fields: [] }, []],
      ["ref", { kind: "ref", target: "referenced", expectedKind: null }, [contract("referenced")]],
      ["union", { kind: "union", variants: [stringNode(), stringNode()] }, []],
    ];

    for (const [name, node, dependencies] of nodeFixtures) {
      const definition = contract(`unknown-${name}`);
      firstField(definition).schema = {
        ...node,
        unexpected: true,
      };
      expect(() => parseContracts([...dependencies, definition]), `node kind ${name}`).toThrow(
        "Unknown contract key",
      );
    }
  });

  it("canonicalizes arbitrary unique Contract order", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 999 }), { minLength: 1 }), (numbers) => {
        const contracts = numbers.map((number) =>
          contract(`contract-${number.toString().padStart(3, "0")}`),
        );
        const ids = parseContracts(contracts).map((item) => item.id);
        expect(ids).toEqual([...ids].toSorted());
      }),
    );
  });
});
