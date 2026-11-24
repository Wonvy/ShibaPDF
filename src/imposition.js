// Prepress Imposition Engine v1.8: Smart Reader-Spread Auto-Split, Multi-Sheet Overview, HiDPI Rendering & Pure K100 Crop Marks
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
    return { cols: 2, rows: 1 };
  }

  // Build logical single-page units from source slots.
  // When autoSplitSpreads is ON and a source page is a landscape spread (e.g. A3 420×297mm reader spread),
  // automatically split it into Left & Right single pages (e.g. A4 210×297mm) so imposing 2-up produces 1×A3 instead of 2×A3!
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

    // Standard Chinese designer spread convention: Spread 1 is [Back Cover | Front Cover]
    if (didSplitSpreads && firstWasSpread && opts.spreadFirstBackFront !== false && units.length >= 2) {
      const backCover = units.shift();
      units.push(backCover);
    }

    units.forEach((u, idx) => {
      u.logicalPageNum = idx + 1;
    });

    return { units, hasAnySpread, didSplitSpreads };
  }

  // Compute imposition layout plan (shared by Multi-Sheet Grid, Single-Sheet Zoom, and Vector PDF Export!)
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
        paddedTotal: 0
      };
    }

    const built = buildLogicalUnits(slots, getSlotSizePt, opts || {});
    const logicalUnits = built.units;
    const firstUnit = logicalUnits[0];
    const cellW = firstUnit.wPt;
    const cellH = firstUnit.hPt;
    const marginPt = opts.cropMarks ? 10 * MM_TO_PT : 0;
    const gutterPt = (opts.type === "nup" ? Math.max(0, opts.gutterMm || 0) : 0) * MM_TO_PT;

    let cols = 2, rows = 1;
    let orderedEntries = []; // Array of unitIndex (number) or null (blank cell)
    let paddedTotal = logicalUnits.length;

    if (opts.type === "booklet") {
      cols = 2;
      rows = 1;
      const n = logicalUnits.length;
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
    } else {
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

    if (opts.type === "nup" && opts.sheetPreset && opts.sheetPreset !== "auto" && SHEET_PRESETS_MM[opts.sheetPreset]) {
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
      sheets.push({
        sheetIndex: sIdx,
        duplexSide: opts.type === "booklet" ? (sIdx % 2 === 0 ? "front" : "back") : null,
        pageSummary: pageLabels.join(" · "),
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
      paddedTotal
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

  // Render HiDPI Retina preview of an imposed sheet at the exact requested CSS width (no CSS stretching!)
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

        // Crisp page number pill in top-left corner of cell
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

    // Center spine fold guide line for 2-up zero-gutter press sheets
    if (sheet.cols === 2 && sheet.rows === 1 && sheet.drawGutter < 0.5) {
      const spineX = (sheet.startX + sheet.drawCellW) * scale;
      ctx.save();
      ctx.strokeStyle = "rgba(35, 131, 226, 0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(spineX, sheet.startYTop * scale);
      ctx.lineTo(spineX, (sheet.startYTop + sheet.totalDrawH) * scale);
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

  // Build Vector Lossless Imposed PDF using pdf-lib embedPages with exact half-spread clipping boxes!
  async function exportImposedPdfBytes(preparedSlotDocs, plan, cropMarks, normVisualToPdfRectFn) {
    const outDoc = await PDFLib.PDFDocument.create();
    const srcPages = preparedSlotDocs.getPages();

    const pagesToEmbed = [];
    const clipBoxes = [];
    const rotAngles = [];
    const validUnitMap = new Map(); // unitIdx -> embeddedIndex

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
    computeImpositionPlan,
    renderImposedSheetPreview,
    exportImposedPdfBytes
  };
})();
