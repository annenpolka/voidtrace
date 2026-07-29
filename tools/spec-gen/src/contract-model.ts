export type LiteralValue = string | number | boolean;

export type StringNode = {
  kind: "string";
  pattern: string | null;
  values: string[] | null;
  minLength: number | null;
};

export type IntegerNode = {
  kind: "integer";
  minimum: number | null;
  maximum: number | null;
};

export type NumberNode = {
  kind: "number";
  minimum: number | null;
  maximum: number | null;
};

export type BooleanNode = {
  kind: "boolean";
};

export type NullNode = {
  kind: "null";
};

export type LiteralNode = {
  kind: "literal";
  value: LiteralValue;
};

export type ArrayNode = {
  kind: "array";
  items: ContractNode;
  minItems: number | null;
  maxItems: number | null;
};

export type RecordNode = {
  kind: "record";
  values: ContractNode;
  keySchema: StringNode | null;
};

export type ObjectNode = {
  kind: "object";
  fields: ContractField[];
};

export type ReferenceNode = {
  kind: "ref";
  target: string;
  expectedKind: string | null;
};

export type UnionNode = {
  kind: "union";
  variants: ContractNode[];
};

export type ContractNode =
  | StringNode
  | IntegerNode
  | NumberNode
  | BooleanNode
  | NullNode
  | LiteralNode
  | ArrayNode
  | RecordNode
  | ObjectNode
  | ReferenceNode
  | UnionNode;

export type ContractField = {
  name: string;
  description: string;
  required: boolean;
  schema: ContractNode;
};

export type ContractDefinition = {
  id: string;
  typeName: string;
  schemaId: string;
  version: string;
  description: string;
  root: ObjectNode;
};

const CONTRACT_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const TYPE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const FIELD_NAME = /^\$?[A-Za-z][A-Za-z0-9]*$/;
const SEMANTIC_VERSION = /^\d+\.\d+\.\d+$/;
const STABLE_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid contract value at ${path}: expected object`);
  }
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  path: string,
  allowedKeys: readonly string[],
): void {
  const allowed = new Set(allowedKeys);
  const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`Unknown contract key at ${path}: ${unknownKeys.toSorted().join(", ")}`);
  }
}

function requireString(
  value: unknown,
  path: string,
  predicate: (candidate: string) => boolean = () => true,
): string {
  if (typeof value !== "string" || !predicate(value)) {
    throw new Error(`Invalid contract value at ${path}: expected string`);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid contract value at ${path}: expected boolean`);
  }
  return value;
}

function optionalNumber(value: unknown, path: string, integer = false): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (integer && !Number.isInteger(value)) ||
    (Number.isInteger(value) && !Number.isSafeInteger(value))
  ) {
    throw new Error(
      `Invalid contract value at ${path}: expected ${
        integer ? "safe integer" : "finite number with safe integer values"
      }`,
    );
  }
  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid contract value at ${path}: expected array`);
  }
  return value;
}

function parseStringNode(value: Record<string, unknown>, path: string): StringNode {
  assertExactKeys(value, path, ["kind", "pattern", "values", "minLength"]);
  const pattern =
    value.pattern === undefined || value.pattern === null
      ? null
      : requireString(value.pattern, `${path}.pattern`);
  let compiledPattern: RegExp | null = null;
  if (pattern !== null) {
    try {
      compiledPattern = new RegExp(pattern, "u");
    } catch {
      throw new Error(`Invalid regular expression at ${path}.pattern: ${pattern}`);
    }
  }

  let values: string[] | null = null;
  if (value.values !== undefined && value.values !== null) {
    values = requireArray(value.values, `${path}.values`).map((item, index) =>
      requireString(item, `${path}.values[${index}]`),
    );
    if (values.length === 0 || new Set(values).size !== values.length) {
      throw new Error(`String enum at ${path}.values must be non-empty and unique`);
    }
  }

  const minLength = optionalNumber(value.minLength, `${path}.minLength`, true);
  if (minLength !== null && minLength < 0) {
    throw new Error(`Invalid negative minLength at ${path}.minLength`);
  }
  if (
    values?.some(
      (item) =>
        (minLength !== null && Array.from(item).length < minLength) ||
        (compiledPattern !== null && !compiledPattern.test(item)),
    )
  ) {
    throw new Error(`String enum at ${path}.values violates its own constraints`);
  }

  return {
    kind: "string",
    pattern,
    values,
    minLength,
  };
}

function parseNumericNode(
  kind: "integer" | "number",
  value: Record<string, unknown>,
  path: string,
): IntegerNode | NumberNode {
  assertExactKeys(value, path, ["kind", "minimum", "maximum"]);
  const integer = kind === "integer";
  const minimum = optionalNumber(value.minimum, `${path}.minimum`, integer);
  const maximum = optionalNumber(value.maximum, `${path}.maximum`, integer);
  if (minimum !== null && maximum !== null && minimum > maximum) {
    throw new Error(`Minimum exceeds maximum at ${path}`);
  }
  return { kind, minimum, maximum };
}

function parseLiteral(value: unknown, path: string): LiteralValue {
  if (
    typeof value !== "string" &&
    typeof value !== "boolean" &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error(`Invalid contract literal at ${path}`);
  }
  if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) {
    throw new Error(`Invalid contract literal at ${path}: expected safe integer`);
  }
  return value;
}

function parseField(value: unknown, path: string): ContractField {
  const record = requireRecord(value, path);
  assertExactKeys(record, path, ["name", "description", "required", "schema"]);
  return {
    name: requireString(record.name, `${path}.name`, (candidate) => FIELD_NAME.test(candidate)),
    description: requireString(
      record.description,
      `${path}.description`,
      (candidate) => candidate.length > 0,
    ),
    required: requireBoolean(record.required, `${path}.required`),
    schema: parseContractNode(record.schema, `${path}.schema`),
  };
}

function parseObjectNode(value: Record<string, unknown>, path: string): ObjectNode {
  assertExactKeys(value, path, ["kind", "fields"]);
  const fields = requireArray(value.fields, `${path}.fields`).map((field, index) =>
    parseField(field, `${path}.fields[${index}]`),
  );
  const names = new Set<string>();
  for (const field of fields) {
    if (names.has(field.name)) {
      throw new Error(`Duplicate contract field at ${path}: ${field.name}`);
    }
    names.add(field.name);
  }
  return { kind: "object", fields };
}

export function parseContractNode(value: unknown, path: string): ContractNode {
  const record = requireRecord(value, path);
  const kind = requireString(record.kind, `${path}.kind`);
  switch (kind) {
    case "string":
      return parseStringNode(record, path);
    case "integer":
    case "number":
      return parseNumericNode(kind, record, path);
    case "boolean":
      assertExactKeys(record, path, ["kind"]);
      return { kind };
    case "null":
      assertExactKeys(record, path, ["kind"]);
      return { kind };
    case "literal":
      assertExactKeys(record, path, ["kind", "value"]);
      return {
        kind,
        value: parseLiteral(record.value, `${path}.value`),
      };
    case "array": {
      assertExactKeys(record, path, ["kind", "items", "minItems", "maxItems"]);
      const minItems = optionalNumber(record.minItems, `${path}.minItems`, true);
      const maxItems = optionalNumber(record.maxItems, `${path}.maxItems`, true);
      if (
        (minItems !== null && minItems < 0) ||
        (maxItems !== null && maxItems < 0) ||
        (minItems !== null && maxItems !== null && minItems > maxItems)
      ) {
        throw new Error(`Invalid array bounds at ${path}`);
      }
      return {
        kind,
        items: parseContractNode(record.items, `${path}.items`),
        minItems,
        maxItems,
      };
    }
    case "record": {
      assertExactKeys(record, path, ["kind", "values", "keySchema"]);
      let keySchema: StringNode | null = null;
      if (record.keySchema !== undefined && record.keySchema !== null) {
        const parsedKeySchema = parseContractNode(record.keySchema, `${path}.keySchema`);
        if (parsedKeySchema.kind !== "string") {
          throw new Error(`Record key schema at ${path}.keySchema must be a string node`);
        }
        keySchema = parsedKeySchema;
      }
      return {
        kind,
        values: parseContractNode(record.values, `${path}.values`),
        keySchema,
      };
    }
    case "object":
      return parseObjectNode(record, path);
    case "ref": {
      assertExactKeys(record, path, ["kind", "target", "expectedKind"]);
      const target = requireString(record.target, `${path}.target`, (candidate) =>
        CONTRACT_ID.test(candidate),
      );
      const expectedKind =
        record.expectedKind === undefined || record.expectedKind === null
          ? null
          : requireString(record.expectedKind, `${path}.expectedKind`, (candidate) =>
              STABLE_ID.test(candidate),
            );
      if (expectedKind !== null && target !== "artifact-ref") {
        throw new Error(
          `Expected Artifact kind at ${path}.expectedKind requires target artifact-ref`,
        );
      }
      return {
        kind,
        target,
        expectedKind,
      };
    }
    case "union": {
      assertExactKeys(record, path, ["kind", "variants"]);
      const variants = requireArray(record.variants, `${path}.variants`).map((variant, index) =>
        parseContractNode(variant, `${path}.variants[${index}]`),
      );
      if (variants.length < 2) {
        throw new Error(`Contract union at ${path} must contain at least two variants`);
      }
      return { kind, variants };
    }
    default:
      throw new Error(`Unknown contract node kind at ${path}.kind: ${kind}`);
  }
}

function visitReferences(node: ContractNode, visit: (target: string) => void): void {
  switch (node.kind) {
    case "ref":
      visit(node.target);
      break;
    case "array":
      visitReferences(node.items, visit);
      break;
    case "record":
      visitReferences(node.values, visit);
      break;
    case "object":
      for (const field of node.fields) {
        visitReferences(field.schema, visit);
      }
      break;
    case "union":
      for (const variant of node.variants) {
        visitReferences(variant, visit);
      }
      break;
    case "boolean":
    case "integer":
    case "literal":
    case "null":
    case "number":
    case "string":
      break;
  }
}

function parseContract(value: unknown, index: number): ContractDefinition {
  const path = `contracts[${index}]`;
  const record = requireRecord(value, path);
  assertExactKeys(record, path, ["id", "typeName", "schemaId", "version", "description", "root"]);
  const id = requireString(record.id, `${path}.id`, (candidate) => CONTRACT_ID.test(candidate));
  const version = requireString(record.version, `${path}.version`, (candidate) =>
    SEMANTIC_VERSION.test(candidate),
  );
  const root = parseContractNode(record.root, `${path}.root`);
  if (root.kind !== "object") {
    throw new Error(`Contract root at ${path}.root must be an object`);
  }
  if (root.fields.length === 0) {
    throw new Error(`Contract root at ${path}.root must contain at least one field`);
  }

  const schemaId = requireString(record.schemaId, `${path}.schemaId`);
  const expectedSchemaId = `urn:voidtrace:schema:${id}:${version}`;
  if (schemaId !== expectedSchemaId) {
    throw new Error(`Contract ${id} schemaId must be ${expectedSchemaId}`);
  }

  return {
    id,
    typeName: requireString(record.typeName, `${path}.typeName`, (candidate) =>
      TYPE_NAME.test(candidate),
    ),
    schemaId,
    version,
    description: requireString(
      record.description,
      `${path}.description`,
      (candidate) => candidate.length > 0,
    ),
    root,
  };
}

export function parseContracts(value: unknown): ContractDefinition[] {
  const contracts = requireArray(value, "contracts").map(parseContract);
  if (contracts.length === 0) {
    throw new Error("Specification must contain at least one Contract");
  }

  const ids = new Set<string>();
  const typeNames = new Set<string>();
  const schemaIds = new Set<string>();
  for (const contract of contracts) {
    if (ids.has(contract.id)) {
      throw new Error(`Duplicate Contract ID: ${contract.id}`);
    }
    if (typeNames.has(contract.typeName)) {
      throw new Error(`Duplicate Contract type name: ${contract.typeName}`);
    }
    if (schemaIds.has(contract.schemaId)) {
      throw new Error(`Duplicate Contract schema ID: ${contract.schemaId}`);
    }
    ids.add(contract.id);
    typeNames.add(contract.typeName);
    schemaIds.add(contract.schemaId);
  }

  for (const contract of contracts) {
    visitReferences(contract.root, (target) => {
      if (!ids.has(target)) {
        throw new Error(`Contract ${contract.id} references unknown Contract: ${target}`);
      }
    });
  }

  return contracts.toSorted((left, right) => compareText(left.id, right.id));
}
