const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tpl = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
const css = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");
const appJs = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const pdfLibJs = fs.readFileSync(path.join(root, "node_modules/pdf-lib/dist/pdf-lib.min.js"), "utf8");
const pdfJs = fs.readFileSync(path.join(root, "node_modules/pdfjs-dist/build/pdf.min.js"), "utf8");
const pdfWorkerJs = fs.readFileSync(path.join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.js"), "utf8");

function escapeScriptClose(code) {
  return code.replace(/<\/script/gi, "<\\/script");
}

let html = tpl;
html = html.replace("/*__INLINE_CSS__*/", () => css);
html = html.replace("/*__INLINE_PDF_WORKER__*/", () => escapeScriptClose(pdfWorkerJs));
html = html.replace("/*__INLINE_PDF_LIB__*/", () => escapeScriptClose(pdfLibJs));
html = html.replace("/*__INLINE_PDF_JS__*/", () => escapeScriptClose(pdfJs));
html = html.replace("/*__INLINE_APP_JS__*/", () => escapeScriptClose(appJs));

const outPath = path.join(root, "index.html");
fs.writeFileSync(outPath, html, "utf8");
console.log("Built ShibaPDF ->", outPath, "(" + Math.round(fs.statSync(outPath).size / 1024) + " KB)");
