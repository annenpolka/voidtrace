import { lstat, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import { loadPklSpec } from "./load-pkl.ts";
import { type GeneratedFile, renderGeneratedFiles } from "./render.ts";

export type GenerationResult = {
  files: GeneratedFile[];
  clauseCount: number;
  contractCount: number;
};

export const CONTROLLED_GENERATED_ROOTS = ["packages/spec-artifacts", "docs/generated"] as const;

function isMissingPath(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function assertNoSymlinkTraversal(root: string, relativePath: string): Promise<void> {
  let current = root;
  for (const segment of relativePath.split("/")) {
    current = join(current, segment);
    try {
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) {
        throw new Error(
          `Refusing to traverse a symlink in a controlled generated path: ${current}`,
        );
      }
    } catch (error) {
      if (isMissingPath(error)) {
        return;
      }
      throw error;
    }
  }
}

export async function resetControlledRoots(outputRoot: string): Promise<string> {
  const resolvedOutputRoot = await realpath(resolve(outputRoot));
  if (resolvedOutputRoot === parse(resolvedOutputRoot).root) {
    throw new Error("Refusing to generate specification artifacts at a filesystem root");
  }

  await Promise.all(
    CONTROLLED_GENERATED_ROOTS.map((controlledRoot) =>
      assertNoSymlinkTraversal(resolvedOutputRoot, controlledRoot),
    ),
  );
  await Promise.all(
    CONTROLLED_GENERATED_ROOTS.map((controlledRoot) =>
      rm(join(resolvedOutputRoot, controlledRoot), {
        recursive: true,
        force: true,
      }),
    ),
  );

  return resolvedOutputRoot;
}

export async function generateSpecification(
  repositoryRoot: string,
  outputRoot = repositoryRoot,
): Promise<GenerationResult> {
  const spec = loadPklSpec(join(repositoryRoot, "specs/main.pkl"));
  const files = renderGeneratedFiles(spec);
  const resolvedOutputRoot = await resetControlledRoots(outputRoot);

  for (const file of files) {
    const destination = join(resolvedOutputRoot, file.path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.contents, "utf8");
  }

  return {
    files,
    clauseCount: spec.clauses.length,
    contractCount: spec.contracts.length,
  };
}
