import type { Datafile } from "@feathq/datafile-schema";
import type { EvalContext } from "./types";
import { resolveAttribute } from "./context";
import { matchOperator } from "./operators";

// True iff the context matches the segment with the given key. A missing
// segment reference is treated as a non-match (never throws).
export function matchSegment(
  segmentKey: string,
  context: EvalContext,
  datafile: Datafile,
): boolean {
  const segment = datafile.segments[segmentKey];
  if (!segment) return false;
  // Segment rules are OR'd; conditions within a rule are AND'd.
  return segment.rules.some((rule) =>
    rule.conditions.every((cond) => {
      // segment_match / segment_not_match operators inside a segment rule
      // recurse — supports the (intentional) "segment of segments" pattern
      // even though the admin UI doesn't expose it yet.
      if (cond.operator === "segment_match") {
        const keys = cond.values.filter((v): v is string => typeof v === "string");
        return keys.some((k) => matchSegment(k, context, datafile));
      }
      if (cond.operator === "segment_not_match") {
        const keys = cond.values.filter((v): v is string => typeof v === "string");
        return !keys.some((k) => matchSegment(k, context, datafile));
      }
      return matchOperator(
        cond.operator,
        resolveAttribute(context, cond.attributePath),
        cond.values,
      );
    }),
  );
}
