import {
  createNodeApplication,
  createProblem,
  exitCodeForProblem,
  type CliApplication,
  type CliProblem,
} from "@voidtrace/runtime-node";
import { Command, CommanderError } from "commander";
import { registerDescribeCommand } from "./commands/describe.ts";
import { registerRunCommand } from "./commands/run.ts";
import { registerTraceCommand } from "./commands/trace.ts";
import { jsonLine } from "./output.ts";

export type CliIo = {
  readonly writeOut: (text: string) => void;
  readonly writeErr: (text: string) => void;
};

export type RunCliOptions = {
  readonly application?: CliApplication;
  readonly io?: CliIo;
};

const processIo: CliIo = {
  writeOut: (text) => process.stdout.write(text),
  writeErr: (text) => process.stderr.write(text),
};

function commanderProblem(error: CommanderError): CliProblem {
  return createProblem({
    classification: "input",
    code: "cli.invalid-argument",
    message: error.message,
  });
}

function internalProblem(): CliProblem {
  return createProblem({
    classification: "internal",
    code: "cli.internal-error",
    message: "VoidTrace failed unexpectedly",
  });
}

export async function runCli(
  argv: readonly string[],
  options: RunCliOptions = {},
): Promise<number> {
  const io = options.io ?? processIo;
  const application = options.application ?? createNodeApplication();
  let problem: CliProblem | undefined;
  let emittedSuccess = false;

  const context = {
    application,
    emitSuccess(value: unknown, pretty: boolean): void {
      if (problem !== undefined || emittedSuccess) {
        throw new Error("CLI attempted to emit more than one terminal value");
      }
      io.writeOut(jsonLine(value, pretty));
      emittedSuccess = true;
    },
    reject(value: CliProblem): void {
      if (problem !== undefined || emittedSuccess) {
        throw new Error("CLI attempted to emit more than one terminal value");
      }
      problem = value;
    },
  };

  const program = new Command()
    .name("voidtrace")
    .description("Deterministic VoidTrace Artifact interface")
    .showSuggestionAfterError(false)
    .exitOverride()
    .configureOutput({
      writeOut: io.writeOut,
      writeErr: () => {},
      outputError: () => {},
    });

  registerDescribeCommand(program, context);
  registerRunCommand(program, context);
  registerTraceCommand(program, context);
  program.action(() => {
    context.reject(
      createProblem({
        classification: "input",
        code: "cli.command-required",
        message: "A command is required",
      }),
    );
  });

  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError && error.exitCode === 0) {
      return 0;
    }
    problem = error instanceof CommanderError ? commanderProblem(error) : internalProblem();
  }

  if (problem !== undefined) {
    io.writeErr(jsonLine(problem, false));
    return exitCodeForProblem(problem);
  }
  if (!emittedSuccess) {
    const missingOutput = internalProblem();
    io.writeErr(jsonLine(missingOutput, false));
    return exitCodeForProblem(missingOutput);
  }
  return 0;
}
