# @feathq/datafile-schema

Canonical TypeScript types for the [feat](https://feat.so) feature-flag platform's wire format. Used by every TS consumer of feat: the server, browser, and worker SDKs. Most people don't import this directly — they consume it transitively through one of the SDK packages.

## Install

```bash
npm install @feathq/datafile-schema
```

## What's in it

- **`Datafile`** — the per-environment evaluatable snapshot served to SDKs (flags, segments, context kinds, etag, version).
- **Spec types** — `FlagSpec`, `RuleSpec`, `VariationSpec`, `TargetSpec`, `ConditionSpec`, `ConditionGroupSpec`, `Rollout`, `SegmentSpec`, `ContextKindSpec`.
- **Literal-union enums** — `Operator`, `ValueType`, `ApiKeyType`.
- **`FeatBindingStub`** — the RPC interface the [`@feathq/worker-sdk`](https://npmjs.com/package/@feathq/worker-sdk) uses to type its service binding.

## When you might import it directly

Most apps shouldn't need to — the SDKs re-export everything you typically need. Reach for this package when:

- Writing a tool that produces or validates feat datafiles (CI lint, format check, etc.).
- Building a custom SDK or runtime adapter for a language / environment we don't ship for.
- Writing tests that construct synthetic `Datafile` objects.

## License

MIT
