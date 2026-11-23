<div align="center">

# ShibaPDF

**Minimalist Client-Side PDF Studio: Page & Text Editor, Visual Prepress Preflight, Pure K100 Fixer & Spread Splitter**

*100% Local in Your Browser · Zero Server Uploads · Preserves Vectors, Gradients & Live Transparency*

🌐 **[Live Online App: wonvy.github.io/ShibaPDF](https://wonvy.github.io/ShibaPDF/)** · **English** | [简体中文](./README.zh-CN.md)

</div>

---

![ShibaPDF Interactive Preflight Locator](./docs/images/preflight-report-light.png)

## Overview

**ShibaPDF** is a borderless, progressive single-file PDF workbench built for designers and print production workflows. Everything runs 100% locally in browser memory with smooth **`Ctrl + Scroll Wheel`** canvas zooming:

1. **Edit Page (`Edit Page`)** — Click any existing text on the PDF to edit in-place (with automatic background & ink color sampling), add new CJK/Latin text boxes anywhere, drag to reposition, or rotate & delete pages with multi-step Undo.
2. **Visual Prepress Preflight (`Preflight Check`)** — Runs an 8-point print-ready inspection (4-color rich black, bleed margins, font embedding, effective printed image DPI, RGB/CMYK color spaces, transparency, 4P saddle-stitch rule, encryption) and **jumps directly to offending text, images, or edges with live spotlight highlights on the canvas**.
3. **Pure K100 Prepress Fix (`Pure K100 Fix`)** — Keeps original spread dimensions and bleed intact while converting black/gray text & strokes to **single-channel Pure CMYK Black (`C0 M0 Y0 K100`)** and switching blending space to `/DeviceCMYK` (`PDF/X-4` standard) without flattening shadows.
4. **Spread Splitter (`Split Spreads`)** — Losslessly slices double-page spreads into single pages, trims outer bleed margins, and reorders `[Back Cover | Front Cover]` spreads automatically.

---

## Key Features

- **8-Point Prepress Preflight Inspector**:
  - **4-Color Rich Black Detection**: Identifies `/DeviceRGB` transparency blending groups (common in PowerPoint/Office PDFs) and non-K100 black text that cause press registration blur, with **1-click K100 auto-fix**.
  - **Bleed & Page Size Uniformity**: Detects mixed page sizes and distinguishes net trim sizes (`0mm` bleed) from bleed-included spreads (`+3mm` / `+5mm`).
  - **Font Embedding Integrity**: Inspects Type0/CID and standard font descriptors across all pages to flag unembedded fonts before sending to RIP.
  - **Effective Print Image DPI**: Tracks PDF Current Transformation Matrices (`CTM`) to compute the **actual printed DPI** of every placed bitmap against the `300 DPI` print benchmark.
  - **Color Space, Live Transparency, Saddle-Stitch `4P` Rule & Encryption Checks**.
- **Flexible Bleed Geometry**: Quick presets (`0mm`, `3mm`, `5mm`), uniform 4-side or independent `Top / Bottom / Left / Right` margins, and optional `TrimBox` metadata retention.
- **Zero File-Size Bloat**: Shares underlying XObject images, fonts, and color profiles across split pages.
- **Minimalist Two-Column Studio UI**: Built with open-source [Lucide Icons](https://lucide.dev/), supporting **Light / Dark** themes and instant **English / 中文** switching.

---

## Screenshots

### In-Place Page & Text Editor
![Edit Page & Text](./docs/images/edit-page-light.png)

### Progressive Spread Splitter & Cut Guides
![Spread Cut Preview](./docs/images/split-view-light.png)

### Dark Theme & All-Pages Overview
![Dark Mode Pages Gallery](./docs/images/pages-gallery-dark-zh.png)

---

## Quick Start

### Option 1: Use Online or Download Standalone Offline HTML (Zero Install)
- **Online**: Visit **[wonvy.github.io/ShibaPDF](https://wonvy.github.io/ShibaPDF/)** directly in your browser.
- **Offline Single-File**: Click **"Download Offline App (.html)"** at the bottom-left of the app (or download **[`index.html`](https://raw.githubusercontent.com/Wonvy/ShibaPDF/main/index.html)**) to save `ShibaPDF.html` to your computer — works 100% offline on Windows, macOS, and Linux with a simple double-click.

### Option 2: Build from Source
If you modify files under `src/`, rebuild the standalone single-file `index.html`:

```bash
npm install
npm run build
```

---

## Project Structure

```text
ShibaPDF/
├── index.html                        # Standalone bundled web app (offline & GitHub Pages ready)
├── src/
│   ├── template.html                 # Two-column layout & Lucide icon bindings
│   ├── styles.css                    # Minimalist Light & Dark theme system
│   └── app.js                        # Spread splitter, K100 stream rewriter & Preflight engine
├── scripts/
│   └── build.js                      # Single-file compiler (inlines CSS, Lucide SVGs & PDF engines)
├── docs/images/                      # UI documentation screenshots
└── .github/workflows/deploy-pages.yml # Automated GitHub Pages deployment
```

---

## License

Released under the **MIT License**. Built with [pdf-lib](https://pdf-lib.js.org/), [PDF.js](https://mozilla.github.io/pdf.js/), and [Lucide Icons](https://lucide.dev/).
