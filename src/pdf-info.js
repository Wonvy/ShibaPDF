// PDF Document Properties & Deep Font Embedding Inspector Modal Controller
window.ShibaPdfInfo = (function () {
  "use strict";

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 KB";
    const mb = bytes / (1024 * 1024);
    const numFmt = bytes.toLocaleString();
    if (mb >= 1) return `${mb.toFixed(2)} MB (${numFmt} B)`;
    return `${(bytes / 1024).toFixed(1)} KB (${numFmt} B)`;
  }

  function buildInspectData(targetDocId, sourceDocs, docOrder, pages, t) {
    const useAll = targetDocId === "__all__" && docOrder.length > 1;
    const targetIds = useAll ? docOrder : [docOrder.includes(targetDocId) ? targetDocId : docOrder[0]];
    const validEntries = targetIds.map((id) => sourceDocs.get(id)).filter(Boolean);
    if (!validEntries.length) return null;

    // Map (docId, origPageOneBased) -> workspace slotIndex (one-based)
    const slotPageLookup = new Map();
    pages.forEach((s, idx) => {
      const k = `${s.docId}_${s.origIdx + 1}`;
      if (!slotPageLookup.has(k)) slotPageLookup.set(k, []);
      slotPageLookup.get(k).push(idx + 1);
    });

    const d0 = validEntries[0];
    const pf0 = d0.preflight || {};
    const m0 = pf0.metaInfo || {};

    let totalSize = 0;
    let totalOrigPages = 0;
    let totalSingleEquiv = 0;
    let totalImages = 0;
    let rgbImages = 0;
    let anyEncrypted = false;
    let hasTrim = false;
    let hasBleed = false;
    const allDpis = [];
    const mergedFonts = new Map();

    validEntries.forEach((doc) => {
      totalSize += doc.size || (doc.rawBytes ? doc.rawBytes.byteLength : 0);
      totalOrigPages += doc.origPages ? doc.origPages.length : 0;
      const pf = doc.preflight || {};
      totalSingleEquiv += pf.singleEquivPages || 0;
      totalImages += pf.totalImages || 0;
      rgbImages += pf.rgbImageCount || 0;
      if (pf.isEncrypted) anyEncrypted = true;
      if (pf.hasTrimBox) hasTrim = true;
      if (pf.hasBleedBox) hasBleed = true;
      (pf.placedDpis || []).forEach((x) => allDpis.push(x.dpi));

      const fList = pf.fontDetails || (pf.fonts || []).map(([nm, emb]) => ({
        name: nm,
        embedded: emb,
        isSubset: false,
        fontType: "Font",
        encoding: "—",
        streamFormat: "",
        pages: []
      }));

      fList.forEach((fd) => {
        const key = `${fd.name}__${fd.fontType}__${fd.embedded ? "1" : "0"}`;
        const mappedWorkspacePages = [];
        (fd.pages || []).forEach((origP) => {
          const hits = slotPageLookup.get(`${doc.id}_${origP}`);
          if (hits && hits.length) mappedWorkspacePages.push(...hits);
          else if (!useAll) mappedWorkspacePages.push(origP);
        });

        if (!mergedFonts.has(key)) {
          mergedFonts.set(key, {
            name: fd.name,
            embedded: fd.embedded,
            isSubset: Boolean(fd.isSubset),
            fontType: fd.fontType || "Font",
            encoding: fd.encoding || "—",
            streamFormat: fd.streamFormat || "",
            pages: new Set(mappedWorkspacePages)
          });
        } else {
          const cur = mergedFonts.get(key);
          if (fd.isSubset) cur.isSubset = true;
          mappedWorkspacePages.forEach((p) => cur.pages.add(p));
        }
      });
    });

    const fonts = Array.from(mergedFonts.values())
      .map((f) => ({
        ...f,
        pages: Array.from(f.pages).sort((a, b) => a - b)
      }))
      .sort((a, b) => {
        if (a.embedded !== b.embedded) return a.embedded ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

    const unembeddedCount = fonts.filter((f) => !f.embedded).length;

    // Page dimensions & boxes summary
    const p0 = d0.origPages && d0.origPages[0];
    const wMm = p0 ? p0.wMm.toFixed(1) : "0";
    const hMm = p0 ? p0.hMm.toFixed(1) : "0";
    const wPt = p0 ? Math.round(p0.wPt) : 0;
    const hPt = p0 ? Math.round(p0.hPt) : 0;
    const uniform = validEntries.every((d) => d.preflight && d.preflight.uniformSize) &&
      validEntries.every((d) => !d.origPages[0] || (Math.abs(d.origPages[0].wMm - p0.wMm) < 1 && Math.abs(d.origPages[0].hMm - p0.hMm) < 1));

    const sizeStr = uniform
      ? `${wMm} × ${hMm} mm (${wPt} × ${hPt} pt)`
      : t("infoSizeMixed", { w: wMm, h: hMm });

    const boxList = ["MediaBox", "CropBox"];
    if (hasBleed) boxList.push("BleedBox");
    if (hasTrim) boxList.push("TrimBox");
    if (pf0.matchedBleed > 0) boxList.push(`${pf0.matchedBleed}mm Bleed`);

    let imgStr = `${totalImages}`;
    if (allDpis.length > 0) {
      const minD = Math.min(...allDpis);
      const maxD = Math.max(...allDpis);
      imgStr += ` (${minD === maxD ? `${minD} DPI` : `${minD}–${maxD} DPI`}${rgbImages > 0 ? ` · ${rgbImages} RGB` : " · CMYK"})`;
    }

    return {
      fileName: useAll ? t("infoAllDocsOpt", { n: validEntries.length }) : d0.name,
      fileSizeStr: formatBytes(totalSize),
      pdfVerStr: `PDF ${m0.pdfVersion || "1.4+"}${m0.isLinearized ? t("infoLinearizedYes") : ""}`,
      title: useAll ? "" : m0.title || "",
      author: useAll ? "" : m0.author || "",
      subject: useAll ? "" : m0.subject || "",
      keywords: useAll ? "" : m0.keywords || "",
      creator: m0.creator || "",
      producer: m0.producer || "",
      created: m0.creationDate || "",
      modified: m0.modDate || "",
      pagesStr: t("infoPagesFmt", { p: useAll ? pages.length : totalOrigPages, s: totalSingleEquiv }),
      sizeStr,
      boxesStr: boxList.join(" · "),
      fonts,
      unembeddedCount,
      imgStr,
      isEncrypted: anyEncrypted
    };
  }

  function formatPlainTextReport(data, t) {
    const lines = [
      `=== ${t("infoModalTitle")} ===`,
      `${t("infoFileName")}: ${data.fileName}`,
      `${t("infoFileSize")}: ${data.fileSizeStr}`,
      `${t("infoPdfVer")}: ${data.pdfVerStr}`,
      `${t("infoPages")}: ${data.pagesStr}`,
      `${t("infoPageSize")}: ${data.sizeStr}`,
      `${t("infoBoxes")}: ${data.boxesStr}`,
      `${t("infoCreator")}: ${data.creator || t("infoNone")}`,
      `${t("infoProducer")}: ${data.producer || t("infoNone")}`,
      `${t("infoCreated")}: ${data.created || t("infoNone")}`,
      `${t("infoModified")}: ${data.modified || t("infoNone")}`,
      `${t("infoImagesSummary")}: ${data.imgStr}`,
      `${t("infoSecurity")}: ${data.isEncrypted ? t("infoSecLocked") : t("infoSecOpen")}`,
      "",
      `--- ${t("infoTabFonts")} (${data.fonts.length}) ---`
    ];
    if (!data.fonts.length) {
      lines.push(t("fontZeroBanner"));
    } else {
      data.fonts.forEach((f, idx) => {
        const st = f.embedded ? (f.isSubset ? t("fontEmbSub") : t("fontEmbFull")) : t("fontNotEmb");
        const pgs = f.pages.length ? ` [P${f.pages.join(", P")}]` : "";
        lines.push(`${idx + 1}. ${f.name} | ${st} | ${f.fontType} | ${f.encoding}${pgs}`);
      });
    }
    return lines.join("\n");
  }

  return {
    buildInspectData,
    formatPlainTextReport
  };
})();
