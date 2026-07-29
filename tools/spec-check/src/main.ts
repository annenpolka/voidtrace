import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTROLLED_GENERATED_ROOTS, generateSpecification } from "../../spec-gen/src/generate.ts";
import { compareGeneratedTrees } from "./compare.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const temporaryRoot = await mkdtemp(join(tmpdir(), "voidtrace-spec-check-"));
try {
  const generated = await generateSpecification(repositoryRoot, temporaryRoot);
  const differences = await compareGeneratedTrees(repositoryRoot, temporaryRoot, [
    ...CONTROLLED_GENERATED_ROOTS,
  ]);

  if (differences.length > 0) {
    const details = differences.map((difference) => `- ${difference.kind}: ${difference.path}`);
    throw new Error(
      [
        "Generated specification artifacts are stale or contain manual additions.",
        ...details,
        "Run `just spec-gen`, review the generated diff, and commit it.",
      ].join("\n"),
    );
  }

  console.log(`Specification is valid and ${generated.files.length} generated files are fresh.`);
  console.log(
    `${generated.clauseCount} Clauses published; runtime oracle maturity is audited in COVERAGE.md.`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
