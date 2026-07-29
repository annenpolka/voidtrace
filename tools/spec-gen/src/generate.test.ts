import { access, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSpecification, resetControlledRoots } from "./generate.ts";

const filesystemControl = vi.hoisted(() => ({
  swapBeforeNextMkdir: null as null | {
    link: string;
    target: string;
  },
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    mkdir: async (...args: Parameters<typeof actual.mkdir>) => {
      const swap = filesystemControl.swapBeforeNextMkdir;
      if (swap !== null) {
        filesystemControl.swapBeforeNextMkdir = null;
        await actual.rm(swap.link, { force: true });
        await actual.symlink(swap.target, swap.link);
      }
      return actual.mkdir(...args);
    },
  };
});

const temporaryRoots: string[] = [];
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

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
  filesystemControl.swapBeforeNextMkdir = null;
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

  it("refuses to traverse a symlink inside a controlled generated path", async () => {
    const root = await temporaryRoot();
    const outside = await temporaryRoot();
    const sentinel = join(outside, "spec-artifacts/sentinel.txt");
    await mkdir(join(outside, "spec-artifacts"), { recursive: true });
    await writeFile(sentinel, "keep\n");
    await symlink(outside, join(root, "packages"));

    await expect(resetControlledRoots(root)).rejects.toThrow(
      "Refusing to traverse a symlink in a controlled generated path",
    );
    await expect(exists(sentinel)).resolves.toBe(true);
  });
});

describe("generateSpecification", () => {
  it("keeps writing to the canonical root if the supplied symlink changes after reset", async () => {
    const root = await temporaryRoot();
    const originalTarget = join(root, "original");
    const redirectedTarget = join(root, "redirected");
    const linkedRoot = join(root, "output");
    await Promise.all([mkdir(originalTarget), mkdir(redirectedTarget)]);
    await symlink(originalTarget, linkedRoot);
    filesystemControl.swapBeforeNextMkdir = {
      link: linkedRoot,
      target: redirectedTarget,
    };

    await generateSpecification(repositoryRoot, linkedRoot);

    expect(filesystemControl.swapBeforeNextMkdir).toBeNull();
    await expect(
      exists(join(originalTarget, "packages/spec-artifacts/package.json")),
    ).resolves.toBe(true);
    await expect(
      exists(join(redirectedTarget, "packages/spec-artifacts/package.json")),
    ).resolves.toBe(false);
  });
});
