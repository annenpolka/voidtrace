import type { ArtifactRef, Fingerprint, Scenario } from "@voidtrace/spec-artifacts/contracts";
import { canonicalizeJson, cloneJsonObjectOmitting, snapshotJsonObject } from "./canonical-json.ts";
import { validateContract } from "./validator.ts";

const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/;
const EMPTY_CONTENT_HASH = `sha256:${"0".repeat(64)}`;

export type ContentHashedArtifact = {
  readonly contentHash: string;
};

export type ResultHashInput = Omit<Fingerprint, "resultHash">;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256CanonicalJson(value: unknown): Promise<string> {
  const canonical = canonicalizeJson(value);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return `sha256:${bytesToHex(new Uint8Array(digest))}`;
}

export async function computeArtifactContentHash<T extends ContentHashedArtifact>(
  artifact: T,
): Promise<string> {
  const snapshot = snapshotJsonObject(artifact);
  if (typeof snapshot.contentHash !== "string") {
    throw new TypeError("Artifact contentHash must be an own enumerable string data property");
  }
  const hashInput = cloneJsonObjectOmitting(snapshot, ["contentHash"]);
  return sha256CanonicalJson(hashInput);
}

export async function verifyArtifactContentHash<T extends ContentHashedArtifact>(
  artifact: T,
): Promise<boolean> {
  try {
    const snapshot = snapshotJsonObject(artifact);
    if (typeof snapshot.contentHash !== "string" || !CONTENT_HASH.test(snapshot.contentHash)) {
      return false;
    }
    return (
      (await computeArtifactContentHash(snapshot as ContentHashedArtifact)) === snapshot.contentHash
    );
  } catch {
    return false;
  }
}

function normalizeResultHashInput(value: ResultHashInput | Fingerprint): ResultHashInput {
  const input = cloneJsonObjectOmitting(value, ["resultHash"]);
  const validation = validateContract("fingerprint", {
    ...input,
    resultHash: EMPTY_CONTENT_HASH,
  });
  if (!validation.ok) {
    throw new TypeError("Invalid Result fingerprint input");
  }
  const { resultHash: _resultHash, ...normalized } = validation.value;
  return normalized;
}

/**
 * Computes the immutable execution-input hash stored in `Fingerprint.resultHash`.
 *
 * The hash covers every other Fingerprint field as canonical JSON. Result
 * Artifact identity, revision, metrics, and optional Trace linkage therefore
 * cannot change the execution cache key.
 */
export async function computeResultHash(
  fingerprint: ResultHashInput | Fingerprint,
): Promise<string> {
  return sha256CanonicalJson(normalizeResultHashInput(fingerprint));
}

export async function attachResultHash(fingerprint: ResultHashInput): Promise<Fingerprint> {
  if (
    typeof fingerprint !== "object" ||
    fingerprint === null ||
    Object.hasOwn(fingerprint, "resultHash")
  ) {
    throw new TypeError("attachResultHash expects a Fingerprint without resultHash");
  }
  const normalized = normalizeResultHashInput(fingerprint);
  const resultHash = await sha256CanonicalJson(normalized);
  return Object.freeze({
    ...normalized,
    resultHash,
  });
}

export async function verifyResultHash(fingerprint: unknown): Promise<boolean> {
  const validation = validateContract("fingerprint", fingerprint);
  if (!validation.ok) {
    return false;
  }
  try {
    return (await computeResultHash(validation.value)) === validation.value.resultHash;
  } catch {
    return false;
  }
}

function referenceMatchesArtifact(
  reference: ArtifactRef,
  artifact: {
    readonly kind: string;
    readonly schemaVersion: string;
    readonly id: string;
    readonly revision: number;
    readonly contentHash: string;
    readonly gameBuild: string;
  },
): boolean {
  return (
    reference.kind === artifact.kind &&
    reference.schemaVersion === artifact.schemaVersion &&
    reference.id === artifact.id &&
    reference.revision === artifact.revision &&
    reference.contentHash === artifact.contentHash &&
    reference.gameBuild === artifact.gameBuild
  );
}

async function fingerprintMatchesScenario(
  fingerprint: Fingerprint,
  scenario: Scenario,
): Promise<boolean> {
  return (
    fingerprint.scenarioSchemaVersion === scenario.schemaVersion &&
    fingerprint.scenarioHash === scenario.contentHash &&
    fingerprint.catalogHash === scenario.catalogRef.contentHash &&
    fingerprint.rulesetHash === scenario.rulesetRef.contentHash &&
    (scenario.simulation.mode !== "monte-carlo" || fingerprint.seed === scenario.simulation.seed) &&
    (await verifyResultHash(fingerprint))
  );
}

export async function verifyResultIntegrity(result: unknown, scenario: unknown): Promise<boolean> {
  const validatedResult = validateContract("result", result);
  const validatedScenario = validateContract("scenario", scenario);
  if (!validatedResult.ok || !validatedScenario.ok) {
    return false;
  }
  return (
    validatedResult.value.gameBuild === validatedScenario.value.gameBuild &&
    referenceMatchesArtifact(validatedResult.value.scenarioRef, validatedScenario.value) &&
    (await verifyArtifactContentHash(validatedScenario.value)) &&
    (await verifyArtifactContentHash(validatedResult.value)) &&
    (await fingerprintMatchesScenario(validatedResult.value.fingerprint, validatedScenario.value))
  );
}

export async function verifyTraceIntegrity(trace: unknown, scenario: unknown): Promise<boolean> {
  const validatedTrace = validateContract("trace", trace);
  const validatedScenario = validateContract("scenario", scenario);
  if (!validatedTrace.ok || !validatedScenario.ok) {
    return false;
  }
  return (
    validatedTrace.value.gameBuild === validatedScenario.value.gameBuild &&
    referenceMatchesArtifact(validatedTrace.value.scenarioRef, validatedScenario.value) &&
    (await verifyArtifactContentHash(validatedScenario.value)) &&
    (await verifyArtifactContentHash(validatedTrace.value)) &&
    (await fingerprintMatchesScenario(validatedTrace.value.fingerprint, validatedScenario.value))
  );
}

export async function verifyResultTraceIntegrity(
  result: unknown,
  trace: unknown,
  scenario: unknown,
): Promise<boolean> {
  const validatedResult = validateContract("result", result);
  const validatedTrace = validateContract("trace", trace);
  const validatedScenario = validateContract("scenario", scenario);
  if (
    !validatedResult.ok ||
    !validatedTrace.ok ||
    !validatedScenario.ok ||
    !validatedResult.value.traceRef
  ) {
    return false;
  }
  if (
    !(await verifyResultIntegrity(validatedResult.value, validatedScenario.value)) ||
    !(await verifyTraceIntegrity(validatedTrace.value, validatedScenario.value))
  ) {
    return false;
  }
  return (
    referenceMatchesArtifact(validatedResult.value.traceRef, validatedTrace.value) &&
    canonicalizeJson(validatedResult.value.fingerprint) ===
      canonicalizeJson(validatedTrace.value.fingerprint)
  );
}

export async function attachArtifactContentHash<T extends object>(
  artifact: T,
): Promise<T & { readonly contentHash: string }> {
  const snapshot = snapshotJsonObject(artifact);
  if (Object.hasOwn(snapshot, "contentHash")) {
    throw new TypeError("attachArtifactContentHash expects an Artifact without contentHash");
  }
  const contentHash = await sha256CanonicalJson(snapshot);
  return Object.freeze({ ...snapshot, contentHash }) as T & { readonly contentHash: string };
}
