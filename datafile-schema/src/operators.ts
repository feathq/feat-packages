// Wire-format type unions for what the producer puts into a datafile and
// what an api_keys row's key_type can be. Kept as plain literal unions
// (not derived from a const array) so the published package surface is
// pure types - the const arrays paired with these live in @feathq/internal
// for producer-side runtime validation.

export type Operator =
  | "is_one_of"
  | "is_not_one_of"
  | "is_empty"
  | "is_not_empty"
  | "contains"
  | "does_not_contain"
  | "starts_with"
  | "ends_with"
  | "matches_regex"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "before"
  | "after"
  | "semver_eq"
  | "semver_gt"
  | "semver_gte"
  | "semver_lt"
  | "semver_lte"
  | "segment_match"
  | "segment_not_match";

export type ValueType = "boolean" | "string" | "number" | "json";

export type ApiKeyType = "server" | "mobile" | "client_side_id";
