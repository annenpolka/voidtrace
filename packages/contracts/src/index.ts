export type {
  ArtifactRef,
  CatalogSnapshot,
  Comparison,
  ContractById,
  ContractId,
  Fingerprint,
  Experiment,
  Problem,
  Result,
  Ruleset,
  Scenario,
  Trace,
} from "@voidtrace/spec-artifacts/contracts";
export {
  artifactMatchesRef,
  type ReferencedArtifact,
} from "./artifact-ref.ts";
export {
  canonicalizeJson,
  type JsonValue,
  snapshotJsonObject,
  snapshotJsonValue,
} from "./canonical-json.ts";
export {
  attachResultHash,
  attachArtifactContentHash,
  computeArtifactContentHash,
  computeResultHash,
  sha256CanonicalJson,
  type ContentHashedArtifact,
  type ResultHashInput,
  verifyArtifactContentHash,
  verifyResultHash,
  verifyResultIntegrity,
  verifyResultTraceIntegrity,
  verifyTraceIntegrity,
} from "./fingerprint.ts";
export { assertStableId, isStableId } from "./stable-id.ts";
export {
  assertContractSchemasReady,
  validateContract,
  type ValidationIssue,
  type ValidationResult,
} from "./validator.ts";
