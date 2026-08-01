import {
  artifactMatchesRef,
  attachArtifactContentHash,
  canonicalizeJson,
  type JsonValue,
  type Scenario,
  type ScenarioPatch,
  snapshotJsonObject,
  snapshotJsonValue,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";

export type MaterializeScenarioPatchRequest = {
  readonly patch: unknown;
  readonly scenario: unknown;
};

export type ScenarioPatchErrorCode =
  | "scenario-patch-request-invalid"
  | "scenario-patch-invalid"
  | "base-scenario-invalid"
  | "base-scenario-reference-mismatch"
  | "scenario-patch-game-build-mismatch"
  | "scenario-patch-result-identity-conflict"
  | "scenario-patch-path-invalid"
  | "scenario-patch-path-duplicate"
  | "scenario-patch-path-missing"
  | "scenario-patch-target-non-scalar"
  | "scenario-patch-value-kind-mismatch"
  | "scenario-patch-no-op"
  | "scenario-patch-construction-failed";

export type ScenarioPatchError = {
  readonly code: ScenarioPatchErrorCode;
  readonly message: string;
  readonly path?: string;
  readonly causeCode?: string;
};

export type ScenarioPatchSuccess = {
  readonly ok: true;
  readonly scenario: Scenario;
};

export type ScenarioPatchFailure = {
  readonly ok: false;
  readonly error: ScenarioPatchError;
};

export type ScenarioPatchOutcome = ScenarioPatchSuccess | ScenarioPatchFailure;

type JsonRecord = Record<string, JsonValue>;
type Scalar = string | number | boolean | null;
type ScalarKind = "boolean" | "null" | "number" | "string";

type ParsedPath = {
  readonly normalized: string;
  readonly segments: readonly string[];
};

const REQUEST_KEYS = ["patch", "scenario"] as const;
const ARRAY_INDEX = /^(?:0|[1-9][0-9]*)$/;
const RELATION_SCALAR_FIELDS = new Set([
  "resolvedDistanceMeters",
  "lineOfSightClear",
  "resolvedHitCount",
]);

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function failure(
  code: ScenarioPatchErrorCode,
  message: string,
  details: { readonly path?: string; readonly causeCode?: string } = {},
): ScenarioPatchFailure {
  return deepFreeze({
    ok: false,
    error: {
      code,
      message,
      ...(details.path === undefined ? {} : { path: details.path }),
      ...(details.causeCode === undefined ? {} : { causeCode: details.causeCode }),
    },
  });
}

function firstIssuePath(
  validation: Extract<ReturnType<typeof validateContract>, { readonly ok: false }>,
): string {
  return validation.issues[0]?.instancePath ?? "";
}

function prefixedPath(prefix: string, suffix: string): string {
  return suffix.length === 0 ? prefix : `${prefix}${suffix}`;
}

function decodePointerSegment(segment: string): string | undefined {
  let decoded = "";
  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index];
    if (character !== "~") {
      decoded += character;
      continue;
    }
    const escapeCode = segment[index + 1];
    if (escapeCode === "0") {
      decoded += "~";
    } else if (escapeCode === "1") {
      decoded += "/";
    } else {
      return undefined;
    }
    index += 1;
  }
  return decoded;
}

function encodePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isCanonicalArrayIndex(segment: string): boolean {
  return ARRAY_INDEX.test(segment);
}

function allowedSegments(segments: readonly string[]): boolean {
  if (segments.length === 3 && segments[0] === "attacker" && segments[1] === "configuration") {
    return segments[2] !== "";
  }
  if (
    segments.length === 4 &&
    segments[0] === "targets" &&
    isCanonicalArrayIndex(segments[1] ?? "") &&
    segments[2] === "configuration"
  ) {
    return segments[3] !== "";
  }
  if (
    segments.length === 4 &&
    segments[0] === "targetGraph" &&
    segments[1] === "relations" &&
    isCanonicalArrayIndex(segments[2] ?? "")
  ) {
    return RELATION_SCALAR_FIELDS.has(segments[3] ?? "");
  }
  if (segments.length === 2 && segments[0] === "initialState") {
    return segments[1] !== "";
  }
  if (
    segments.length === 4 &&
    segments[0] === "actionPlan" &&
    isCanonicalArrayIndex(segments[1] ?? "") &&
    segments[2] === "parameters"
  ) {
    return segments[3] !== "";
  }
  if (segments.length === 2 && segments[0] === "simulation") {
    return segments[1] === "timeLimitMs";
  }
  return (
    segments.length === 2 && segments[0] === "metrics" && isCanonicalArrayIndex(segments[1] ?? "")
  );
}

function parseAllowedPath(path: string): ParsedPath | undefined {
  if (!path.startsWith("/") || path === "/") {
    return undefined;
  }
  const encodedSegments = path.slice(1).split("/");
  const segments: string[] = [];
  for (const encoded of encodedSegments) {
    const segment = decodePointerSegment(encoded);
    if (segment === undefined) {
      return undefined;
    }
    segments.push(segment);
  }
  if (!allowedSegments(segments)) {
    return undefined;
  }
  return {
    normalized: `/${segments.map(encodePointerSegment).join("/")}`,
    segments: Object.freeze(segments),
  };
}

function isContainer(value: JsonValue): value is JsonRecord | JsonValue[] {
  return typeof value === "object" && value !== null;
}

function ownValue(container: JsonRecord | JsonValue[], segment: string): JsonValue | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(container, segment);
  return descriptor?.enumerable && Object.hasOwn(descriptor, "value")
    ? (descriptor.value as JsonValue)
    : undefined;
}

function resolveLeaf(
  document: JsonRecord,
  segments: readonly string[],
):
  | { readonly parent: JsonRecord | JsonValue[]; readonly key: string; readonly value: JsonValue }
  | undefined {
  let cursor: JsonValue = document;
  for (const segment of segments.slice(0, -1)) {
    if (!isContainer(cursor)) {
      return undefined;
    }
    const child = ownValue(cursor, segment);
    if (child === undefined) {
      return undefined;
    }
    cursor = child;
  }
  const key = segments.at(-1);
  if (key === undefined || !isContainer(cursor)) {
    return undefined;
  }
  const value = ownValue(cursor, key);
  return value === undefined ? undefined : { parent: cursor, key, value };
}

function scalarKind(value: JsonValue): ScalarKind | undefined {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    default:
      return undefined;
  }
}

function replaceOwnValue(parent: JsonRecord | JsonValue[], key: string, value: Scalar): void {
  Object.defineProperty(parent, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function exactArtifactRef(scenario: Scenario): ScenarioPatch["baseScenarioRef"] {
  return deepFreeze({
    kind: scenario.kind,
    schemaVersion: scenario.schemaVersion,
    id: scenario.id,
    revision: scenario.revision,
    contentHash: scenario.contentHash,
    gameBuild: scenario.gameBuild,
  });
}

export async function materializeScenarioPatch(
  request: MaterializeScenarioPatchRequest,
): Promise<ScenarioPatchOutcome> {
  let requestSnapshot: Record<string, JsonValue>;
  try {
    requestSnapshot = snapshotJsonObject(request);
  } catch {
    return failure(
      "scenario-patch-request-invalid",
      "Scenario Patch request must be a plain JSON object",
    );
  }
  const requestKeys = Object.keys(requestSnapshot).toSorted();
  if (
    requestKeys.length !== REQUEST_KEYS.length ||
    !requestKeys.every((key, index) => key === REQUEST_KEYS[index])
  ) {
    return failure(
      "scenario-patch-request-invalid",
      "Scenario Patch request has an invalid field set",
    );
  }

  try {
    const patchValidation = validateContract("scenario-patch", requestSnapshot.patch);
    if (!patchValidation.ok) {
      const issuePath = firstIssuePath(patchValidation);
      return failure("scenario-patch-invalid", "ScenarioPatch Contract validation failed", {
        path: prefixedPath("/patch", issuePath),
      });
    }
    const patch = deepFreeze(patchValidation.value);
    if (!(await verifyArtifactContentHash(patch))) {
      return failure(
        "scenario-patch-invalid",
        "ScenarioPatch contentHash does not match its content",
        {
          path: "/patch/contentHash",
          causeCode: "content-hash-mismatch",
        },
      );
    }

    const scenarioValidation = validateContract("scenario", requestSnapshot.scenario);
    if (!scenarioValidation.ok) {
      const issuePath = firstIssuePath(scenarioValidation);
      return failure("base-scenario-invalid", "Base Scenario Contract validation failed", {
        path: prefixedPath("/scenario", issuePath),
      });
    }
    const scenario = deepFreeze(scenarioValidation.value);
    if (!(await verifyArtifactContentHash(scenario))) {
      return failure(
        "base-scenario-invalid",
        "Base Scenario contentHash does not match its content",
        {
          path: "/scenario/contentHash",
          causeCode: "content-hash-mismatch",
        },
      );
    }
    if (!(await artifactMatchesRef(patch.baseScenarioRef, scenario))) {
      return failure(
        "base-scenario-reference-mismatch",
        "ScenarioPatch baseScenarioRef does not match the supplied base Scenario",
        { path: "/patch/baseScenarioRef" },
      );
    }
    if (patch.gameBuild !== scenario.gameBuild) {
      return failure(
        "scenario-patch-game-build-mismatch",
        "ScenarioPatch gameBuild does not match the supplied base Scenario",
        { path: "/patch/gameBuild" },
      );
    }
    if (
      patch.resultScenario.id === scenario.id &&
      patch.resultScenario.revision === scenario.revision
    ) {
      return failure(
        "scenario-patch-result-identity-conflict",
        "Materialized Scenario identity must differ from the base Scenario identity",
        { path: "/patch/resultScenario" },
      );
    }

    const candidate = snapshotJsonObject(scenario);
    const seenPaths = new Set<string>();
    for (const [index, operation] of patch.operations.entries()) {
      const operationPath = `/patch/operations/${index}`;
      const parsed = parseAllowedPath(operation.path);
      if (parsed === undefined) {
        return failure(
          "scenario-patch-path-invalid",
          "ScenarioPatch path is outside the supported canonical scalar allowlist",
          { path: `${operationPath}/path` },
        );
      }
      if (seenPaths.has(parsed.normalized)) {
        return failure(
          "scenario-patch-path-duplicate",
          "ScenarioPatch paths must be unique after JSON Pointer normalization",
          { path: `${operationPath}/path` },
        );
      }
      seenPaths.add(parsed.normalized);

      const leaf = resolveLeaf(candidate, parsed.segments);
      if (leaf === undefined) {
        return failure(
          "scenario-patch-path-missing",
          "ScenarioPatch path does not resolve to an existing Scenario field",
          { path: `${operationPath}/path` },
        );
      }
      const existingKind = scalarKind(leaf.value);
      if (existingKind === undefined) {
        return failure(
          "scenario-patch-target-non-scalar",
          "ScenarioPatch path must resolve to a scalar Scenario field",
          { path: `${operationPath}/path` },
        );
      }
      const replacementKind = scalarKind(operation.value);
      if (replacementKind !== existingKind) {
        return failure(
          "scenario-patch-value-kind-mismatch",
          "ScenarioPatch replacement must preserve the existing JSON scalar kind",
          { path: `${operationPath}/value` },
        );
      }
      if (canonicalizeJson(leaf.value) === canonicalizeJson(operation.value)) {
        return failure(
          "scenario-patch-no-op",
          "ScenarioPatch replacement must change the canonical scalar value",
          { path: `${operationPath}/value` },
        );
      }
      replaceOwnValue(leaf.parent, leaf.key, operation.value);
    }

    delete candidate.contentHash;
    candidate.id = patch.resultScenario.id;
    candidate.revision = patch.resultScenario.revision;
    candidate.createdFrom = snapshotJsonValue(exactArtifactRef(scenario));

    const withHash = await attachArtifactContentHash(candidate);
    const materializedValidation = validateContract("scenario", withHash);
    if (!materializedValidation.ok) {
      const issuePath = firstIssuePath(materializedValidation);
      return failure(
        "scenario-patch-construction-failed",
        "Materialized Scenario Contract validation failed",
        { path: prefixedPath("/scenario", issuePath) },
      );
    }
    const materialized = deepFreeze(materializedValidation.value);
    if (!(await verifyArtifactContentHash(materialized))) {
      return failure(
        "scenario-patch-construction-failed",
        "Materialized Scenario contentHash verification failed",
        { path: "/scenario/contentHash", causeCode: "content-hash-mismatch" },
      );
    }
    return deepFreeze({ ok: true, scenario: materialized });
  } catch {
    return failure("scenario-patch-construction-failed", "Scenario Patch materialization failed");
  }
}
