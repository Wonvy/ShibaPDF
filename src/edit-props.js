// Rich Typography Engine (Left/Center/Right/Justify, Wrapping, Spacing) & Multi-Element Align/Distribute
window.ShibaEditProps = (function () {
  "use strict";

  function measureLineWithSpacing(ctx, str, letterSpacingPx) {
    const chars = Array.from(str || "");
    if (!chars.length) return 0;
    let w = 0;
    for (let i = 0; i < chars.length; i++) {
      w += ctx.measureText(chars[i]).width;
      if (i < chars.length - 1) w += letterSpacingPx;
    }
    return Math.max(0, w);
  }

  // Wrap paragraphs into visual lines when an explicit boxWidthPx is set
  function layoutParagraphLines(ctx, text, boxWidthPx, letterSpacingPx) {
    const rawParas = String(text || "").split("\n");
    const visualLines = [];

    rawParas.forEach((para) => {
      if (!para.length) {
        visualLines.push({ text: "", width: 0, isParaEnd: true });
        return;
      }
      if (!boxWidthPx || boxWidthPx <= 4) {
        visualLines.push({
          text: para,
          width: measureLineWithSpacing(ctx, para, letterSpacingPx),
          isParaEnd: true
        });
        return;
      }

      // Tokenize so Western words stay together when possible while CJK wraps cleanly per glyph
      const tokens = para.match(/([A-Za-z0-9_.,;:'"!?-]+|\s+|.)/g) || Array.from(para);
      let curStr = "";
      for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
        const tok = tokens[tIdx];
        const cand = curStr + tok;
        const candW = measureLineWithSpacing(ctx, cand, letterSpacingPx);
        if (curStr.length > 0 && candW > boxWidthPx + 0.5) {
          const trimmed = curStr.replace(/\s+$/, "");
          visualLines.push({
            text: trimmed,
            width: measureLineWithSpacing(ctx, trimmed, letterSpacingPx),
            isParaEnd: false
          });
          curStr = tok.replace(/^\s+/, "");
          // If a single long token exceeds boxWidthPx, split character by character
          if (measureLineWithSpacing(ctx, curStr, letterSpacingPx) > boxWidthPx + 0.5) {
            const subChars = Array.from(curStr);
            let subAcc = "";
            for (let k = 0; k < subChars.length; k++) {
              const nextSub = subAcc + subChars[k];
              if (subAcc.length > 0 && measureLineWithSpacing(ctx, nextSub, letterSpacingPx) > boxWidthPx + 0.5) {
                visualLines.push({
                  text: subAcc,
                  width: measureLineWithSpacing(ctx, subAcc, letterSpacingPx),
                  isParaEnd: false
                });
                subAcc = subChars[k];
              } else {
                subAcc = nextSub;
              }
            }
            curStr = subAcc;
          }
        } else {
          curStr = cand;
        }
      }
      const lastTrim = curStr.replace(/\s+$/, "");
      visualLines.push({
        text: lastTrim,
        width: measureLineWithSpacing(ctx, lastTrim, letterSpacingPx),
        isParaEnd: true
      });
    });

    return visualLines;
  }

  function drawLineChars(ctx, str, startX, baselineY, baseSpacingPx, extraPerGapPx) {
    const chars = Array.from(str || "");
    let curX = startX;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      ctx.fillText(ch, curX, baselineY);
      curX += ctx.measureText(ch).width + baseSpacingPx + (i < chars.length - 1 ? extraPerGapPx : 0);
    }
  }

  function drawFormattedTextBlock(ctx, ed, x0, y0, scale, pageWPt, getCssFontStackFn) {
    if (!ed.text || !ed.text.trim()) return;
    const fontPx = Math.max(6, ed.fontPt || 14) * scale;
    const lineRatio = typeof ed.lineHeight === "number" && ed.lineHeight >= 0.85 ? ed.lineHeight : 1.16;
    const lineH = fontPx * lineRatio;
    const asc = ed.ascent || 0.84;
    const letterSpPx = (ed.letterSpacing || 0) * scale;
    const align = ed.textAlign || "left";
    const opacity = typeof ed.opacity === "number" ? Math.max(0.08, Math.min(1, ed.opacity)) : 1;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `${ed.italic ? "italic " : ""}${ed.bold ? "700" : "400"} ${fontPx}px ${getCssFontStackFn(ed.fontKey)}`;
    ctx.textBaseline = "alphabetic";

    const explicitBoxW =
      ed.boxWidthU && ed.boxWidthU > 0.015 ? ed.boxWidthU * pageWPt * scale : 0;
    const vLines = layoutParagraphLines(ctx, ed.text, explicitBoxW, letterSpPx);
    let maxLineW = explicitBoxW;
    vLines.forEach((ln) => {
      if (ln.width > maxLineW) maxLineW = ln.width;
    });

    if (!ed.origRect && ed.maskBg) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = ed.bgColor || "#ffffff";
      ctx.fillRect(x0 - 2 * scale, y0 - 1 * scale, maxLineW + 4 * scale, vLines.length * lineH + 2 * scale);
      ctx.restore();
    }

    ctx.fillStyle = ed.color || "#181817";
    ctx.strokeStyle = ed.color || "#181817";
    const strokeThick = Math.max(1, fontPx * 0.065);

    const singleLineJustify = align === "justify" && vLines.length === 1 && maxLineW > 8;

    vLines.forEach((ln, idx) => {
      const baseY = y0 + fontPx * asc + idx * lineH;
      const chars = Array.from(ln.text);
      let drawX = x0;
      let extraGap = 0;
      let drawnSpanW = ln.width;

      if (align === "center") {
        drawX = x0 + Math.max(0, (maxLineW - ln.width) / 2);
      } else if (align === "right") {
        drawX = x0 + Math.max(0, maxLineW - ln.width);
      } else if (align === "justify" && chars.length > 1 && (!ln.isParaEnd || singleLineJustify)) {
        const slack = maxLineW - ln.width;
        if (slack > 0.5) {
          extraGap = slack / (chars.length - 1);
          drawnSpanW = maxLineW;
        }
      }

      if (Math.abs(letterSpPx) < 0.01 && extraGap === 0) {
        ctx.fillText(ln.text, drawX, baseY);
      } else {
        drawLineChars(ctx, ln.text, drawX, baseY, letterSpPx, extraGap);
      }

      if (ed.underline && ln.text.length > 0) {
        ctx.lineWidth = strokeThick;
        const uy = baseY + fontPx * 0.11;
        ctx.beginPath();
        ctx.moveTo(drawX, uy);
        ctx.lineTo(drawX + drawnSpanW, uy);
        ctx.stroke();
      }
      if (ed.strike && ln.text.length > 0) {
        ctx.lineWidth = strokeThick;
        const sy = baseY - fontPx * 0.28;
        ctx.beginPath();
        ctx.moveTo(drawX, sy);
        ctx.lineTo(drawX + drawnSpanW, sy);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  // Render high-DPI (~430 DPI) transparent PNG stamp for lossless PDF vector/stamp assembly
  function renderRichTextStampPng(ed, pageWPt, getCssFontStackFn) {
    const scale = 6;
    const fontPx = Math.max(6, ed.fontPt || 14) * scale;
    const lineRatio = typeof ed.lineHeight === "number" && ed.lineHeight >= 0.85 ? ed.lineHeight : 1.16;
    const lineH = fontPx * lineRatio;
    const letterSpPx = (ed.letterSpacing || 0) * scale;
    const padPx = Math.ceil(fontPx * 0.16);
    const fontSpec = `${ed.italic ? "italic " : ""}${ed.bold ? "700" : "400"} ${fontPx}px ${getCssFontStackFn(ed.fontKey)}`;

    const mCv = document.createElement("canvas");
    const mCtx = mCv.getContext("2d");
    mCtx.font = fontSpec;

    const explicitBoxW =
      ed.boxWidthU && ed.boxWidthU > 0.015 ? ed.boxWidthU * pageWPt * scale : 0;
    const vLines = layoutParagraphLines(mCtx, ed.text || "", explicitBoxW, letterSpPx);
    let maxW = Math.max(8, explicitBoxW);
    vLines.forEach((ln) => {
      if (ln.width > maxW) maxW = ln.width;
    });

    const cv = document.createElement("canvas");
    cv.width = Math.max(4, Math.ceil(maxW + padPx * 2));
    cv.height = Math.max(4, Math.ceil(Math.max(1, vLines.length) * lineH + padPx * 2));
    const ctx = cv.getContext("2d");

    drawFormattedTextBlock(ctx, ed, padPx, padPx, scale, pageWPt, getCssFontStackFn);

    const dataUrl = cv.toDataURL("image/png");
    const bin = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return {
      bytes,
      ptW: cv.width / scale,
      ptH: cv.height / scale,
      padPt: padPx / scale
    };
  }

  // Align & Distribute 1 or N selected items ({ ref, kind, u, v, uw, vh })
  // When items.length === 1 -> aligns relative to Page [0..1]
  // When items.length >= 2 -> aligns relative to Selection Bounding Box & distributes evenly
  function alignAndDistributeItems(boxItems, action) {
    if (!boxItems || !boxItems.length) return false;

    if (boxItems.length === 1) {
      const it = boxItems[0];
      if (action === "left") it.u = 0;
      else if (action === "center-h") it.u = Math.max(0, (1 - it.uw) / 2);
      else if (action === "right") it.u = Math.max(0, 1 - it.uw);
      else if (action === "top") it.v = 0;
      else if (action === "center-v") it.v = Math.max(0, (1 - it.vh) / 2);
      else if (action === "bottom") it.v = Math.max(0, 1 - it.vh);
      else return false;
      applyBackToRef(it);
      return true;
    }

    const minU = Math.min(...boxItems.map((b) => b.u));
    const maxR = Math.max(...boxItems.map((b) => b.u + b.uw));
    const midU = (minU + maxR) / 2;
    const minV = Math.min(...boxItems.map((b) => b.v));
    const maxB = Math.max(...boxItems.map((b) => b.v + b.vh));
    const midV = (minV + maxB) / 2;

    if (action === "left") {
      boxItems.forEach((b) => { b.u = minU; applyBackToRef(b); });
      return true;
    }
    if (action === "center-h") {
      boxItems.forEach((b) => { b.u = midU - b.uw / 2; applyBackToRef(b); });
      return true;
    }
    if (action === "right") {
      boxItems.forEach((b) => { b.u = maxR - b.uw; applyBackToRef(b); });
      return true;
    }
    if (action === "top") {
      boxItems.forEach((b) => { b.v = minV; applyBackToRef(b); });
      return true;
    }
    if (action === "center-v") {
      boxItems.forEach((b) => { b.v = midV - b.vh / 2; applyBackToRef(b); });
      return true;
    }
    if (action === "bottom") {
      boxItems.forEach((b) => { b.v = maxB - b.vh; applyBackToRef(b); });
      return true;
    }
    if (action === "distribute-h") {
      if (boxItems.length < 3) return false;
      const sorted = boxItems.slice().sort((a, b) => a.u + a.uw / 2 - (b.u + b.uw / 2));
      const totalW = sorted.reduce((acc, b) => acc + b.uw, 0);
      const spanW = maxR - minU;
      if (spanW > totalW) {
        const gap = (spanW - totalW) / (sorted.length - 1);
        let cur = minU;
        sorted.forEach((b) => {
          b.u = cur;
          cur += b.uw + gap;
          applyBackToRef(b);
        });
      } else {
        const firstC = sorted[0].u + sorted[0].uw / 2;
        const lastC = sorted[sorted.length - 1].u + sorted[sorted.length - 1].uw / 2;
        const step = (lastC - firstC) / (sorted.length - 1);
        sorted.forEach((b, i) => {
          b.u = firstC + step * i - b.uw / 2;
          applyBackToRef(b);
        });
      }
      return true;
    }
    if (action === "distribute-v") {
      if (boxItems.length < 3) return false;
      const sorted = boxItems.slice().sort((a, b) => a.v + a.vh / 2 - (b.v + b.vh / 2));
      const totalH = sorted.reduce((acc, b) => acc + b.vh, 0);
      const spanH = maxB - minV;
      if (spanH > totalH) {
        const gap = (spanH - totalH) / (sorted.length - 1);
        let cur = minV;
        sorted.forEach((b) => {
          b.v = cur;
          cur += b.vh + gap;
          applyBackToRef(b);
        });
      } else {
        const firstC = sorted[0].v + sorted[0].vh / 2;
        const lastC = sorted[sorted.length - 1].v + sorted[sorted.length - 1].vh / 2;
        const step = (lastC - firstC) / (sorted.length - 1);
        sorted.forEach((b, i) => {
          b.v = firstC + step * i - b.vh / 2;
          applyBackToRef(b);
        });
      }
      return true;
    }
    return false;
  }

  function applyBackToRef(b) {
    b.ref.u = Math.min(0.98, Math.max(-0.1, Math.round(b.u * 10000) / 10000));
    b.ref.v = Math.min(0.98, Math.max(-0.1, Math.round(b.v * 10000) / 10000));
    if (b.kind === "img") b.ref.moved = true;
  }

  return {
    measureLineWithSpacing,
    layoutParagraphLines,
    drawFormattedTextBlock,
    renderRichTextStampPng,
    alignAndDistributeItems
  };
})();
