import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  executeExpectedAggregateRule,
  executeFixedMultishotRule,
  executeFixedPelletRule,
  executeResolvedRadialFalloffRule,
  executeResolvedStatusTickDamageRule,
  executeResolvedStatusTickScheduleRule,
  executeSequentialHitAggregateRule,
  executeSequentialPelletAggregateRule,
  executeSequentialStatusTickAggregateRule,
  executeRule,
  type ExpectedAggregateContext,
  type RuleContext,
  scaleDamageVector,
  sumDamageVector,
} from "./execution.ts";
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

function expectFloatingEqual(actual: number, expected: number): void {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(actual), Math.abs(expected)) * 64;
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
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
          expectFloatingEqual(sumDamageVector(scaled), expectedTotal * factor);
          for (const [id, value] of Object.entries(damage)) {
            expectFloatingEqual(scaled[id] ?? Number.NaN, value * factor);
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
  const fixedMultishot = loaded.resolveRule("rule.multishot.emit-fixed-hits");
  const fixedPellets = loaded.resolveRule("rule.pellet.emit-fixed-hits");
  const criticalRoll = loaded.resolveRule("rule.critical.resolve-tier-roll");
  const expectedCritical = loaded.resolveRule("rule.critical.resolve-expected-branches");
  const criticalScale = loaded.resolveRule("rule.critical.scale-tier");
  const armorRule = loaded.resolveRule("rule.defense.standard-armor");
  const commitHealth = loaded.resolveRule("rule.damage.commit-health");
  const aggregateExpected = loaded.resolveRule("rule.critical.aggregate-expected-branches");
  const aggregateMultishot = loaded.resolveRule("rule.multishot.aggregate-fixed-hits");
  const aggregatePellets = loaded.resolveRule("rule.pellet.aggregate-fixed-hits");
  const radialFalloff = loaded.resolveRule("rule.radial.apply-resolved-falloff");
  const statusSchedule = loaded.resolveRule("rule.status.schedule-resolved-ticks");
  const statusTick = loaded.resolveRule("rule.status.construct-resolved-tick");
  const aggregateStatusTicks = loaded.resolveRule("rule.status.aggregate-resolved-ticks");

  it("expands only bounded positive safe-integer fixed Multishot counts", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), (hitCount) => {
        const result = executeFixedMultishotRule(fixedMultishot, {
          hitCount,
          initialHealth: 1000,
          zeroDamage: { "damage.synthetic": 0 },
        });

        expect(result.parameters).toEqual({
          factor: 1,
          hitCount,
          maximumHits: 64,
        });
        expect(result.before).toEqual(result.after);
      }),
    );

    for (const hitCount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        executeFixedMultishotRule(fixedMultishot, {
          hitCount,
          initialHealth: 1000,
          zeroDamage: { "damage.synthetic": 0 },
        }),
      ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    }
    expect(() =>
      executeFixedMultishotRule(fixedMultishot, {
        hitCount: 65,
        initialHealth: 1000,
        zeroDamage: { "damage.synthetic": 0 },
      }),
    ).toThrowError(expect.objectContaining({ code: "execution-limit-exceeded" }));
  });

  it("expands only bounded positive safe-integer fixed pellet counts", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), (pelletCount) => {
        const result = executeFixedPelletRule(fixedPellets, {
          pelletCount,
          initialHealth: 1000,
          zeroDamage: { "damage.synthetic": 0 },
        });

        expect(result.parameters).toEqual({
          factor: 1,
          maximumPellets: 64,
          pelletCount,
        });
        expect(result.before).toEqual(result.after);
      }),
    );

    for (const pelletCount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        executeFixedPelletRule(fixedPellets, {
          pelletCount,
          initialHealth: 1000,
          zeroDamage: { "damage.synthetic": 0 },
        }),
      ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    }
    expect(() =>
      executeFixedPelletRule(fixedPellets, {
        pelletCount: 65,
        initialHealth: 1000,
        zeroDamage: { "damage.synthetic": 0 },
      }),
    ).toThrowError(expect.objectContaining({ code: "execution-limit-exceeded" }));
  });

  it("scales Radial damage only by a finite resolved multiplier in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1_000_000, noNaN: true }),
        (multiplier, damage) => {
          const result = executeResolvedRadialFalloffRule(radialFalloff, {
            currentDamage: { "damage.synthetic": damage },
            multiplier,
            health: 1000,
          });

          expect(result.after.damage["damage.synthetic"]).toBe(damage * multiplier);
          expect(result.after.health).toBe(1000);
          expect(result.factor).toBe(multiplier);
        },
      ),
    );

    for (const multiplier of [-1, 1.01, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(() =>
        executeResolvedRadialFalloffRule(radialFalloff, {
          currentDamage: { "damage.synthetic": 100 },
          multiplier,
          health: 1000,
        }),
      ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    }
  });

  it("schedules bounded resolved Status ticks and constructs explicit tick Damage", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 64 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (tickCount, tickIntervalMs, resolvedHealthDamagePerTick) => {
          const schedule = executeResolvedStatusTickScheduleRule(statusSchedule, {
            tickCount,
            tickIntervalMs,
            initialHealth: 1000,
            zeroDamage: { "damage.synthetic-status": 0 },
          });
          const tick = executeResolvedStatusTickDamageRule(statusTick, {
            resolvedHealthDamagePerTick,
            health: 1000,
          });

          expect(schedule.parameters).toEqual({
            factor: 1,
            maximumTicks: 64,
            tickCount,
            tickIntervalMs,
          });
          expect(tick.after).toEqual({
            damage: { "damage.synthetic-status": resolvedHealthDamagePerTick },
            damageTotal: resolvedHealthDamagePerTick,
            health: 1000,
          });
        },
      ),
    );

    expect(() =>
      executeResolvedStatusTickScheduleRule(statusSchedule, {
        tickCount: 65,
        tickIntervalMs: 1000,
        initialHealth: 1000,
        zeroDamage: { "damage.synthetic-status": 0 },
      }),
    ).toThrowError(expect.objectContaining({ code: "execution-limit-exceeded" }));
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        executeResolvedStatusTickDamageRule(statusTick, {
          resolvedHealthDamagePerTick: value,
          health: 1000,
        }),
      ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    }
  });

  it("aggregates resolved Status ticks with distinct tick parameters", () => {
    const result = executeSequentialStatusTickAggregateRule(aggregateStatusTicks, {
      initialHealth: 100,
      hits: [
        {
          id: "tick.status-0",
          index: 0,
          damage: { "damage.synthetic-status": 40 },
          healthBefore: 100,
          healthAfter: 60,
        },
        {
          id: "tick.status-1",
          index: 1,
          damage: { "damage.synthetic-status": 40 },
          healthBefore: 60,
          healthAfter: 20,
        },
      ],
    });

    expect(result.parameters).toMatchObject({
      tickCount: 2,
      "tick.0.id": "tick.status-0",
      "tick.1.id": "tick.status-1",
    });
    expect(result.after).toEqual({
      damage: { "damage.synthetic-status": 80 },
      damageTotal: 80,
      health: 20,
    });
  });

  it("aggregates ordered terminal Multishot hits and preserves sequential Health", () => {
    const result = executeSequentialHitAggregateRule(aggregateMultishot, {
      initialHealth: 250,
      hits: [
        {
          id: "hit.multishot-0",
          index: 0,
          damage: { "damage.synthetic-a": 40, "damage.synthetic-b": 60 },
          healthBefore: 250,
          healthAfter: 150,
        },
        {
          id: "hit.multishot-1",
          index: 1,
          damage: { "damage.synthetic-a": 40, "damage.synthetic-b": 60 },
          healthBefore: 150,
          healthAfter: 50,
        },
        {
          id: "hit.multishot-2",
          index: 2,
          damage: { "damage.synthetic-a": 40, "damage.synthetic-b": 60 },
          healthBefore: 50,
          healthAfter: 0,
        },
      ],
    });

    expect(result.after).toEqual({
      damage: { "damage.synthetic-a": 120, "damage.synthetic-b": 180 },
      damageTotal: 300,
      health: 0,
    });
    expect(result.parameters).toMatchObject({
      hitCount: 3,
      "hit.0.healthBefore": 250,
      "hit.0.healthAfter": 150,
      "hit.2.healthBefore": 50,
      "hit.2.healthAfter": 0,
    });
  });

  it("aggregates ordered terminal pellet hits through the distinct operation", () => {
    const result = executeSequentialPelletAggregateRule(aggregatePellets, {
      initialHealth: 250,
      hits: [
        {
          id: "pellet.shot-0",
          index: 0,
          damage: { "damage.synthetic": 100 },
          healthBefore: 250,
          healthAfter: 150,
        },
        {
          id: "pellet.shot-1",
          index: 1,
          damage: { "damage.synthetic": 100 },
          healthBefore: 150,
          healthAfter: 50,
        },
      ],
    });

    expect(result.after).toEqual({
      damage: { "damage.synthetic": 200 },
      damageTotal: 200,
      health: 50,
    });
  });

  it("rejects non-sequential or arithmetically inconsistent Multishot hit histories", () => {
    expect(() =>
      executeSequentialHitAggregateRule(aggregateMultishot, {
        initialHealth: 250,
        hits: [
          {
            id: "hit.multishot-0",
            index: 0,
            damage: { "damage.synthetic": 100 },
            healthBefore: 250,
            healthAfter: 149,
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));

    expect(() =>
      executeSequentialHitAggregateRule(aggregateMultishot, {
        initialHealth: 250,
        hits: [
          {
            id: "hit.multishot-0",
            index: 0,
            damage: { "damage.synthetic": 100 },
            healthBefore: 200,
            healthAfter: 100,
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
  });

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

  it("scales every non-negative Critical tier by 1 + tier * (multiplier - 1)", () => {
    fc.assert(
      fc.property(
        damageVectorArbitrary,
        fc.integer({ min: 10, max: 100 }).map((value) => value / 10),
        fc.integer({ min: 0, max: 100 }),
        (damage, criticalMultiplier, criticalTier) => {
          const result = executeRule(
            criticalScale,
            context(damage, {
              criticalTier,
              criticalMultiplier,
            }),
          );
          const expectedFactor = 1 + criticalTier * (criticalMultiplier - 1);

          expect(result).toMatchObject({
            outcome: "applied",
            factor: expectedFactor,
            matched: true,
          });
          expectFloatingEqual(result.after.damageTotal, sumDamageVector(damage) * expectedFactor);
          expect(result.parameters).toEqual({
            actualTier: criticalTier,
            criticalMultiplier,
            factor: expectedFactor,
          });
          expect(result.resolvedCriticalTier).toBeUndefined();
        },
      ),
    );
  });

  it("resolves adjacent Critical tiers and normalized probabilities from an explicit roll", () => {
    fc.assert(
      fc.property(
        damageVectorArbitrary,
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.integer({ min: 0, max: 999_999 }),
        (damage, chanceNumerator, rollNumerator) => {
          const criticalChance = chanceNumerator / 1_000_000;
          const explicitRoll = rollNumerator / 1_000_000;
          const baseTier = Math.floor(criticalChance);
          const fraction = criticalChance - baseTier;
          const nextTier = fraction === 0 ? baseTier : baseTier + 1;
          const baseTierProbability = 1 - fraction;
          const nextTierProbability = fraction;
          const tier0Probability =
            (baseTier === 0 ? baseTierProbability : 0) + (nextTier === 0 ? nextTierProbability : 0);
          const tier1Probability =
            (baseTier === 1 ? baseTierProbability : 0) + (nextTier === 1 ? nextTierProbability : 0);
          const result = executeRule(
            criticalRoll,
            context(damage, {
              criticalTier: null,
              criticalChance,
              criticalRoll: explicitRoll,
            }),
          );
          const expectedTier = explicitRoll < fraction ? nextTier : baseTier;

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
            baseTier,
            nextTier,
            fraction,
            baseTierProbability,
            nextTierProbability,
            tier0Probability,
            tier1Probability,
            resolvedTier: expectedTier,
            factor: 1,
          });
          expect(
            Number(result.parameters.baseTierProbability) +
              Number(result.parameters.nextTierProbability),
          ).toBeCloseTo(1, 15);
          expect([baseTier, nextTier]).toContain(result.resolvedCriticalTier);
        },
      ),
    );
  });

  it("preserves binary probabilities and uses strict comparison at tier boundaries", () => {
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

    expect(resolve(0, 0)).toMatchObject({
      resolvedCriticalTier: 0,
      parameters: {
        baseTier: 0,
        nextTier: 0,
        tier0Probability: 1,
        tier1Probability: 0,
      },
    });
    expect(resolve(0.25, 0.2)).toMatchObject({
      resolvedCriticalTier: 1,
      parameters: {
        baseTier: 0,
        nextTier: 1,
        tier0Probability: 0.75,
        tier1Probability: 0.25,
      },
    });
    expect(resolve(0.5, 0.5).resolvedCriticalTier).toBe(0);
    expect(resolve(0.5, 0.5 - Number.EPSILON).resolvedCriticalTier).toBe(1);
    expect(resolve(1, 1 - Number.EPSILON).resolvedCriticalTier).toBe(1);
    expect(resolve(1.25, 0.2)).toMatchObject({
      resolvedCriticalTier: 2,
      parameters: {
        baseTier: 1,
        nextTier: 2,
        baseTierProbability: 0.75,
        nextTierProbability: 0.25,
        tier0Probability: 0,
        tier1Probability: 0.75,
      },
    });
    expect(resolve(2, 0).resolvedCriticalTier).toBe(2);
  });

  it("resolves expected adjacent Critical branches without selecting a realized tier", () => {
    const damage = { "damage.synthetic": 1 };

    expect(
      executeRule(
        expectedCritical,
        context(damage, {
          criticalTier: null,
          criticalChance: 1.25,
          criticalRoll: null,
        }),
      ),
    ).toMatchObject({
      outcome: "applied",
      factor: 1,
      matched: true,
      parameters: {
        criticalChance: 1.25,
        baseTier: 1,
        nextTier: 2,
        fraction: 0.25,
        baseTierProbability: 0.75,
        nextTierProbability: 0.25,
        tier0Probability: 0,
        tier1Probability: 0.75,
        factor: 1,
      },
    });
    expect(
      executeRule(
        expectedCritical,
        context(damage, {
          criticalTier: null,
          criticalChance: 2,
          criticalRoll: null,
        }),
      ),
    ).toMatchObject({
      parameters: {
        baseTier: 2,
        nextTier: 2,
        fraction: 0,
        baseTierProbability: 1,
        nextTierProbability: 0,
      },
    });
    expect(
      executeRule(
        expectedCritical,
        context(damage, {
          criticalTier: null,
          criticalChance: 1.25,
          criticalRoll: null,
        }),
      ).resolvedCriticalTier,
    ).toBeUndefined();
  });

  it("rejects unrepresentable Critical chance and invalid rolls without clamping", () => {
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

    expect(() => resolve(Number.MAX_SAFE_INTEGER + 1, 0.5)).toThrowError(
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

  it("keeps all tiers at factor 1 when the Critical multiplier is 1", () => {
    const damage = { "damage.synthetic": 10 };
    for (const criticalTier of [0, 1, 2, 100, Number.MAX_SAFE_INTEGER]) {
      const result = executeRule(
        criticalScale,
        context(damage, { criticalTier, criticalMultiplier: 1 }),
      );
      expect(result.factor).toBe(1);
      expect(result.after.damage).toEqual(damage);
    }
  });

  it("rejects an unrepresentable Critical multiplier and scaled-damage overflow", () => {
    expect(() =>
      executeRule(
        criticalScale,
        context(
          { "damage.synthetic": 1 },
          {
            criticalTier: Number.MAX_SAFE_INTEGER,
            criticalMultiplier: Number.MAX_VALUE,
          },
        ),
      ),
    ).toThrowError(expect.objectContaining({ code: "unsupported-critical-multiplier" }));

    expect(() =>
      executeRule(
        criticalScale,
        context(
          { "damage.synthetic": Number.MAX_VALUE },
          {
            criticalTier: 2,
            criticalMultiplier: 2,
          },
        ),
      ),
    ).toThrowError(expect.objectContaining({ code: "arithmetic-invalid" }));
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

  it("aggregates terminal expected branches after per-branch Health commit", () => {
    const branches = [
      {
        id: "branch.critical-tier-1",
        tier: 1,
        weight: 0.75,
        damage: {
          "damage.impact": 50,
          "damage.puncture": 25,
        },
        health: 925,
      },
      {
        id: "branch.critical-tier-2",
        tier: 2,
        weight: 0.25,
        damage: {
          "damage.impact": 100,
          "damage.puncture": 50,
        },
        health: 850,
      },
    ] satisfies ExpectedAggregateContext["branches"];
    const original = structuredClone(branches);
    const result = executeExpectedAggregateRule(aggregateExpected, {
      initialHealth: 1_000,
      branches,
    });

    expect(result).toMatchObject({
      outcome: "applied",
      matched: true,
      factor: 1,
      parameters: {
        branchCount: 2,
        weightTotal: 1,
        expectedHealth: 906.25,
        "branch.0.id": "branch.critical-tier-1",
        "branch.0.tier": 1,
        "branch.0.weight": 0.75,
        "branch.0.damageTotal": 75,
        "branch.0.health": 925,
        "branch.0.damage.damage.impact": 50,
        "branch.0.damage.damage.puncture": 25,
        "branch.1.id": "branch.critical-tier-2",
        "branch.1.tier": 2,
        "branch.1.weight": 0.25,
        "branch.1.damageTotal": 150,
        "branch.1.health": 850,
        "branch.1.damage.damage.impact": 100,
        "branch.1.damage.damage.puncture": 50,
      },
      before: {
        damage: {
          "damage.impact": 62.5,
          "damage.puncture": 31.25,
        },
        damageTotal: 93.75,
        health: 1_000,
      },
      after: {
        damage: {
          "damage.impact": 62.5,
          "damage.puncture": 31.25,
        },
        damageTotal: 93.75,
        health: 906.25,
      },
    });
    expect(branches).toEqual(original);
    expect(Object.isFrozen(result.after.damage)).toBe(true);
  });

  it("accepts one certain expected branch without inventing a duplicate tier", () => {
    const result = executeExpectedAggregateRule(aggregateExpected, {
      initialHealth: 100,
      branches: [
        {
          id: "branch.critical-tier-2",
          tier: 2,
          weight: 1,
          damage: { "damage.synthetic": 80 },
          health: 20,
        },
      ],
    });

    expect(result.after).toEqual({
      damage: { "damage.synthetic": 80 },
      damageTotal: 80,
      health: 20,
    });
    expect(result.parameters.branchCount).toBe(1);
  });

  it("rejects malformed, ambiguous, or non-normalized expected branches", () => {
    const branch = {
      id: "branch.critical-tier-1",
      tier: 1,
      weight: 1,
      damage: { "damage.synthetic": 10 },
      health: 90,
    };
    const aggregate = (overrides: Partial<ExpectedAggregateContext>) =>
      executeExpectedAggregateRule(aggregateExpected, {
        initialHealth: 100,
        branches: [branch],
        ...overrides,
      });

    expect(() => aggregate({ branches: [] })).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() =>
      aggregate({
        branches: [{ ...branch, tier: Number.MAX_SAFE_INTEGER + 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    expect(() =>
      aggregate({
        branches: [{ ...branch, weight: 0 }],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    expect(() =>
      aggregate({
        branches: [
          { ...branch, weight: 0.5 },
          { ...branch, weight: 0.5 },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    expect(() =>
      aggregate({
        branches: [
          { ...branch, weight: 0.5 },
          {
            ...branch,
            id: "branch.same-tier",
            weight: 0.5,
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    expect(() =>
      aggregate({
        branches: [{ ...branch, weight: 0.75 }],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    expect(() =>
      aggregate({
        branches: [
          { ...branch, weight: 0.5 },
          {
            ...branch,
            id: "branch.critical-tier-2",
            tier: 2,
            weight: 0.5,
            damage: { "damage.other": 10 },
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
  });

  it("rejects non-finite weighted aggregate arithmetic and the wrong executor surface", () => {
    expect(() =>
      executeExpectedAggregateRule(aggregateExpected, {
        initialHealth: Number.MAX_VALUE,
        branches: [
          {
            id: "branch.critical-tier-1",
            tier: 1,
            weight: 2,
            damage: { "damage.synthetic": Number.MAX_VALUE },
            health: Number.MAX_VALUE,
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "arithmetic-invalid" }));
    expect(() =>
      executeExpectedAggregateRule(directHit, {
        initialHealth: 100,
        branches: [
          {
            id: "branch.critical-tier-0",
            tier: 0,
            weight: 1,
            damage: { "damage.synthetic": 10 },
            health: 90,
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-rule" }));
  });

  it("rejects invalid context and unknown operations with structured errors", () => {
    const damage = { "damage.synthetic": 1 };
    expect(() => executeRule(criticalScale, context(damage, { criticalTier: -1 }))).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() => executeRule(criticalScale, context(damage, { criticalTier: 0.5 }))).toThrowError(
      expect.objectContaining({ code: "invalid-context" }),
    );
    expect(() =>
      executeRule(criticalScale, context(damage, { criticalTier: Number.MAX_SAFE_INTEGER + 1 })),
    ).toThrowError(expect.objectContaining({ code: "invalid-context" }));
    expect(() => executeRule(criticalScale, context(damage, { criticalTier: null }))).toThrowError(
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
