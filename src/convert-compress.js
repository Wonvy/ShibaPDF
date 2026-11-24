// Export Images (PNG/JPG + Multi-Page ZIP), Image-Only Anti-Copy PDF, & Smart File-Size Compressor
window.ShibaConvert = (function () {
  "use strict";

  function canvasToUint8Array(canvas, mimeType, quality) {
    const dataUrl = canvas.toDataURL(mimeType, quality);
    const bin = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function renderSlotAtDpi(sourceDocsMap, slot, dpi) {
    const docEntry = sourceDocsMap.get(slot.docId);
    const page = await docEntry.pdfJsDoc.getPage(slot.origIdx + 1);
    const origInfo = docEntry.origPages[slot.origIdx];
    const totalRot = (origInfo.rot + slot.extraRot) % 360;
    const scale = dpi / 72.0;
    const vp = page.getViewport({ scale, rotation: totalRot });

    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(vp.width));
    cv.height = Math.max(1, Math.round(vp.height));
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    // Also burn any user text edits onto the rendered canvas with exact baseline & font family!
    if (slot.edits && slot.edits.length) {
      const getStack = (window.ShibaPrepress && window.ShibaPrepress.getCssFontStack)
        ? window.ShibaPrepress.getCssFontStack
        : () => '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      slot.edits.forEach((ed) => {
        if (ed.maskBg && ed.origRect) {
          ctx.fillStyle = ed.bgColor || "#ffffff";
          ctx.fillRect(
            ed.origRect.u * cv.width - 1,
            ed.origRect.v * cv.height - 1,
            ed.origRect.uw * cv.width + 2,
            ed.origRect.vh * cv.height + 2
          );
        }
        if (ed.text && ed.text.trim()) {
          const fontPx = Math.max(7, ed.fontPt) * scale;
          const lineH = fontPx * 1.14;
          const ascRatio = ed.ascent || 0.84;
          const fStyle = ed.italic ? "italic " : "";
          const fWeight = ed.bold ? "700" : "400";
          ctx.font = `${fStyle}${fWeight} ${fontPx}px ${getStack(ed.fontKey)}`;
          const lines = ed.text.split("\n");
          if (!ed.origRect && ed.maskBg) {
            let mw = 10;
            lines.forEach((l) => { mw = Math.max(mw, ctx.measureText(l).width); });
            ctx.fillStyle = ed.bgColor || "#ffffff";
            ctx.fillRect(ed.u * cv.width - 2, ed.v * cv.height - 1, mw + 4, lines.length * lineH + 2);
          }
          ctx.fillStyle = ed.color || "#181817";
          ctx.textBaseline = "alphabetic";
          lines.forEach((ln, idx) => {
            ctx.fillText(ln, ed.u * cv.width, ed.v * cv.height + fontPx * ascRatio + idx * lineH);
          });
        }
      });
    }

    const baseVp = page.getViewport({ scale: 1, rotation: totalRot });
    return { canvas: cv, wPt: baseVp.width, hPt: baseVp.height };
  }

  // 1. Export Selected or All Slots as PNG / JPG (Single file or bundled .zip)
  async function exportSlotsAsImages(sourceDocsMap, slots, baseStem, format, dpi, onProgress) {
    const isJpg = format === "jpg";
    const mime = isJpg ? "image/jpeg" : "image/png";
    const ext = isJpg ? "jpg" : "png";
    const quality = isJpg ? 0.92 : undefined;

    if (slots.length === 1) {
      if (onProgress) onProgress(1, 1);
      const { canvas } = await renderSlotAtDpi(sourceDocsMap, slots[0], dpi);
      const bytes = canvasToUint8Array(canvas, mime, quality);
      return {
        blob: new Blob([bytes], { type: mime }),
        filename: `${baseStem}_P1.${ext}`
      };
    }

    const zipEntries = [];
    const padLen = String(slots.length).length;
    for (let i = 0; i < slots.length; i++) {
      if (onProgress) onProgress(i + 1, slots.length);
      const { canvas } = await renderSlotAtDpi(sourceDocsMap, slots[i], dpi);
      const bytes = canvasToUint8Array(canvas, mime, quality);
      const numStr = String(i + 1).padStart(Math.max(2, padLen), "0");
      zipEntries.push({
        name: `${baseStem}_P${numStr}.${ext}`,
        data: bytes
      });
    }

    return {
      blob: window.ShibaZip.createZipBlob(zipEntries),
      filename: `${baseStem}_${dpi}dpi_${ext}.zip`
    };
  }

  // 2. Convert Slots into Image-Only PDF (Anti-Copy / Font-Locked / Or Extreme Raster Compression)
  async function buildRasterizedPdfBytes(sourceDocsMap, slots, dpi, jpegQuality, onProgress) {
    const outDoc = await PDFLib.PDFDocument.create();
    for (let i = 0; i < slots.length; i++) {
      if (onProgress) onProgress(i + 1, slots.length);
      const { canvas, wPt, hPt } = await renderSlotAtDpi(sourceDocsMap, slots[i], dpi);
      const jpgBytes = canvasToUint8Array(canvas, "image/jpeg", jpegQuality);
      const jpgImg = await outDoc.embedJpg(jpgBytes);
      const pg = outDoc.addPage([wPt, hPt]);
      pg.drawImage(jpgImg, { x: 0, y: 0, width: wPt, height: hPt });
    }
    return await outDoc.save({ useObjectStreams: true });
  }

  // 3. Vector-Preserving Embedded Image Downsampler + Smart Fallback Compressor
  async function compressPreparedPdfBytes(preparedPdfBytes, sourceDocsMap, slots, preset, preserveVectors, onProgress) {
    // preset: 'high' (220dpi, q=0.82) | 'balanced' (150dpi, q=0.72) | 'max' (100dpi, q=0.58)
    const cfg = preset === "high"
      ? { dpi: 220, quality: 0.82, maxPx: 2600 }
      : preset === "max"
        ? { dpi: 105, quality: 0.56, maxPx: 1280 }
        : { dpi: 150, quality: 0.72, maxPx: 1850 };

    if (!preserveVectors) {
      return await buildRasterizedPdfBytes(sourceDocsMap, slots, cfg.dpi, cfg.quality, onProgress);
    }

    // Vector-preserving pass: downsample embedded DCTDecode (JPEG) & uncompressed RGB Image XObjects in-place!
    const pdfDoc = await PDFLib.PDFDocument.load(preparedPdfBytes, { ignoreEncryption: true });
    const visitedRefs = new Set();
    let shrunkAnyStream = false;
    const pages = pdfDoc.getPages();

    for (let p = 0; p < pages.length; p++) {
      if (onProgress) onProgress(p + 1, pages.length);
      const res = pages[p].node.lookup(PDFLib.PDFName.of("Resources"));
      const xObjDict = res && res instanceof PDFLib.PDFDict ? res.lookup(PDFLib.PDFName.of("XObject")) : null;
      if (!xObjDict || !(xObjDict instanceof PDFLib.PDFDict)) continue;

      for (const [, xRef] of xObjDict.entries()) {
        if (!(xRef instanceof PDFLib.PDFRef)) continue;
        const rKey = xRef.toString();
        if (visitedRefs.has(rKey)) continue;
        visitedRefs.add(rKey);

        const xObj = pdfDoc.context.lookup(xRef);
        if (!xObj || !(xObj instanceof PDFLib.PDFRawStream)) continue;
        const sub = (xObj.dict.get(PDFLib.PDFName.of("Subtype")) || "").toString();
        if (sub !== "/Image") continue;

        // Skip images that carry transparency SMask/Mask so alpha edges stay crisp
        if (xObj.dict.get(PDFLib.PDFName.of("SMask")) || xObj.dict.get(PDFLib.PDFName.of("Mask"))) continue;

        const filterStr = (xObj.dict.get(PDFLib.PDFName.of("Filter")) || "").toString();
        const wObj = xObj.dict.lookup(PDFLib.PDFName.of("Width"));
        const hObj = xObj.dict.lookup(PDFLib.PDFName.of("Height"));
        const origW = wObj && typeof wObj.asNumber === "function" ? wObj.asNumber() : 0;
        const origH = hObj && typeof hObj.asNumber === "function" ? hObj.asNumber() : 0;
        if (origW < 120 || origH < 120) continue;

        if (filterStr === "/DCTDecode") {
          try {
            const blob = new Blob([xObj.contents], { type: "image/jpeg" });
            const bmp = await createImageBitmap(blob);
            const ratio = Math.min(1.0, cfg.maxPx / Math.max(bmp.width, bmp.height));
            const targetW = Math.max(64, Math.round(bmp.width * ratio));
            const targetH = Math.max(64, Math.round(bmp.height * ratio));

            const cv = document.createElement("canvas");
            cv.width = targetW;
            cv.height = targetH;
            cv.getContext("2d").drawImage(bmp, 0, 0, targetW, targetH);
            bmp.close();

            const newJpg = canvasToUint8Array(cv, "image/jpeg", cfg.quality);
            if (newJpg.length < xObj.contents.length * 0.92) {
              const newDict = xObj.dict.clone(pdfDoc.context);
              newDict.set(PDFLib.PDFName.of("Width"), PDFLib.PDFNumber.of(targetW));
              newDict.set(PDFLib.PDFName.of("Height"), PDFLib.PDFNumber.of(targetH));
              newDict.set(PDFLib.PDFName.of("ColorSpace"), PDFLib.PDFName.of("DeviceRGB"));
              newDict.set(PDFLib.PDFName.of("BitsPerComponent"), PDFLib.PDFNumber.of(8));
              newDict.set(PDFLib.PDFName.of("Filter"), PDFLib.PDFName.of("DCTDecode"));
              newDict.set(PDFLib.PDFName.of("Length"), PDFLib.PDFNumber.of(newJpg.length));
              newDict.delete(PDFLib.PDFName.of("DecodeParms"));
              pdfDoc.context.assign(xRef, PDFLib.PDFRawStream.of(newDict, newJpg));
              shrunkAnyStream = true;
            }
          } catch (_) {}
        } else if (filterStr === "/FlateDecode") {
          // Compress uncompressed FlateDecode RGB bitmaps (very common in PowerPoint & screenshots!)
          const csStr = (xObj.dict.lookup(PDFLib.PDFName.of("ColorSpace")) || "").toString();
          const bpcObj = xObj.dict.lookup(PDFLib.PDFName.of("BitsPerComponent"));
          const bpc = bpcObj && typeof bpcObj.asNumber === "function" ? bpcObj.asNumber() : 8;
          if ((csStr === "/DeviceRGB" || csStr.includes("/N 3")) && bpc === 8 && !xObj.dict.get(PDFLib.PDFName.of("DecodeParms"))) {
            try {
              const rawRgb = PDFLib.decodePDFRawStream(xObj).decode();
              if (rawRgb.length === origW * origH * 3) {
                const rgba = new Uint8ClampedArray(origW * origH * 4);
                for (let px = 0, j = 0; px < origW * origH; px++, j += 3) {
                  const o = px * 4;
                  rgba[o] = rawRgb[j];
                  rgba[o + 1] = rawRgb[j + 1];
                  rgba[o + 2] = rawRgb[j + 2];
                  rgba[o + 3] = 255;
                }
                const srcCv = document.createElement("canvas");
                srcCv.width = origW;
                srcCv.height = origH;
                srcCv.getContext("2d").putImageData(new ImageData(rgba, origW, origH), 0, 0);

                const ratio = Math.min(1.0, cfg.maxPx / Math.max(origW, origH));
                const targetW = Math.max(64, Math.round(origW * ratio));
                const targetH = Math.max(64, Math.round(origH * ratio));
                const dstCv = document.createElement("canvas");
                dstCv.width = targetW;
                dstCv.height = targetH;
                dstCv.getContext("2d").drawImage(srcCv, 0, 0, targetW, targetH);

                const newJpg = canvasToUint8Array(dstCv, "image/jpeg", cfg.quality);
                if (newJpg.length < xObj.contents.length * 0.90) {
                  const newDict = xObj.dict.clone(pdfDoc.context);
                  newDict.set(PDFLib.PDFName.of("Width"), PDFLib.PDFNumber.of(targetW));
                  newDict.set(PDFLib.PDFName.of("Height"), PDFLib.PDFNumber.of(targetH));
                  newDict.set(PDFLib.PDFName.of("ColorSpace"), PDFLib.PDFName.of("DeviceRGB"));
                  newDict.set(PDFLib.PDFName.of("BitsPerComponent"), PDFLib.PDFNumber.of(8));
                  newDict.set(PDFLib.PDFName.of("Filter"), PDFLib.PDFName.of("DCTDecode"));
                  newDict.set(PDFLib.PDFName.of("Length"), PDFLib.PDFNumber.of(newJpg.length));
                  pdfDoc.context.assign(xRef, PDFLib.PDFRawStream.of(newDict, newJpg));
                  shrunkAnyStream = true;
                }
              }
            } catch (_) {}
          }
        }
      }
    }

    const vecSaved = await pdfDoc.save({ useObjectStreams: true });
    if (shrunkAnyStream || vecSaved.length < preparedPdfBytes.length * 0.9) {
      return vecSaved;
    }
    // If vector pass couldn't shrink further (e.g. exotic Predictor-encoded streams) and preset is max, check if rasterized is smaller
    if (preset === "max") {
      const rast = await buildRasterizedPdfBytes(sourceDocsMap, slots, cfg.dpi, cfg.quality, onProgress);
      return rast.length < vecSaved.length ? rast : vecSaved;
    }
    return vecSaved;
  }

  return {
    renderSlotAtDpi,
    exportSlotsAsImages,
    buildRasterizedPdfBytes,
    compressPreparedPdfBytes
  };
})();
