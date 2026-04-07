import * as esbuild from "esbuild";
import { copyFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const ext = join(root, "extension");
const dist = join(ext, "dist");
const pdfWorkerSrc = join(root, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");

const watch = process.argv.includes("--watch");

async function copyStatic() {
  await mkdir(dist, { recursive: true });
  await mkdir(join(dist, "pdfjs"), { recursive: true });
  await copyFile(join(ext, "sidepanel.html"), join(dist, "sidepanel.html"));
  await copyFile(join(ext, "sidepanel.css"), join(dist, "sidepanel.css"));
  await copyFile(join(ext, "options.html"), join(dist, "options.html"));
  await copyFile(pdfWorkerSrc, join(dist, "pdfjs", "pdf.worker.min.mjs"));
}

const common = {
  bundle: true,
  platform: "browser",
  target: ["chrome120"],
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
};

async function build() {
  await copyStatic();

  const ctxSw = await esbuild.context({
    ...common,
    entryPoints: [join(ext, "src", "background.js")],
    outfile: join(dist, "background.js"),
    format: "esm",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  });

  const ctxContent = await esbuild.context({
    ...common,
    entryPoints: [join(ext, "src", "content.js")],
    outfile: join(dist, "content.js"),
    format: "iife",
  });

  const ctxPanel = await esbuild.context({
    ...common,
    entryPoints: [join(ext, "src", "sidepanel.js")],
    outfile: join(dist, "sidepanel.js"),
    format: "esm",
  });

  const ctxOpts = await esbuild.context({
    ...common,
    entryPoints: [join(ext, "src", "options.js")],
    outfile: join(dist, "options.js"),
    format: "esm",
  });

  if (watch) {
    await Promise.all([ctxSw.watch(), ctxContent.watch(), ctxPanel.watch(), ctxOpts.watch()]);
    console.log("watching…");
  } else {
    await Promise.all([ctxSw.rebuild(), ctxContent.rebuild(), ctxPanel.rebuild(), ctxOpts.rebuild()]);
    await Promise.all([ctxSw.dispose(), ctxContent.dispose(), ctxPanel.dispose(), ctxOpts.dispose()]);
  }
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
