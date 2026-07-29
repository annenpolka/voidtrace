import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compareGeneratedTrees } from "./compare.ts";

const temporaryRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "voidtrace-freshness-test-"));
  temporaryRoots.push(root);
  return root;
}

async function put(root: string, path: string, contents: string): Promise<void> {
  const destination = join(root, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, contents, "utf8");
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("compareGeneratedTrees", () => {
  it("accepts byte-identical generated trees", async () => {
    const actual = await temporaryRoot();
    const expected = await temporaryRoot();
    await put(actual, "docs/generated/SPEC.md", "same\n");
    await put(expected, "docs/generated/SPEC.md", "same\n");

    await expect(compareGeneratedTrees(actual, expected, ["docs/generated"])).resolves.toEqual([]);
  });

  it("reports changed and unexpected generated files", async () => {
    const actual = await temporaryRoot();
    const expected = await temporaryRoot();
    await put(actual, "docs/generated/SPEC.md", "old\n");
    await put(expected, "docs/generated/SPEC.md", "new\n");
    await put(actual, "docs/generated/manual.md", "manual\n");

    await expect(compareGeneratedTrees(actual, expected, ["docs/generated"])).resolves.toEqual([
      { kind: "changed", path: "docs/generated/SPEC.md" },
      { kind: "unexpected", path: "docs/generated/manual.md" },
    ]);
  });

  it("reports missing and hidden generated files", async () => {
    const actual = await temporaryRoot();
    const expected = await temporaryRoot();
    await put(expected, "docs/generated/SPEC.md", "expected\n");
    await put(actual, "docs/generated/.manual.md", "hidden\n");

    await expect(compareGeneratedTrees(actual, expected, ["docs/generated"])).resolves.toEqual([
      { kind: "unexpected", path: "docs/generated/.manual.md" },
      { kind: "missing", path: "docs/generated/SPEC.md" },
    ]);
  });

  it("rejects symlinks inside controlled roots", async () => {
    const actual = await temporaryRoot();
    const expected = await temporaryRoot();
    await put(actual, "outside.txt", "outside\n");
    await mkdir(join(actual, "docs/generated"), { recursive: true });
    await symlink(join(actual, "outside.txt"), join(actual, "docs/generated/link.md"));

    await expect(compareGeneratedTrees(actual, expected, ["docs/generated"])).rejects.toThrow(
      "Generated control root must not contain symlinks",
    );
  });

  it("rejects a controlled root that is itself a symlink", async () => {
    const actual = await temporaryRoot();
    const expected = await temporaryRoot();
    const target = join(actual, "elsewhere");
    await mkdir(join(actual, "docs"), { recursive: true });
    await mkdir(target, { recursive: true });
    await symlink(target, join(actual, "docs/generated"));

    await expect(compareGeneratedTrees(actual, expected, ["docs/generated"])).rejects.toThrow(
      "Generated control root must not contain symlinks",
    );
  });
});
