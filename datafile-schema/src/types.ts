import type { Operator, ValueType } from "./operators";

// Per-environment evaluatable snapshot. The single shape passed between the
// producer and every SDK. Schema version bumps only on breaking shape
// changes; additive fields don't require it.
export interface Datafile {
  schemaVersion: 1;
  envId: string;
  envKey: string;
  projectId: string;
  // Monotonic per env. Lets the SDK / edge dedupe out-of-order delivery as
  // a no-op rather than treating it as a regression.
  version: number;
  // Hex sha256 of the canonical JSON bytes. Powers If-None-Match 304s on
  // the read path so polling SDKs don't redownload an unchanged datafile.
  etag: string;
  generatedAt: string;
  flags: Record<string, FlagSpec>;
  segments: Record<string, SegmentSpec>;
  contextKinds: Record<string, ContextKindSpec>;
}

export interface FlagSpec {
  id: string;
  key: string;
  valueType: ValueType;
  // 16-char hex random salt. Mixed into the bucketing hash so unrelated
  // rollouts don't auto-correlate against the same context. SDK computes
  //   sha1(salt + "." + key + "." + ctx[kind].key)
  // and reduces to [0, 100000).
  salt: string;
  archived: boolean;
  isEnabled: boolean;
  offVariationId: string;
  // Exactly one of defaultVariationId or defaultRollout is non-null when
  // isEnabled and no rule matches. The producer enforces this.
  defaultVariationId: string | null;
  defaultRollout: Rollout | null;
  defaultBucketingContextKindKey: string | null;
  variations: VariationSpec[];
  // Pre-rule explicit (kind, key) -> variation pairs. Evaluated before rules.
  targets: TargetSpec[];
  // Ordered by position (asc).
  rules: RuleSpec[];
}

export interface VariationSpec {
  id: string;
  name: string;
  // Raw JSON value. Booleans store true/false, strings a JSON string,
  // numbers a JSON number, JSON flags an arbitrary object/array.
  value: unknown;
}

export interface TargetSpec {
  contextKindKey: string;
  contextKey: string;
  variationId: string;
}

export interface RuleSpec {
  id: string;
  bucketingContextKindKey: string | null;
  // Exactly one of variationId or rollout is non-null. Producer enforces.
  variationId: string | null;
  rollout: Rollout | null;
  // OR of groups, AND of conditions within a group.
  groups: ConditionGroupSpec[];
}

export interface ConditionGroupSpec {
  conditions: ConditionSpec[];
}

export interface ConditionSpec {
  attributePath: string;
  operator: Operator;
  values: unknown[];
}

export interface Rollout {
  bucketingContextKindKey: string;
  // Weights are integers in [0, 100000] and sum to exactly 100000. The eval
  // engine walks cumulative weights against the bucketed value.
  variations: Array<{ variationId: string; weight: number }>;
}

export interface SegmentSpec {
  key: string;
  // OR of rules; AND of conditions within a rule.
  rules: Array<{ conditions: ConditionSpec[] }>;
}

export interface ContextKindSpec {
  key: string;
  availableForRules: boolean;
  availableForExperiments: boolean;
}

// In-Worker service-binding RPC surface. A consuming Worker declares a
// service binding with entrypoint="FeatBinding" and calls these methods.
export interface FeatBindingStub {
  evaluate(args: {
    apiKey: string;
    flagKey: string;
    defaultValue: unknown;
    context: Record<string, unknown>;
  }): Promise<{
    value: unknown;
    variationId: string | null;
    reason:
      | "TARGETING_MATCH"
      | "SPLIT"
      | "FALLTHROUGH"
      | "DEFAULT"
      | "DISABLED"
      | "ERROR"
      | "STATIC";
    errorMessage?: string;
  }>;
  ping(): Promise<{ ok: true; environment: string }>;
}
