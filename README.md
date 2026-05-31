# feat-packages

Shared TypeScript packages for the [feat](https://feat.so) feature-flag platform. Used by feat's server, browser, and worker SDKs; published to npm under the `@feathq` scope.

## Packages

| Package | npm | Source |
|---|---|---|
| `@feathq/datafile-schema` | [`@feathq/datafile-schema`](https://www.npmjs.com/package/@feathq/datafile-schema) | [`datafile-schema/`](./datafile-schema) |
| `@feathq/feat-eval` | [`@feathq/feat-eval`](https://www.npmjs.com/package/@feathq/feat-eval) | [`feat-eval/`](./feat-eval) |

Both are MIT-licensed.

- **`@feathq/datafile-schema`** — canonical TypeScript types for feat's per-environment evaluatable snapshot (flags, segments, context kinds), the operator / value-type / API-key-type unions, and the worker-binding RPC stub.
- **`@feathq/feat-eval`** — reference flag-evaluation engine. Single authoritative implementation of the eval precedence (archived → disabled → individual target → rule → default), 24 operators, segment recursion, and percentage-rollout bucketing.

Most apps consume these transitively through one of the SDK packages (`@feathq/js-sdk`, `@feathq/web-sdk`, `@feathq/worker-sdk`). Direct use is for tooling: datafile validators, CI lints, custom runtime adapters.

## Quick start

```bash
npm install @feathq/feat-eval @feathq/datafile-schema
```

```ts
import { evaluate } from "@feathq/feat-eval";
import type { Datafile, EvalContext } from "@feathq/datafile-schema";

const datafile: Datafile = /* load from feat's edge or a server you trust */;

const result = await evaluate(
  "checkout-v2",
  false,
  { targetingKey: "user-123", user: { plan: "pro" } },
  datafile,
);
// result.value, result.variationId, result.reason
```

## Repository layout

```
.
├── datafile-schema/      # @feathq/datafile-schema
├── feat-eval/            # @feathq/feat-eval (depends on @feathq/datafile-schema)
├── .github/workflows/    # tag-triggered publish workflows (one per package)
└── package.json          # yarn workspace root
```

`@feathq/feat-eval` declares `@feathq/datafile-schema` as `workspace:^`; yarn rewrites that to a real semver range (`^X.Y.Z`) when packing for npm.

## Local development

Requires Node 20+ and Corepack (`corepack enable`).

```bash
yarn install
yarn typecheck

# build one package
yarn workspace @feathq/datafile-schema build
yarn workspace @feathq/feat-eval build

# inspect what a published tarball would contain
yarn workspace @feathq/datafile-schema pack --dry-run
```

Each package builds to its own `dist/` via [tsup](https://tsup.egoist.dev) (ESM + CJS + `.d.ts`).

## Releasing

Each package releases independently via tag-triggered workflows + OIDC trusted publishing. No long-lived npm token in CI; provenance attestations are attached automatically.

```bash
# 1. bump version in the relevant package.json (e.g. 0.1.0 -> 0.1.1)

# 2. commit + tag with the per-package prefix
git add datafile-schema/package.json
git commit -m "datafile-schema: v0.1.1"
git tag datafile-schema@v0.1.1
git push --follow-tags

# same shape for feat-eval:
git tag feat-eval@v0.1.1
git push --tags
```

CI builds the package, packs it, publishes to npm. The new version appears on `npmjs.com` within ~30s with a green provenance badge linking back to the commit and workflow run.

## License

MIT
