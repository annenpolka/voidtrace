export const KNOWN_PATTERNS = [
  "scope_boundary",
  "unsupported_mechanic_rejected",
  "deterministic_replay",
  "event_time_monotonic",
  "same_logical_random",
] as const;

export const VERIFICATION_LEVELS = ["property-tested", "example-tested", "manual"] as const;

export const CLAUSE_MATURITIES = ["planned", "active", "retired"] as const;

export const SPEC_AREAS = ["scope", "kernel", "mechanics", "catalog", "lab"] as const;

export type PatternId = (typeof KNOWN_PATTERNS)[number];
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];
export type ClauseMaturity = (typeof CLAUSE_MATURITIES)[number];
export type SpecArea = (typeof SPEC_AREAS)[number];

export type Clause = {
  id: string;
  pattern: PatternId;
  desc: string;
  guarantee: VerificationLevel;
  maturity: ClauseMaturity;
  area: SpecArea;
};

export type SpecDocument = {
  title: string;
  schemaVersion: string;
  clauses: Clause[];
};

// Commit 1 contains no runtime oracle. Add a pattern here only when its independent
// runner exists and is exercised by `just check`.
export const IMPLEMENTED_ORACLE_PATTERNS: readonly PatternId[] = [];

const CLAUSE_ID = /^[A-Z][A-Z0-9]{2}-\d{3}$/;
const SCHEMA_VERSION = /^\d+\.\d+\.\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  value: unknown,
  path: string,
  predicate: (candidate: string) => boolean = () => true,
): string {
  if (typeof value !== "string" || !predicate(value)) {
    throw new Error(`Invalid specification value at ${path}`);
  }
  return value;
}

function requireVocabularyValue<const T extends readonly string[]>(
  value: unknown,
  path: string,
  vocabulary: T,
): T[number] {
  const candidate = requireString(value, path);
  if (!vocabulary.includes(candidate)) {
    throw new Error(
      `Unknown value at ${path}: ${candidate}. Expected one of ${vocabulary.join(", ")}`,
    );
  }
  return candidate;
}

function parseClause(value: unknown, index: number): Clause {
  const path = `clauses[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Invalid specification value at ${path}`);
  }

  return {
    id: requireString(value.id, `${path}.id`, (candidate) => CLAUSE_ID.test(candidate)),
    pattern: requireVocabularyValue(value.pattern, `${path}.pattern`, KNOWN_PATTERNS),
    desc: requireString(value.desc, `${path}.desc`, (candidate) => candidate.length > 0),
    guarantee: requireVocabularyValue(value.guarantee, `${path}.guarantee`, VERIFICATION_LEVELS),
    maturity: requireVocabularyValue(value.maturity, `${path}.maturity`, CLAUSE_MATURITIES),
    area: requireVocabularyValue(value.area, `${path}.area`, SPEC_AREAS),
  };
}

export function validateSpecDocument(value: unknown): SpecDocument {
  if (!isRecord(value)) {
    throw new Error("Pkl entrypoint did not evaluate to an object");
  }
  if (!Array.isArray(value.clauses) || value.clauses.length === 0) {
    throw new Error("Specification must contain at least one Clause");
  }

  const clauses = value.clauses.map(parseClause);
  const ids = new Set<string>();
  for (const clause of clauses) {
    if (ids.has(clause.id)) {
      throw new Error(`Duplicate Clause ID: ${clause.id}`);
    }
    ids.add(clause.id);
    if (
      clause.maturity === "active" &&
      clause.guarantee !== "manual" &&
      !IMPLEMENTED_ORACLE_PATTERNS.includes(clause.pattern)
    ) {
      throw new Error(
        `Clause ${clause.id} cannot be active: no independent ${clause.pattern} oracle is registered`,
      );
    }
  }

  return {
    title: requireString(value.title, "title", (candidate) => candidate.length > 0),
    schemaVersion: requireString(value.schemaVersion, "schemaVersion", (candidate) =>
      SCHEMA_VERSION.test(candidate),
    ),
    clauses: clauses.toSorted((left, right) => left.id.localeCompare(right.id)),
  };
}
