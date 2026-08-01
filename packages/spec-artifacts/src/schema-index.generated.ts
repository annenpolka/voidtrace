// Generated from specs/main.pkl. Do not edit.

import artifactRefSchema from "./schemas/artifact-ref.schema.json" with { type: "json" };
import catalogSnapshotSchema from "./schemas/catalog-snapshot.schema.json" with { type: "json" };
import comparisonSchema from "./schemas/comparison.schema.json" with { type: "json" };
import experimentSchema from "./schemas/experiment.schema.json" with { type: "json" };
import fingerprintSchema from "./schemas/fingerprint.schema.json" with { type: "json" };
import problemSchema from "./schemas/problem.schema.json" with { type: "json" };
import resultSchema from "./schemas/result.schema.json" with { type: "json" };
import rulesetSchema from "./schemas/ruleset.schema.json" with { type: "json" };
import scenarioSchema from "./schemas/scenario.schema.json" with { type: "json" };
import scenarioPatchSchema from "./schemas/scenario-patch.schema.json" with { type: "json" };
import traceSchema from "./schemas/trace.schema.json" with { type: "json" };

export const CONTRACT_SCHEMAS = {
  "artifact-ref": artifactRefSchema,
  "catalog-snapshot": catalogSnapshotSchema,
  "comparison": comparisonSchema,
  "experiment": experimentSchema,
  "fingerprint": fingerprintSchema,
  "problem": problemSchema,
  "result": resultSchema,
  "ruleset": rulesetSchema,
  "scenario": scenarioSchema,
  "scenario-patch": scenarioPatchSchema,
  "trace": traceSchema,
} as const;

export const CONTRACT_SCHEMA_IDS = {
  "artifact-ref": "urn:voidtrace:schema:artifact-ref:0.1.0",
  "catalog-snapshot": "urn:voidtrace:schema:catalog-snapshot:0.1.0",
  "comparison": "urn:voidtrace:schema:comparison:0.1.0",
  "experiment": "urn:voidtrace:schema:experiment:0.2.0",
  "fingerprint": "urn:voidtrace:schema:fingerprint:0.1.0",
  "problem": "urn:voidtrace:schema:problem:0.1.0",
  "result": "urn:voidtrace:schema:result:0.2.0",
  "ruleset": "urn:voidtrace:schema:ruleset:0.18.0",
  "scenario": "urn:voidtrace:schema:scenario:0.3.0",
  "scenario-patch": "urn:voidtrace:schema:scenario-patch:0.1.0",
  "trace": "urn:voidtrace:schema:trace:0.1.0",
} as const;
