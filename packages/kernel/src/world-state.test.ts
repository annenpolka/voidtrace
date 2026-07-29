import { describe, expect, it } from "vitest";
import { advanceWorldTime, createWorldState, replaceEntityState } from "./world-state.ts";

describe("WorldState", () => {
  it("snapshots initial scalar entity state", () => {
    const values = { health: 100, alive: true };
    const state = createWorldState([{ id: "target.one", values }]);
    values.health = 0;

    expect(state.entities["target.one"]?.values.health).toBe(100);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.entities)).toBe(true);
    expect(Object.isFrozen(state.entities["target.one"]?.values)).toBe(true);
  });

  it("returns a new state for explicit transitions without mutating history", () => {
    const before = createWorldState([{ id: "target.one", values: { health: 100 } }]);
    const after = replaceEntityState(before, "target.one", { health: 75 });

    expect(before.entities["target.one"]?.values.health).toBe(100);
    expect(after.entities["target.one"]?.values.health).toBe(75);
    expect(after.timeMs).toBe(before.timeMs);
  });

  it("rejects unknown entities and time regression", () => {
    const state = createWorldState([{ id: "target.one", values: { health: 100 } }]);

    expect(() => replaceEntityState(state, "target.missing", { health: 0 })).toThrow(
      "Unknown world entity",
    );
    expect(() => advanceWorldTime(advanceWorldTime(state, 10), 9)).toThrow(
      "World time cannot regress",
    );
  });

  it("rejects duplicate entity IDs", () => {
    expect(() =>
      createWorldState([
        { id: "target.one", values: {} },
        { id: "target.one", values: {} },
      ]),
    ).toThrow("Duplicate world entity ID");
  });
});
