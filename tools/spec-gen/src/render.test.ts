import { describe, expect, it } from "vitest";
import type { ContractDefinition } from "./contract-model.ts";
import type { Clause, SpecDocument } from "./model.ts";
import { renderGeneratedFiles } from "./render.ts";

const clause: Clause = {
  id: "ENG-001",
  pattern: "deterministic_replay",
  desc: "same inputs replay identically",
  guarantee: "property-tested",
  maturity: "planned",
  area: "kernel",
};

const contract: ContractDefinition = {
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
};

const spec: SpecDocument = {
  title: "VoidTrace test specification",
  schemaVersion: "0.1.0",
  clauses: [clause],
  contracts: [contract],
};

describe("renderGeneratedFiles", () => {
  it("is byte-deterministic", () => {
    expect(renderGeneratedFiles(spec)).toEqual(renderGeneratedFiles(structuredClone(spec)));
  });

  it("publishes planned clauses without claiming active conformance", () => {
    const generated = renderGeneratedFiles(spec);
    const conformance = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/conformance/engine.generated.json",
    );

    expect(conformance).toBeDefined();
    expect(JSON.parse(conformance?.contents ?? "{}")).toMatchObject({
      activeClauses: [],
      plannedClauses: [{ id: "ENG-001" }],
    });
  });

  it("publishes active and planned Kernel capability coverage separately", () => {
    const generated = renderGeneratedFiles({
      ...spec,
      clauses: [
        {
          ...clause,
          maturity: "active",
        },
        {
          ...clause,
          id: "ENG-002",
        },
      ],
    });
    const capabilities = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/capabilities.generated.json",
    );

    expect(JSON.parse(capabilities?.contents ?? "{}")).toMatchObject({
      capabilities: [
        {},
        {},
        {
          id: "kernel.foundation",
          status: "partial",
          activeClauseRefs: ["ENG-001"],
          plannedClauseRefs: ["ENG-002"],
        },
      ],
    });
  });

  it("escapes table delimiters and line breaks in human-readable clauses", () => {
    const generated = renderGeneratedFiles({
      ...spec,
      clauses: [
        {
          ...clause,
          desc: "left | right\\path\nnext line",
        },
      ],
    });
    const renderedSpec = generated.find((file) => file.path === "docs/generated/SPEC.md");

    expect(renderedSpec?.contents).toContain("left \\| right\\\\path<br>next line");
  });

  it("projects one Contract IR into matching JSON Schema and TypeScript", () => {
    const generated = renderGeneratedFiles(spec);
    const schema = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/schemas/example.schema.json",
    );
    const types = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/contracts.generated.ts",
    );

    expect(JSON.parse(schema?.contents ?? "{}")).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "urn:voidtrace:schema:example:1.0.0",
      type: "object",
      required: ["kind"],
      additionalProperties: false,
      properties: {
        kind: {
          const: "example",
        },
      },
    });
    expect(types?.contents).toContain('readonly "kind": "example";');
    expect(new Set(generated.map((file) => file.path)).size).toBe(generated.length);
  });
});
