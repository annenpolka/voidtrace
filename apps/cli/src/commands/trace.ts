import type { Command } from "commander";
import type { CommandContext, JsonOptions } from "./context.ts";

type TraceOptions = JsonOptions & {
  readonly catalog: string;
};

export function registerTraceCommand(program: Command, context: CommandContext): void {
  program
    .command("trace")
    .description("Evaluate a Scenario and emit its causal Trace Artifact")
    .argument("<scenario>", "Scenario JSON path, or - for stdin")
    .requiredOption("--catalog <path>", "CatalogSnapshot JSON path, or - for stdin")
    .option("--json", "Emit JSON (the default)")
    .option("--pretty", "Pretty-print deterministic JSON")
    .action(async (scenario: string, options: TraceOptions) => {
      const outcome = await context.application.evaluate({
        scenarioSource: scenario,
        catalogSource: options.catalog,
      });
      if (!outcome.ok) {
        context.reject(outcome.problem);
        return;
      }
      context.emitSuccess(outcome.trace, options.pretty === true);
    });
}
