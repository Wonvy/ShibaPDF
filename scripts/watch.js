const fs = require("fs");
const path = require("path");
const { build } = require("./build");

const srcDir = path.resolve(__dirname, "../src");
let timer = null;

console.log("[ShibaPDF Watch] Watching src/ for changes to auto-generate index.html...");
build();

fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
  if (!filename || !/\.(js|css|html)$/i.test(filename)) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      console.log(`[ShibaPDF Watch] Change detected in src/${filename} -> rebuilding...`);
      build();
    } catch (err) {
      console.error("[ShibaPDF Watch] Build failed:", err.message);
    }
  }, 80);
});
