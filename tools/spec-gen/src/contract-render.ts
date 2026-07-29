import type {
  ContractDefinition,
  ContractField,
  ContractNode,
  LiteralValue,
  ObjectNode,
} from "./contract-model.ts";

export type ContractGeneratedFile = {
  path: string;
  contents: string;
};

type JsonSchema = Record<string, unknown>;

const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";
const GENERATED_TS_NOTICE = "// Generated from specs/main.pkl. Do not edit.";
const GENERATED_MARKDOWN_NOTICE = "<!-- Generated from specs/main.pkl. Do not edit. -->";

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function literalSchema(value: LiteralValue): JsonSchema {
  const type =
    typeof value === "number" ? (Number.isInteger(value) ? "integer" : "number") : typeof value;
  return {
    type,
    const: value,
  };
}

function renderJsonSchemaNode(
  node: ContractNode,
  contractsById: ReadonlyMap<string, ContractDefinition>,
): JsonSchema {
  switch (node.kind) {
    case "string": {
      const schema: JsonSchema = { type: "string" };
      if (node.minLength !== null) {
        schema.minLength = node.minLength;
      }
      if (node.pattern !== null) {
        schema.pattern = node.pattern;
      }
      if (node.values !== null) {
        schema.enum = node.values;
      }
      return schema;
    }
    case "integer":
    case "number": {
      const schema: JsonSchema = { type: node.kind };
      if (node.minimum !== null) {
        schema.minimum = node.minimum;
      }
      if (node.maximum !== null) {
        schema.maximum = node.maximum;
      }
      return schema;
    }
    case "boolean":
    case "null":
      return { type: node.kind };
    case "literal":
      return literalSchema(node.value);
    case "array": {
      const schema: JsonSchema = {
        type: "array",
        items: renderJsonSchemaNode(node.items, contractsById),
      };
      if (node.minItems !== null) {
        schema.minItems = node.minItems;
      }
      if (node.maxItems !== null) {
        schema.maxItems = node.maxItems;
      }
      return schema;
    }
    case "record": {
      const schema: JsonSchema = {
        type: "object",
        additionalProperties: renderJsonSchemaNode(node.values, contractsById),
      };
      if (node.keySchema !== null) {
        schema.propertyNames = renderJsonSchemaNode(node.keySchema, contractsById);
      }
      return schema;
    }
    case "object":
      return renderJsonObject(node, contractsById);
    case "ref": {
      const target = contractsById.get(node.target);
      if (!target) {
        throw new Error(`Cannot render unresolved Contract reference: ${node.target}`);
      }
      if (node.expectedKind === null) {
        return { $ref: target.schemaId };
      }
      return {
        allOf: [
          { $ref: target.schemaId },
          {
            type: "object",
            properties: {
              kind: {
                const: node.expectedKind,
              },
            },
            required: ["kind"],
          },
        ],
      };
    }
    case "union":
      return {
        anyOf: node.variants.map((variant) => renderJsonSchemaNode(variant, contractsById)),
      };
  }
}

function renderFieldSchema(
  field: ContractField,
  contractsById: ReadonlyMap<string, ContractDefinition>,
): JsonSchema {
  return {
    description: field.description,
    ...renderJsonSchemaNode(field.schema, contractsById),
  };
}

function renderJsonObject(
  node: ObjectNode,
  contractsById: ReadonlyMap<string, ContractDefinition>,
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const field of node.fields) {
    properties[field.name] = renderFieldSchema(field, contractsById);
    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function renderContractJsonSchema(
  contract: ContractDefinition,
  contractsById: ReadonlyMap<string, ContractDefinition>,
): JsonSchema {
  return {
    $schema: JSON_SCHEMA_DIALECT,
    $id: contract.schemaId,
    title: contract.typeName,
    description: contract.description,
    ...renderJsonObject(contract.root, contractsById),
  };
}

function escapeDocComment(value: string): string {
  return value.replaceAll("*/", "*\\/");
}

function renderTypeScriptNode(
  node: ContractNode,
  contractsById: ReadonlyMap<string, ContractDefinition>,
  indentation = 0,
): string {
  switch (node.kind) {
    case "string":
      return node.values === null
        ? "string"
        : node.values.map((value) => JSON.stringify(value)).join(" | ");
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "literal":
      return JSON.stringify(node.value);
    case "array":
      return `ReadonlyArray<${renderTypeScriptNode(node.items, contractsById, indentation)}>`;
    case "record":
      return `Readonly<Record<string, ${renderTypeScriptNode(node.values, contractsById, indentation)}>>`;
    case "ref": {
      const target = contractsById.get(node.target);
      if (!target) {
        throw new Error(`Cannot render unresolved Contract reference: ${node.target}`);
      }
      return node.expectedKind === null
        ? target.typeName
        : `${target.typeName} & { readonly "kind": ${JSON.stringify(node.expectedKind)} }`;
    }
    case "union":
      return node.variants
        .map((variant) => renderTypeScriptNode(variant, contractsById, indentation))
        .join(" | ");
    case "object": {
      const lines = node.fields.flatMap((field) => {
        const comment = `${" ".repeat(indentation + 2)}/** ${escapeDocComment(field.description)} */`;
        const fieldType = renderTypeScriptNode(field.schema, contractsById, indentation + 2);
        const declaration = `${" ".repeat(indentation + 2)}readonly ${JSON.stringify(field.name)}${
          field.required ? "" : "?"
        }: ${fieldType};`;
        return [comment, declaration];
      });
      return `{\n${lines.join("\n")}\n${" ".repeat(indentation)}}`;
    }
  }
}

function schemaVariableName(contract: ContractDefinition): string {
  return `${contract.typeName.charAt(0).toLowerCase()}${contract.typeName.slice(1)}Schema`;
}

function renderTypeScriptContracts(contracts: ContractDefinition[]): string {
  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));
  const declarations = contracts.map(
    (contract) => `/** ${escapeDocComment(contract.description)} */
export type ${contract.typeName} = ${renderTypeScriptNode(contract.root, contractsById)};
`,
  );
  const contractIds = contracts.map((contract) => JSON.stringify(contract.id)).join(" | ");
  const contractMap = contracts
    .map((contract) => `  readonly ${JSON.stringify(contract.id)}: ${contract.typeName};`)
    .join("\n");

  return `${GENERATED_TS_NOTICE}

${declarations.join("\n")}export type ContractId = ${contractIds};

export type ContractById = {
${contractMap}
};
`;
}

function renderSchemaIndex(contracts: ContractDefinition[]): string {
  const imports = contracts
    .map(
      (contract) =>
        `import ${schemaVariableName(contract)} from "./schemas/${contract.id}.schema.json" with { type: "json" };`,
    )
    .join("\n");
  const schemas = contracts
    .map((contract) => `  ${JSON.stringify(contract.id)}: ${schemaVariableName(contract)},`)
    .join("\n");
  const schemaIds = contracts
    .map((contract) => `  ${JSON.stringify(contract.id)}: ${JSON.stringify(contract.schemaId)},`)
    .join("\n");

  return `${GENERATED_TS_NOTICE}

${imports}

export const CONTRACT_SCHEMAS = {
${schemas}
} as const;

export const CONTRACT_SCHEMA_IDS = {
${schemaIds}
} as const;
`;
}

function renderContractsDocumentation(contracts: ContractDefinition[]): string {
  const sections = contracts.map((contract) => {
    const rows = contract.root.fields.map(
      (field) =>
        `| \`${field.name.replaceAll("|", "\\|")}\` | ${
          field.required ? "required" : "optional"
        } | ${field.description.replaceAll("|", "\\|").replace(/\r\n?|\n/g, "<br>")} |`,
    );
    return `## ${contract.typeName}

- Contract ID: \`${contract.id}\`
- Schema ID: \`${contract.schemaId}\`
- Schema version: \`${contract.version}\`

${contract.description}

| Field | Presence | Meaning |
| --- | --- | --- |
${rows.join("\n")}`;
  });

  return `${GENERATED_MARKDOWN_NOTICE}

# Artifact contracts

These contracts are generated from the finite Contract IR imported by \`specs/main.pkl\`.
JSON Schema is the runtime authority; generated TypeScript is its static projection.
Objects reject undeclared properties, and validators do not coerce or insert defaults.

${sections.join("\n\n")}
`;
}

export function renderContractFiles(contracts: ContractDefinition[]): ContractGeneratedFile[] {
  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));
  const files: ContractGeneratedFile[] = contracts.map((contract) => ({
    path: `packages/spec-artifacts/src/schemas/${contract.id}.schema.json`,
    contents: json(renderContractJsonSchema(contract, contractsById)),
  }));

  files.push(
    {
      path: "packages/spec-artifacts/src/contracts.generated.ts",
      contents: renderTypeScriptContracts(contracts),
    },
    {
      path: "packages/spec-artifacts/src/schema-index.generated.ts",
      contents: renderSchemaIndex(contracts),
    },
    {
      path: "docs/generated/CONTRACTS.md",
      contents: renderContractsDocumentation(contracts),
    },
  );

  return files;
}
