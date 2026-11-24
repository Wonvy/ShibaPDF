const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let tpl = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
const css = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");

const jsModules = [
  "src/i18n.js",
  "src/zip.js",
  "src/prepress-k100.js",
  "src/imposition.js",
  "src/convert-compress.js",
  "src/app.js"
];
const combinedAppJs = jsModules
  .map((rel) => fs.readFileSync(path.join(root, rel), "utf8"))
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
  "square-pen"
];
const iconMap = {};
for (const name of dynamicIconNames) {
  iconMap[name] = loadLucideSvg(name);
}
const lucideMapJs = `window.LUCIDE_SVGS = ${JSON.stringify(iconMap)};`;

function escapeScriptClose(code) {
  return code.replace(/<\/script/gi, "<\\/script");
}

let html = tpl;
html = html.replace("/*__INLINE_CSS__*/", () => css);
html = html.replace("/*__INLINE_LUCIDE_MAP__*/", () => escapeScriptClose(lucideMapJs));
html = html.replace("/*__INLINE_PDF_WORKER__*/", () => escapeScriptClose(pdfWorkerJs));
html = html.replace("/*__INLINE_PDF_LIB__*/", () => escapeScriptClose(pdfLibJs));
html = html.replace("/*__INLINE_PDF_JS__*/", () => escapeScriptClose(pdfJs));
html = html.replace("/*__INLINE_APP_JS__*/", () => escapeScriptClose(combinedAppJs));

const outPath = path.join(root, "index.html");
fs.writeFileSync(outPath, html, "utf8");
console.log("Built ShibaPDF v4 ->", outPath, "(" + Math.round(fs.statSync(outPath).size / 1024) + " KB)");
