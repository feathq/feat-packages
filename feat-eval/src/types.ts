// Eval-engine surface types. Distinct from @feathq/datafile-schema (which
// is the wire format) — these are runtime concepts the eval engine needs.

// SDK-consumer context. Mirrors OpenFeature's "evaluation context" pattern:
// a top-level `targetingKey` is shorthand for `user.key`, and each remaining
// top-level key is a context kind matching one in the datafile's
// `contextKinds` map.
//
// Example:
//   {
//     targetingKey: "user-123",
//     user: { key: "user-123", email: "u@example.com" },
//     organization: { key: "acme", plan: "pro" }
//   }
export interface EvalContext {
  targetingKey?: string;
  [kindKey: string]: ContextKindObject | string | undefined;
}

export interface ContextKindObject {
  key: string;
  [attr: string]: unknown;
}

export type Reason =
  | "TARGETING_MATCH"
  | "SPLIT"
  | "FALLTHROUGH"
  | "DEFAULT"
  | "DISABLED"
  | "ERROR"
  | "STATIC";

export interface EvaluationResult<T = unknown> {
  value: T;
  variationId: string | null;
  reason: Reason;
  errorMessage?: string;
}
