// Prepress Imposition Engine: Saddle-Stitch Booklet, 2-Up Reader Spreads, and N-Up Sheet Imposition with Pure K100 Crop Marks
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
    if (nup === 8) return { cols: 4, rows: 2 };
    return { cols: 2, rows: 1 }; // default 2-up
  }

  // Compute imposition layout plan (shared by Live Canvas Preview AND Vector PDF Export!)
  function computeImpositionPlan(slots, getSlotSizePt, opts) {
    // opts: { type: 'booklet'|'spread2up'|'nup', nup: 2|4|8, sheetPreset: 'auto'|'sra3'|..., gutterMm: 0, cropMarks: true, firstCoverAlone: false }
    if (!slots.length) return { sheets: [], sheetWMm: 0, sheetHMm: 0, paddedTotal: 0 };

    const firstSz = getSlotSizePt(slots[0]);
    const cellW = firstSz.wPt;
    const cellH = firstSz.hPt;
    const marginPt = opts.cropMarks ? 10 * MM_TO_PT : 0;
    const gutterPt = (opts.type === "nup" ? Math.max(0, opts.gutterMm || 0) : 0) * MM_TO_PT;

    let cols = 2, rows = 1;
    let orderedEntries = []; // Array of slotIndex (number) or null (blank cell)
    let paddedTotal = slots.length;

    if (opts.type === "booklet") {
      cols = 2;
      rows = 1;
      const n = slots.length;
      paddedTotal = Math.max(4, Math.ceil(n / 4) * 4);
      const padded = [];
      for (let i = 0; i < paddedTotal; i++) {
        padded.push(i < n ? i : null);
      }
      const numSheets = paddedTotal / 2;
      for (let s = 0; s < numSheets; s++) {
        if (s % 2 === 0) {
          // Front of signature sheet: [Last - s | First + s]
          orderedEntries.push(padded[paddedTotal - 1 - s], padded[s]);
        } else {
          // Back of signature sheet: [First + s | Last - s]
          orderedEntries.push(padded[s], padded[paddedTotal - 1 - s]);
        }
      }
    } else if (opts.type === "spread2up") {
      cols = 2;
      rows = 1;
      const list = slots.map((_, idx) => idx);
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
    } else {
      // N-Up Sheet Imposition
      const gr = getGridColsRows(opts.nup || 4);
      cols = gr.cols;
      rows = gr.rows;
      const perSheet = cols * rows;
      for (let i = 0; i < slots.length; i++) orderedEntries.push(i);
      while (orderedEntries.length % perSheet !== 0) orderedEntries.push(null);
    }

    const gridW = cols * cellW + (cols - 1) * gutterPt;
    const gridH = rows * cellH + (rows - 1) * gutterPt;

    let sheetWPt = gridW + marginPt * 2;
    let sheetHPt = gridH + marginPt * 2;

    if (opts.type === "nup" && opts.sheetPreset && opts.sheetPreset !== "auto" && SHEET_PRESETS_MM[opts.sheetPreset]) {
      const sp = SHEET_PRESETS_MM[opts.sheetPreset];
      let pw = sp.w * MM_TO_PT;
      let ph = sp.h * MM_TO_PT;
      // Match landscape/portrait orientation to grid aspect ratio
      if ((gridW > gridH && pw < ph) || (gridH > gridW && ph < pw)) {
        const tmp = pw; pw = ph; ph = tmp;
      }
      sheetWPt = pw;
      sheetHPt = ph;
    }

    // Scale down cells uniformly ONLY if fixed sheet preset is smaller than grid + margin
    const maxAvailW = Math.max(40, sheetWPt - marginPt * 2);
    const maxAvailH = Math.max(40, sheetHPt - marginPt * 2);
    const fitFactor = Math.min(1.0, maxAvailW / gridW, maxAvailH / gridH);

    const drawCellW = cellW * fitFactor;
    const drawCellH = cellH * fitFactor;
    const drawGutter = gutterPt * fitFactor;
    const totalDrawW = cols * drawCellW + (cols - 1) * drawGutter;
    const totalDrawH = rows * drawCellH + (rows - 1) * drawGutter;

    const startX = (sheetWPt - totalDrawW) / 2;
    const startYTop = (sheetHPt - totalDrawH) / 2; // from top in visual coords

    const perSheet = cols * rows;
    const sheets = [];
    for (let base = 0; base < orderedEntries.length; base += perSheet) {
      const placements = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const slotIdx = orderedEntries[base + r * cols + c];
          const x = startX + c * (drawCellW + drawGutter);
          const yTop = startYTop + r * (drawCellH + drawGutter);
          const yBottom = sheetHPt - yTop - drawCellH;
          placements.push({
            slotIdx, // null if blank pad
            col: c,
            row: r,
            xPt: x,
            yTopPt: yTop,
            yBottomPt: yBottom,
            wPt: drawCellW,
            hPt: drawCellH
          });
        }
      }
      sheets.push({
        sheetIndex: sheets.length,
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
      sheets,
      sheetWPt,
      sheetHPt,
      sheetWMm: sheetWPt / MM_TO_PT,
      sheetHMm: sheetHPt / MM_TO_PT,
      paddedTotal
    };
  }

  function getCropMarkSegments(sheet) {
    // Returns array of [x1, y1, x2, y2] in visual top-down pt coordinates
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

    // Vertical trim ticks at top & bottom outside grid
    xTicks.forEach((x) => {
      segs.push([x, minY - off - len, x, minY - off]);
      segs.push([x, maxY + off, x, maxY + off + len]);
    });
    // Horizontal trim ticks at left & right outside grid
    yTicks.forEach((y) => {
      segs.push([minX - off - len, y, minX - off, y]);
      segs.push([maxX + off, y, maxX + off + len, y]);
    });

    return segs;
  }

  // Render live preview of a single imposed sheet onto HTML Canvas!
  async function renderImposedSheetPreview(canvas, sheet, getSlotBitmapFn, cropMarks, blankLabel) {
    const maxCssW = 860;
    const scale = Math.min(maxCssW / sheet.wPt, 620 / sheet.hPt, 1.4);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.round(sheet.wPt * scale);
    const cssH = Math.round(sheet.hPt * scale);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);

    for (const pl of sheet.placements) {
      const dx = pl.xPt * scale;
      const dy = pl.yTopPt * scale;
      const dw = pl.wPt * scale;
      const dh = pl.hPt * scale;

      if (pl.slotIdx === null) {
        ctx.fillStyle = "#f8f8f6";
        ctx.fillRect(dx, dy, dw, dh);
        ctx.strokeStyle = "#e0e0dc";
        ctx.lineWidth = 1;
        ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
        ctx.fillStyle = "#a0a09b";
        ctx.font = "500 11px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(blankLabel || "Blank", dx + dw / 2, dy + dh / 2);
      } else {
        const bmp = await getSlotBitmapFn(pl.slotIdx);
        ctx.drawImage(bmp, dx, dy, dw, dh);
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 0.75;
        ctx.strokeRect(dx, dy, dw, dh);

        // Subtle page number pill in corner
        ctx.fillStyle = "rgba(24,24,23,0.75)";
        ctx.fillRect(dx + 6, dy + 6, 32, 17);
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 10px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`P${pl.slotIdx + 1}`, dx + 22, dy + 18);
      }
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

  // Build Vector Lossless Imposed PDF using pdf-lib embedPages
  async function exportImposedPdfBytes(preparedSlotDocs, plan, cropMarks) {
    // preparedSlotDocs: single PDFDocument containing all active slots in 0..N-1 order (already rotated & edited & K100-fixed!)
    const outDoc = await PDFLib.PDFDocument.create();
    const srcPages = preparedSlotDocs.getPages();
    const embeddedPages = await outDoc.embedPages(srcPages);

    for (const sheet of plan.sheets) {
      const outPage = outDoc.addPage([sheet.wPt, sheet.hPt]);

      for (const pl of sheet.placements) {
        if (pl.slotIdx === null) continue;
        const emb = embeddedPages[pl.slotIdx];
        outPage.drawPage(emb, {
          x: pl.xPt,
          y: pl.yBottomPt,
          width: pl.wPt,
          height: pl.hPt
        });
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
    computeImpositionPlan,
    renderImposedSheetPreview,
    exportImposedPdfBytes
  };
})();
