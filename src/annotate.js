// Freeform Infinite Pan & Zoom Designer Review & Markup Artboard (Boxes, Circles, Arrows, Freehand Pen, Margin Callouts, PNG & PDF Export)
window.ShibaAnnotate = (function () {
  "use strict";

  const PAD = 110; // Generous margin around pages so reviewers can draw arrows & notes outside page bounds!
  const GAP = 72;

  function hexToRgba(hex, alpha) {
    const h = (hex || "#e03e3e").replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) || 224;
    const g = parseInt(h.slice(2, 4), 16) || 62;
    const b = parseInt(h.slice(4, 6), 16) || 62;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function hexToRgb01(hex) {
    const h = (hex || "#e03e3e").replace("#", "");
    return {
      r: (parseInt(h.slice(0, 2), 16) || 224) / 255,
      g: (parseInt(h.slice(2, 4), 16) || 62) / 255,
      b: (parseInt(h.slice(4, 6), 16) || 62) / 255
    };
  }

  function computeBoardLayout(slots, getSlotSizeInfoFn) {
    if (!slots.length) return { boardW: 800, boardH: 600, placements: [] };
    const sizes = slots.map((s) => getSlotSizeInfoFn(s));
    const s0 = sizes[0];
    const cols = slots.length >= 2 && s0.wPt <= s0.hPt * 1.15 ? 2 : 1;

    const colWidths = new Array(cols).fill(0);
    const rowHeights = [];
    for (let i = 0; i < sizes.length; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      colWidths[c] = Math.max(colWidths[c], sizes[i].wPt);
      rowHeights[r] = Math.max(rowHeights[r] || 0, sizes[i].hPt);
    }

    const colX = [PAD];
    for (let c = 1; c < cols; c++) colX[c] = colX[c - 1] + colWidths[c - 1] + GAP;

    const rowY = [PAD];
    for (let r = 1; r < rowHeights.length; r++) rowY[r] = rowY[r - 1] + rowHeights[r - 1] + GAP;

    const placements = sizes.map((sz, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return {
        slotIdx: i,
        x: colX[c] + (colWidths[c] - sz.wPt) / 2,
        y: rowY[r] + (rowHeights[r] - sz.hPt) / 2,
        w: sz.wPt,
        h: sz.hPt
      };
    });

    const totalW = colX[cols - 1] + colWidths[cols - 1] + PAD;
    const totalH = rowY[rowHeights.length - 1] + rowHeights[rowHeights.length - 1] + PAD;
    return { boardW: Math.round(totalW), boardH: Math.round(totalH), placements };
  }

  function drawArrowOnCtx(ctx, x1, y1, x2, y2, color, strokeW) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;

    const angle = Math.atan2(dy, dx);
    const headLen = Math.max(11, strokeW * 3.8);
    const headAng = Math.PI / 6.2;

    const shaftEndX = x2 - Math.cos(angle) * (headLen * 0.7);
    const shaftEndY = y2 - Math.sin(angle) * (headLen * 0.7);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = strokeW;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - headAng), y2 - headLen * Math.sin(angle - headAng));
    ctx.lineTo(x2 - headLen * Math.cos(angle + headAng), y2 - headLen * Math.sin(angle + headAng));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSingleAnnotationOnCtx(ctx, ann, isSelected) {
    const color = ann.color || "#e03e3e";
    const sw = ann.strokeW || 3.5;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = sw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (ann.type === "rect") {
      ctx.fillStyle = hexToRgba(color, 0.08);
      ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
      if (isSelected) drawSelectionBox(ctx, ann.x, ann.y, ann.w, ann.h);
    } else if (ann.type === "ellipse") {
      const cx = ann.x + ann.w / 2;
      const cy = ann.y + ann.h / 2;
      ctx.fillStyle = hexToRgba(color, 0.07);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, Math.abs(ann.w) / 2), Math.max(1, Math.abs(ann.h) / 2), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (isSelected) drawSelectionBox(ctx, ann.x, ann.y, ann.w, ann.h);
    } else if (ann.type === "arrow") {
      drawArrowOnCtx(ctx, ann.x1, ann.y1, ann.x2, ann.y2, color, sw);
      if (isSelected) {
        drawHandleDot(ctx, ann.x1, ann.y1);
        drawHandleDot(ctx, ann.x2, ann.y2);
      }
    } else if (ann.type === "pen" && ann.pts && ann.pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(ann.pts[0][0], ann.pts[0][1]);
      for (let i = 1; i < ann.pts.length - 1; i++) {
        const mx = (ann.pts[i][0] + ann.pts[i + 1][0]) / 2;
        const my = (ann.pts[i][1] + ann.pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(ann.pts[i][0], ann.pts[i][1], mx, my);
      }
      const last = ann.pts[ann.pts.length - 1];
      ctx.lineTo(last[0], last[1]);
      ctx.stroke();
      if (isSelected) {
        const b = getAnnotationBounds(ann);
        drawSelectionBox(ctx, b.x, b.y, b.w, b.h);
      }
    }
    ctx.restore();
  }

  function drawHandleDot(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#2383e2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSelectionBox(ctx, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = "#2383e2";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    ctx.restore();
  }

  function getAnnotationBounds(ann) {
    if (ann.type === "rect" || ann.type === "ellipse") {
      return { x: ann.x, y: ann.y, w: ann.w, h: ann.h };
    }
    if (ann.type === "arrow") {
      const minX = Math.min(ann.x1, ann.x2);
      const minY = Math.min(ann.y1, ann.y2);
      return { x: minX, y: minY, w: Math.max(8, Math.abs(ann.x2 - ann.x1)), h: Math.max(8, Math.abs(ann.y2 - ann.y1)) };
    }
    if (ann.type === "pen" && ann.pts && ann.pts.length) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      ann.pts.forEach(([px, py]) => {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      });
      return { x: minX, y: minY, w: Math.max(8, maxX - minX), h: Math.max(8, maxY - minY) };
    }
    if (ann.type === "note") {
      const lines = (ann.text || "").split("\n");
      const maxChars = Math.max(5, ...lines.map((l) => l.length));
      return { x: ann.x, y: ann.y, w: Math.min(280, maxChars * 14 + 26), h: lines.length * 20 + 16 };
    }
    return { x: 0, y: 0, w: 10, h: 10 };
  }

  function distPointToSeg(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  function hitTestShapes(annotations, bx, by) {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.type === "note") continue; // Notes handled by DOM
      if (a.type === "rect" || a.type === "ellipse") {
        if (bx >= a.x - 6 && bx <= a.x + a.w + 6 && by >= a.y - 6 && by <= a.y + a.h + 6) return a;
      } else if (a.type === "arrow") {
        if (distPointToSeg(bx, by, a.x1, a.y1, a.x2, a.y2) <= 10) return a;
      } else if (a.type === "pen" && a.pts) {
        for (let k = 1; k < a.pts.length; k++) {
          if (distPointToSeg(bx, by, a.pts[k - 1][0], a.pts[k - 1][1], a.pts[k][0], a.pts[k][1]) <= 10) return a;
        }
      }
    }
    return null;
  }

  function moveAnnotation(ann, dx, dy) {
    if (ann.type === "rect" || ann.type === "ellipse" || ann.type === "note") {
      ann.x += dx;
      ann.y += dy;
    } else if (ann.type === "arrow") {
      ann.x1 += dx;
      ann.y1 += dy;
      ann.x2 += dx;
      ann.y2 += dy;
    } else if (ann.type === "pen" && ann.pts) {
      ann.pts = ann.pts.map(([px, py]) => [px + dx, py + dy]);
    }
  }

  function drawNoteCalloutOnCanvas(ctx, ann) {
    const lines = (ann.text || "").split("\n");
    const fontSpec = '600 13px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.save();
    ctx.font = fontSpec;
    let maxW = 64;
    lines.forEach((l) => {
      maxW = Math.max(maxW, Math.min(265, ctx.measureText(l || " ").width));
    });
    const cardW = maxW + 22;
    const cardH = lines.length * 19 + 14;
    const x = ann.x;
    const y = ann.y;

    ctx.shadowColor = "rgba(0,0,0,0.14)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, cardW, cardH);

    ctx.shadowColor = "transparent";
    ctx.fillStyle = ann.color || "#e03e3e";
    ctx.fillRect(x, y, 4, cardH);

    ctx.fillStyle = "#181817";
    ctx.textBaseline = "top";
    lines.forEach((ln, idx) => {
      ctx.fillText(ln, x + 11, y + 7 + idx * 19);
    });
    ctx.restore();
  }

  // Export High-Res Designer Review Board PNG (including pages + margin arrows/notes!)
  async function exportReviewBoardPngBlob(layout, getSlotPreviewCanvasFn, annotations) {
    let minX = PAD - 36;
    let minY = PAD - 36;
    let maxX = layout.boardW - PAD + 36;
    let maxY = layout.boardH - PAD + 36;

    annotations.forEach((a) => {
      const b = getAnnotationBounds(a);
      minX = Math.min(minX, b.x - 28);
      minY = Math.min(minY, b.y - 28);
      maxX = Math.max(maxX, b.x + b.w + 28);
      maxY = Math.max(maxY, b.y + b.h + 28);
    });

    const outW = Math.max(200, Math.round(maxX - minX));
    const outH = Math.max(200, Math.round(maxY - minY));
    const scale = Math.min(2.0, 4200 / Math.max(outW, outH));

    const cv = document.createElement("canvas");
    cv.width = Math.round(outW * scale);
    cv.height = Math.round(outH * scale);
    const ctx = cv.getContext("2d");
    ctx.scale(scale, scale);

    ctx.fillStyle = "#f2f2ee";
    ctx.fillRect(0, 0, outW, outH);
    ctx.translate(-minX, -minY);

    for (const pl of layout.placements) {
      ctx.save();
      ctx.shadowColor = "rgba(15,15,15,0.10)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.restore();

      const bmp = await getSlotPreviewCanvasFn(pl.slotIdx);
      ctx.drawImage(bmp, pl.x, pl.y, pl.w, pl.h);

      ctx.fillStyle = "#63625e";
      ctx.font = '600 11px -apple-system, "PingFang SC", sans-serif';
      ctx.fillText(`P${pl.slotIdx + 1}`, pl.x, pl.y - 8);
    }

    annotations.forEach((ann) => {
      if (ann.type === "note") drawNoteCalloutOnCanvas(ctx, ann);
      else drawSingleAnnotationOnCtx(ctx, ann, false);
    });

    return await new Promise((resolve) => cv.toBlob(resolve, "image/png"));
  }

  // Export Lossless Vector Pages + Vector Boxes/Arrows & Crisp CJK Callouts to PDF!
  async function exportAnnotatedPdfBytes(preparedSlotsDoc, layout, annotations) {
    const outDoc = await PDFLib.PDFDocument.create();
    const srcPages = preparedSlotsDoc.getPages();
    const embeddedPages = await outDoc.embedPages(srcPages);

    // Assign every annotation to its nearest page placement on the board!
    const byPage = layout.placements.map(() => []);
    annotations.forEach((ann) => {
      const b = getAnnotationBounds(ann);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      layout.placements.forEach((pl, idx) => {
        const dx = cx < pl.x ? pl.x - cx : cx > pl.x + pl.w ? cx - (pl.x + pl.w) : 0;
        const dy = cy < pl.y ? pl.y - cy : cy > pl.y + pl.h ? cy - (pl.y + pl.h) : 0;
        const d = Math.hypot(dx, dy);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      byPage[bestIdx].push(ann);
    });

    for (let i = 0; i < layout.placements.length; i++) {
      const pl = layout.placements[i];
      const pageAnns = byPage[i];

      // Expand PDF sheet bounds automatically if reviewer drew callout notes/arrows outside page margin!
      let minX = pl.x;
      let minY = pl.y;
      let maxX = pl.x + pl.w;
      let maxY = pl.y + pl.h;
      pageAnns.forEach((a) => {
        const b = getAnnotationBounds(a);
        minX = Math.min(minX, b.x - 18);
        minY = Math.min(minY, b.y - 18);
        maxX = Math.max(maxX, b.x + b.w + 18);
        maxY = Math.max(maxY, b.y + b.h + 18);
      });

      const sheetW = maxX - minX;
      const sheetH = maxY - minY;
      const outPage = outDoc.addPage([sheetW, sheetH]);

      if (sheetW > pl.w + 1 || sheetH > pl.h + 1) {
        outPage.drawRectangle({ x: 0, y: 0, width: sheetW, height: sheetH, color: PDFLib.rgb(0.95, 0.95, 0.935) });
        outPage.drawRectangle({
          x: pl.x - minX,
          y: sheetH - (pl.y - minY) - pl.h,
          width: pl.w,
          height: pl.h,
          color: PDFLib.rgb(1, 1, 1)
        });
      }

      outPage.drawPage(embeddedPages[i], {
        x: pl.x - minX,
        y: sheetH - (pl.y - minY) - pl.h,
        width: pl.w,
        height: pl.h
      });

      const toPdfX = (bx) => bx - minX;
      const toPdfY = (by) => sheetH - (by - minY);

      for (const ann of pageAnns) {
        const c = hexToRgb01(ann.color || "#e03e3e");
        const pdfColor = PDFLib.rgb(c.r, c.g, c.b);
        const sw = ann.strokeW || 3.5;

        if (ann.type === "rect") {
          outPage.drawRectangle({
            x: toPdfX(ann.x),
            y: toPdfY(ann.y + ann.h),
            width: ann.w,
            height: ann.h,
            color: pdfColor,
            opacity: 0.08,
            borderColor: pdfColor,
            borderWidth: sw,
            borderOpacity: 1
          });
        } else if (ann.type === "ellipse") {
          outPage.drawEllipse({
            x: toPdfX(ann.x + ann.w / 2),
            y: toPdfY(ann.y + ann.h / 2),
            xScale: ann.w / 2,
            yScale: ann.h / 2,
            color: pdfColor,
            opacity: 0.07,
            borderColor: pdfColor,
            borderWidth: sw,
            borderOpacity: 1
          });
        } else if (ann.type === "arrow") {
          const x1 = toPdfX(ann.x1), y1 = toPdfY(ann.y1);
          const x2 = toPdfX(ann.x2), y2 = toPdfY(ann.y2);
          const ang = Math.atan2(y2 - y1, x2 - x1);
          const headLen = Math.max(11, sw * 3.8);
          const headAng = Math.PI / 6.2;
          outPage.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2 - Math.cos(ang) * (headLen * 0.5), y: y2 - Math.sin(ang) * (headLen * 0.5) },
            thickness: sw,
            color: pdfColor
          });
          outPage.drawLine({
            start: { x: x2, y: y2 },
            end: { x: x2 - headLen * Math.cos(ang - headAng), y: y2 - headLen * Math.sin(ang - headAng) },
            thickness: sw,
            color: pdfColor
          });
          outPage.drawLine({
            start: { x: x2, y: y2 },
            end: { x: x2 - headLen * Math.cos(ang + headAng), y: y2 - headLen * Math.sin(ang + headAng) },
            thickness: sw,
            color: pdfColor
          });
        } else if (ann.type === "pen" && ann.pts && ann.pts.length > 1) {
          for (let k = 1; k < ann.pts.length; k++) {
            outPage.drawLine({
              start: { x: toPdfX(ann.pts[k - 1][0]), y: toPdfY(ann.pts[k - 1][1]) },
              end: { x: toPdfX(ann.pts[k][0]), y: toPdfY(ann.pts[k][1]) },
              thickness: sw,
              color: pdfColor
            });
          }
        } else if (ann.type === "note" && ann.text && ann.text.trim()) {
          // Render callout card at 4x print crispness so full CJK glyphs work offline!
          const b = getAnnotationBounds(ann);
          const sc = 4;
          const nCv = document.createElement("canvas");
          nCv.width = Math.ceil((b.w + 16) * sc);
          nCv.height = Math.ceil((b.h + 16) * sc);
          const nCtx = nCv.getContext("2d");
          nCtx.scale(sc, sc);
          drawNoteCalloutOnCanvas(nCtx, { ...ann, x: 4, y: 4 });
          const bin = atob(nCv.toDataURL("image/png").split(",")[1]);
          const pngBytes = new Uint8Array(bin.length);
          for (let m = 0; m < bin.length; m++) pngBytes[m] = bin.charCodeAt(m);
          const pngEmb = await outDoc.embedPng(pngBytes);
          const ptW = nCv.width / sc;
          const ptH = nCv.height / sc;
          outPage.drawImage(pngEmb, {
            x: toPdfX(ann.x - 4),
            y: toPdfY(ann.y - 4 + ptH),
            width: ptW,
            height: ptH
          });
        }
      }
    }

    return await outDoc.save();
  }

  return {
    computeBoardLayout,
    drawSingleAnnotationOnCtx,
    getAnnotationBounds,
    hitTestShapes,
    moveAnnotation,
    exportReviewBoardPngBlob,
    exportAnnotatedPdfBytes
  };
})();
