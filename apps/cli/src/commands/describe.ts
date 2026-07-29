import type { Command } from "commander";
import type { CommandContext, JsonOptions } from "./context.ts";

export function registerDescribeCommand(program: Command, context: CommandContext): void {
  program
    .command("describe")
    .description("Describe the currently supported VoidTrace capabilities")
    .option("--json", "Emit JSON (the default)")
    .option("--pretty", "Pretty-print deterministic JSON")
    .action(async (options: JsonOptions) => {
      const manifest = await context.application.describe();
      context.emitSuccess(manifest, options.pretty === true);
    });
}
