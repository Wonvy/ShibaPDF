// In-Place PDF Image Selection, Drag-and-Drop / File-Picker Replacement, Resize & Vector-Layer Export
window.ShibaImageEdit = (function () {
  "use strict";

  const imgCache = new Map(); // dataUrl -> HTMLImageElement
  const TRANSPARENT_1PX_PNG_B64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII=";

  function base64ToUint8(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith("image/")) return true;
    return /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name || "");
  }

  function ensureCachedImage(dataUrl) {
    if (!dataUrl) return Promise.resolve(null);
    if (imgCache.has(dataUrl)) {
      const existing = imgCache.get(dataUrl);
      if (existing.complete && existing.naturalWidth > 0) return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imgCache.set(dataUrl, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error("Invalid image file"));
      img.src = dataUrl;
    });
  }

  async function readImageFileMeta(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
    const img = await ensureCachedImage(dataUrl);
    const isPngOrAlpha = /\.(png|webp|svg|gif)$/i.test(file.name || "") || (file.type && file.type !== "image/jpeg");
    return {
      dataUrl,
      natW: img.naturalWidth || 400,
      natH: img.naturalHeight || 300,
      hasAlpha: Boolean(isPngOrAlpha)
    };
  }

  // Draw img onto ctx inside [dx, dy, dw, dh] honoring fitMode ('cover' | 'contain' | 'fill')
  function drawImageWithFit(ctx, img, dx, dy, dw, dh, fitMode) {
    if (!img || dw <= 0 || dh <= 0) return;
    const iw = Math.max(1, img.naturalWidth || img.width);
    const ih = Math.max(1, img.naturalHeight || img.height);

    if (fitMode === "fill") {
      ctx.drawImage(img, dx, dy, dw, dh);
      return;
    }

    if (fitMode === "contain") {
      const sc = Math.min(dw / iw, dh / ih);
      const rw = iw * sc;
      const rh = ih * sc;
      ctx.drawImage(img, dx + (dw - rw) / 2, dy + (dh - rh) / 2, rw, rh);
      return;
    }

    // Default: 'cover' (center-crops source image to fill exact target frame without distortion!)
    const sc = Math.max(dw / iw, dh / ih);
    const sw = dw / sc;
    const sh = dh / sc;
    const sx = Math.max(0, (iw - sw) / 2);
    const sy = Math.max(0, (ih - sh) / 2);
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  // Synchronous canvas painter for thumbnails, Split/Impose previews, & raster exports
  function paintSlotImageEditsSync(ctx, canvasW, canvasH, slot) {
    if (!slot.imgEdits || !slot.imgEdits.length) return;
    slot.imgEdits.forEach((imEd) => {
      if (imEd.origRect && (imEd.moved || imEd.deleted || !imEd.hasAlpha || imEd.fitMode === "contain")) {
        ctx.fillStyle = imEd.bgMaskColor || "#ffffff";
        ctx.fillRect(
          imEd.origRect.u * canvasW - 0.5,
          imEd.origRect.v * canvasH - 0.5,
          imEd.origRect.uw * canvasW + 1,
          imEd.origRect.vh * canvasH + 1
        );
      }
      if (imEd.deleted || !imEd.dataUrl) return;
      const img = imgCache.get(imEd.dataUrl);
      if (!img) return;
      drawImageWithFit(
        ctx,
        img,
        imEd.u * canvasW,
        imEd.v * canvasH,
        imEd.uw * canvasW,
        imEd.vh * canvasH,
        imEd.fitMode || "cover"
      );
    });
  }

  function renderFittedImageBytes(img, targetW, targetH, fitMode, flipX, flipY, usePng) {
    const cv = document.createElement("canvas");
    cv.width = Math.max(4, Math.round(targetW));
    cv.height = Math.max(4, Math.round(targetH));
    const ctx = cv.getContext("2d");

    if (!usePng) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cv.width, cv.height);
    }

    ctx.save();
    if (flipX || flipY) {
      ctx.translate(flipX ? cv.width : 0, flipY ? cv.height : 0);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    }
    drawImageWithFit(ctx, img, 0, 0, cv.width, cv.height, fitMode || "cover");
    ctx.restore();

    const mime = usePng ? "image/png" : "image/jpeg";
    const dataUrl = cv.toDataURL(mime, usePng ? undefined : 0.93);
    return base64ToUint8(dataUrl.split(",")[1]);
  }

  function swapPageXObjectImageRef(outDoc, pg, xObjKey, newRef) {
    if (!xObjKey) return false;
    const rawRes = pg.node.Resources();
    if (!rawRes || !(rawRes instanceof PDFLib.PDFDict)) return false;
    const xObjLookup = rawRes.lookup(PDFLib.PDFName.of("XObject"));
    if (!xObjLookup || !(xObjLookup instanceof PDFLib.PDFDict)) return false;
    if (!xObjLookup.get(PDFLib.PDFName.of(xObjKey))) return false;

    const clonedRes = rawRes.clone(outDoc.context);
    const clonedXObj = xObjLookup.clone(outDoc.context);
    clonedXObj.set(PDFLib.PDFName.of(xObjKey), newRef);
    clonedRes.set(PDFLib.PDFName.of("XObject"), outDoc.context.register(clonedXObj));
    pg.node.set(PDFLib.PDFName.of("Resources"), outDoc.context.register(clonedRes));
    return true;
  }

  // Apply all image replacements / deletions / additions onto a copied PDFPage in outDoc!
  async function applySlotImageEditsToPdfPage(outDoc, pg, slot, crop, totalRot, normVisualToPdfRectFn, hexToRgb01Fn) {
    if (!slot.imgEdits || !slot.imgEdits.length) return;

    let trans1pxRef = null;
    async function getTransparent1PxRef() {
      if (trans1pxRef) return trans1pxRef;
      const emb = await outDoc.embedPng(base64ToUint8(TRANSPARENT_1PX_PNG_B64));
      await emb.embed();
      trans1pxRef = emb.ref;
      return trans1pxRef;
    }

    for (const imEd of slot.imgEdits) {
      const img = imEd.dataUrl ? await ensureCachedImage(imEd.dataUrl) : null;

      // Case 1: In-place lossless XObject swap (preserves foreground text, badges & clipping paths!)
      const canSwapInPlace =
        Boolean(imEd.origId) &&
        !imEd.moved &&
        !imEd.deleted &&
        !imEd.inForm &&
        !imEd.sharedOnPage &&
        Boolean(img);

      if (canSwapInPlace) {
        const aspect = (imEd.uw * crop.width) / Math.max(1, imEd.vh * crop.height);
        const maxSide = Math.min(2800, Math.max(600, Math.max(img.naturalWidth, img.naturalHeight)));
        const targetW = aspect >= 1 ? maxSide : Math.round(maxSide * aspect);
        const targetH = aspect >= 1 ? Math.round(maxSide / aspect) : maxSide;
        const needPng = Boolean(imEd.hasAlpha) || imEd.fitMode === "contain";
        const imgBytes = renderFittedImageBytes(img, targetW, targetH, imEd.fitMode, imEd.flipX, imEd.flipY, needPng);
        const emb = needPng ? await outDoc.embedPng(imgBytes) : await outDoc.embedJpg(imgBytes);
        await emb.embed();
        const swapped = swapPageXObjectImageRef(outDoc, pg, imEd.xObjKey, emb.ref);
        if (swapped) continue;
      }

      // Case 2: Original image was deleted, moved/resized, inside a Form, or shared multiple times on same page
      if (imEd.origId && imEd.origRect) {
        let erasedCleanly = false;
        if (!imEd.inForm && !imEd.sharedOnPage && imEd.xObjKey) {
          const tRef = await getTransparent1PxRef();
          erasedCleanly = swapPageXObjectImageRef(outDoc, pg, imEd.xObjKey, tRef);
        }
        if (!erasedCleanly) {
          const r = normVisualToPdfRectFn(crop, totalRot, imEd.origRect);
          const bg = hexToRgb01Fn(imEd.bgMaskColor || "#ffffff");
          const isWhite = bg.r > 0.96 && bg.g > 0.96 && bg.b > 0.96;
          pg.drawRectangle({
            x: r.x - 0.5,
            y: r.y - 0.5,
            width: r.w + 1,
            height: r.h + 1,
            color: isWhite ? PDFLib.cmyk(0, 0, 0, 0) : PDFLib.rgb(bg.r, bg.g, bg.b)
          });
        }
      }

      // Draw replacement or newly added image at (u, v, uw, vh)
      if (!imEd.deleted && img) {
        const destRect = normVisualToPdfRectFn(crop, totalRot, {
          u: imEd.u,
          v: imEd.v,
          uw: imEd.uw,
          vh: imEd.vh
        });
        const aspect = destRect.w / Math.max(1, destRect.h);
        const maxSide = Math.min(2800, Math.max(600, Math.max(img.naturalWidth, img.naturalHeight)));
        const targetW = aspect >= 1 ? maxSide : Math.round(maxSide * aspect);
        const targetH = aspect >= 1 ? Math.round(maxSide / aspect) : maxSide;
        const needPng = Boolean(imEd.hasAlpha) || imEd.fitMode === "contain";
        const imgBytes = renderFittedImageBytes(img, targetW, targetH, imEd.fitMode, false, false, needPng);
        const emb = needPng ? await outDoc.embedPng(imgBytes) : await outDoc.embedJpg(imgBytes);
        pg.drawImage(emb, {
          x: destRect.x,
          y: destRect.y,
          width: destRect.w,
          height: destRect.h
        });
      }
    }
  }

  return {
    isImageFile,
    ensureCachedImage,
    readImageFileMeta,
    drawImageWithFit,
    paintSlotImageEditsSync,
    applySlotImageEditsToPdfPage
  };
})();
