import {
  parseSemanticVersion,
  readCommandVersion,
  satisfies,
  type VersionRange,
} from "./toolchain.ts";

const requirements: Array<{
  name: string;
  rawVersion: string;
  range: VersionRange;
}> = [
  {
    name: "Node.js",
    rawVersion: process.version,
    range: {
      minimum: { major: 24, minor: 0, patch: 0 },
      maximumExclusive: { major: 27, minor: 0, patch: 0 },
    },
  },
  {
    name: "pnpm",
    rawVersion: readCommandVersion("pnpm"),
    range: {
      minimum: { major: 11, minor: 0, patch: 0 },
      maximumExclusive: { major: 12, minor: 0, patch: 0 },
    },
  },
  {
    name: "Pkl",
    rawVersion: readCommandVersion("pkl"),
    range: {
      minimum: { major: 0, minor: 32, patch: 0 },
      maximumExclusive: { major: 0, minor: 33, patch: 0 },
    },
  },
  {
    name: "just",
    rawVersion: readCommandVersion("just"),
    range: {
      minimum: { major: 1, minor: 51, patch: 0 },
      maximumExclusive: { major: 2, minor: 0, patch: 0 },
    },
  },
];

const resolvedVersions: string[] = [];
for (const requirement of requirements) {
  const version = parseSemanticVersion(requirement.rawVersion);
  if (!satisfies(version, requirement.range)) {
    throw new Error(
      `${requirement.name} ${requirement.rawVersion} is outside the supported version range`,
    );
  }
  resolvedVersions.push(`${requirement.name} ${version.major}.${version.minor}.${version.patch}`);
}

console.log(resolvedVersions.join(" | "));
