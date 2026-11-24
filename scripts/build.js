const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const jsModules = [
  "src/i18n.js",
  "src/zip.js",
  "src/prepress-k100.js",
  "src/imposition.js",
  "src/convert-compress.js",
  "src/image-edit.js",
  "src/annotate.js",
  "src/workspace-ux.js",
  "src/app.js"
];

const dynamicIconNames = [
  "file-text",
  "trash-2",
  "check-circle-2",
  "alert-triangle",
  "x-circle",
  "info",
  "shield-check",
  "shield-alert",
  "wrench",
  "crosshair",
  "check",
  "rotate-cw",
  "move",
  "square-pen",
  "image-plus",
  "replace",
  "upload"
];

function escapeScriptClose(code) {
  return code.replace(/<\/script/gi, "<\\/script");
}

function build() {
  const t0 = Date.now();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  let tpl = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
  tpl = tpl.replace(/\/\*__APP_VERSION__\*\//g, pkg.version || "1.6.0");
  const css = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");

  const combinedAppJs = jsModules
    .filter((rel) => fs.existsSync(path.join(root, rel)))
    .map((rel) => `/* === ${rel} === */\n` + fs.readFileSync(path.join(root, rel), "utf8"))
    .join("\n;\n");

  const pdfLibJs = fs.readFileSync(path.join(root, "node_modules/pdf-lib/dist/pdf-lib.min.js"), "utf8");
  const pdfJs = fs.readFileSync(path.join(root, "node_modules/pdfjs-dist/build/pdf.min.js"), "utf8");
  const pdfWorkerJs = fs.readFileSync(path.join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.js"), "utf8");
  const lucideDir = path.join(root, "node_modules/lucide-static/icons");

  function loadLucideSvg(name) {
    const svgPath = path.join(lucideDir, `${name}.svg`);
    return fs.readFileSync(svgPath, "utf8").replace(/\s+/g, " ").trim();
  }

  tpl = tpl.replace(/<i\s+data-lucide="([a-z0-9-]+)"([^>]*)><\/i>/gi, (_, iconName, extraAttrs) => {
    let svg = loadLucideSvg(iconName);
    if (extraAttrs && extraAttrs.trim()) {
      svg = svg.replace("<svg ", `<svg ${extraAttrs.trim()} `);
    }
    return svg;
  });

  const iconMap = {};
  for (const name of dynamicIconNames) {
    iconMap[name] = loadLucideSvg(name);
  }
  const lucideMapJs = `window.LUCIDE_SVGS = ${JSON.stringify(iconMap)};`;

  let html = tpl;
  html = html.replace("/*__INLINE_CSS__*/", () => css);
  html = html.replace("/*__INLINE_LUCIDE_MAP__*/", () => escapeScriptClose(lucideMapJs));
  html = html.replace("/*__INLINE_PDF_WORKER__*/", () => escapeScriptClose(pdfWorkerJs));
  html = html.replace("/*__INLINE_PDF_LIB__*/", () => escapeScriptClose(pdfLibJs));
  html = html.replace("/*__INLINE_PDF_JS__*/", () => escapeScriptClose(pdfJs));
  html = html.replace("/*__INLINE_APP_JS__*/", () => escapeScriptClose(combinedAppJs));

  const outPath = path.join(root, "index.html");
  fs.writeFileSync(outPath, html, "utf8");
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`[ShibaPDF Build] Generated standalone index.html (${kb} KB) in ${Date.now() - t0}ms`);
}

if (require.main === module) {
  build();
}

module.exports = { build };
