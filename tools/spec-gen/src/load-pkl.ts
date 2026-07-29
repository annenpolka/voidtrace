import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import type { SpecDocument } from "./model.ts";
import { validateSpecDocument } from "./model.ts";

export function loadPklSpec(entrypoint: string): SpecDocument {
  const evaluation = spawnSync(
    "pkl",
    [
      "eval",
      "--format=json",
      "--root-dir",
      dirname(entrypoint),
      "--allowed-modules",
      "pkl:,file:",
      "--allowed-resources",
      "prop:,file:",
      "--no-cache",
      entrypoint,
    ],
    {
      encoding: "utf8",
      shell: false,
    },
  );

  if (evaluation.error) {
    throw new Error(`Unable to execute Pkl: ${evaluation.error.message}`);
  }
  if (evaluation.status !== 0) {
    throw new Error(
      [
        `Pkl evaluation failed with exit code ${evaluation.status ?? "unknown"}`,
        evaluation.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  try {
    return validateSpecDocument(JSON.parse(evaluation.stdout) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Pkl emitted invalid JSON: ${error.message}`);
    }
    throw error;
  }
}
