# @feathq/feat-eval

Reference flag-evaluation engine for the [feat](https://feat.so) feature-flag platform. The single authoritative implementation of the eval pipeline: archived/disabled handling, individual targets, rule matching, segment recursion, percentage-rollout bucketing, default fallback. Every TS-flavored consumer of feat uses this same engine; the Go/Python/Ruby SDKs port the same semantics bit-for-bit.

Most apps don't import this directly — the SDKs do.

## Install

```bash
npm install @feathq/feat-eval @feathq/datafile-schema
```

`@feathq/datafile-schema` is a peer of this package.

## API

```ts
import { evaluate } from "@feathq/feat-eval";
import type { Datafile } from "@feathq/datafile-schema";

const result = await evaluate(
  "checkout-v2",         // flag key
  false,                  // default value
  { targetingKey: "user-123", user: { plan: "pro" } },
  datafile,               // a Datafile loaded out of band (server, polling, etc.)
);

// result.value         -> boolean | string | number | object (per flag valueType)
// result.variationId   -> string | null
// result.reason        -> "TARGETING_MATCH" | "SPLIT" | "FALLTHROUGH" | "DEFAULT" | "DISABLED" | "ERROR"
// result.errorMessage  -> string | undefined
```

Lower-level building blocks are also exported (`bucket`, `pickByWeight`, `matchOperator`, `matchSegment`, `resolveAttribute`, `readContextKey`) for callers building tests or custom integrations.

## Evaluation precedence

The engine implements the following decision chain. Every language port mirrors this bit-for-bit.

1. **Archived flag** → off variation, `reason: DISABLED`
2. **`isEnabled: false`** → off variation, `reason: DISABLED`
3. **Individual target match** (kind + key) → target variation, `reason: TARGETING_MATCH`
4. **First matching rule** → rule variation or rollout, `reason: TARGETING_MATCH` / `SPLIT`
5. **Env default** → default variation or rollout, `reason: FALLTHROUGH` / `SPLIT`
6. **Nothing matched** → off variation, `reason: DEFAULT`

On error (missing flag, missing variation) the supplied default value is returned with `reason: ERROR`.

## When you might import it directly

- Writing unit tests against a hand-crafted `Datafile` without spinning up an SDK client.
- Building a custom runtime adapter for an environment we don't ship for (Deno, Bun edge, etc.).
- Implementing a CI lint or admin tool that evaluates flags offline.

## License

MIT
