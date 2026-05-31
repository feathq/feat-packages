import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: false,
  clean: true,
  target: "es2020",
  treeshake: true,
  splitting: false,
  minify: false,
  // @feathq/datafile-schema stays external; consumers install it as a
  // transitive npm dep via publishConfig.dependencies.
  external: ["@feathq/datafile-schema"],
});
