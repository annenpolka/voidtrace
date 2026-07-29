import type { Command } from "commander";
import type { CommandContext, JsonOptions } from "./context.ts";

type RunOptions = JsonOptions & {
  readonly catalog: string;
};

export function registerRunCommand(program: Command, context: CommandContext): void {
  program
    .command("run")
    .description("Evaluate a Scenario and emit its Result Artifact")
    .argument("<scenario>", "Scenario JSON path, or - for stdin")
    .requiredOption("--catalog <path>", "CatalogSnapshot JSON path, or - for stdin")
    .option("--json", "Emit JSON (the default)")
    .option("--pretty", "Pretty-print deterministic JSON")
    .action(async (scenario: string, options: RunOptions) => {
      const outcome = await context.application.evaluate({
        scenarioSource: scenario,
        catalogSource: options.catalog,
      });
      if (!outcome.ok) {
        context.reject(outcome.problem);
        return;
      }
      context.emitSuccess(outcome.result, options.pretty === true);
    });
}
