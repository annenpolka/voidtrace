import { describe, expect, it } from "vitest";
import { computeArtifactContentHash } from "../../../packages/contracts/src/fingerprint.ts";
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

const rulesetContract: ContractDefinition = {
  id: "ruleset",
  typeName: "Ruleset",
  schemaId: "urn:voidtrace:schema:ruleset:0.1.0",
  version: "0.1.0",
  description: "test ruleset contract",
  root: {
    kind: "object",
    fields: [],
  },
};

const spec: SpecDocument = {
  title: "VoidTrace test specification",
  schemaVersion: "0.1.0",
  clauses: [clause],
  contracts: [contract, rulesetContract],
  ruleset: {
    id: "ruleset.test",
    version: "0.1.0",
    revision: 7,
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

    const parsed = JSON.parse(capabilities?.contents ?? "{}") as {
      capabilities: unknown[];
    };
    expect(parsed.capabilities).toContainEqual(
      expect.objectContaining({
        id: "kernel.foundation",
        status: "partial",
        activeClauseRefs: ["ENG-001"],
        plannedClauseRefs: ["ENG-002"],
      }),
    );
  });

  it("publishes the CLI surface as an independently derived capability", () => {
    const generated = renderGeneratedFiles({
      ...spec,
      clauses: [
        {
          id: "CLI-001",
          pattern: "cli_command_output_selection",
          desc: "select one contract per command",
          guarantee: "example-tested",
          maturity: "active",
          area: "cli",
        },
        {
          id: "CLI-002",
          pattern: "cli_deterministic_json",
          desc: "emit deterministic JSON",
          guarantee: "example-tested",
          maturity: "planned",
          area: "cli",
        },
      ],
    });
    const capabilities = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/capabilities.generated.json",
    );

    const parsed = JSON.parse(capabilities?.contents ?? "{}") as {
      capabilities: unknown[];
    };
    expect(parsed.capabilities).toContainEqual({
      id: "cli.core",
      status: "partial",
      activeClauseRefs: ["CLI-001"],
      plannedClauseRefs: ["CLI-002"],
    });
  });

  it("publishes resolved Experiment comparison as an independently derived capability", () => {
    const generated = renderGeneratedFiles({
      ...spec,
      clauses: [
        {
          id: "EXP-001",
          pattern: "resolved_experiment_membership",
          desc: "validate a bounded set of resolved Scenario revisions",
          guarantee: "property-tested",
          maturity: "active",
          area: "experiments",
        },
        {
          id: "EXP-002",
          pattern: "resolved_experiment_comparison",
          desc: "project one primary metric and signed deltas",
          guarantee: "property-tested",
          maturity: "active",
          area: "experiments",
        },
      ],
    });
    const capabilities = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/capabilities.generated.json",
    );

    const parsed = JSON.parse(capabilities?.contents ?? "{}") as {
      capabilities: unknown[];
    };
    expect(parsed.capabilities).toContainEqual({
      id: "experiments.resolved-comparison",
      status: "supported",
      activeClauseRefs: ["EXP-001", "EXP-002"],
      plannedClauseRefs: [],
    });
  });

  it("publishes Patch-backed resolution in the Experiment comparison capability", () => {
    const generated = renderGeneratedFiles({
      ...spec,
      clauses: [
        {
          id: "EXP-003",
          pattern: "patch_backed_experiment_resolution",
          desc: "materialize exact Patch variants before comparison",
          guarantee: "property-tested",
          maturity: "active",
          area: "experiments",
        },
      ],
    });
    const capabilities = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/capabilities.generated.json",
    );

    const parsed = JSON.parse(capabilities?.contents ?? "{}") as {
      capabilities: unknown[];
    };
    expect(parsed.capabilities).toContainEqual({
      id: "experiments.resolved-comparison",
      status: "supported",
      activeClauseRefs: ["EXP-003"],
      plannedClauseRefs: [],
    });
  });

  it("publishes finite Sweep as a separate planned or active capability", () => {
    const sweepClause = {
      id: "SWP-001",
      pattern: "finite_parameter_sweep" as const,
      desc: "bind ordered explicit values to exact one-operation ScenarioPatch revisions",
      guarantee: "property-tested" as const,
      maturity: "planned" as const,
      area: "experiments" as const,
    };
    const planned = renderGeneratedFiles({
      ...spec,
      clauses: [sweepClause],
    });
    const active = renderGeneratedFiles({
      ...spec,
      clauses: [{ ...sweepClause, maturity: "active" }],
    });

    const readCapabilities = (generated: ReturnType<typeof renderGeneratedFiles>) => {
      const capabilities = generated.find(
        (file) => file.path === "packages/spec-artifacts/src/capabilities.generated.json",
      );
      return JSON.parse(capabilities?.contents ?? "{}").capabilities as unknown[];
    };

    expect(readCapabilities(planned)).toContainEqual({
      id: "experiments.finite-sweep",
      status: "unsupported",
      activeClauseRefs: [],
      plannedClauseRefs: ["SWP-001"],
    });
    expect(readCapabilities(active)).toContainEqual({
      id: "experiments.finite-sweep",
      status: "supported",
      activeClauseRefs: ["SWP-001"],
      plannedClauseRefs: [],
    });
  });

  it("publishes Scenario Patch separately from resolved Experiment comparison", () => {
    const generated = renderGeneratedFiles({
      ...spec,
      clauses: [
        {
          id: "EXP-001",
          pattern: "resolved_experiment_membership",
          desc: "validate a bounded set of resolved Scenario revisions",
          guarantee: "property-tested",
          maturity: "active",
          area: "experiments",
        },
        {
          id: "SCN-001",
          pattern: "patch_isolation",
          desc: "replace only declared Scenario scalar paths",
          guarantee: "property-tested",
          maturity: "active",
          area: "experiments",
        },
      ],
    });
    const capabilities = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/capabilities.generated.json",
    );

    const parsed = JSON.parse(capabilities?.contents ?? "{}") as {
      capabilities: unknown[];
    };
    expect(parsed.capabilities).toEqual(
      expect.arrayContaining([
        {
          id: "experiments.resolved-comparison",
          status: "supported",
          activeClauseRefs: ["EXP-001"],
          plannedClauseRefs: [],
        },
        {
          id: "experiments.scenario-patch",
          status: "supported",
          activeClauseRefs: ["SCN-001"],
          plannedClauseRefs: [],
        },
      ]),
    );
  });

  it("publishes fixed Multishot separately from direct Critical and Armor", () => {
    const generated = renderGeneratedFiles({
      ...spec,
      clauses: [
        {
          ...clause,
          id: "CRT-001",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "MSH-001",
          area: "mechanics",
          maturity: "planned",
        },
        {
          ...clause,
          id: "PLT-001",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "PLT-002",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "RAD-001",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "RAD-002",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "STS-001",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "BEM-001",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "GOL-018",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "PTH-001",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "RCH-001",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "CHN-001",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "IMP-002",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "GOL-015",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "IMP-003",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "GOL-016",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "IMP-004",
          area: "mechanics",
          maturity: "active",
        },
        {
          ...clause,
          id: "GOL-017",
          area: "mechanics",
          maturity: "active",
        },
      ],
    });
    const capabilities = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/capabilities.generated.json",
    );

    const parsed = JSON.parse(capabilities?.contents ?? "{}") as {
      capabilities: unknown[];
    };
    expect(parsed.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "mechanics.direct-critical-armor",
          status: "supported",
          activeClauseRefs: ["CRT-001"],
        }),
        expect.objectContaining({
          id: "mechanics.fixed-multishot",
          status: "unsupported",
          plannedClauseRefs: ["MSH-001"],
        }),
        expect.objectContaining({
          id: "mechanics.fixed-pellets",
          status: "supported",
          activeClauseRefs: ["PLT-001"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-pellet-allocation",
          status: "supported",
          activeClauseRefs: ["PLT-002"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-radial",
          status: "supported",
          activeClauseRefs: ["RAD-001"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-radial-targets",
          status: "supported",
          activeClauseRefs: ["RAD-002"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-status-ticks",
          status: "supported",
          activeClauseRefs: ["STS-001"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-beam-ticks",
          status: "supported",
          activeClauseRefs: ["BEM-001", "GOL-018"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-punch-through",
          status: "supported",
          activeClauseRefs: ["PTH-001"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-ricochet",
          status: "supported",
          activeClauseRefs: ["RCH-001"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-chain",
          status: "supported",
          activeClauseRefs: ["CHN-001"],
        }),
        expect.objectContaining({
          id: "mechanics.resolved-direct-radial-impact",
          status: "supported",
          activeClauseRefs: ["IMP-002", "GOL-015", "IMP-003", "GOL-016", "IMP-004", "GOL-017"],
        }),
      ]),
    );
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

  it("emits content-addressed Rule IR from the normative Ruleset", async () => {
    const generated = renderGeneratedFiles(spec);
    const rulesetFile = generated.find(
      (file) => file.path === "packages/spec-artifacts/src/rulesets/core.generated.json",
    );
    const ruleset = JSON.parse(rulesetFile?.contents ?? "{}") as {
      contentHash: string;
      revision: number;
      rules: Array<{ id: string; operation: { kind: string } }>;
    };

    expect(ruleset.revision).toBe(7);
    expect(ruleset.rules).toEqual([
      expect.objectContaining({
        id: "rule.damage.copy",
        operation: {
          kind: "damage-vector.copy",
        },
      }),
    ]);
    expect(await computeArtifactContentHash(ruleset)).toBe(ruleset.contentHash);
  });
});
