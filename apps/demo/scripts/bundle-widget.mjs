import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStyles } from "../../../packages/widget/scripts/build-styles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const widgetEntry = path.resolve(rootDir, "../../packages/widget/src/index.ts");
const outfile = path.resolve(rootDir, "public/widget.js");

try {
  buildStyles();

  await esbuild.build({
    entryPoints: [widgetEntry],
    bundle: true,
    format: "esm",
    target: "es2022",
    outfile,
    sourcemap: true,
    minify: false,
  });
  console.log(`[demo] Successfully bundled widget into ${outfile}`);
} catch (err) {
  console.error("[demo] Failed to bundle widget:", err);
  process.exit(1);
}
