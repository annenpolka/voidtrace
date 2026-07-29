import { attachArtifactContentHash, validateContract } from "@voidtrace/contracts";
import { describe, expect, it } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import { loadCatalogSnapshot } from "./catalog.ts";

function first<T>(values: ReadonlyArray<T>, description: string): T {
  const value = values[0];
  if (value === undefined) {
    throw new Error(`Expected ${description} fixture`);
  }
  return value;
}

describe("loadCatalogSnapshot", () => {
  it("validates contract and hash, snapshots caller data, and deeply freezes it", async () => {
    expect(validateContract("catalog-snapshot", catalogFixture).ok).toBe(true);

    const callerValue = structuredClone(catalogFixture);
    const catalog = await loadCatalogSnapshot(callerValue);
    const callerWeapon = first(callerValue.weapons, "caller weapon");
    const snapshotWeapon = first(catalog.snapshot.weapons, "snapshot weapon");
    const snapshotAttackMode = first(snapshotWeapon.attackModes, "snapshot attack mode");
    const snapshotMod = first(catalog.snapshot.mods, "snapshot mod");
    callerWeapon.label = "Mutated after loading";

    expect(snapshotWeapon.label).toBe("Synthetic Aperture Fixture");
    expect(catalog.snapshot).not.toBe(callerValue);
    expect(Object.isFrozen(catalog.snapshot)).toBe(true);
    expect(Object.isFrozen(catalog.snapshot.weapons)).toBe(true);
    expect(Object.isFrozen(snapshotWeapon)).toBe(true);
    expect(Object.isFrozen(snapshotWeapon.attackModes)).toBe(true);
    expect(Object.isFrozen(snapshotAttackMode.baseDamage)).toBe(true);
    expect(Object.isFrozen(first(catalog.snapshot.targets, "snapshot target"))).toBe(true);
    expect(Object.isFrozen(snapshotMod.effects)).toBe(true);
    expect(Reflect.set(snapshotWeapon, "label", "Mutation attempt")).toBe(false);
  });

  it("reports generated-contract failures before building indexes", async () => {
    const invalid = {
      ...catalogFixture,
      targets: [
        {
          ...first(catalogFixture.targets, "target"),
          baseArmor: -1,
        },
      ],
    };

    await expect(loadCatalogSnapshot(invalid)).rejects.toThrowError(
      expect.objectContaining({
        code: "contract-invalid",
      }),
    );
  });

  it("rejects a content hash that does not match canonical content", async () => {
    const invalid = {
      ...catalogFixture,
      contentHash: `sha256:${"0".repeat(64)}`,
    };

    await expect(loadCatalogSnapshot(invalid)).rejects.toThrowError(
      expect.objectContaining({
        code: "content-hash-mismatch",
      }),
    );
  });

  it("rejects duplicate stable IDs across Catalog entity kinds", async () => {
    const target = first(catalogFixture.targets, "target");
    const duplicate = {
      ...catalogFixture,
      mods: [
        {
          ...first(catalogFixture.mods, "mod"),
          id: target.id,
        },
        ...catalogFixture.mods.slice(1),
      ],
    };

    await expect(loadCatalogSnapshot(duplicate)).rejects.toThrow(
      `Duplicate Catalog ID ${target.id}`,
    );
  });

  it("rejects attack modes with an empty damage vector", async () => {
    const weapon = first(catalogFixture.weapons, "weapon");
    const attackMode = first(weapon.attackModes, "attack mode");
    const emptyDamageVector = {
      ...catalogFixture,
      weapons: [
        {
          ...weapon,
          attackModes: [
            {
              ...attackMode,
              baseDamage: {},
            },
          ],
        },
      ],
    };

    await expect(loadCatalogSnapshot(emptyDamageVector)).rejects.toThrow(
      `Attack mode ${attackMode.id} must define at least one baseDamage component`,
    );
  });

  it("resolves typed IDs without interpreting data-only mod effects", async () => {
    const catalog = await loadCatalogSnapshot(catalogFixture);
    const weapon = first(catalogFixture.weapons, "weapon");
    const attackMode = first(weapon.attackModes, "attack mode");
    const target = first(catalogFixture.targets, "target");
    const firstMod = first(catalogFixture.mods, "mod");
    const modIds = catalogFixture.mods.map((mod) => mod.id);

    const resolved = catalog.resolveReferences({
      weaponId: weapon.id,
      attackModeId: attackMode.id,
      targetId: target.id,
      modIds,
    });

    expect(resolved.weapon).toBe(catalog.resolveWeapon(weapon.id));
    expect(resolved.attackMode).toBe(catalog.resolveAttackMode(attackMode.id));
    expect(resolved.target).toBe(catalog.resolveTarget(target.id));
    expect(resolved.mods.map((mod) => mod.id)).toEqual(modIds);
    expect(first(resolved.mods, "resolved mod").effects).toEqual(firstMod.effects);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.mods)).toBe(true);
  });

  it("rejects unknown, duplicate, and ownership-mismatched references", async () => {
    const firstWeapon = first(catalogFixture.weapons, "weapon");
    const firstAttackMode = first(firstWeapon.attackModes, "attack mode");
    const secondAttackMode = {
      ...firstAttackMode,
      id: "attack-mode.synthetic-secondary.primary",
      label: "Synthetic Secondary Hitscan Fixture",
    };
    const { contentHash: _contentHash, ...catalogWithoutHash } = catalogFixture;
    const modifiedCatalog = await attachArtifactContentHash({
      ...catalogWithoutHash,
      weapons: [
        firstWeapon,
        {
          id: "weapon.synthetic-secondary",
          label: "Synthetic Secondary Fixture",
          attackModes: [secondAttackMode],
        },
      ],
    });
    const catalog = await loadCatalogSnapshot(modifiedCatalog);
    const targetId = first(catalogFixture.targets, "target").id;
    const modId = first(catalogFixture.mods, "mod").id;

    expect(() => catalog.resolveTarget("target.synthetic-unknown")).toThrow(
      "Unknown Catalog target ID: target.synthetic-unknown",
    );
    expect(() =>
      catalog.resolveReferences({
        weaponId: firstWeapon.id,
        attackModeId: secondAttackMode.id,
        targetId,
        modIds: [],
      }),
    ).toThrow(`Attack mode ${secondAttackMode.id} is not owned by weapon ${firstWeapon.id}`);
    expect(() =>
      catalog.resolveReferences({
        weaponId: firstWeapon.id,
        attackModeId: firstAttackMode.id,
        targetId,
        modIds: [modId, modId],
      }),
    ).toThrow(`Duplicate Catalog mod reference: ${modId}`);
  });
});
