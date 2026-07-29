import type { ContractById, ContractId } from "@voidtrace/spec-artifacts/contracts";
import { CONTRACT_SCHEMA_IDS, CONTRACT_SCHEMAS } from "@voidtrace/spec-artifacts/schemas";
import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { canonicalizeJson, snapshotJsonValue } from "./canonical-json.ts";

export type ValidationIssue = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message: string;
  details: string;
};

export type ValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      issues: ValidationIssue[];
    };

const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  validateSchema: true,
  coerceTypes: false,
  ownProperties: true,
  removeAdditional: false,
  useDefaults: false,
});

for (const schema of Object.values(CONTRACT_SCHEMAS)) {
  ajv.addSchema(schema);
}

const validators = new Map<ContractId, ValidateFunction<unknown>>();
for (const [contractId, schemaId] of Object.entries(CONTRACT_SCHEMA_IDS) as Array<
  [ContractId, string]
>) {
  const validator = ajv.getSchema(schemaId);
  if (!validator) {
    throw new Error(`Generated Contract schema was not registered: ${contractId}`);
  }
  validators.set(contractId, validator);
}

export function assertContractSchemasReady(): void {
  if (validators.size !== Object.keys(CONTRACT_SCHEMA_IDS).length) {
    throw new Error("Not every generated Contract schema has a compiled validator");
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function portableIssue(error: ErrorObject): ValidationIssue {
  return {
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
    keyword: error.keyword,
    message: error.message ?? "JSON Schema validation failed",
    details: canonicalizeJson(error.params),
  };
}

function stableIssues(errors: ErrorObject[] | null | undefined): ValidationIssue[] {
  return (errors ?? [])
    .map(portableIssue)
    .toSorted((left, right) =>
      compareText(
        `${left.instancePath}\0${left.schemaPath}\0${left.keyword}\0${left.details}`,
        `${right.instancePath}\0${right.schemaPath}\0${right.keyword}\0${right.details}`,
      ),
    );
}

function nonJsonIssue(): ValidationIssue {
  return {
    instancePath: "",
    schemaPath: "#",
    keyword: "jsonValue",
    message: "must be a plain JSON value with own enumerable data properties",
    details: '{"constraint":"plain-json"}',
  };
}

export function validateContract<K extends ContractId>(
  contractId: K,
  value: unknown,
): ValidationResult<ContractById[K]> {
  const validator = validators.get(contractId);
  if (!validator) {
    throw new Error(`Unknown Contract ID: ${contractId}`);
  }
  let snapshot: ReturnType<typeof snapshotJsonValue>;
  try {
    snapshot = snapshotJsonValue(value);
  } catch {
    return {
      ok: false,
      issues: [nonJsonIssue()],
    };
  }
  if (validator(snapshot)) {
    return {
      ok: true,
      value: snapshot as ContractById[K],
    };
  }
  return {
    ok: false,
    issues: stableIssues(validator.errors),
  };
}
