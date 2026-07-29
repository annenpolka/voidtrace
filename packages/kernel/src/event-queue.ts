export type KernelEvent<TPayload = unknown> = {
  readonly id: string;
  readonly logicalId: string;
  readonly parentEventId?: string;
  readonly timeMs: number;
  readonly sequence: number;
  readonly kind: string;
  readonly payload: TPayload;
};

function compareEvents(left: KernelEvent, right: KernelEvent): number {
  if (left.timeMs !== right.timeMs) {
    return left.timeMs - right.timeMs;
  }
  if (left.sequence !== right.sequence) {
    return left.sequence - right.sequence;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function snapshotEvent<TPayload>(event: KernelEvent<TPayload>): KernelEvent<TPayload> {
  if (event.id.length === 0) {
    throw new TypeError("Event id must not be empty");
  }
  if (event.logicalId.length === 0) {
    throw new TypeError("Event logicalId must not be empty");
  }
  if (!Number.isSafeInteger(event.timeMs) || event.timeMs < 0) {
    throw new TypeError("Event timeMs must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 0) {
    throw new TypeError("Event sequence must be a non-negative safe integer");
  }

  return Object.freeze({ ...event });
}

export class EventQueue<TPayload = unknown> {
  readonly #events: KernelEvent<TPayload>[] = [];
  readonly #seenIds = new Set<string>();
  #processedTimeMs = 0;
  #hasProcessedEvent = false;

  constructor(events: Iterable<KernelEvent<TPayload>> = []) {
    for (const event of events) {
      this.enqueue(event);
    }
  }

  get size(): number {
    return this.#events.length;
  }

  get processedTimeMs(): number | undefined {
    return this.#hasProcessedEvent ? this.#processedTimeMs : undefined;
  }

  enqueue(event: KernelEvent<TPayload>): void {
    const snapshot = snapshotEvent(event);
    if (this.#seenIds.has(snapshot.id)) {
      throw new Error(`Duplicate event ID: ${snapshot.id}`);
    }
    if (this.#hasProcessedEvent && snapshot.timeMs < this.#processedTimeMs) {
      throw new RangeError(
        `Cannot enqueue event before processed time ${this.#processedTimeMs}: ${snapshot.timeMs}`,
      );
    }

    this.#seenIds.add(snapshot.id);
    this.#events.push(snapshot);
    this.#events.sort(compareEvents);
  }

  dequeue(): KernelEvent<TPayload> | undefined {
    const next = this.#events.shift();
    if (!next) {
      return undefined;
    }
    if (this.#hasProcessedEvent && next.timeMs < this.#processedTimeMs) {
      throw new Error("Event Queue invariant violated: logical time regressed");
    }
    this.#processedTimeMs = next.timeMs;
    this.#hasProcessedEvent = true;
    return next;
  }

  drain(): KernelEvent<TPayload>[] {
    const drained: KernelEvent<TPayload>[] = [];
    for (let next = this.dequeue(); next; next = this.dequeue()) {
      drained.push(next);
    }
    return drained;
  }
}
