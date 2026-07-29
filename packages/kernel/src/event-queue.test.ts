import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { EventQueue, type KernelEvent } from "./event-queue.ts";

function event(id: string, timeMs: number, sequence: number): KernelEvent {
  return {
    id,
    logicalId: id,
    timeMs,
    sequence,
    kind: "test.event",
    payload: null,
  };
}

describe("EventQueue", () => {
  it("dequeues by logical time, sequence, then stable ID", () => {
    const queue = new EventQueue([
      event("event.z", 20, 0),
      event("event.b", 10, 1),
      event("event.a", 10, 1),
      event("event.first", 10, 0),
    ]);

    expect(queue.drain().map(({ id }) => id)).toEqual([
      "event.first",
      "event.a",
      "event.b",
      "event.z",
    ]);
  });

  it("never dequeues a time earlier than the previous event", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            id: fc.uuid(),
            timeMs: fc.integer({ min: 0, max: 1_000_000 }),
            sequence: fc.integer({ min: 0, max: 1_000_000 }),
          }),
          { selector: ({ id }) => id },
        ),
        (inputs) => {
          const queue = new EventQueue(
            inputs.map(({ id, timeMs, sequence }) => event(`event.${id}`, timeMs, sequence)),
          );
          const times = queue.drain().map(({ timeMs }) => timeMs);
          expect(times).toEqual([...times].toSorted((left, right) => left - right));
        },
      ),
    );
  });

  it("rejects duplicate IDs and events scheduled in the processed past", () => {
    const queue = new EventQueue([event("event.current", 10, 0)]);
    expect(queue.dequeue()?.id).toBe("event.current");

    expect(() => queue.enqueue(event("event.current", 10, 1))).toThrow("Duplicate event ID");
    expect(() => queue.enqueue(event("event.past", 9, 0))).toThrow(
      "Cannot enqueue event before processed time",
    );
  });

  it("snapshots ordering fields at enqueue time", () => {
    const mutable = {
      id: "event.mutable",
      logicalId: "event.mutable",
      timeMs: 10,
      sequence: 0,
      kind: "test.event",
      payload: null,
    };
    const queue = new EventQueue([mutable]);
    mutable.timeMs = 999;

    expect(queue.dequeue()?.timeMs).toBe(10);
  });

  it("rejects invalid logical coordinates", () => {
    expect(() => new EventQueue([event("event.nan", Number.NaN, 0)])).toThrow(
      "Event timeMs must be",
    );
    expect(() => new EventQueue([event("event.negative", 0, -1)])).toThrow(
      "Event sequence must be",
    );
  });
});
