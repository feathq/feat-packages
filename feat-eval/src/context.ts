import type { ContextKindObject, EvalContext } from "./types";

// Pull `attributePath` (e.g. "user.email", "organization.plan",
// "user.address.city") out of an EvalContext. Returns undefined if any
// segment is missing — operators treat undefined as "miss" rather than
// throw.
export function resolveAttribute(
  context: EvalContext,
  attributePath: string,
): unknown {
  if (!attributePath) return undefined;
  const parts = attributePath.split(".");
  if (parts.length === 0) return undefined;

  const kindKey = parts[0]!;
  const kindObj = readKind(context, kindKey);
  if (!kindObj) return undefined;

  if (parts.length === 1) return kindObj.key;

  let cur: unknown = kindObj;
  for (let i = 1; i < parts.length; i++) {
    if (cur === null || typeof cur !== "object") return undefined;
    const segment = parts[i]!;
    // Filter known prototype-pollution traps. Defensive only; modern JS
    // engines don't expose these via plain bracket access, but a context
    // deserialized from untrusted JSON shouldn't be able to traverse them.
    if (segment === "__proto__" || segment === "constructor" || segment === "prototype") {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[segment];
  }
  return cur;
}

function readKind(context: EvalContext, kindKey: string): ContextKindObject | null {
  // Special-case "user": fall back to `targetingKey` shorthand when a
  // `user` object isn't explicitly provided. Matches OpenFeature semantics
  // (targetingKey is widely understood as the user's id).
  if (kindKey === "user") {
    const userObj = context.user;
    if (userObj && typeof userObj === "object") return userObj;
    if (typeof context.targetingKey === "string") {
      return { key: context.targetingKey };
    }
    return null;
  }
  const value = context[kindKey];
  if (value && typeof value === "object") return value;
  return null;
}

// Pull just the "key" for a context kind — what bucketing and individual
// targeting hash against. Falls back to targetingKey for "user".
export function readContextKey(
  context: EvalContext,
  kindKey: string,
): string | null {
  const obj = readKind(context, kindKey);
  return obj ? obj.key : null;
}
