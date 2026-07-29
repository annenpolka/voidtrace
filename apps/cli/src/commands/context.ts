import type { CliApplication, CliProblem } from "@voidtrace/runtime-node";

export type CommandContext = {
  readonly application: CliApplication;
  readonly emitSuccess: (value: unknown, pretty: boolean) => void;
  readonly reject: (problem: CliProblem) => void;
};

export type JsonOptions = {
  readonly json?: boolean;
  readonly pretty?: boolean;
};
