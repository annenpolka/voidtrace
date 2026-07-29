<!-- Generated from specs/main.pkl. Do not edit. -->

# Runtime rules

- Ruleset: `ruleset.synthetic-core`
- Version: `0.2.0`
- Revision: `1`
- Game build: `synthetic-fixture-0`
- Generated IR: `packages/spec-artifacts/src/rulesets/core.generated.json`

## Rules

| ID | Phase | Operation | Evidence | Normative semantics |
| --- | --- | --- | --- | --- |
| `rule.damage.direct-hit` | `damage.construct` | `damage-vector.copy` | `experimental` | For a resolved Direct Hit without modifiers, copy the Catalog attack mode base Damage Vector unchanged into event damage. |
| `rule.critical.resolve-binary-roll` | `critical.roll` | `critical-tier.resolve-binary-roll` | `experimental` | For Critical chance c in [0, 1], resolve the binary distribution p(tier 0) = 1 - c and p(tier 1) = c from an explicit roll: tier 1 exactly when roll is less than c, otherwise tier 0. |
| `rule.critical.fixed-tier-0` | `critical.resolve` | `damage-vector.scale-fixed-critical` | `experimental` | When deterministic fixed Critical tier is 0, preserve event damage with multiplier 1. |
| `rule.critical.fixed-tier-1` | `critical.resolve` | `damage-vector.scale-fixed-critical` | `experimental` | When deterministic fixed Critical tier is 1, multiply event damage by the Catalog attack critical multiplier. |
| `rule.defense.standard-armor` | `target.mitigate` | `damage-vector.scale-standard-armor` | `experimental` | For non-negative resolved Armor on the Health layer, multiply event damage by constant / (Armor + constant), where constant is 300. |
| `rule.damage.commit-health` | `damage.commit` | `damage.commit-health` | `experimental` | Commit the final Direct Hit Damage Vector to the resolved Health layer and record the remaining Health. |
