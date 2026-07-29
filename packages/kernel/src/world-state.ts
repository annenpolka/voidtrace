export type ScalarState = Readonly<Record<string, string | number | boolean | null>>;

export type WorldEntity = {
  readonly id: string;
  readonly values: ScalarState;
};

export type WorldState = {
  readonly timeMs: number;
  readonly entities: Readonly<Record<string, WorldEntity>>;
};

function snapshotValues(values: ScalarState): ScalarState {
  return Object.freeze({ ...values });
}

function snapshotEntity(entity: WorldEntity): WorldEntity {
  if (entity.id.length === 0) {
    throw new TypeError("World entity id must not be empty");
  }
  return Object.freeze({
    id: entity.id,
    values: snapshotValues(entity.values),
  });
}

function freezeWorldState(timeMs: number, entities: Record<string, WorldEntity>): WorldState {
  return Object.freeze({
    timeMs,
    entities: Object.freeze(entities),
  });
}

export function createWorldState(entities: Iterable<WorldEntity> = []): WorldState {
  const indexed: Record<string, WorldEntity> = Object.create(null);
  for (const entity of entities) {
    const snapshot = snapshotEntity(entity);
    if (Object.hasOwn(indexed, snapshot.id)) {
      throw new Error(`Duplicate world entity ID: ${snapshot.id}`);
    }
    indexed[snapshot.id] = snapshot;
  }
  return freezeWorldState(0, indexed);
}

export function advanceWorldTime(state: WorldState, timeMs: number): WorldState {
  if (!Number.isSafeInteger(timeMs) || timeMs < 0) {
    throw new TypeError("World time must be a non-negative safe integer");
  }
  if (timeMs < state.timeMs) {
    throw new RangeError(`World time cannot regress from ${state.timeMs} to ${timeMs}`);
  }
  if (timeMs === state.timeMs) {
    return state;
  }
  return freezeWorldState(timeMs, { ...state.entities });
}

export function replaceEntityState(
  state: WorldState,
  entityId: string,
  values: ScalarState,
): WorldState {
  const existing = state.entities[entityId];
  if (!existing) {
    throw new Error(`Unknown world entity: ${entityId}`);
  }
  return freezeWorldState(state.timeMs, {
    ...state.entities,
    [entityId]: Object.freeze({
      id: existing.id,
      values: snapshotValues(values),
    }),
  });
}
