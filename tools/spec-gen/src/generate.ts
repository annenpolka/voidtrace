import { mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import { loadPklSpec } from "./load-pkl.ts";
import { renderGeneratedFiles, type GeneratedFile } from "./render.ts";

export type GenerationResult = {
  files: GeneratedFile[];
  clauseCount: number;
};

export const CONTROLLED_GENERATED_ROOTS = ["packages/spec-artifacts", "docs/generated"] as const;

export async function resetControlledRoots(outputRoot: string): Promise<void> {
  const resolvedOutputRoot = await realpath(resolve(outputRoot));
  if (resolvedOutputRoot === parse(resolvedOutputRoot).root) {
    throw new Error("Refusing to generate specification artifacts at a filesystem root");
  }

  await Promise.all(
    CONTROLLED_GENERATED_ROOTS.map((controlledRoot) =>
      rm(join(resolvedOutputRoot, controlledRoot), {
        recursive: true,
        force: true,
      }),
    ),
  );
}

export async function generateSpecification(
  repositoryRoot: string,
  outputRoot = repositoryRoot,
): Promise<GenerationResult> {
  const spec = loadPklSpec(join(repositoryRoot, "specs/main.pkl"));
  const files = renderGeneratedFiles(spec);
  await resetControlledRoots(outputRoot);

  for (const file of files) {
    const destination = join(outputRoot, file.path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.contents, "utf8");
  }

  return {
    files,
    clauseCount: spec.clauses.length,
  };
}
