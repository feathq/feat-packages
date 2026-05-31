import type { Datafile, FlagSpec } from "@feathq/datafile-schema";
import type { EvalContext, EvaluationResult, Reason } from "./types";
import { bucket, pickByWeight } from "./bucketing";
import { readContextKey, resolveAttribute } from "./context";
import { matchOperator } from "./operators";
import { matchSegment } from "./segments";

// Evaluate a flag against a context. Single authoritative implementation;
// every language port mirrors this precedence bit-for-bit:
//
//   1. archived flag        -> off variation        reason DISABLED
//   2. !isEnabled           -> off variation        reason DISABLED
//   3. individual target    -> target variation     reason TARGETING_MATCH
//   4. first matching rule  -> rule variation/rollout reason TARGETING_MATCH / SPLIT
//   5. default              -> default variation/rollout reason FALLTHROUGH / SPLIT
//   6. nothing matched      -> off variation        reason DEFAULT
//
// On any error (missing flag, missing variation, etc.), returns the
// supplied defaultValue with reason ERROR.
export async function evaluate(
  flagKey: string,
  defaultValue: unknown,
  context: EvalContext,
  datafile: Datafile,
): Promise<EvaluationResult> {
  const flag = datafile.flags[flagKey];
  if (!flag) {
    return {
      value: defaultValue,
      variationId: null,
      reason: "ERROR",
      errorMessage: "flag could not be evaluated",
    };
  }

  if (flag.archived || !flag.isEnabled) {
    return resolveVariation(flag, flag.offVariationId, "DISABLED", defaultValue);
  }

  for (const target of flag.targets) {
    const ctxKey = readContextKey(context, target.contextKindKey);
    if (ctxKey === target.contextKey) {
      return resolveVariation(
        flag,
        target.variationId,
        "TARGETING_MATCH",
        defaultValue,
      );
    }
  }

  for (const rule of flag.rules) {
    if (!matchesRule(rule, context, datafile)) continue;
    if (rule.variationId) {
      return resolveVariation(flag, rule.variationId, "TARGETING_MATCH", defaultValue);
    }
    if (rule.rollout) {
      const bucketed = await pickRollout(flag, rule.rollout, context);
      if (bucketed) {
        return resolveVariation(flag, bucketed, "SPLIT", defaultValue);
      }
    }
  }

  if (flag.defaultVariationId) {
    return resolveVariation(flag, flag.defaultVariationId, "FALLTHROUGH", defaultValue);
  }
  if (flag.defaultRollout) {
    const bucketed = await pickRollout(flag, flag.defaultRollout, context);
    if (bucketed) {
      return resolveVariation(flag, bucketed, "SPLIT", defaultValue);
    }
  }

  return resolveVariation(flag, flag.offVariationId, "DEFAULT", defaultValue);
}

function matchesRule(
  rule: FlagSpec["rules"][number],
  context: EvalContext,
  datafile: Datafile,
): boolean {
  if (rule.groups.length === 0) return false;
  return rule.groups.some((group) =>
    group.conditions.every((cond) => {
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

async function pickRollout(
  flag: FlagSpec,
  rollout: NonNullable<FlagSpec["rules"][number]["rollout"]>,
  context: EvalContext,
): Promise<string | null> {
  const ctxKey = readContextKey(context, rollout.bucketingContextKindKey);
  if (!ctxKey) return null;
  const b = await bucket({ salt: flag.salt, flagKey: flag.key, contextKey: ctxKey });
  const pick = pickByWeight(b, rollout.variations);
  return pick?.variationId ?? null;
}

function resolveVariation(
  flag: FlagSpec,
  variationId: string,
  reason: Reason,
  defaultValue: unknown,
): EvaluationResult {
  const v = flag.variations.find((x) => x.id === variationId);
  if (!v) {
    return {
      value: defaultValue,
      variationId: null,
      reason: "ERROR",
      errorMessage: "flag could not be evaluated",
    };
  }
  return { value: v.value, variationId, reason };
}
