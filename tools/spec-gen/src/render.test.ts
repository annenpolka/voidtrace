import { describe, expect, it } from "vitest";
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

const spec: SpecDocument = {
  title: "VoidTrace test specification",
  schemaVersion: "0.1.0",
  clauses: [clause],
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
});
