import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

type BoundaryRule = {
  root: string;
  forbiddenImports: string[];
};

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const rules: BoundaryRule[] = [
  {
    root: "packages/contracts",
    forbiddenImports: [
      "node:",
      "@voidtrace/catalog",
      "@voidtrace/rules",
      "@voidtrace/kernel",
      "@voidtrace/agent",
      "react",
    ],
  },
  {
    root: "packages/kernel",
    forbiddenImports: [
      "node:",
      "@voidtrace/runtime-node",
      "@voidtrace/planner",
      "@voidtrace/agent",
      "react",
    ],
  },
  {
    root: "packages/analysis",
    forbiddenImports: ["@voidtrace/agent"],
  },
  {
    root: "apps/lab",
    forbiddenImports: ["@voidtrace/kernel", "@voidtrace/rules"],
  },
];

async function sourceFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue;
      }
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await sourceFiles(path)));
      } else if ([".ts", ".tsx", ".mts", ".cts"].includes(extname(entry.name))) {
        files.push(path);
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

const violations: string[] = [];
let scannedFileCount = 0;
for (const rule of rules) {
  const root = join(repositoryRoot, rule.root);
  for (const file of await sourceFiles(root)) {
    scannedFileCount += 1;
    const source = await readFile(file, "utf8");
    for (const forbidden of rule.forbiddenImports) {
      const quoted = [`"${forbidden}`, `'${forbidden}`];
      if (quoted.some((prefix) => source.includes(prefix))) {
        violations.push(
          `${relative(repositoryRoot, file)} imports forbidden boundary ${forbidden}`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Architecture boundary violations:\n${violations.join("\n")}`);
}

console.log(
  `Architecture boundary check passed (${scannedFileCount} source files scanned; absent roots are allowed).`,
);
