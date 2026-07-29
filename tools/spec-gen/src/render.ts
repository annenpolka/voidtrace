import { createHash } from "node:crypto";
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

\`guarantee\` names the intended independent verification method. \`maturity\` records
whether that oracle currently exists. Foundational Kernel clauses remain \`planned\`;
generated Contract validation does not claim that a combat Kernel has verified them.

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

${activeCount === 0 ? "No engine oracle is active yet." : `${activeCount} Clause${activeCount === 1 ? " has" : "s have"} an independent oracle exercised by \`just check\`.`}
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

function renderRules(): string {
  return `${GENERATED_NOTICE}

# Runtime rules

No runtime Rule IR is defined yet. Rule contracts and the Rule compiler begin in later
commits; Pkl is not evaluated by the future runtime.
`;
}

function renderEvidence(): string {
  return `${GENERATED_NOTICE}

# Mechanics evidence

No Warframe mechanics rule is asserted yet, so there are no Evidence references.
Implementation verification and game-mechanics evidence will remain separate axes.
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
  const activeClauseIds = spec.clauses
    .filter((clause) => clause.maturity === "active")
    .map((clause) => clause.id);
  const plannedClauseIds = spec.clauses
    .filter((clause) => clause.maturity === "planned")
    .map((clause) => clause.id);
  const contractIds = spec.contracts.map((contract) => contract.id);
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
      {
        id: "kernel.foundation",
        status:
          activeClauseIds.length === clauseIds.length
            ? "supported"
            : activeClauseIds.length > 0
              ? "partial"
              : "unsupported",
        activeClauseRefs: activeClauseIds,
        plannedClauseRefs: plannedClauseIds,
      },
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
        },
      }),
    },
    {
      path: "packages/spec-artifacts/AGENTS.md",
      contents: `# Generated package\n\nEverything in this package is generated by \`just spec-gen\`. Do not edit it manually.\n`,
    },
    {
      path: "packages/spec-artifacts/GENERATED.md",
      contents: `# Generated specification artifacts\n\nSource: \`specs/main.pkl\`\n\nThis package contains generated Contract types, JSON Schemas, manifests, and conformance metadata. Regenerate with \`just spec-gen\`. Freshness is enforced by \`just spec-check\`.\n`,
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
      contents: renderRules(),
    },
    {
      path: "docs/generated/EVIDENCE.md",
      contents: renderEvidence(),
    },
    {
      path: "docs/generated/AI_UX.md",
      contents: renderAiUx(),
    },
    ...renderContractFiles(spec.contracts),
  ].toSorted((left, right) => compareText(left.path, right.path));
}
