import { spawnSync } from "node:child_process";

export type SemanticVersion = {
  major: number;
  minor: number;
  patch: number;
};

export type VersionRange = {
  minimum: SemanticVersion;
  maximumExclusive: SemanticVersion;
};

export function parseSemanticVersion(value: string): SemanticVersion {
  const match = value.match(/(?:^|\s|v)(\d+)\.(\d+)\.(\d+)(?:\s|$|-|\))/);
  if (!match) {
    throw new Error(`Unable to parse semantic version from: ${value.trim()}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compare(left: SemanticVersion, right: SemanticVersion): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

export function satisfies(version: SemanticVersion, range: VersionRange): boolean {
  return compare(version, range.minimum) >= 0 && compare(version, range.maximumExclusive) < 0;
}

export function readCommandVersion(command: string, args: string[] = ["--version"]): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
  });
  if (result.error) {
    throw new Error(`Required tool is unavailable: ${command}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} version check failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}
