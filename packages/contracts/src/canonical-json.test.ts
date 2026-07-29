import { describe, expect, it } from "vitest";
import { canonicalizeJson } from "./canonical-json.ts";
import {
  attachArtifactContentHash,
  attachResultHash,
  computeArtifactContentHash,
  computeResultHash,
  sha256CanonicalJson,
  verifyArtifactContentHash,
  verifyResultHash,
} from "./fingerprint.ts";

const HASH = `sha256:${"0".repeat(64)}`;

describe("canonicalizeJson", () => {
  it("matches the RFC 8785 serialization example", () => {
    expect(
      canonicalizeJson({
        numbers: [333333333.3333333, 1e30, 4.5, 2e-3, 1e-27],
        string: '€$\u000f\nA\'B"\\\\"/',
        literals: [null, true, false],
      }),
    ).toBe(
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}',
    );
  });

  it("is independent of object insertion order", () => {
    expect(canonicalizeJson({ z: 1, a: { y: 2, b: 3 } })).toBe(
      canonicalizeJson({ a: { b: 3, y: 2 }, z: 1 }),
    );
  });

  it("rejects values outside I-JSON", () => {
    expect(() => canonicalizeJson({ value: Number.NaN })).toThrow("Non-finite number");
    expect(() => canonicalizeJson({ value: undefined })).toThrow("Non-JSON value");
    expect(() => canonicalizeJson("\ud800")).toThrow("lone high surrogate");
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalizeJson(cyclic)).toThrow("Cyclic value");
    const accessor = Object.defineProperty({}, "value", {
      enumerable: true,
      get: () => 1,
    });
    expect(() => canonicalizeJson(accessor)).toThrow("Accessor or hidden property");
  });

  it("rejects sparse arrays", () => {
    const sparse = new Array(1);

    expect(Object.hasOwn(sparse, 0)).toBe(false);
    expect(() => canonicalizeJson(sparse)).toThrow("Sparse array");
  });

  it("rejects dense arrays with behavior-bearing custom prototypes", () => {
    const array = [42];
    Object.setPrototypeOf(array, Object.create(Array.prototype));

    expect(() => canonicalizeJson(array)).toThrow("Non-plain array");
  });
});

describe("Artifact content fingerprints", () => {
  it("uses canonical JSON and excludes only the self-referential hash", async () => {
    const left = await sha256CanonicalJson({ b: 2, a: 1 });
    const right = await sha256CanonicalJson({ a: 1, b: 2 });
    expect(left).toBe(right);
    expect(left).toBe("sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777");

    const artifact = await attachArtifactContentHash({
      kind: "scenario",
      id: "scenario.example",
      revision: 0,
    });
    await expect(verifyArtifactContentHash(artifact)).resolves.toBe(true);
    await expect(
      verifyArtifactContentHash({
        ...artifact,
        revision: 1,
      }),
    ).resolves.toBe(false);
  });

  it("computes and verifies a Result hash from execution inputs only", async () => {
    const input = {
      productVersion: "0.1.0",
      engineVersion: "0.1.0",
      scenarioSchemaVersion: "0.1.0",
      catalogHash: HASH,
      rulesetHash: HASH,
      scenarioHash: HASH,
      seed: 42,
    };

    const fingerprint = await attachResultHash(input);
    expect(fingerprint.resultHash).toBe(await computeResultHash(input));
    await expect(verifyResultHash(fingerprint)).resolves.toBe(true);
    await expect(
      verifyResultHash({
        ...fingerprint,
        engineVersion: "0.2.0",
      }),
    ).resolves.toBe(false);
    expect(await computeResultHash({ ...fingerprint, resultHash: HASH })).toBe(
      fingerprint.resultHash,
    );
  });

  it("does not erase hidden or inherited state before hashing", async () => {
    const hidden = {
      kind: "voidtrace.scenario",
      contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    Object.defineProperty(hidden, "hidden", {
      enumerable: false,
      value: 42,
    });

    await expect(computeArtifactContentHash(hidden)).rejects.toThrow("hidden property");
    await expect(verifyArtifactContentHash(hidden)).resolves.toBe(false);

    const inheritedFingerprint = Object.assign(Object.create({ hidden: true }), {
      productVersion: "0.1.0",
      engineVersion: "0.1.0",
      scenarioSchemaVersion: "0.1.0",
      catalogHash: HASH,
      rulesetHash: HASH,
      scenarioHash: HASH,
      seed: 0,
    });
    await expect(computeResultHash(inheritedFingerprint)).rejects.toThrow("Non-plain object");
  });

  it("uses one descriptor snapshot when attaching a hash to a Proxy", async () => {
    const source = {
      kind: "descriptor-kind",
      id: "artifact.example",
      revision: 0,
    };
    let reads = 0;
    const proxy = new Proxy(source, {
      get(target, property, receiver) {
        reads += 1;
        return property === "kind" ? "get-trap-kind" : Reflect.get(target, property, receiver);
      },
    });

    const attached = await attachArtifactContentHash(proxy);
    expect(attached.kind).toBe("descriptor-kind");
    expect(reads).toBe(0);
    await expect(verifyArtifactContentHash(attached)).resolves.toBe(true);
  });
});
