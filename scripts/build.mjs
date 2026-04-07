import * as esbuild from "esbuild";
import { copyFile, mkdir, readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const ext = join(root, "extension");
const dist = join(ext, "dist");
const pdfWorkerSrc = join(root, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");

const watch = process.argv.includes("--watch");

/** Rasterize SVG logo to PNGs for manifest toolbar / store icons. */
async function generateIcons() {
  const sharp = (await import("sharp")).default;
  const iconsDir = join(ext, "icons");
  const svgPath = join(iconsDir, "skim-mark.svg");
  const buf = await readFile(svgPath);
  for (const size of [16, 32, 48, 128]) {
    await sharp(buf).resize(size, size).png().toFile(join(iconsDir, `icon-${size}.png`));
  }
}

async function copyStatic() {
  await mkdir(dist, { recursive: true });
  await mkdir(join(dist, "pdfjs"), { recursive: true });
  await mkdir(join(dist, "icons"), { recursive: true });
  await copyFile(join(ext, "sidepanel.html"), join(dist, "sidepanel.html"));
  await copyFile(join(ext, "sidepanel.css"), join(dist, "sidepanel.css"));
  await copyFile(join(ext, "skim-ui.css"), join(dist, "skim-ui.css"));
  await copyFile(join(ext, "options.css"), join(dist, "options.css"));
  await copyFile(join(ext, "options.html"), join(dist, "options.html"));
  await copyFile(pdfWorkerSrc, join(dist, "pdfjs", "pdf.worker.min.mjs"));
  for (const size of [16, 32, 48, 128]) {
    await copyFile(join(ext, "icons", `icon-${size}.png`), join(dist, "icons", `icon-${size}.png`));
  }
  await copyFile(join(ext, "icons", "skim-mark.svg"), join(dist, "icons", "skim-mark.svg"));
}

const common = {
  bundle: true,
  platform: "browser",
  target: ["chrome120"],
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
};

async function build() {
  await generateIcons();
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
