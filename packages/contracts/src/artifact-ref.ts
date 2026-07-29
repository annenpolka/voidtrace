import type { ArtifactRef } from "@voidtrace/spec-artifacts/contracts";
import { snapshotJsonObject } from "./canonical-json.ts";
import { type ContentHashedArtifact, verifyArtifactContentHash } from "./fingerprint.ts";
import { validateContract } from "./validator.ts";

export type ReferencedArtifact = ContentHashedArtifact & {
  readonly kind: string;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly gameBuild: string;
};

const ARTIFACT_REF_FIELDS = [
  "kind",
  "schemaVersion",
  "id",
  "revision",
  "contentHash",
  "gameBuild",
] as const;

function projectArtifactRef(
  artifact: ReferencedArtifact,
): { artifact: ReferencedArtifact; reference: ArtifactRef } | undefined {
  let snapshot: ReturnType<typeof snapshotJsonObject>;
  try {
    snapshot = snapshotJsonObject(artifact);
  } catch {
    return undefined;
  }
  if (ARTIFACT_REF_FIELDS.some((field) => !Object.hasOwn(snapshot, field))) {
    return undefined;
  }

  const projection = {
    kind: snapshot.kind,
    schemaVersion: snapshot.schemaVersion,
    id: snapshot.id,
    revision: snapshot.revision,
    contentHash: snapshot.contentHash,
    gameBuild: snapshot.gameBuild,
  };
  const validation = validateContract("artifact-ref", projection);
  return validation.ok
    ? {
        artifact: snapshot as unknown as ReferencedArtifact,
        reference: validation.value,
      }
    : undefined;
}

export async function artifactMatchesRef(
  reference: ArtifactRef,
  artifact: ReferencedArtifact,
): Promise<boolean> {
  const referenceValidation = validateContract("artifact-ref", reference);
  const projected = projectArtifactRef(artifact);
  if (!referenceValidation.ok || !projected) {
    return false;
  }

  const validatedReference = referenceValidation.value;
  return (
    validatedReference.kind === projected.reference.kind &&
    validatedReference.schemaVersion === projected.reference.schemaVersion &&
    validatedReference.id === projected.reference.id &&
    validatedReference.revision === projected.reference.revision &&
    validatedReference.contentHash === projected.reference.contentHash &&
    validatedReference.gameBuild === projected.reference.gameBuild &&
    (await verifyArtifactContentHash(projected.artifact))
  );
}
