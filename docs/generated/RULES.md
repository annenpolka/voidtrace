<!-- Generated from specs/main.pkl. Do not edit. -->

# Runtime rules

- Ruleset: `ruleset.synthetic-core`
- Version: `0.10.0`
- Revision: `1`
- Game build: `synthetic-fixture-0`
- Generated IR: `packages/spec-artifacts/src/rulesets/core.generated.json`

## Rules

| ID | Phase | Operation | Evidence | Normative semantics |
| --- | --- | --- | --- | --- |
| `rule.multishot.emit-fixed-hits` | `attack.emit` | `event.expand-fixed-multishot` | `experimental` | Expand one action with an explicit positive safe-integer hit count into that many stable ordered Direct Hit child events, bounded by the operation execution limit. |
| `rule.pellet.emit-fixed-hits` | `attack.emit` | `event.expand-fixed-pellets` | `experimental` | Expand one action with an explicit positive safe-integer pellet count into that many stable ordered Direct Hit child events, bounded by the operation execution limit. |
| `rule.status.schedule-resolved-ticks` | `attack.emit` | `event.expand-resolved-status-ticks` | `experimental` | Expand one explicit resolved Status action into a bounded count of ordered logical-time tick events. |
| `rule.punch-through.expand-resolved-targets` | `attack.emit` | `event.expand-resolved-punch-through-targets` | `experimental` | Expand one explicit resolved punch-through path into a bounded ordered sequence of target Direct Hit events. |
| `rule.ricochet.expand-resolved-targets` | `attack.emit` | `event.expand-resolved-ricochet-targets` | `experimental` | Expand one explicit resolved ricochet path into a bounded ordered sequence of target Direct Hit events. |
| `rule.critical.resolve-expected-branches` | `critical.expected` | `critical-tier.resolve-expected-branches` | `experimental` | For non-negative Critical chance c, resolve the same safe adjacent-tier probability distribution as explicit-roll resolution without selecting a realized tier. |
| `rule.damage.direct-hit` | `damage.construct` | `damage-vector.copy` | `experimental` | For a resolved Direct Hit without modifiers, copy the Catalog attack mode base Damage Vector unchanged into event damage. |
| `rule.radial.construct-hit` | `damage.construct` | `damage-vector.copy` | `experimental` | Copy the Catalog attack mode base Damage Vector into one resolved Radial Hit. |
| `rule.critical.resolve-tier-roll` | `critical.roll` | `critical-tier.resolve-tier-roll` | `experimental` | For non-negative Critical chance c, let baseTier = floor(c) and fraction = c - baseTier. baseTier must be a safe integer; nextTier is baseTier when fraction is 0, otherwise baseTier + 1 and must also be safe. Resolve p(baseTier) = 1 - fraction and p(nextTier) = fraction from an explicit roll in [0, 1): nextTier exactly when roll is less than fraction, otherwise baseTier. |
| `rule.critical.scale-tier` | `critical.resolve` | `damage-vector.scale-critical-tier` | `experimental` | For a resolved non-negative safe-integer Critical tier t and Catalog Critical multiplier M, scale event damage by 1 + t * (M - 1). |
| `rule.radial.scale-critical-tier` | `critical.resolve` | `damage-vector.scale-critical-tier` | `experimental` | Scale one resolved Radial Hit by the same explicit fixed Critical tier operation as the synthetic Direct Hit slice. |
| `rule.radial.apply-resolved-falloff` | `damage.radial-falloff` | `damage-vector.scale-resolved-radial-falloff` | `experimental` | Scale one Radial Hit after Critical and before Armor by an explicit finite resolved multiplier in the closed interval [0, 1]. |
| `rule.status.construct-resolved-tick` | `status.tick` | `damage-vector.copy-resolved-status-tick` | `experimental` | Construct one synthetic Status tick Damage Vector from explicit resolved Health damage without deriving a Status formula. |
| `rule.defense.standard-armor` | `target.mitigate` | `damage-vector.scale-standard-armor` | `experimental` | For non-negative resolved Armor on the Health layer, multiply event damage by constant / (Armor + constant), where constant is 300. |
| `rule.radial.standard-armor` | `target.mitigate` | `damage-vector.scale-standard-armor` | `experimental` | Apply the synthetic standard Armor operation to one Radial Hit after resolved falloff. |
| `rule.damage.commit-health` | `damage.commit` | `damage.commit-health` | `experimental` | Commit the final Direct Hit Damage Vector to the resolved Health layer and record the remaining Health. |
| `rule.radial.commit-health` | `damage.commit` | `damage.commit-health` | `experimental` | Commit final Radial Hit damage to the resolved Health layer. |
| `rule.status.commit-resolved-tick-health` | `damage.commit` | `damage.commit-health` | `experimental` | Commit one resolved synthetic Status tick to the target Health layer. |
| `rule.critical.aggregate-expected-branches` | `result.aggregate` | `damage-vector.aggregate-weighted-branches` | `experimental` | After every reachable adjacent Critical tier branch reaches terminal Health commit, weight its final Damage Vector and remaining Health by the branch probability. |
| `rule.multishot.aggregate-fixed-hits` | `result.aggregate` | `damage-vector.aggregate-sequential-hits` | `experimental` | After every emitted Direct Hit reaches terminal Health commit in stable index order, sum the hit Damage Vectors and preserve the final sequential remaining Health. |
| `rule.pellet.aggregate-fixed-hits` | `result.aggregate` | `damage-vector.aggregate-sequential-pellets` | `experimental` | After every emitted pellet Direct Hit reaches terminal Health commit in stable index order, sum the hit Damage Vectors and preserve the final sequential remaining Health. |
| `rule.status.aggregate-resolved-ticks` | `result.aggregate` | `damage-vector.aggregate-sequential-status-ticks` | `experimental` | Aggregate every terminal Status tick Damage Vector and preserve the final sequential remaining Health. |
| `rule.punch-through.aggregate-resolved-targets` | `result.aggregate` | `damage-vector.aggregate-resolved-punch-through-targets` | `experimental` | Aggregate terminal Damage and target-specific Health from every target visited by one resolved punch-through path. |
| `rule.ricochet.aggregate-resolved-targets` | `result.aggregate` | `damage-vector.aggregate-resolved-ricochet-targets` | `experimental` | Aggregate terminal Damage and target-specific Health from every target visited by one resolved ricochet path. |
