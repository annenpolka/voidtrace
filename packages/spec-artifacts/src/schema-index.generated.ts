// Generated from specs/main.pkl. Do not edit.

import artifactRefSchema from "./schemas/artifact-ref.schema.json" with { type: "json" };
import catalogSnapshotSchema from "./schemas/catalog-snapshot.schema.json" with { type: "json" };
import fingerprintSchema from "./schemas/fingerprint.schema.json" with { type: "json" };
import resultSchema from "./schemas/result.schema.json" with { type: "json" };
import scenarioSchema from "./schemas/scenario.schema.json" with { type: "json" };
import traceSchema from "./schemas/trace.schema.json" with { type: "json" };

export const CONTRACT_SCHEMAS = {
  "artifact-ref": artifactRefSchema,
  "catalog-snapshot": catalogSnapshotSchema,
  "fingerprint": fingerprintSchema,
  "result": resultSchema,
  "scenario": scenarioSchema,
  "trace": traceSchema,
} as const;

export const CONTRACT_SCHEMA_IDS = {
  "artifact-ref": "urn:voidtrace:schema:artifact-ref:0.1.0",
  "catalog-snapshot": "urn:voidtrace:schema:catalog-snapshot:0.1.0",
  "fingerprint": "urn:voidtrace:schema:fingerprint:0.1.0",
  "result": "urn:voidtrace:schema:result:0.1.0",
  "scenario": "urn:voidtrace:schema:scenario:0.1.0",
  "trace": "urn:voidtrace:schema:trace:0.1.0",
} as const;
