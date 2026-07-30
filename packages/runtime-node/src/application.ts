import { readFile } from "node:fs/promises";
import { type Problem, type Result, type Trace, validateContract } from "@voidtrace/contracts";
import {
  type CapabilityManifest,
  describeCapabilities,
  evaluateScenario,
  type SdkEvaluationOutcome,
  type SdkEvaluationRequest,
} from "@voidtrace/sdk";

export type CliProblem = Problem;

export type ProblemClassification = Problem["classification"];

export type CreateProblemRequest = {
  readonly classification: ProblemClassification;
  readonly code: string;
  readonly message: string;
  readonly pointer?: string;
  readonly mechanicId?: string;
  readonly causeCode?: string;
  readonly source?: string;
};

export type CliEvaluationRequest = {
  readonly scenarioSource: string;
  readonly catalogSource: string;
  readonly stdinText?: string;
};

export type CliEvaluationOutcome =
  | {
      readonly ok: true;
      readonly result: Result;
      readonly trace: Trace;
    }
  | {
      readonly ok: false;
      readonly problem: CliProblem;
    };

export type CliApplication = {
  describe(): CapabilityManifest;
  evaluate(request: CliEvaluationRequest): Promise<CliEvaluationOutcome>;
};

export type SdkFacade = {
  describeCapabilities(): CapabilityManifest;
  evaluateScenario(request: SdkEvaluationRequest): Promise<SdkEvaluationOutcome>;
};

export type NodeApplicationDependencies = {
  readonly readStdin?: () => Promise<string>;
  readonly readTextFile?: (path: string) => Promise<string>;
  readonly sdk?: SdkFacade;
};

type ReadJsonOutcome =
  | {
      readonly ok: true;
      readonly value: unknown;
    }
  | {
      readonly ok: false;
      readonly problem: CliProblem;
    };

type EvaluationError = Extract<SdkEvaluationOutcome, { readonly ok: false }>["error"];

const EXIT_CODES = {
  input: 2,
  unsupported: 3,
  limit: 4,
  internal: 5,
} as const satisfies Record<ProblemClassification, 2 | 3 | 4 | 5>;

const defaultSdk: SdkFacade = {
  describeCapabilities,
  evaluateScenario,
};

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

export function createProblem(request: CreateProblemRequest): CliProblem {
  const candidate = {
    kind: "voidtrace.problem",
    schemaVersion: "0.1.0",
    code: request.code,
    message: request.message,
    classification: request.classification,
    ...(request.pointer === undefined ? {} : { pointer: request.pointer }),
    ...(request.mechanicId === undefined ? {} : { mechanicId: request.mechanicId }),
    ...(request.causeCode === undefined ? {} : { causeCode: request.causeCode }),
    ...(request.source === undefined ? {} : { source: request.source }),
  } as const;
  const validation = validateContract("problem", candidate);
  if (!validation.ok) {
    throw new TypeError("Runtime constructed an invalid VoidTrace Problem");
  }
  return deepFreeze(validation.value);
}

export function exitCodeForProblem(problem: CliProblem): 2 | 3 | 4 | 5 {
  return EXIT_CODES[problem.classification];
}

async function readProcessStdin(): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  for await (const chunk of process.stdin) {
    text +=
      typeof chunk === "string"
        ? chunk
        : decoder.decode(chunk as Uint8Array, {
            stream: true,
          });
  }
  return text + decoder.decode();
}

function sourceProblem(code: string, message: string, source: string | undefined): ReadJsonOutcome {
  return {
    ok: false,
    problem: createProblem({
      classification: "input",
      code,
      message,
      ...(source === undefined ? {} : { source }),
    }),
  };
}

async function readJsonSource(
  label: "Scenario" | "Catalog",
  source: string,
  stdinText: string | undefined,
  readStdin: () => Promise<string>,
  readTextFile: (path: string) => Promise<string>,
): Promise<ReadJsonOutcome> {
  if (source.length === 0) {
    return sourceProblem(
      "cli.source-invalid",
      `${label} source must be a non-empty path or -`,
      undefined,
    );
  }

  let text: string;
  if (source === "-") {
    try {
      text = stdinText ?? (await readStdin());
    } catch {
      return sourceProblem("cli.stdin-read-failed", `Could not read ${label} JSON from stdin`, "-");
    }
  } else {
    try {
      text = await readTextFile(source);
    } catch {
      return sourceProblem("cli.file-read-failed", `Could not read ${label} JSON input`, source);
    }
  }

  try {
    return {
      ok: true,
      value: JSON.parse(text) as unknown,
    };
  } catch {
    return sourceProblem("cli.json-invalid", `${label} input is not valid JSON`, source);
  }
}

function classificationForEvaluationError(error: EvaluationError): ProblemClassification {
  if (
    error.code.startsWith("unsupported-") ||
    error.causeCode?.startsWith("unsupported-") === true
  ) {
    return "unsupported";
  }
  switch (error.code) {
    case "unsupported-critical-chance":
    case "unsupported-critical-multiplier":
    case "unsupported-delivery":
      return "unsupported";
    case "scenario-invalid":
    case "catalog-load-failed":
    case "catalog-reference-mismatch":
    case "ruleset-reference-mismatch":
    case "catalog-resolution-failed":
    case "ruleset-load-failed":
      return "input";
    case "rule-execution-failed":
    case "artifact-construction-failed":
    case "integrity-check-failed":
      if (error.causeCode === "unsupported-rule") {
        return "unsupported";
      }
      return error.causeCode === "execution-limit-exceeded" ? "limit" : "internal";
  }
}

function sourceForEvaluationError(
  error: EvaluationError,
  request: CliEvaluationRequest,
): string | undefined {
  switch (error.code) {
    case "catalog-load-failed":
    case "catalog-resolution-failed":
      return request.catalogSource;
    case "scenario-invalid":
    case "catalog-reference-mismatch":
    case "ruleset-reference-mismatch":
      return request.scenarioSource;
    case "ruleset-load-failed":
    case "unsupported-delivery":
    case "rule-execution-failed":
    case "artifact-construction-failed":
    case "integrity-check-failed":
      return undefined;
    case "unsupported-critical-chance":
    case "unsupported-critical-multiplier":
      return request.catalogSource;
  }
}

function evaluationProblem(error: EvaluationError, request: CliEvaluationRequest): CliProblem {
  const source = sourceForEvaluationError(error, request);
  return createProblem({
    classification: classificationForEvaluationError(error),
    code: error.code,
    message: error.message,
    ...(error.path === undefined ? {} : { pointer: error.path }),
    ...(error.mechanicId === undefined ? {} : { mechanicId: error.mechanicId }),
    ...(error.causeCode === undefined ? {} : { causeCode: error.causeCode }),
    ...(source === undefined ? {} : { source }),
  });
}

function unexpectedProblem(): CliProblem {
  return createProblem({
    classification: "internal",
    code: "cli.internal",
    message: "VoidTrace could not complete the evaluation",
  });
}

export function createNodeApplication(
  dependencies: NodeApplicationDependencies = {},
): CliApplication {
  const sdk = dependencies.sdk ?? defaultSdk;
  const readStdin = dependencies.readStdin ?? readProcessStdin;
  const readTextFile = dependencies.readTextFile ?? ((path: string) => readFile(path, "utf8"));

  return Object.freeze({
    describe: (): CapabilityManifest => sdk.describeCapabilities(),
    evaluate: async (request: CliEvaluationRequest): Promise<CliEvaluationOutcome> => {
      if (request.scenarioSource === "-" && request.catalogSource === "-") {
        return {
          ok: false,
          problem: createProblem({
            classification: "input",
            code: "cli.stdin-conflict",
            message: "Scenario and Catalog cannot both read from stdin",
          }),
        };
      }

      const [scenario, catalog] = await Promise.all([
        readJsonSource(
          "Scenario",
          request.scenarioSource,
          request.stdinText,
          readStdin,
          readTextFile,
        ),
        readJsonSource(
          "Catalog",
          request.catalogSource,
          request.stdinText,
          readStdin,
          readTextFile,
        ),
      ]);
      if (!scenario.ok) {
        return scenario;
      }
      if (!catalog.ok) {
        return catalog;
      }

      try {
        const outcome = await sdk.evaluateScenario({
          scenario: scenario.value,
          catalog: catalog.value,
        });
        if (!outcome.ok) {
          if (classificationForEvaluationError(outcome.error) === "internal") {
            return {
              ok: false,
              problem: unexpectedProblem(),
            };
          }
          return {
            ok: false,
            problem: evaluationProblem(outcome.error, request),
          };
        }
        return {
          ok: true,
          result: outcome.result,
          trace: outcome.trace,
        };
      } catch {
        return {
          ok: false,
          problem: unexpectedProblem(),
        };
      }
    },
  });
}
