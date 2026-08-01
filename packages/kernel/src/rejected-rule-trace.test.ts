import {
  attachArtifactContentHash,
  canonicalizeJson,
  verifyArtifactContentHash,
  verifyResultTraceIntegrity,
} from "@voidtrace/contracts";
import { loadCoreRuleset } from "@voidtrace/rules";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import probabilityExpectedFixture from "../../../data/fixtures/golden/probability-critical-armor.expected.json" with {
  type: "json",
};
import probabilityScenarioFixture from "../../../data/fixtures/golden/probability-critical-armor.scenario.json" with {
  type: "json",
};
import sharedRollExpectedFixture from "../../../data/fixtures/golden/resolved-shared-roll-direct-radial-impact.expected.json" with {
  type: "json",
};
import sharedRollScenarioFixture from "../../../data/fixtures/golden/resolved-shared-roll-direct-radial-impact.scenario.json" with {
  type: "json",
};
import { evaluateScenario } from "./evaluate.ts";

const CRITICAL_ROLL_CANDIDATES = [
  "rule.impact.resolve-shared-critical-roll",
  "rule.critical.resolve-tier-roll",
] as const;

async function rehash<T extends { contentHash: string }>(
  value: T,
): Promise<Omit<T, "contentHash"> & { readonly contentHash: string }> {
  const { contentHash: _contentHash, ...withoutHash } = value;
  return attachArtifactContentHash(withoutHash);
}

function expectPredicateRejection(
  decision: unknown,
  options: {
    readonly ruleId: string;
    readonly actualEventKind: string;
    readonly expectedEventKind: string;
  },
): void {
  expect(decision).toMatchObject({
    outcome: "rejected",
    phase: "critical.roll",
    ruleId: options.ruleId,
    matched: false,
    rejectionStage: "predicate",
  });
  const rejected = decision as {
    readonly reads?: unknown;
    readonly rejectionReason?: unknown;
  };
  expect(rejected.rejectionReason).toEqual({
    code: "predicate.event-kind-mismatch",
    message: "Rule event kind does not match the current event kind",
  });
  expect(rejected.reads).toEqual({
    "event.kind": options.actualEventKind,
    "rule.event-kind": options.expectedEventKind,
  });
  expect(Object.hasOwn(decision as object, "operations")).toBe(false);
  expect(Object.hasOwn(decision as object, "before")).toBe(false);
  expect(Object.hasOwn(decision as object, "after")).toBe(false);
  expect(Object.hasOwn(decision as object, "guardResult")).toBe(false);
}

describe("TRC-002 critical.roll predicate rejection", () => {
  it("records the Direct explicit-roll candidates in Ruleset declaration order without changing the golden Result", async () => {
    const ruleset = await loadCoreRuleset();
    expect(
      ruleset.snapshot.rules
        .filter((rule) => rule.phase === "critical.roll")
        .map((rule) => rule.id),
    ).toEqual(CRITICAL_ROLL_CANDIDATES);

    const outcome = await evaluateScenario({
      scenario: structuredClone(probabilityScenarioFixture),
      catalog: structuredClone(catalogFixture),
      ruleset,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }

    const decisions = outcome.trace.decisions.filter(
      (decision) => decision.phase === "critical.roll",
    );
    expect(decisions.map((decision) => [decision.ruleId, decision.outcome])).toEqual([
      [CRITICAL_ROLL_CANDIDATES[0], "rejected"],
      [CRITICAL_ROLL_CANDIDATES[1], "applied"],
    ]);
    expectPredicateRejection(decisions[0], {
      ruleId: CRITICAL_ROLL_CANDIDATES[0],
      actualEventKind: "damage.direct",
      expectedEventKind: "action.resolved-direct-radial-impact",
    });
    expect(outcome.result.metrics).toEqual(probabilityExpectedFixture.metrics);
    expect(outcome.result.damageByType).toEqual(probabilityExpectedFixture.damageByType);
    expect(outcome.result.fingerprint.engineVersion).toBe("0.19.0");
    expect(outcome.trace.fingerprint.engineVersion).toBe("0.19.0");

    const construct = outcome.trace.decisions.find(
      (decision) => decision.ruleId === "rule.damage.direct-hit",
    );
    const appliedRoll = decisions[1];
    if (construct?.outcome !== "applied" || appliedRoll?.outcome !== "applied") {
      throw new Error("Direct explicit-roll Trace omitted an applied decision");
    }
    expect(appliedRoll.before).toEqual(construct.after);
  });

  it("records the shared-impact candidates in Ruleset declaration order without changing the golden Result", async () => {
    const ruleset = await loadCoreRuleset();
    const outcome = await evaluateScenario({
      scenario: structuredClone(sharedRollScenarioFixture),
      catalog: structuredClone(catalogFixture),
      ruleset,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }

    const decisions = outcome.trace.decisions.filter(
      (decision) => decision.phase === "critical.roll",
    );
    expect(decisions.map((decision) => [decision.ruleId, decision.outcome])).toEqual([
      [CRITICAL_ROLL_CANDIDATES[0], "applied"],
      [CRITICAL_ROLL_CANDIDATES[1], "rejected"],
    ]);
    expectPredicateRejection(decisions[1], {
      ruleId: CRITICAL_ROLL_CANDIDATES[1],
      actualEventKind: "action.resolved-direct-radial-impact",
      expectedEventKind: "damage.direct",
    });
    expect(outcome.result.metrics).toEqual(sharedRollExpectedFixture.metrics);
    expect(outcome.result.damageByType).toEqual(sharedRollExpectedFixture.damageByType);
    expect(outcome.result.targetStates).toEqual(sharedRollExpectedFixture.targetStates);
  });

  it("property-tests stable opposite candidate rejection for every supported explicit roll", async () => {
    const ruleset = await loadCoreRuleset();
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("direct", "shared-impact"),
        fc.integer({ min: 0, max: 999 }),
        async (kind, rollBasisPoints) => {
          const criticalRoll = rollBasisPoints / 1000;
          const scenario = structuredClone(
            kind === "direct" ? probabilityScenarioFixture : sharedRollScenarioFixture,
          );
          const action = scenario.actionPlan[0];
          if (action === undefined) {
            throw new Error("Explicit-roll fixture omitted its action");
          }
          action.parameters.criticalRoll = criticalRoll;
          const changed = await rehash(scenario);
          const first = await evaluateScenario({
            scenario: changed,
            catalog: structuredClone(catalogFixture),
            ruleset,
          });
          const second = await evaluateScenario({
            scenario: changed,
            catalog: structuredClone(catalogFixture),
            ruleset,
          });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));

          const decisions = first.trace.decisions.filter(
            (decision) => decision.phase === "critical.roll",
          );
          expect(decisions.map((decision) => decision.ruleId)).toEqual(CRITICAL_ROLL_CANDIDATES);
          const rejected = decisions.find((decision) => decision.outcome === "rejected");
          const expected =
            kind === "direct"
              ? {
                  ruleId: CRITICAL_ROLL_CANDIDATES[0],
                  actualEventKind: "damage.direct",
                  expectedEventKind: "action.resolved-direct-radial-impact",
                }
              : {
                  ruleId: CRITICAL_ROLL_CANDIDATES[1],
                  actualEventKind: "action.resolved-direct-radial-impact",
                  expectedEventKind: "damage.direct",
                };
          expectPredicateRejection(rejected, expected);
          expect(decisions.filter((decision) => decision.outcome === "applied")).toHaveLength(1);
          expect(first.result.metrics["critical.roll"]).toBe(criticalRoll);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("binds rejection reads to the Trace hash and the Result traceRef", async () => {
    const outcome = await evaluateScenario({
      scenario: structuredClone(probabilityScenarioFixture),
      catalog: structuredClone(catalogFixture),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }

    const tampered = structuredClone(outcome.trace);
    const rejected = tampered.decisions.find((decision) => decision.outcome === "rejected");
    if (rejected?.outcome !== "rejected") {
      throw new Error("Explicit-roll Trace omitted its rejected candidate");
    }
    (rejected.reads as Record<string, string | number | boolean | null>)["rule.event-kind"] =
      "damage.direct";

    expect(await verifyArtifactContentHash(tampered)).toBe(false);
    const rehashed = await rehash(tampered);
    expect(await verifyArtifactContentHash(rehashed)).toBe(true);
    expect(
      await verifyResultTraceIntegrity(outcome.result, rehashed, probabilityScenarioFixture),
    ).toBe(false);
  });
});
