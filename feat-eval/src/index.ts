export { evaluate } from "./eval";
export { bucket, pickByWeight } from "./bucketing";
export { matchOperator } from "./operators";
export { matchSegment } from "./segments";
export { resolveAttribute, readContextKey } from "./context";
export type {
  ContextKindObject,
  EvalContext,
  EvaluationResult,
  Reason,
} from "./types";
