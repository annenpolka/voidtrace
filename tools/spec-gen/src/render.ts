import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../packages/contracts/src/canonical-json.ts";
import { renderContractFiles } from "./contract-render.ts";
import type { Clause, ClauseMaturity, SpecArea, SpecDocument, VerificationLevel } from "./model.ts";

export type GeneratedFile = {
  path: string;
  contents: string;
};

const GENERATED_NOTICE = "<!-- Generated from specs/main.pkl. Do not edit. -->";
const GENERATED_TS_NOTICE = "// Generated from specs/main.pkl. Do not edit.";

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function fingerprint(spec: SpecDocument): string {
  return `sha256:${createHash("sha256").update(json(spec)).digest("hex")}`;
}

function contentHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalizeJson(value)).digest("hex")}`;
}

function countBy<T extends string>(
  clauses: Clause[],
  select: (clause: Clause) => T,
): Record<T, number> {
  return clauses.reduce<Record<T, number>>(
    (counts, clause) => {
      const key = select(clause);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    },
    {} as Record<T, number>,
  );
}

function markdownCell(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replace(/\r\n?|\n/g, "<br>");
}

function markdownTable(headers: string[], rows: string[][]): string {
  const header = `| ${headers.map(markdownCell).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function renderSpec(spec: SpecDocument, sourceFingerprint: string): string {
  const rows = spec.clauses.map((clause) => [
    `\`${clause.id}\``,
    `\`${clause.area}\``,
    `\`${clause.pattern}\``,
    `\`${clause.guarantee}\``,
    `\`${clause.maturity}\``,
    clause.desc,
  ]);

  return `${GENERATED_NOTICE}

# ${spec.title}

- Schema version: \`${spec.schemaVersion}\`
- Source: \`specs/main.pkl\`
- Source fingerprint: \`${sourceFingerprint}\`
- Generated contracts: ${spec.contracts.length} (see [CONTRACTS.md](./CONTRACTS.md))

## Maturity semantics

\`guarantee\` names the intended verification method. \`maturity\` records whether
that obligation is currently satisfied. Machine-verified active Clauses have an
independent oracle; active manual Clauses remain explicit review obligations.
Contract validation alone never activates a Kernel or mechanics Clause.

## Clauses

${markdownTable(["ID", "Area", "Pattern", "Guarantee", "Maturity", "Normative statement"], rows)}
`;
}

function renderCoverage(spec: SpecDocument): string {
  const maturityCounts = countBy<ClauseMaturity>(spec.clauses, (clause) => clause.maturity);
  const guaranteeCounts = countBy<VerificationLevel>(spec.clauses, (clause) => clause.guarantee);
  const areaCounts = countBy<SpecArea>(spec.clauses, (clause) => clause.area);
  const activeCount = maturityCounts.active ?? 0;
  const plannedCount = maturityCounts.planned ?? 0;
  const areaRows = Object.entries(areaCounts)
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([area, count]) => [`\`${area}\``, String(count)]);

  return `${GENERATED_NOTICE}

# Specification coverage

## Current state

- Total clauses: ${spec.clauses.length}
- Active clauses: ${activeCount}
- Planned clauses: ${plannedCount}
- Retired clauses: ${maturityCounts.retired ?? 0}

${activeCount === 0 ? "No verification obligation is active yet." : `${activeCount} Clause${activeCount === 1 ? " is" : "s are"} active. Machine-verified Clauses have independent oracles exercised by \`just check\`; manual Clauses remain review obligations.`}
A planned property-test is a declared obligation, not a passing runtime guarantee.

The ${spec.contracts.length} generated Contract schemas are independently compiled and
validated by \`@voidtrace/contracts\`; this does not activate any Kernel behavior Clause.

## Intended verification methods

- Property-tested: ${guaranteeCounts["property-tested"] ?? 0}
- Example-tested: ${guaranteeCounts["example-tested"] ?? 0}
- Manual: ${guaranteeCounts.manual ?? 0}

## Clauses by area

${markdownTable(["Area", "Clauses"], areaRows)}
`;
}

function renderRules(spec: SpecDocument): string {
  const rows = spec.ruleset.rules.map((rule) => [
    `\`${rule.id}\``,
    `\`${rule.phase}\``,
    `\`${rule.operation.kind}\``,
    `\`${rule.evidenceStatus}\``,
    rule.description,
  ]);

  return `${GENERATED_NOTICE}

# Runtime rules

- Ruleset: \`${spec.ruleset.id}\`
- Version: \`${spec.ruleset.version}\`
- Game build: \`${spec.ruleset.gameBuild}\`
- Generated IR: \`packages/spec-artifacts/src/rulesets/core.generated.json\`

## Rules

${markdownTable(["ID", "Phase", "Operation", "Evidence", "Normative semantics"], rows)}
`;
}

function renderEvidence(spec: SpecDocument): string {
  const statusRows = Object.entries(
    spec.ruleset.rules.reduce<Record<string, number>>((counts, rule) => {
      counts[rule.evidenceStatus] = (counts[rule.evidenceStatus] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([status, count]) => [`\`${status}\``, String(count)]);
  const evidenceCount = new Set(spec.ruleset.rules.flatMap((rule) => rule.evidenceIds)).size;

  return `${GENERATED_NOTICE}

# Mechanics evidence

Implementation verification and game-mechanics evidence will remain separate axes.

- Rules: ${spec.ruleset.rules.length}
- Referenced evidence records: ${evidenceCount}

${markdownTable(["Evidence status", "Rules"], statusRows)}

The synthetic first-slice Ruleset is not presented as verified current Warframe behavior.
`;
}

function renderAiUx(): string {
  return `${GENERATED_NOTICE}

# Lab and AI UX clauses

No Lab or AI UX clause is active. The Lab starts only after Result and Trace
contracts complete a real Kernel round trip.
`;
}

export function renderGeneratedFiles(spec: SpecDocument): GeneratedFile[] {
  const sourceFingerprint = fingerprint(spec);
  const clauseIds = spec.clauses.map((clause) => clause.id);
  const contractIds = spec.contracts.map((contract) => contract.id);
  const capability = (id: string, clauses: Clause[]) => {
    const active = clauses
      .filter((clause) => clause.maturity === "active")
      .map((clause) => clause.id);
    const planned = clauses
      .filter((clause) => clause.maturity === "planned")
      .map((clause) => clause.id);
    return {
      id,
      status:
        clauses.length === 0
          ? "unsupported"
          : active.length === clauses.length
            ? "supported"
            : active.length > 0
              ? "partial"
              : "unsupported",
      activeClauseRefs: active,
      plannedClauseRefs: planned,
    };
  };
  const kernelClauses = spec.clauses.filter(
    (clause) => clause.area === "kernel" || clause.area === "scope",
  );
  const mechanicsClauses = spec.clauses.filter((clause) => clause.area === "mechanics");
  const cliClauses = spec.clauses.filter((clause) => clause.area === "cli");
  const rulesetContract = spec.contracts.find((contract) => contract.id === "ruleset");
  if (!rulesetContract) {
    throw new Error("Ruleset Contract is required when rendering Rule IR");
  }
  const rulesetWithoutHash = {
    $schema: rulesetContract.schemaId,
    kind: "ruleset",
    schemaVersion: rulesetContract.version,
    id: spec.ruleset.id,
    revision: 0,
    gameBuild: spec.ruleset.gameBuild,
    rules: spec.ruleset.rules,
  };
  const generatedRuleset = {
    $schema: rulesetWithoutHash.$schema,
    kind: rulesetWithoutHash.kind,
    schemaVersion: rulesetWithoutHash.schemaVersion,
    id: rulesetWithoutHash.id,
    revision: rulesetWithoutHash.revision,
    contentHash: contentHash(rulesetWithoutHash),
    gameBuild: rulesetWithoutHash.gameBuild,
    rules: rulesetWithoutHash.rules,
  };
  const manifest = {
    kind: "voidtrace.spec-manifest",
    schemaVersion: spec.schemaVersion,
    source: "specs/main.pkl",
    sourceFingerprint,
    clauses: spec.clauses,
    contracts: spec.contracts.map((contract) => ({
      id: contract.id,
      typeName: contract.typeName,
      schemaId: contract.schemaId,
      version: contract.version,
    })),
    ruleset: {
      id: generatedRuleset.id,
      version: spec.ruleset.version,
      contentHash: generatedRuleset.contentHash,
      gameBuild: generatedRuleset.gameBuild,
      ruleIds: generatedRuleset.rules.map((rule) => rule.id),
    },
  };
  const capabilities = {
    kind: "voidtrace.capability-manifest",
    schemaVersion: spec.schemaVersion,
    sourceFingerprint,
    capabilities: [
      {
        id: "specification.pipeline",
        status: "supported",
        clauseRefs: [],
      },
      {
        id: "contracts.artifacts",
        status: "supported",
        contractRefs: contractIds,
        clauseRefs: [],
      },
      capability("kernel.foundation", kernelClauses),
      capability("mechanics.direct-critical-armor", mechanicsClauses),
      capability("cli.core", cliClauses),
    ],
  };
  const conformance = {
    kind: "voidtrace.engine-conformance",
    schemaVersion: spec.schemaVersion,
    sourceFingerprint,
    activeClauses: spec.clauses.filter((clause) => clause.maturity === "active"),
    plannedClauses: spec.clauses.filter((clause) => clause.maturity === "planned"),
  };
  const ids = `${GENERATED_TS_NOTICE}

export const CLAUSE_IDS = ${JSON.stringify(clauseIds, null, 2)} as const;

export type ClauseId = (typeof CLAUSE_IDS)[number];
`;

  return [
    {
      path: "packages/spec-artifacts/package.json",
      contents: json({
        name: "@voidtrace/spec-artifacts",
        version: "0.0.0",
        private: true,
        type: "module",
        exports: {
          "./ids": "./src/ids.generated.ts",
          "./contracts": "./src/contracts.generated.ts",
          "./schemas": "./src/schema-index.generated.ts",
          "./schemas/*": "./src/schemas/*.schema.json",
          "./manifest": "./src/spec-manifest.generated.json",
          "./capabilities": "./src/capabilities.generated.json",
          "./conformance/engine": "./src/conformance/engine.generated.json",
          "./rulesets/core": "./src/rulesets/core.generated.json",
        },
      }),
    },
    {
      path: "packages/spec-artifacts/AGENTS.md",
      contents: `# Generated package\n\nEverything in this package is generated by \`just spec-gen\`. Do not edit it manually.\n`,
    },
    {
      path: "packages/spec-artifacts/GENERATED.md",
      contents: `# Generated specification artifacts\n\nSource: \`specs/main.pkl\`\n\nThis package contains generated Contract types, JSON Schemas, Rule IR, manifests, and conformance metadata. Regenerate with \`just spec-gen\`. Freshness is enforced by \`just spec-check\`.\n`,
    },
    {
      path: "packages/spec-artifacts/src/ids.generated.ts",
      contents: ids,
    },
    {
      path: "packages/spec-artifacts/src/spec-manifest.generated.json",
      contents: json(manifest),
    },
    {
      path: "packages/spec-artifacts/src/rulesets/core.generated.json",
      contents: json(generatedRuleset),
    },
    {
      path: "packages/spec-artifacts/src/capabilities.generated.json",
      contents: json(capabilities),
    },
    {
      path: "packages/spec-artifacts/src/conformance/engine.generated.json",
      contents: json(conformance),
    },
    {
      path: "docs/generated/SPEC.md",
      contents: renderSpec(spec, sourceFingerprint),
    },
    {
      path: "docs/generated/COVERAGE.md",
      contents: renderCoverage(spec),
    },
    {
      path: "docs/generated/RULES.md",
      contents: renderRules(spec),
    },
    {
      path: "docs/generated/EVIDENCE.md",
      contents: renderEvidence(spec),
    },
    {
      path: "docs/generated/AI_UX.md",
      contents: renderAiUx(),
    },
    ...renderContractFiles(spec.contracts),
  ].toSorted((left, right) => compareText(left.path, right.path));
}
