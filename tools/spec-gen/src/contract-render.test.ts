import { describe, expect, it } from "vitest";
import type { ContractDefinition } from "./contract-model.ts";
import { renderContractFiles } from "./contract-render.ts";

const artifactRef: ContractDefinition = {
  id: "artifact-ref",
  typeName: "ArtifactRef",
  schemaId: "urn:voidtrace:schema:artifact-ref:1.0.0",
  version: "1.0.0",
  description: "test artifact reference",
  root: {
    kind: "object",
    fields: [
      {
        name: "kind",
        description: "artifact kind",
        required: true,
        schema: {
          kind: "string",
          pattern: null,
          values: null,
          minLength: 1,
        },
      },
    ],
  },
};

const consumer: ContractDefinition = {
  id: "consumer",
  typeName: "Consumer",
  schemaId: "urn:voidtrace:schema:consumer:1.0.0",
  version: "1.0.0",
  description: "test consumer",
  root: {
    kind: "object",
    fields: [
      {
        name: "scenarioRef",
        description: "typed scenario reference",
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
            pattern: "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$",
            values: null,
            minLength: 1,
          },
        },
      },
      {
        name: "duplicateUnion",
        description: "overlapping TypeScript union",
        required: true,
        schema: {
          kind: "union",
          variants: [
            {
              kind: "literal",
              value: "same",
            },
            {
              kind: "literal",
              value: "same",
            },
          ],
        },
      },
    ],
  },
};

describe("renderContractFiles", () => {
  it("renders Artifact kind refinements, record key constraints, and union-compatible anyOf", () => {
    const files = renderContractFiles([artifactRef, consumer]);
    const schemaFile = files.find(
      (file) => file.path === "packages/spec-artifacts/src/schemas/consumer.schema.json",
    );
    const typesFile = files.find(
      (file) => file.path === "packages/spec-artifacts/src/contracts.generated.ts",
    );
    const schema = JSON.parse(schemaFile?.contents ?? "{}") as {
      properties?: Record<string, Record<string, unknown>>;
    };

    expect(schema).toMatchObject({
      properties: {
        scenarioRef: {
          allOf: [
            {
              $ref: "urn:voidtrace:schema:artifact-ref:1.0.0",
            },
            {
              type: "object",
              properties: {
                kind: {
                  const: "voidtrace.scenario",
                },
              },
              required: ["kind"],
            },
          ],
        },
        metrics: {
          propertyNames: {
            type: "string",
            minLength: 1,
            pattern: "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$",
          },
        },
        duplicateUnion: {
          anyOf: [
            {
              type: "string",
              const: "same",
            },
            {
              type: "string",
              const: "same",
            },
          ],
        },
      },
    });
    expect(schema.properties?.duplicateUnion).not.toHaveProperty("oneOf");
    expect(typesFile?.contents).toContain(
      'ArtifactRef & { readonly "kind": "voidtrace.scenario" }',
    );
    expect(typesFile?.contents).toContain('readonly "duplicateUnion": "same" | "same";');
  });
});
