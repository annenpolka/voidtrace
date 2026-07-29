import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { executeRule, type RuleContext, scaleDamageVector, sumDamageVector } from "./execution.ts";
import { loadRuleset } from "./ruleset.ts";

const damageVectorArbitrary = fc
  .uniqueArray(
    fc.record({
      id: fc.integer({ min: 0, max: 100 }).map((id) => `damage.synthetic-${id}`),
      value: fc.integer({ min: 0, max: 1_000_000 }),
    }),
    {
      minLength: 1,
      maxLength: 8,
      selector: ({ id }) => id,
    },
  )
  .map((components) => Object.fromEntries(components.map(({ id, value }) => [id, value])));

function context(
  currentDamage: Readonly<Record<string, number>>,
  overrides: Partial<RuleContext> = {},
): RuleContext {
  return {
    baseDamage: currentDamage,
    currentDamage,
    criticalTier: 0,
    criticalChance: 0,
    criticalRoll: null,
    criticalMultiplier: 2,
    armor: 0,
    health: 1_000_000,
    ...overrides,
  };
}

describe("DamageVector operations", () => {
  it("sums components and scales every component without mutating input", () => {
    fc.assert(
      fc.property(
        damageVectorArbitrary,
        fc.integer({ min: 0, max: 100 }).map((value) => value / 10),
        (damage, factor) => {
          const original = structuredClone(damage);
          const scaled = scaleDamageVector(damage, factor);
          const expectedTotal = Object.values(damage).reduce((total, value) => total + value, 0);

          expect(sumDamageVector(damage)).toBe(expectedTotal);
          expect(sumDamageVector(scaled)).toBeCloseTo(expectedTotal * factor, 7);
          for (const [id, value] of Object.entries(damage)) {
            expect(scaled[id]).toBeCloseTo(value * factor, 10);
          }
          expect(damage).toEqual(original);
          expect(Object.isFrozen(scaled)).toBe(true);
        },
      ),
    );
  });

  it("rejects empty, negative, and non-finite vectors", () => {
    expect(() => sumDamageVector({})).toThrowError(
      expect.objectContaining({ code: "invalid-damage-vector" }),
    );
    expect(() => sumDamageVector({ "damage.synthetic": -1 })).toThrowError(
      expect.objectContaining({ code: "invalid-damage-vector" }),
    );
    expect(() => sumDamageVector({ "damage.synthetic": Number.NaN })).toThrowError(
      expect.objectContaining({ code: "invalid-damage-vector" }),
    );
  });
});

describe("generated core Rule execution", async () => {
  const loaded = await loadRuleset();
  const directHit = loaded.resolveRule("rule.damage.direct-hit");
  const criticalRoll = loaded.resolveRule("rule.critical.resolve-binary-roll");
  const criticalTier0 = loaded.resolveRule("rule.critical.fixed-tier-0");
  const criticalTier1 = loaded.resolveRule("rule.critical.fixed-tier-1");
  const armorRule = loaded.resolveRule("rule.defense.standard-armor");
  const commitHealth = loaded.resolveRule("rule.damage.commit-health");

  it("copies base damage and exposes trace-ready scalar before/after values", () => {
    fc.assert(
      fc.property(damageVectorArbitrary, damageVectorArbitrary, (baseDamage, currentDamage) => {
        const result = executeRule(
          directHit,
          context(currentDamage, {
            baseDamage,
          }),
        );

        expect(result.outcome).toBe("applied");
        expect(result.factor).toBe(1);
        expect(result.before.damageTotal).toBe(sumDamageVector(currentDamage));
        expect(result.after.damage).toEqual(baseDamage);
        expect(result.after.damageTotal).toBe(sumDamageVector(baseDamage));
      }),
    );
  });

  it("applies only the fixed Critical tier candidate whose predicate matches", () => {
    fc.assert(
      fc.property(
        damageVectorArbitrary,
        fc.integer({ min: 10, max: 100 }).map((value) => value / 10),
        (damage, criticalMultiplier) => {
          const tier0Applied = executeRule(criticalTier0, context(damage, { criticalTier: 0 }));
          const tier1Rejected = executeRule(criticalTier1, context(damage, { criticalTier: 0 }));
          const tier0Rejected = executeRule(criticalTier0, context(damage, { criticalTier: 1 }));
          const tier1Applied = executeRule(
            criticalTier1,
            context(damage, {
              criticalTier: 1,
              criticalMultiplier,
            }),
          );

          expect(tier0Applied).toMatchObject({ outcome: "applied", factor: 1, matched: true });
          expect(tier1Rejected).toMatchObject({
            outcome: "predicate-rejected",
            factor: null,
            matched: false,
          });
          expect(tier0Rejected).toMatchObject({
            outcome: "predicate-rejected",
            factor: null,
            matched: false,
          });
          expect(tier1Applied).toMatchObject({
            outcome: "applied",
            factor: criticalMultiplier,
            matched: true,
          });
          expect(tier0Applied.resolvedCriticalTier).toBeUndefined();
          expect(tier1Applied.resolvedCriticalTier).toBeUndefined();
        },
      ),
    );
  });

  it("resolves a binary Critical tier and its probabilities from an explicit roll", () => {
    fc.assert(
      fc.property(
        damageVectorArbitrary,
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 999_999 }),
        (damage, chanceNumerator, rollNumerator) => {
          const criticalChance = chanceNumerator / 1_000_000;
          const explicitRoll = rollNumerator / 1_000_000;
          const result = executeRule(
            criticalRoll,
            context(damage, {
              criticalTier: null,
              criticalChance,
              criticalRoll: explicitRoll,
            }),
          );
          const expectedTier = explicitRoll < criticalChance ? 1 : 0;

          expect(result).toMatchObject({
            outcome: "applied",
            factor: 1,
            matched: true,
            resolvedCriticalTier: expectedTier,
          });
          expect(result.before).toEqual(result.after);
          expect(result.parameters).toEqual({
            criticalChance,
            criticalRoll: explicitRoll,
            tier0Probability: 1 - criticalChance,
            tier1Probability: criticalChance,
            resolvedTier: expectedTier,
            factor: 1,
          });
          expect(
            Number(result.parameters.tier0Probability) + Number(result.parameters.tier1Probability),
          ).toBeCloseTo(1, 15);
        },
      ),
    );
  });

  it("uses strict roll comparison at the binary Critical boundaries", () => {
    const damage = { "damage.synthetic": 1 };
    const resolve = (criticalChance: number, explicitRoll: number) =>
      executeRule(
        criticalRoll,
        context(damage, {
          criticalTier: null,
          criticalChance,
          criticalRoll: explicitRoll,
        }),
      );

    expect(resolve(0, 0).resolvedCriticalTier).toBe(0);
    expect(resolve(0.5, 0.5).resolvedCriticalTier).toBe(0);
    expect(resolve(0.5, 0.5 - Number.EPSILON).resolvedCriticalTier).toBe(1);
    expect(resolve(1, 1 - Number.EPSILON).resolvedCriticalTier).toBe(1);
  });

  it("rejects out-of-domain binary Critical chance and rolls without clamping", () => {
    const damage = { "damage.synthetic": 1 };
    const resolve = (criticalChance: number, explicitRoll: number | null) =>
      executeRule(
        criticalRoll,
        context(damage, {
          criticalTier: null,
          criticalChance,
          criticalRoll: explicitRoll,
        }),
      );

    expect(() => resolve(1 + Number.EPSILON, 0.5)).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() => resolve(0.5, null)).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() => resolve(0.5, -Number.EPSILON)).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() => resolve(0.5, 1)).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() => resolve(0.5, Number.NaN)).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
  });

  it("scales tier 1 damage by the declared Critical multiplier", () => {
    fc.assert(
      fc.property(
        damageVectorArbitrary,
        fc.integer({ min: 10, max: 100 }).map((value) => value / 10),
        (damage, criticalMultiplier) => {
          const result = executeRule(
            criticalTier1,
            context(damage, {
              criticalTier: 1,
              criticalMultiplier,
            }),
          );

          expect(result.outcome).toBe("applied");
          expect(result.factor).toBe(criticalMultiplier);
          expect(result.after.damageTotal).toBeCloseTo(
            sumDamageVector(damage) * criticalMultiplier,
            7,
          );
        },
      ),
    );
  });

  it("is monotonic in Armor and gives factor 0.5 at Armor 300", () => {
    fc.assert(
      fc.property(
        damageVectorArbitrary,
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (damage, leftArmor, rightArmor) => {
          const lowerArmor = Math.min(leftArmor, rightArmor);
          const higherArmor = Math.max(leftArmor, rightArmor);
          const lower = executeRule(armorRule, context(damage, { armor: lowerArmor }));
          const higher = executeRule(armorRule, context(damage, { armor: higherArmor }));

          expect(higher.after.damageTotal).toBeLessThanOrEqual(
            lower.after.damageTotal + Number.EPSILON,
          );
        },
      ),
    );

    fc.assert(
      fc.property(damageVectorArbitrary, (damage) => {
        const armor300 = executeRule(armorRule, context(damage, { armor: 300 }));
        expect(armor300.factor).toBe(0.5);
        expect(armor300.after.damageTotal).toBeCloseTo(sumDamageVector(damage) * 0.5, 10);
      }),
    );
  });

  it("commits final damage to Health without making Health negative", () => {
    fc.assert(
      fc.property(
        damageVectorArbitrary,
        fc.integer({ min: 0, max: 10_000_000 }),
        (damage, health) => {
          const result = executeRule(commitHealth, context(damage, { health }));
          const total = sumDamageVector(damage);

          expect(result.outcome).toBe("applied");
          expect(result.after.health).toBe(Math.max(0, health - total));
          expect(result.after.damage).toEqual(damage);
          expect(result.parameters.healthBefore).toBe(health);
          expect(result.parameters.healthAfter).toBe(result.after.health);
        },
      ),
    );
  });

  it("rejects invalid context and unknown operations with structured errors", () => {
    const damage = { "damage.synthetic": 1 };
    expect(() =>
      executeRule(criticalTier0, context(damage, { criticalTier: 2 as never })),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    expect(() => executeRule(criticalTier0, context(damage, { criticalTier: null }))).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() => executeRule(armorRule, context(damage, { armor: -1 }))).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() =>
      executeRule(
        {
          ...directHit,
          operation: { kind: "damage-vector.unknown" },
        } as never,
        context(damage),
      ),
    ).toThrowError(expect.objectContaining({ code: "unknown-operation" }));
  });
});
