import type { Operator } from "@feathq/datafile-schema";

// Apply a single operator to (lhs, values). Returns false on type mismatch
// / parse failure rather than throwing — keeps evaluation defensive
// against malformed contexts at the edge.
//
// segment_match / segment_not_match are dispatched by the rule evaluator
// (they recurse into the datafile's segments map), not by this function.
export function matchOperator(
  operator: Operator,
  lhs: unknown,
  values: unknown[],
): boolean {
  switch (operator) {
    case "is_one_of":
      return values.some((v) => deepEq(lhs, v));
    case "is_not_one_of":
      return !values.some((v) => deepEq(lhs, v));
    case "is_empty":
      return lhs === null || lhs === undefined || lhs === "";
    case "is_not_empty":
      return !(lhs === null || lhs === undefined || lhs === "");
    case "contains":
      return strs(values).some((v) => typeof lhs === "string" && lhs.includes(v));
    case "does_not_contain":
      return typeof lhs === "string"
        ? !strs(values).some((v) => lhs.includes(v))
        : true;
    case "starts_with":
      return strs(values).some((v) => typeof lhs === "string" && lhs.startsWith(v));
    case "ends_with":
      return strs(values).some((v) => typeof lhs === "string" && lhs.endsWith(v));
    case "matches_regex":
      if (typeof lhs !== "string") return false;
      return strs(values).some((pattern) => {
        if (!isSafeRegex(pattern)) return false;
        try {
          return new RegExp(pattern).test(lhs);
        } catch {
          return false;
        }
      });
    case "gt":
      return numericCompare(lhs, values, (a, b) => a > b);
    case "gte":
      return numericCompare(lhs, values, (a, b) => a >= b);
    case "lt":
      return numericCompare(lhs, values, (a, b) => a < b);
    case "lte":
      return numericCompare(lhs, values, (a, b) => a <= b);
    case "before":
      return dateCompare(lhs, values, (a, b) => a < b);
    case "after":
      return dateCompare(lhs, values, (a, b) => a > b);
    case "semver_eq":
      return semverCompare(lhs, values, (cmp) => cmp === 0);
    case "semver_gt":
      return semverCompare(lhs, values, (cmp) => cmp > 0);
    case "semver_gte":
      return semverCompare(lhs, values, (cmp) => cmp >= 0);
    case "semver_lt":
      return semverCompare(lhs, values, (cmp) => cmp < 0);
    case "semver_lte":
      return semverCompare(lhs, values, (cmp) => cmp <= 0);
    case "segment_match":
    case "segment_not_match":
      return false;
  }
}

function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) {
    if (typeof a === "number" && typeof b === "string") return String(a) === b;
    if (typeof a === "string" && typeof b === "number") return a === String(b);
    return false;
  }
  if (a === null || b === null) return a === b;
  if (typeof a === "object") return JSON.stringify(a) === JSON.stringify(b);
  return false;
}

function strs(values: unknown[]): string[] {
  return values.filter((v): v is string => typeof v === "string");
}

// ReDoS guard for matches_regex. Caps pattern length and rejects the most
// common catastrophic-backtracking shapes (nested unbounded quantifiers,
// alternation inside a starred group). False positives here just turn the
// rule into a no-match, which is the safe default.
const REDOS_SHAPES = /\([^)]*[+*][^)]*\)\s*[+*]|\([^)]*\|[^)]*\)\s*[+*]/;
function isSafeRegex(pattern: string): boolean {
  if (pattern.length > 512) return false;
  if (REDOS_SHAPES.test(pattern)) return false;
  return true;
}

function numericCompare(
  lhs: unknown,
  values: unknown[],
  cmp: (a: number, b: number) => boolean,
): boolean {
  const a = toNumber(lhs);
  if (a === null) return false;
  return values.some((v) => {
    const b = toNumber(v);
    return b !== null && cmp(a, b);
  });
}

function toNumber(x: unknown): number | null {
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function dateCompare(
  lhs: unknown,
  values: unknown[],
  cmp: (a: number, b: number) => boolean,
): boolean {
  const a = toDateMs(lhs);
  if (a === null) return false;
  return values.some((v) => {
    const b = toDateMs(v);
    return b !== null && cmp(a, b);
  });
}

function toDateMs(x: unknown): number | null {
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  if (typeof x === "string") {
    const t = Date.parse(x);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

interface Semver {
  major: number;
  minor: number;
  patch: number;
  pre: string | null;
}

function parseSemver(x: unknown): Semver | null {
  if (typeof x !== "string") return null;
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(
    x.trim(),
  );
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ?? null,
  };
}

function compareSemver(a: Semver, b: Semver): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.pre === b.pre) return 0;
  if (a.pre === null) return 1;
  if (b.pre === null) return -1;
  return a.pre < b.pre ? -1 : 1;
}

function semverCompare(
  lhs: unknown,
  values: unknown[],
  predicate: (cmp: number) => boolean,
): boolean {
  const a = parseSemver(lhs);
  if (!a) return false;
  return values.some((v) => {
    const b = parseSemver(v);
    return b !== null && predicate(compareSemver(a, b));
  });
}
