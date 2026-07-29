export type RandomCoordinate = {
  readonly seed: number;
  readonly logicalEventId: string;
  readonly purpose: string;
  readonly index?: number;
};

const UINT32_RANGE = 0x1_0000_0000;

function assertCoordinateInteger(value: number, name: "seed" | "index"): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Random coordinate ${name} must be a non-negative safe integer`);
  }
}

function appendComponent(hash: number, component: string): number {
  const framed = `${component.length}:${component};`;
  let next = hash;
  for (let index = 0; index < framed.length; index += 1) {
    next ^= framed.charCodeAt(index);
    next = Math.imul(next, 0x01000193);
  }
  return next >>> 0;
}

function avalanche(value: number): number {
  let result = value >>> 0;
  result ^= result >>> 16;
  result = Math.imul(result, 0x85ebca6b);
  result ^= result >>> 13;
  result = Math.imul(result, 0xc2b2ae35);
  result ^= result >>> 16;
  return result >>> 0;
}

export function rollAtCoordinate(coordinate: RandomCoordinate): number {
  const index = coordinate.index ?? 0;
  assertCoordinateInteger(coordinate.seed, "seed");
  assertCoordinateInteger(index, "index");
  if (coordinate.logicalEventId.length === 0) {
    throw new TypeError("Random coordinate logicalEventId must not be empty");
  }
  if (coordinate.purpose.length === 0) {
    throw new TypeError("Random coordinate purpose must not be empty");
  }

  let hash = 0x811c9dc5;
  hash = appendComponent(hash, String(coordinate.seed));
  hash = appendComponent(hash, coordinate.logicalEventId);
  hash = appendComponent(hash, coordinate.purpose);
  hash = appendComponent(hash, String(index));
  return avalanche(hash) / UINT32_RANGE;
}
