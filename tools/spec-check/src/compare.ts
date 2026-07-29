import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

export type FreshnessDifference =
  | { kind: "missing"; path: string }
  | { kind: "unexpected"; path: string }
  | { kind: "changed"; path: string };

async function listFiles(root: string, directory: string): Promise<string[]> {
  const absolute = join(root, directory);
  try {
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) {
      throw new Error(`Generated control root must not contain symlinks: ${absolute}`);
    }
    const entries = await readdir(absolute, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      if (entry.name === "node_modules") {
        continue;
      }
      const path = join(absolute, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Generated control root must not contain symlinks: ${path}`);
      }
      if (entry.isDirectory()) {
        files.push(...(await listFiles(root, relative(root, path))));
      } else if (entry.isFile()) {
        files.push(relative(root, path));
      }
    }
    return files;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function readBytes(path: string): Promise<Buffer | undefined> {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile()) {
      return undefined;
    }
    return await readFile(path);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function compareGeneratedTrees(
  actualRoot: string,
  expectedRoot: string,
  controlledRoots: string[],
): Promise<FreshnessDifference[]> {
  const [actualFiles, expectedFiles] = await Promise.all([
    Promise.all(controlledRoots.map((root) => listFiles(actualRoot, root))),
    Promise.all(controlledRoots.map((root) => listFiles(expectedRoot, root))),
  ]);
  const actual = new Set(actualFiles.flat());
  const expected = new Set(expectedFiles.flat());
  const allPaths = [...new Set([...actual, ...expected])].toSorted();
  const differences: FreshnessDifference[] = [];

  for (const path of allPaths) {
    if (!actual.has(path)) {
      differences.push({ kind: "missing", path });
      continue;
    }
    if (!expected.has(path)) {
      differences.push({ kind: "unexpected", path });
      continue;
    }

    const [actualBytes, expectedBytes] = await Promise.all([
      readBytes(join(actualRoot, path)),
      readBytes(join(expectedRoot, path)),
    ]);
    if (!actualBytes || !expectedBytes || !actualBytes.equals(expectedBytes)) {
      differences.push({ kind: "changed", path });
    }
  }

  return differences;
}
