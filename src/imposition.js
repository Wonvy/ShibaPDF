// Prepress Imposition Engine v2.0: 6 Binding Methods with Visual SVG Schematics, Smart Spread Split, HiDPI & Lossless PDF Export
window.ShibaImpose = (function () {
  "use strict";

  const MM_TO_PT = 72.0 / 25.4;

  const SHEET_PRESETS_MM = {
    sra3: { w: 450, h: 320 },
    a3: { w: 420, h: 297 },
    dadu4: { w: 595, h: 440 },
    zhengdu4: { w: 543, h: 390 }
  };

  function getGridColsRows(nup) {
    if (nup === 4) return { cols: 2, rows: 2 };
    if (nup === 6) return { cols: 3, rows: 2 };
    if (nup === 8) return { cols: 4, rows: 2 };
    if (nup === 9) return { cols: 3, rows: 3 };
    if (nup === 16) return { cols: 4, rows: 4 };
    return { cols: 2, rows: 1 };
  }

  // Crisp visual schematic SVGs illustrating each binding & imposition method for intuitive selection
  const BINDING_SVGS = {
    booklet: `<svg viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14 L44 19 L76 14 L76 46 L44 51 L12 46 Z" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M17 10 L44 16 L71 10 L71 42 L44 48 L17 42 Z" fill="var(--bg-surface, #fff)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <line x1="44" y1="14" x2="44" y2="50" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2.5 2"/>
      <line x1="41.5" y1="23" x2="46.5" y2="23" stroke="#2383e2" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="41.5" y1="39" x2="46.5" y2="39" stroke="#2383e2" stroke-width="2.2" stroke-linecap="round"/>
      <text x="27" y="30" font-size="8.5" font-weight="700" fill="currentColor" opacity="0.72" text-anchor="middle">Pn</text>
      <text x="60" y="30" font-size="8.5" font-weight="700" fill="#2383e2" text-anchor="middle">P1</text>
    </svg>`,

    perfect: `<svg viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="10" width="27" height="36" rx="1.5" fill="var(--bg-surface, #fff)" stroke="currentColor" stroke-width="1.4"/>
      <rect x="47" y="10" width="27" height="36" rx="1.5" fill="var(--bg-surface, #fff)" stroke="currentColor" stroke-width="1.4"/>
      <rect x="41" y="9" width="6" height="38" rx="1" fill="#2383e2" fill-opacity="0.22" stroke="#2383e2" stroke-width="1.5"/>
      <path d="M41 18 H47 M41 28 H47 M41 38 H47" stroke="#2383e2" stroke-width="1.4"/>
      <line x1="18" y1="49" x2="40" y2="49" stroke="currentColor" stroke-width="1.2" opacity="0.45"/>
      <line x1="48" y1="49" x2="70" y2="49" stroke="currentColor" stroke-width="1.2" opacity="0.45"/>
      <text x="27.5" y="31" font-size="7.5" font-weight="700" fill="currentColor" opacity="0.75" text-anchor="middle">1帖</text>
      <text x="60.5" y="31" font-size="7.5" font-weight="700" fill="#2383e2" text-anchor="middle">2帖</text>
    </svg>`,

    spread2up: `<svg viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="11" y="13" width="66" height="33" rx="2" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.4"/>
      <rect x="14" y="10" width="30" height="33" fill="var(--bg-surface, #fff)" stroke="currentColor" stroke-width="1.5"/>
      <rect x="44" y="10" width="30" height="33" fill="var(--bg-surface, #fff)" stroke="currentColor" stroke-width="1.5"/>
      <line x1="44" y1="10" x2="44" y2="43" stroke="#2383e2" stroke-width="1.8"/>
      <path d="M35 26 H53" stroke="#2383e2" stroke-width="1.3" stroke-dasharray="2 2"/>
      <text x="29" y="29" font-size="8.5" font-weight="700" fill="currentColor" opacity="0.72" text-anchor="middle">P2</text>
      <text x="59" y="29" font-size="8.5" font-weight="700" fill="#2383e2" text-anchor="middle">P3</text>
    </svg>`,

    fold: `<svg viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,13 33,9 33,43 12,47" fill="var(--bg-surface, #fff)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="33,9 55,15 55,49 33,43" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="55,15 76,10 76,44 55,49" fill="var(--bg-surface, #fff)" stroke="#2383e2" stroke-width="1.6" stroke-linejoin="round"/>
      <line x1="33" y1="9" x2="33" y2="43" stroke="#2383e2" stroke-width="1.3" stroke-dasharray="2.5 2"/>
      <line x1="55" y1="15" x2="55" y2="49" stroke="#2383e2" stroke-width="1.3" stroke-dasharray="2.5 2"/>
      <text x="22.5" y="31" font-size="7.5" font-weight="700" fill="currentColor" opacity="0.7" text-anchor="middle">P5</text>
      <text x="44" y="32" font-size="7.5" font-weight="700" fill="currentColor" opacity="0.7" text-anchor="middle">P6</text>
      <text x="65.5" y="30" font-size="7.5" font-weight="700" fill="#2383e2" text-anchor="middle">P1</text>
    </svg>`,

    nup: `<svg viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="8" width="58" height="40" rx="2" fill="var(--bg-surface, #fff)" stroke="currentColor" stroke-width="1.4"/>
      <rect x="20" y="12" width="22" height="14" rx="1" fill="#2383e2" fill-opacity="0.10" stroke="#2383e2" stroke-width="1.3"/>
      <rect x="46" y="12" width="22" height="14" rx="1" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-width="1.2"/>
      <rect x="20" y="30" width="22" height="14" rx="1" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-width="1.2"/>
      <rect x="46" y="30" width="22" height="14" rx="1" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-width="1.2"/>
      <text x="31" y="21.5" font-size="7.5" font-weight="700" fill="#2383e2" text-anchor="middle">P1</text>
      <text x="57" y="21.5" font-size="7.5" font-weight="700" fill="currentColor" opacity="0.72" text-anchor="middle">P2</text>
      <text x="31" y="39.5" font-size="7.5" font-weight="700" fill="currentColor" opacity="0.72" text-anchor="middle">P3</text>
      <text x="57" y="39.5" font-size="7.5" font-weight="700" fill="currentColor" opacity="0.72" text-anchor="middle">P4</text>
    </svg>`,

    steprepeat: `<svg viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="8" width="58" height="40" rx="2" fill="var(--bg-surface, #fff)" stroke="currentColor" stroke-width="1.4"/>
      <rect x="20" y="12" width="22" height="14" rx="1" fill="#2383e2" fill-opacity="0.13" stroke="#2383e2" stroke-width="1.3"/>
      <rect x="46" y="12" width="22" height="14" rx="1" fill="#2383e2" fill-opacity="0.13" stroke="#2383e2" stroke-width="1.3"/>
      <rect x="20" y="30" width="22" height="14" rx="1" fill="#2383e2" fill-opacity="0.13" stroke="#2383e2" stroke-width="1.3"/>
      <rect x="46" y="30" width="22" height="14" rx="1" fill="#2383e2" fill-opacity="0.13" stroke="#2383e2" stroke-width="1.3"/>
      <text x="31" y="21.5" font-size="7.5" font-weight="700" fill="#2383e2" text-anchor="middle">P1</text>
      <text x="57" y="21.5" font-size="7.5" font-weight="700" fill="#2383e2" text-anchor="middle">P1</text>
      <text x="31" y="39.5" font-size="7.5" font-weight="700" fill="#2383e2" text-anchor="middle">P1</text>
      <text x="57" y="39.5" font-size="7.5" font-weight="700" fill="#2383e2" text-anchor="middle">P1</text>
    </svg>`
  };

  function getBindingMethodSvgs() {
    return BINDING_SVGS;
  }

  // Build logical single-page units from source slots.
  function buildLogicalUnits(slots, getSlotSizePt, opts) {
    const units = [];
    let hasAnySpread = false;
    let didSplitSpreads = false;
    let firstWasSpread = false;
    const autoSplit = opts.autoSplitSpreads !== false;
    const bleedPt = Math.max(0, opts.spreadBleedMm || 0) * MM_TO_PT;

    slots.forEach((slot, sIdx) => {
      const sz = getSlotSizePt(slot);
      const isSpread = sz.wPt > sz.hPt * 1.15;
      if (isSpread) hasAnySpread = true;

      if (autoSplit && isSpread) {
        didSplitSpreads = true;
        if (sIdx === 0) firstWasSpread = true;
        const uL = Math.min(0.45, bleedPt / Math.max(1, sz.wPt));
        const uR = Math.min(0.45, bleedPt / Math.max(1, sz.wPt));
        const vT = Math.min(0.45, bleedPt / Math.max(1, sz.hPt));
        const vB = Math.min(0.45, bleedPt / Math.max(1, sz.hPt));
        const halfUwL = Math.max(0.05, 0.5 - uL);
        const halfUwR = Math.max(0.05, 0.5 - uR);
        const netVh = Math.max(0.05, 1 - vT - vB);

        units.push({
          slotIdx: sIdx,
          side: "left",
          u: uL,
          v: vT,
          uw: halfUwL,
          vh: netVh,
          wPt: halfUwL * sz.wPt,
          hPt: netVh * sz.hPt
        });
        units.push({
          slotIdx: sIdx,
          side: "right",
          u: 0.5,
          v: vT,
          uw: halfUwR,
          vh: netVh,
          wPt: halfUwR * sz.wPt,
          hPt: netVh * sz.hPt
        });
      } else {
        units.push({
          slotIdx: sIdx,
          side: "full",
          u: 0,
          v: 0,
          uw: 1,
          vh: 1,
          wPt: sz.wPt,
          hPt: sz.hPt
        });
      }
    });

    if (didSplitSpreads && firstWasSpread && opts.spreadFirstBackFront !== false && units.length >= 2) {
      const backCover = units.shift();
      units.push(backCover);
    }

    units.forEach((u, idx) => {
      u.logicalPageNum = idx + 1;
    });

    return { units, hasAnySpread, didSplitSpreads };
  }

  // Helper to impose a slice of indices as a nested saddle-stitch signature
  function buildNestedSignatureEntries(sliceIndices) {
    const out = [];
    const total = sliceIndices.length;
    const numSheets = total / 2;
    for (let s = 0; s < numSheets; s++) {
      if (s % 2 === 0) {
        out.push(sliceIndices[total - 1 - s], sliceIndices[s]);
      } else {
        out.push(sliceIndices[s], sliceIndices[total - 1 - s]);
      }
    }
    return out;
  }

  function computeImpositionPlan(slots, getSlotSizePt, opts) {
    if (!slots.length) {
      return {
        sheets: [],
        logicalUnits: [],
        hasAnySpread: false,
        didSplitSpreads: false,
        sheetWPt: 0,
        sheetHPt: 0,
        sheetWMm: 0,
        sheetHMm: 0,
        cellWMm: 0,
        cellHMm: 0,
        origLogicalCount: 0,
        paddedTotal: 0,
        sigCount: 0
      };
    }

    const mode = (opts && opts.type) || "booklet";
    const built = buildLogicalUnits(slots, getSlotSizePt, opts || {});
    const logicalUnits = built.units;
    const firstUnit = logicalUnits[0];
    const cellW = firstUnit.wPt;
    const cellH = firstUnit.hPt;
    const marginPt = opts.cropMarks ? 10 * MM_TO_PT : 0;

    let gutterMm = 0;
    if (mode === "nup" || mode === "steprepeat") {
      gutterMm = Math.max(0, opts.gutterMm || 0);
    } else if (mode === "perfect") {
      // Spine milling allowance (each leaf gets spineGrindMm at the spine -> 2 * spineGrindMm between left & right pages)
      gutterMm = Math.max(0, (opts.spineGrindMm || 0) * 2);
    }
    const gutterPt = gutterMm * MM_TO_PT;

    let cols = 2, rows = 1;
    let orderedEntries = [];
    let sheetMetaList = []; // Optional per-sheet duplexSide / sigIndex metadata
    let paddedTotal = logicalUnits.length;
    let sigCount = 0;

    if (mode === "booklet") {
      cols = 2;
      rows = 1;
      const n = logicalUnits.length;
      paddedTotal = Math.max(4, Math.ceil(n / 4) * 4);
      const padded = [];
      for (let i = 0; i < paddedTotal; i++) padded.push(i < n ? i : null);
      orderedEntries = buildNestedSignatureEntries(padded);
      sigCount = 1;
      for (let s = 0; s < orderedEntries.length / 2; s++) {
        sheetMetaList.push({ duplexSide: s % 2 === 0 ? "front" : "back", sigIdx: 1 });
      }
    } else if (mode === "perfect") {
      cols = 2;
      rows = 1;
      const rawSig = Number(opts.sigPages) || 8;
      const sigPages = [4, 8, 16, 32].includes(rawSig) ? rawSig : 8;
      const n = logicalUnits.length;
      // Pad overall book to a multiple of 4, then group into signatures of sigPages (last signature rounds to multiple of 4)
      paddedTotal = Math.max(4, Math.ceil(n / 4) * 4);
      const padded = [];
      for (let i = 0; i < paddedTotal; i++) padded.push(i < n ? i : null);

      let cursor = 0;
      while (cursor < padded.length) {
        const chunk = padded.slice(cursor, cursor + sigPages);
        while (chunk.length % 4 !== 0) chunk.push(null);
        sigCount++;
        const sigEntries = buildNestedSignatureEntries(chunk);
        orderedEntries.push(...sigEntries);
        for (let s = 0; s < sigEntries.length / 2; s++) {
          sheetMetaList.push({ duplexSide: s % 2 === 0 ? "front" : "back", sigIdx: sigCount });
        }
        cursor += sigPages;
      }
    } else if (mode === "spread2up") {
      cols = 2;
      rows = 1;
      const list = logicalUnits.map((_, idx) => idx);
      if (opts.firstCoverAlone) {
        orderedEntries.push(null, list[0]);
        for (let i = 1; i < list.length; i += 2) {
          orderedEntries.push(list[i], i + 1 < list.length ? list[i + 1] : null);
        }
      } else {
        for (let i = 0; i < list.length; i += 2) {
          orderedEntries.push(list[i], i + 1 < list.length ? list[i + 1] : null);
        }
      }
    } else if (mode === "fold") {
      const panels = [2, 3, 4].includes(Number(opts.foldPanels)) ? Number(opts.foldPanels) : 3;
      cols = panels;
      rows = 1;
      const perBrochure = panels * 2;
      const n = logicalUnits.length;
      paddedTotal = Math.max(perBrochure, Math.ceil(n / perBrochure) * perBrochure);
      const padded = [];
      for (let i = 0; i < paddedTotal; i++) padded.push(i < n ? i : null);

      for (let b = 0; b < padded.length; b += perBrochure) {
        const p = padded.slice(b, b + perBrochure);
        if (panels === 2) {
          // Bi-fold 4P: Outside [P4 | P1], Inside [P2 | P3]
          orderedEntries.push(p[3], p[0], p[1], p[2]);
        } else if (panels === 3) {
          // Tri-fold 6P: Outside [P5 | P6 | P1], Inside [P2 | P3 | P4]
          orderedEntries.push(p[4], p[5], p[0], p[1], p[2], p[3]);
        } else {
          // 4-panel Accordion 8P: Outside [P8 | P7 | P6 | P1], Inside [P2 | P3 | P4 | P5]
          orderedEntries.push(p[7], p[6], p[5], p[0], p[1], p[2], p[3], p[4]);
        }
        sheetMetaList.push({ duplexSide: "front", sigIdx: b / perBrochure + 1 });
        sheetMetaList.push({ duplexSide: "back", sigIdx: b / perBrochure + 1 });
      }
    } else if (mode === "steprepeat") {
      const gr = getGridColsRows(opts.nup || 4);
      cols = gr.cols;
      rows = gr.rows;
      const perSheet = cols * rows;
      for (let i = 0; i < logicalUnits.length; i++) {
        for (let r = 0; r < perSheet; r++) orderedEntries.push(i);
      }
    } else {
      // Sequential N-Up
      const gr = getGridColsRows(opts.nup || 4);
      cols = gr.cols;
      rows = gr.rows;
      const perSheet = cols * rows;
      for (let i = 0; i < logicalUnits.length; i++) orderedEntries.push(i);
      while (orderedEntries.length % perSheet !== 0) orderedEntries.push(null);
    }

    const gridW = cols * cellW + (cols - 1) * gutterPt;
    const gridH = rows * cellH + (rows - 1) * gutterPt;

    let sheetWPt = gridW + marginPt * 2;
    let sheetHPt = gridH + marginPt * 2;

    if (opts.sheetPreset && opts.sheetPreset !== "auto" && SHEET_PRESETS_MM[opts.sheetPreset]) {
      const sp = SHEET_PRESETS_MM[opts.sheetPreset];
      let pw = sp.w * MM_TO_PT;
      let ph = sp.h * MM_TO_PT;
      if ((gridW > gridH && pw < ph) || (gridH > gridW && ph < pw)) {
        const tmp = pw; pw = ph; ph = tmp;
      }
      sheetWPt = pw;
      sheetHPt = ph;
    }

    const maxAvailW = Math.max(40, sheetWPt - marginPt * 2);
    const maxAvailH = Math.max(40, sheetHPt - marginPt * 2);
    const fitFactor = Math.min(1.0, maxAvailW / gridW, maxAvailH / gridH);

    const drawCellW = cellW * fitFactor;
    const drawCellH = cellH * fitFactor;
    const drawGutter = gutterPt * fitFactor;
    const totalDrawW = cols * drawCellW + (cols - 1) * drawGutter;
    const totalDrawH = rows * drawCellH + (rows - 1) * drawGutter;

    const startX = (sheetWPt - totalDrawW) / 2;
    const startYTop = (sheetHPt - totalDrawH) / 2;

    const perSheet = cols * rows;
    const sheets = [];
    for (let base = 0; base < orderedEntries.length; base += perSheet) {
      const placements = [];
      const pageLabels = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const uIdx = orderedEntries[base + r * cols + c];
          const unit = uIdx !== null && uIdx !== undefined ? logicalUnits[uIdx] : null;
          const x = startX + c * (drawCellW + drawGutter);
          const yTop = startYTop + r * (drawCellH + drawGutter);
          const yBottom = sheetHPt - yTop - drawCellH;
          placements.push({
            unitIdx: uIdx,
            unit,
            slotIdx: unit ? unit.slotIdx : null,
            logicalPageNum: unit ? unit.logicalPageNum : null,
            col: c,
            row: r,
            xPt: x,
            yTopPt: yTop,
            yBottomPt: yBottom,
            wPt: drawCellW,
            hPt: drawCellH
          });
          pageLabels.push(unit ? `P${unit.logicalPageNum}` : "—");
        }
      }
      const sIdx = sheets.length;
      const sm = sheetMetaList[sIdx] || {};
      const summaryStr =
        mode === "steprepeat" && placements[0] && placements[0].logicalPageNum
          ? `P${placements[0].logicalPageNum} × ${perSheet}`
          : pageLabels.join(" · ");

      sheets.push({
        sheetIndex: sIdx,
        mode,
        duplexSide: sm.duplexSide || null,
        sigIdx: sm.sigIdx || null,
        pageSummary: summaryStr,
        wPt: sheetWPt,
        hPt: sheetHPt,
        cols,
        rows,
        startX,
        startYTop,
        totalDrawW,
        totalDrawH,
        drawCellW,
        drawCellH,
        drawGutter,
        placements
      });
    }

    return {
      mode,
      sheets,
      logicalUnits,
      hasAnySpread: built.hasAnySpread,
      didSplitSpreads: built.didSplitSpreads,
      sheetWPt,
      sheetHPt,
      sheetWMm: sheetWPt / MM_TO_PT,
      sheetHMm: sheetHPt / MM_TO_PT,
      cellWMm: drawCellW / MM_TO_PT,
      cellHMm: drawCellH / MM_TO_PT,
      origLogicalCount: logicalUnits.length,
      paddedTotal,
      sigCount
    };
  }

  function getCropMarkSegments(sheet) {
    const segs = [];
    const off = 2.5 * MM_TO_PT;
    const len = 5.5 * MM_TO_PT;

    const xTicks = new Set();
    const yTicks = new Set();
    sheet.placements.forEach((p) => {
      xTicks.add(Math.round(p.xPt * 100) / 100);
      xTicks.add(Math.round((p.xPt + p.wPt) * 100) / 100);
      yTicks.add(Math.round(p.yTopPt * 100) / 100);
      yTicks.add(Math.round((p.yTopPt + p.hPt) * 100) / 100);
    });

    const minX = sheet.startX;
    const maxX = sheet.startX + sheet.totalDrawW;
    const minY = sheet.startYTop;
    const maxY = sheet.startYTop + sheet.totalDrawH;

    xTicks.forEach((x) => {
      segs.push([x, minY - off - len, x, minY - off]);
      segs.push([x, maxY + off, x, maxY + off + len]);
    });
    yTicks.forEach((y) => {
      segs.push([minX - off - len, y, minX - off, y]);
      segs.push([maxX + off, y, maxX + off + len, y]);
    });

    return segs;
  }

  async function renderImposedSheetPreview(canvas, sheet, targetCssW, renderUnitHiResFn, cropMarks, blankLabel) {
    const cssW = Math.max(120, Math.round(targetCssW || 720));
    const scale = cssW / Math.max(1, sheet.wPt);
    const cssH = Math.max(80, Math.round(sheet.hPt * scale));
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);

    // Optional Perfect-Binding spine milling shaded zone
    if (sheet.mode === "perfect" && sheet.cols === 2 && sheet.drawGutter > 0.2) {
      const gx = (sheet.startX + sheet.drawCellW) * scale;
      const gw = sheet.drawGutter * scale;
      ctx.fillStyle = "rgba(35, 131, 226, 0.08)";
      ctx.fillRect(gx, sheet.startYTop * scale, gw, sheet.totalDrawH * scale);
    }

    for (const pl of sheet.placements) {
      const dx = pl.xPt * scale;
      const dy = pl.yTopPt * scale;
      const dw = pl.wPt * scale;
      const dh = pl.hPt * scale;

      if (!pl.unit) {
        ctx.fillStyle = "#f8f8f6";
        ctx.fillRect(dx, dy, dw, dh);
        ctx.strokeStyle = "#e0e0dc";
        ctx.lineWidth = 1;
        ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
        ctx.fillStyle = "#a0a09b";
        ctx.font = "500 11px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(blankLabel || "Blank", dx + dw / 2, dy + dh / 2);
      } else {
        const reqDevPxW = Math.max(240, Math.round(dw * dpr));
        const bmp = await renderUnitHiResFn(pl.unit, reqDevPxW);
        if (bmp) {
          ctx.drawImage(bmp, dx, dy, dw, dh);
        }
        ctx.strokeStyle = "rgba(0,0,0,0.09)";
        ctx.lineWidth = 0.75;
        ctx.strokeRect(dx, dy, dw, dh);

        const labelTxt = `P${pl.logicalPageNum}`;
        const pillW = Math.max(28, labelTxt.length * 7 + 12);
        ctx.fillStyle = "rgba(24,24,23,0.78)";
        ctx.fillRect(dx + 6, dy + 6, pillW, 17);
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 10.5px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelTxt, dx + 6 + pillW / 2, dy + 14.5);
      }
    }

    // Fold / Spine guide dashed lines
    if (sheet.rows === 1 && sheet.cols >= 2 && (sheet.drawGutter < 0.5 || sheet.mode === "perfect" || sheet.mode === "fold")) {
      ctx.save();
      ctx.strokeStyle = "rgba(35, 131, 226, 0.65)";
      ctx.lineWidth = 1.1;
      ctx.setLineDash([4, 3.5]);
      ctx.beginPath();
      for (let c = 1; c < sheet.cols; c++) {
        const foldX = (sheet.startX + c * sheet.drawCellW + (c - 0.5) * sheet.drawGutter) * scale;
        ctx.moveTo(foldX, sheet.startYTop * scale);
        ctx.lineTo(foldX, (sheet.startYTop + sheet.totalDrawH) * scale);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (cropMarks) {
      const segs = getCropMarkSegments(sheet);
      ctx.strokeStyle = "#181817";
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      segs.forEach(([x1, y1, x2, y2]) => {
        ctx.moveTo(x1 * scale, y1 * scale);
        ctx.lineTo(x2 * scale, y2 * scale);
      });
      ctx.stroke();
    }
  }

  async function exportImposedPdfBytes(preparedSlotDocs, plan, cropMarks, normVisualToPdfRectFn) {
    const outDoc = await PDFLib.PDFDocument.create();
    const srcPages = preparedSlotDocs.getPages();

    const pagesToEmbed = [];
    const clipBoxes = [];
    const rotAngles = [];
    const validUnitMap = new Map();

    plan.logicalUnits.forEach((unit, uIdx) => {
      const srcPage = srcPages[unit.slotIdx];
      if (!srcPage || !srcPage.node.Contents()) return;
      const crop = srcPage.getCropBox();
      const rot = ((srcPage.getRotation().angle || 0) % 360 + 360) % 360;
      const r = normVisualToPdfRectFn
        ? normVisualToPdfRectFn(crop, rot, { u: unit.u, v: unit.v, uw: unit.uw, vh: unit.vh })
        : {
            x: crop.x + unit.u * crop.width,
            y: crop.y + (1 - unit.v - unit.vh) * crop.height,
            w: unit.uw * crop.width,
            h: unit.vh * crop.height
          };

      validUnitMap.set(uIdx, pagesToEmbed.length);
      pagesToEmbed.push(srcPage);
      clipBoxes.push({ left: r.x, bottom: r.y, right: r.x + r.w, top: r.y + r.h });
      rotAngles.push(rot);
    });

    const embeddedPages = pagesToEmbed.length
      ? await outDoc.embedPages(pagesToEmbed, clipBoxes)
      : [];

    for (const sheet of plan.sheets) {
      const outPage = outDoc.addPage([sheet.wPt, sheet.hPt]);

      for (const pl of sheet.placements) {
        if (pl.unitIdx === null || pl.unitIdx === undefined) continue;
        const embIdx = validUnitMap.get(pl.unitIdx);
        if (embIdx === undefined) continue;
        const emb = embeddedPages[embIdx];
        const rot = rotAngles[embIdx] || 0;

        if (rot === 90) {
          outPage.drawPage(emb, {
            x: pl.xPt,
            y: pl.yBottomPt + pl.hPt,
            width: pl.hPt,
            height: pl.wPt,
            rotate: PDFLib.degrees(-90)
          });
        } else if (rot === 180) {
          outPage.drawPage(emb, {
            x: pl.xPt + pl.wPt,
            y: pl.yBottomPt + pl.hPt,
            width: pl.wPt,
            height: pl.hPt,
            rotate: PDFLib.degrees(180)
          });
        } else if (rot === 270) {
          outPage.drawPage(emb, {
            x: pl.xPt + pl.wPt,
            y: pl.yBottomPt,
            width: pl.hPt,
            height: pl.wPt,
            rotate: PDFLib.degrees(90)
          });
        } else {
          outPage.drawPage(emb, {
            x: pl.xPt,
            y: pl.yBottomPt,
            width: pl.wPt,
            height: pl.hPt
          });
        }
      }

      if (cropMarks) {
        const segs = getCropMarkSegments(sheet);
        const k100Color = PDFLib.cmyk(0, 0, 0, 1);
        segs.forEach(([x1, y1, x2, y2]) => {
          outPage.drawLine({
            start: { x: x1, y: sheet.hPt - y1 },
            end: { x: x2, y: sheet.hPt - y2 },
            thickness: 0.35,
            color: k100Color
          });
        });
      }
    }

    return await outDoc.save();
  }

  return {
    buildLogicalUnits,
    getBindingMethodSvgs,
    computeImpositionPlan,
    renderImposedSheetPreview,
    exportImposedPdfBytes
  };
})();
