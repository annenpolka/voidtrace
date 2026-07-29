import {
  type CatalogSnapshot,
  isStableId,
  type ValidationIssue,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";

export type WeaponDefinition = CatalogSnapshot["weapons"][number];
export type AttackModeDefinition = WeaponDefinition["attackModes"][number];
export type TargetDefinition = CatalogSnapshot["targets"][number];
export type ModDefinition = CatalogSnapshot["mods"][number];

export type CatalogReferences = {
  readonly weaponId: string;
  readonly attackModeId: string;
  readonly targetId: string;
  readonly modIds: ReadonlyArray<string>;
};

export type ResolvedCatalogReferences = {
  readonly weapon: WeaponDefinition;
  readonly attackMode: AttackModeDefinition;
  readonly target: TargetDefinition;
  readonly mods: ReadonlyArray<ModDefinition>;
};

export type Catalog = {
  readonly snapshot: CatalogSnapshot;
  resolveWeapon(id: string): WeaponDefinition;
  resolveAttackMode(id: string): AttackModeDefinition;
  resolveTarget(id: string): TargetDefinition;
  resolveMod(id: string): ModDefinition;
  resolveReferences(references: CatalogReferences): ResolvedCatalogReferences;
};

export type CatalogErrorCode =
  | "contract-invalid"
  | "content-hash-mismatch"
  | "duplicate-id"
  | "empty-damage-vector"
  | "invalid-reference"
  | "duplicate-reference";

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;

  constructor(code: CatalogErrorCode, message: string) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
  }
}

type EntityKind = "catalog snapshot" | "weapon" | "attack mode" | "target" | "mod";

function formatContractIssues(issues: ReadonlyArray<ValidationIssue>): string {
  return issues.map((issue) => `${issue.instancePath || "/"}: ${issue.message}`).join("; ");
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function registerId(kindsById: Map<string, EntityKind>, id: string, entityKind: EntityKind): void {
  const previousKind = kindsById.get(id);
  if (previousKind !== undefined) {
    throw new CatalogError(
      "duplicate-id",
      `Duplicate Catalog ID ${id}: used by both ${previousKind} and ${entityKind}`,
    );
  }
  kindsById.set(id, entityKind);
}

function requireReference<T>(
  entries: ReadonlyMap<string, T>,
  entityKind: EntityKind,
  id: unknown,
): T {
  if (!isStableId(id)) {
    throw new CatalogError(
      "invalid-reference",
      `Invalid Catalog ${entityKind} reference: ${String(id)}`,
    );
  }

  const value = entries.get(id);
  if (value === undefined) {
    throw new CatalogError("invalid-reference", `Unknown Catalog ${entityKind} ID: ${id}`);
  }
  return value;
}

/**
 * Validates, behavior-free snapshots, semantically indexes, and deeply freezes a CatalogSnapshot.
 *
 * This package deliberately does not interpret or execute modifier effects.
 */
export async function loadCatalogSnapshot(value: unknown): Promise<Catalog> {
  const validation = validateContract("catalog-snapshot", value);
  if (!validation.ok) {
    throw new CatalogError(
      "contract-invalid",
      `CatalogSnapshot contract validation failed: ${formatContractIssues(validation.issues)}`,
    );
  }

  const snapshot = validation.value;
  const kindsById = new Map<string, EntityKind>();
  const weapons = new Map<string, WeaponDefinition>();
  const attackModes = new Map<string, AttackModeDefinition>();
  const attackModeOwners = new Map<string, string>();
  const targets = new Map<string, TargetDefinition>();
  const mods = new Map<string, ModDefinition>();

  registerId(kindsById, snapshot.id, "catalog snapshot");

  for (const weapon of snapshot.weapons) {
    registerId(kindsById, weapon.id, "weapon");
    weapons.set(weapon.id, weapon);

    for (const attackMode of weapon.attackModes) {
      registerId(kindsById, attackMode.id, "attack mode");
      if (Object.keys(attackMode.baseDamage).length === 0) {
        throw new CatalogError(
          "empty-damage-vector",
          `Attack mode ${attackMode.id} must define at least one baseDamage component`,
        );
      }
      attackModes.set(attackMode.id, attackMode);
      attackModeOwners.set(attackMode.id, weapon.id);
    }
  }

  for (const target of snapshot.targets) {
    registerId(kindsById, target.id, "target");
    targets.set(target.id, target);
  }

  for (const mod of snapshot.mods) {
    registerId(kindsById, mod.id, "mod");
    mods.set(mod.id, mod);
  }

  deepFreeze(snapshot);
  if (!(await verifyArtifactContentHash(snapshot))) {
    throw new CatalogError(
      "content-hash-mismatch",
      `CatalogSnapshot contentHash does not match canonical content: ${snapshot.id}`,
    );
  }

  const resolveWeapon = (id: string): WeaponDefinition => requireReference(weapons, "weapon", id);
  const resolveAttackMode = (id: string): AttackModeDefinition =>
    requireReference(attackModes, "attack mode", id);
  const resolveTarget = (id: string): TargetDefinition => requireReference(targets, "target", id);
  const resolveMod = (id: string): ModDefinition => requireReference(mods, "mod", id);

  const resolveReferences = (references: CatalogReferences): ResolvedCatalogReferences => {
    const weapon = resolveWeapon(references.weaponId);
    const attackMode = resolveAttackMode(references.attackModeId);
    if (attackModeOwners.get(attackMode.id) !== weapon.id) {
      throw new CatalogError(
        "invalid-reference",
        `Attack mode ${attackMode.id} is not owned by weapon ${weapon.id}`,
      );
    }

    const target = resolveTarget(references.targetId);
    const seenModIds = new Set<string>();
    const resolvedMods = references.modIds.map((id) => {
      if (seenModIds.has(id)) {
        throw new CatalogError("duplicate-reference", `Duplicate Catalog mod reference: ${id}`);
      }
      seenModIds.add(id);
      return resolveMod(id);
    });

    return Object.freeze({
      weapon,
      attackMode,
      target,
      mods: Object.freeze(resolvedMods),
    });
  };

  return Object.freeze({
    snapshot,
    resolveWeapon,
    resolveAttackMode,
    resolveTarget,
    resolveMod,
    resolveReferences,
  });
}
