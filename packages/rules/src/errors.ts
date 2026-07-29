export type RulesErrorCode =
  | "contract-invalid"
  | "content-hash-mismatch"
  | "duplicate-rule-id"
  | "phase-order-invalid"
  | "operation-declaration-invalid"
  | "invalid-rule"
  | "invalid-reference"
  | "invalid-context"
  | "invalid-damage-vector"
  | "unsupported-rule"
  | "unknown-operation"
  | "arithmetic-invalid";

export type RulesErrorDetails = Readonly<Record<string, string | number | boolean | null>>;

export class RulesError extends Error {
  readonly code: RulesErrorCode;
  readonly details: RulesErrorDetails;

  constructor(code: RulesErrorCode, message: string, details: RulesErrorDetails = {}) {
    super(message);
    this.name = "RulesError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
