import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type RandomCoordinate, rollAtCoordinate } from "./rng.ts";

const coordinateArbitrary: fc.Arbitrary<RandomCoordinate> = fc.record({
  seed: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  logicalEventId: fc.string({ minLength: 1 }),
  purpose: fc.string({ minLength: 1 }),
  index: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

describe("rollAtCoordinate", () => {
  it("returns the same roll for the same logical coordinate", () => {
    fc.assert(
      fc.property(coordinateArbitrary, (coordinate) => {
        expect(rollAtCoordinate(coordinate)).toBe(rollAtCoordinate(structuredClone(coordinate)));
      }),
    );
  });

  it("returns a unit-interval value without using mutable stream state", () => {
    fc.assert(
      fc.property(coordinateArbitrary, (coordinate) => {
        const roll = rollAtCoordinate(coordinate);
        expect(Number.isFinite(roll)).toBe(true);
        expect(roll).toBeGreaterThanOrEqual(0);
        expect(roll).toBeLessThan(1);
      }),
    );
  });

  it("uses length-delimited coordinate components", () => {
    expect(
      rollAtCoordinate({
        seed: 1,
        logicalEventId: "ab",
        purpose: "c",
        index: 0,
      }),
    ).not.toBe(
      rollAtCoordinate({
        seed: 1,
        logicalEventId: "a",
        purpose: "bc",
        index: 0,
      }),
    );
  });

  it("rejects invalid seeds and indexes", () => {
    expect(() =>
      rollAtCoordinate({
        seed: -1,
        logicalEventId: "event",
        purpose: "critical",
        index: 0,
      }),
    ).toThrow("seed");
    expect(() =>
      rollAtCoordinate({
        seed: 0,
        logicalEventId: "event",
        purpose: "critical",
        index: 0.5,
      }),
    ).toThrow("index");
  });
});
