import { access, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resetControlledRoots } from "./generate.ts";

const temporaryRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "voidtrace-generation-test-"));
  temporaryRoots.push(root);
  return root;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("resetControlledRoots", () => {
  it("removes only controlled generated roots", async () => {
    const root = await temporaryRoot();
    const artifact = join(root, "packages/spec-artifacts/stale.txt");
    const document = join(root, "docs/generated/stale.md");
    const preserved = join(root, "docs/handwritten.md");
    await Promise.all([
      mkdir(join(root, "packages/spec-artifacts"), { recursive: true }),
      mkdir(join(root, "docs/generated"), { recursive: true }),
      mkdir(join(root, "docs"), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(artifact, "stale\n"),
      writeFile(document, "stale\n"),
      writeFile(preserved, "keep\n"),
    ]);

    await resetControlledRoots(root);

    await expect(exists(artifact)).resolves.toBe(false);
    await expect(exists(document)).resolves.toBe(false);
    await expect(exists(preserved)).resolves.toBe(true);
  });

  it("refuses a filesystem root reached directly or through a symlink", async () => {
    const root = await temporaryRoot();
    const filesystemRoot = parse(root).root;
    const linkedRoot = join(root, "filesystem-root");
    await symlink(filesystemRoot, linkedRoot);

    await expect(resetControlledRoots(filesystemRoot)).rejects.toThrow(
      "Refusing to generate specification artifacts at a filesystem root",
    );
    await expect(resetControlledRoots(linkedRoot)).rejects.toThrow(
      "Refusing to generate specification artifacts at a filesystem root",
    );
  });
});
