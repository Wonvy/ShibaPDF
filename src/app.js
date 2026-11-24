// ShibaPDF v4 — Unified 4-Pillar Client-Side PDF Studio Controller
(function () {
  "use strict";

  const MM_TO_PT = 72.0 / 25.4;
  const ICONS = window.LUCIDE_SVGS || {};
  const I18N = window.SHIBA_I18N || {};
  const BOOT_CLEAN_HTML = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

  (function initPdfJsWorker() {
    if (typeof pdfjsLib === "undefined") return;
    try {
      const workerEl = document.getElementById("pdf-worker-code");
      if (workerEl && workerEl.textContent.trim().length > 50) {
        const rawCode = workerEl.textContent.replace(/<\\\/script/gi, "</script");
        const blob = new Blob([rawCode], { type: "text/javascript" });
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn("PDF.js worker fallback:", err);
    }
  })();

  const state = {
    lang: localStorage.getItem("shibapdf_lang") || "zh",
    theme:
      localStorage.getItem("shibapdf_theme") ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),

    // Navigation: 4 Pillars ('pages' | 'prepress' | 'preflight' | 'convert')
    pillar: "pages",
    pagesSub: "organize", // 'organize' | 'text'
    prepressSub: "impose", // 'impose' | 'split' | 'k100'
    convertSub: "compress", // 'compress' | 'img' | 'imgpdf'

    // Unified Multi-PDF Workspace
    sourceDocs: new Map(), // docId -> { id, name, size, rawBytes, pdfJsDoc, origPages, preflight }
    docOrder: [], // [docId]
    pages: [], // [{ uid, docId, origIdx, extraRot, selected, edits }]
    undoStack: [],
    bitmapCache: new Map(),
    activeSlotIdx: 0,
    lastClickedOrgIdx: -1,
    draggingOrgIdx: -1,

    // Text Editor State
    placingNewText: false,
    selectedTextId: null,

    // Imposition State
    imposeType: "booklet", // 'booklet' | 'spread2up' | 'nup'
    imposeNup: 4,
    sheetPreset: "auto",
    gutterMm: 0,
    firstCoverAlone: false,
    cropMarks: true,
    imposeK100: true,
    activeSheetIdx: 0,

    // Split Spreads State
    splitTab: "spread", // 'spread' | 'sequence'
    bleed: { top: 3, bottom: 3, left: 3, right: 3 },
    bleedAction: "trim",
    moveFirstToLast: true,
    pureBlackK100: true,
    onlyLandscape: true,
    readingDir: "ltr",

    // Preflight State
    activePfHighlights: [],
    selectedPfCardIdx: -1,

    // Convert & Compress State
    compPreset: "balanced",
    compKeepVec: true,
    imgFmt: "png",
    imgDpi: 300,
    imgScope: "all", // 'all' | 'selected'
    imgPdfDpi: 220,

    // Viewport & Render
    zoomFactor: 1.0,
    baseFitScale: 1.0,
    renderToken: 0,
    wheelRenderTimer: null,
    busy: false
  };

  const el = {
    html: document.documentElement,
    langBtn: document.getElementById("langBtn"),
    langLabel: document.getElementById("langLabel"),
    themeBtn: document.getElementById("themeBtn"),
    iconMoon: document.getElementById("iconMoon"),
    iconSun: document.getElementById("iconSun"),

    // Left 4 Pillars
    navPagesBtn: document.getElementById("navPagesBtn"),
    navPrepressBtn: document.getElementById("navPrepressBtn"),
    navPreflightBtn: document.getElementById("navPreflightBtn"),
    navConvertBtn: document.getElementById("navConvertBtn"),
    navPreflightBadge: document.getElementById("navPreflightBadge"),

    // Rail Footer & Files
    fileInput: document.getElementById("fileInput"),
    railFilesBox: document.getElementById("railFilesBox"),
    addMoreBtn: document.getElementById("addMoreBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    fileList: document.getElementById("fileList"),
    sidebarUploadBtn: document.getElementById("sidebarUploadBtn"),
    downloadOfflineBtn: document.getElementById("downloadOfflineBtn"),

    // Top Action Strip
    topStrip: document.getElementById("topStrip"),
    stripPages: document.getElementById("stripPages"),
    subOrgBtn: document.getElementById("subOrgBtn"),
    subTextBtn: document.getElementById("subTextBtn"),
    orgControls: document.getElementById("orgControls"),
    selAllBtn: document.getElementById("selAllBtn"),
    selNoneBtn: document.getElementById("selNoneBtn"),
    selActionGroup: document.getElementById("selActionGroup"),
    rotSelBtn: document.getElementById("rotSelBtn"),
    delSelBtn: document.getElementById("delSelBtn"),
    imgSelBtn: document.getElementById("imgSelBtn"),
    extractSelBtn: document.getElementById("extractSelBtn"),
    extractSelText: document.getElementById("extractSelText"),

    textEditControls: document.getElementById("textEditControls"),
    addTextBtn: document.getElementById("addTextBtn"),
    rotatePageBtn: document.getElementById("rotatePageBtn"),
    deletePageBtn: document.getElementById("deletePageBtn"),
    undoEditBtn: document.getElementById("undoEditBtn"),
    editHintLabel: document.getElementById("editHintLabel"),

    stripPrepress: document.getElementById("stripPrepress"),
    subImposeBtn: document.getElementById("subImposeBtn"),
    subSplitBtn: document.getElementById("subSplitBtn"),
    subK100Btn: document.getElementById("subK100Btn"),
    imposeControls: document.getElementById("imposeControls"),
    impBookletBtn: document.getElementById("impBookletBtn"),
    impSpreadBtn: document.getElementById("impSpreadBtn"),
    impNupBtn: document.getElementById("impNupBtn"),
    imposeParamsBtn: document.getElementById("imposeParamsBtn"),
    imposePopover: document.getElementById("imposePopover"),
    nupOnlyRows: document.getElementById("nupOnlyRows"),
    nupChips: Array.from(document.querySelectorAll(".nup-chip")),
    sheetPresetSelect: document.getElementById("sheetPresetSelect"),
    gutterInput: document.getElementById("gutterInput"),
    firstCoverRow: document.getElementById("firstCoverRow"),
    firstCoverCheck: document.getElementById("firstCoverCheck"),
    cropMarksCheck: document.getElementById("cropMarksCheck"),
    imposeK100Check: document.getElementById("imposeK100Check"),

    splitControls: document.getElementById("splitControls"),
    tabSpreadBtn: document.getElementById("tabSpreadBtn"),
    tabSeqBtn: document.getElementById("tabSeqBtn"),
    splitParamsBtn: document.getElementById("splitParamsBtn"),
    splitParamsSummary: document.getElementById("splitParamsSummary"),
    splitParamsPopover: document.getElementById("splitParamsPopover"),
    presetChips: Array.from(document.querySelectorAll(".preset-chip")),
    bleedUniformInput: document.getElementById("bleedUniformInput"),
    toggleQuadLink: document.getElementById("toggleQuadLink"),
    quadGridPop: document.getElementById("quadGridPop"),
    bleedTopInput: document.getElementById("bleedTopInput"),
    bleedBottomInput: document.getElementById("bleedBottomInput"),
    bleedLeftInput: document.getElementById("bleedLeftInput"),
    bleedRightInput: document.getElementById("bleedRightInput"),
    moveFirstCheck: document.getElementById("moveFirstCheck"),
    pureBlackCheck: document.getElementById("pureBlackCheck"),
    onlyLandscapeCheck: document.getElementById("onlyLandscapeCheck"),
    bleedTrimBtn: document.getElementById("bleedTrimBtn"),
    bleedKeepBtn: document.getElementById("bleedKeepBtn"),
    dirLtrBtn: document.getElementById("dirLtrBtn"),
    dirRtlBtn: document.getElementById("dirRtlBtn"),
    k100InlineHint: document.getElementById("k100InlineHint"),

    stripPreflight: document.getElementById("stripPreflight"),
    pfScorePills: document.getElementById("pfScorePills"),

    stripConvert: document.getElementById("stripConvert"),
    subCompBtn: document.getElementById("subCompBtn"),
    subImgBtn: document.getElementById("subImgBtn"),
    subImgPdfBtn: document.getElementById("subImgPdfBtn"),

    stripRightGroup: document.getElementById("stripRightGroup"),
    dimSummaryText: document.getElementById("dimSummaryText"),
    exportBtn: document.getElementById("exportBtn"),
    exportBtnText: document.getElementById("exportBtnText"),

    // Main Body
    preflightDrawer: document.getElementById("preflightDrawer"),
    stageViewport: document.getElementById("stageViewport"),
    emptyStage: document.getElementById("emptyStage"),
    dropzone: document.getElementById("dropzone"),
    spreadViewContainer: document.getElementById("spreadViewContainer"),
    spreadCanvas: document.getElementById("spreadCanvas"),
    guidesOverlay: document.getElementById("guidesOverlay"),
    shadeTop: document.getElementById("shadeTop"),
    shadeBottom: document.getElementById("shadeBottom"),
    shadeLeft: document.getElementById("shadeLeft"),
    shadeRight: document.getElementById("shadeRight"),
    trimRect: document.getElementById("trimRect"),
    centerLine: document.getElementById("centerLine"),
    leftBadge: document.getElementById("leftBadge"),
    rightBadge: document.getElementById("rightBadge"),
    pfHighlightOverlay: document.getElementById("pfHighlightOverlay"),
    textEditOverlay: document.getElementById("textEditOverlay"),
    sequenceGrid: document.getElementById("sequenceGrid"),

    // Convert & Compress Cards
    convertViewPanel: document.getElementById("convertViewPanel"),
    panelCompress: document.getElementById("panelCompress"),
    compCards: Array.from(document.querySelectorAll(".comp-card")),
    compKeepVecCheck: document.getElementById("compKeepVecCheck"),
    compResultBox: document.getElementById("compResultBox"),
    runCompressBtn: document.getElementById("runCompressBtn"),
    runCompressText: document.getElementById("runCompressText"),

    panelExportImg: document.getElementById("panelExportImg"),
    imgFmtChips: Array.from(document.querySelectorAll(".img-fmt-chip")),
    imgDpiChips: Array.from(document.querySelectorAll(".img-dpi-chip")),
    imgScopeAllBtn: document.getElementById("imgScopeAllBtn"),
    imgScopeSelBtn: document.getElementById("imgScopeSelBtn"),
    runExportImgBtn: document.getElementById("runExportImgBtn"),
    runExportImgText: document.getElementById("runExportImgText"),

    panelImgPdf: document.getElementById("panelImgPdf"),
    imgPdfDpiChips: Array.from(document.querySelectorAll(".imgpdf-dpi-chip")),
    runImgPdfBtn: document.getElementById("runImgPdfBtn"),
    runImgPdfText: document.getElementById("runImgPdfText"),

    // Floating Text Formatting Bar
    textFmtBar: document.getElementById("textFmtBar"),
    fmtFontSelect: document.getElementById("fmtFontSelect"),
    fmtSmallerBtn: document.getElementById("fmtSmallerBtn"),
    fmtLargerBtn: document.getElementById("fmtLargerBtn"),
    fmtSizeLabel: document.getElementById("fmtSizeLabel"),
    fmtBoldBtn: document.getElementById("fmtBoldBtn"),
    fmtItalicBtn: document.getElementById("fmtItalicBtn"),
    fmtColorInput: document.getElementById("fmtColorInput"),
    fmtMaskCheck: document.getElementById("fmtMaskCheck"),
    fmtBgInput: document.getElementById("fmtBgInput"),
    fmtDeleteNodeBtn: document.getElementById("fmtDeleteNodeBtn"),

    // Bottom Pager
    bottomPager: document.getElementById("bottomPager"),
    prevSpreadBtn: document.getElementById("prevSpreadBtn"),
    nextSpreadBtn: document.getElementById("nextSpreadBtn"),
    pageIndicator: document.getElementById("pageIndicator"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomFitBtn: document.getElementById("zoomFitBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomLabel: document.getElementById("zoomLabel")
  };

  function t(key, vars) {
    const dict = I18N[state.lang] || I18N.zh || {};
    let str = dict[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.split(`{${k}}`).join(String(vars[k]));
      });
    }
    return str;
  }

  function hasPages() {
    return state.pages.length > 0;
  }

  function clampActiveIndices() {
    if (!state.pages.length) {
      state.activeSlotIdx = 0;
      state.activeSheetIdx = 0;
      return;
    }
    if (state.activeSlotIdx >= state.pages.length) state.activeSlotIdx = state.pages.length - 1;
    if (state.activeSlotIdx < 0) state.activeSlotIdx = 0;
  }

  function getSlotSizeInfo(slot) {
    const docEntry = state.sourceDocs.get(slot.docId);
    const base = docEntry.origPages[slot.origIdx];
    const swap = slot.extraRot % 180 !== 0;
    return {
      wPt: swap ? base.hPt : base.wPt,
      hPt: swap ? base.wPt : base.hPt,
      wMm: swap ? base.hMm : base.wMm,
      hMm: swap ? base.wMm : base.hMm,
      totalRot: (base.rot + slot.extraRot) % 360
    };
  }

  function getSelectedSlots() {
    return state.pages.filter((s) => s.selected);
  }

  function getPrimaryStem() {
    if (!state.docOrder.length) return "ShibaPDF";
    const firstDoc = state.sourceDocs.get(state.docOrder[0]);
    const name = firstDoc ? firstDoc.name : "ShibaPDF.pdf";
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    return state.docOrder.length > 1 ? `${stem}_merged` : stem;
  }

  function pushUndo() {
    state.undoStack.push(JSON.stringify(state.pages));
    if (state.undoStack.length > 25) state.undoStack.shift();
  }

  function triggerDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 12000);
  }

  // =========================================================================
  // Theme, Language & Smooth Canvas Zoom (Blocking Browser Native Zoom)
  // =========================================================================
  function applyTheme() {
    el.html.setAttribute("data-theme", state.theme);
    const isDark = state.theme === "dark";
    el.iconMoon.classList.toggle("hidden", isDark);
    el.iconSun.classList.toggle("hidden", !isDark);
    localStorage.setItem("shibapdf_theme", state.theme);
  }

  function applyLanguage() {
    el.html.setAttribute("lang", state.lang === "zh" ? "zh-CN" : "en");
    el.langLabel.textContent = state.lang === "zh" ? "EN" : "中文";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    localStorage.setItem("shibapdf_lang", state.lang);
    updateZoomReadout();
    renderFileList();
    refreshWorkspace(true);
  }

  function updateZoomReadout() {
    el.zoomLabel.textContent =
      Math.abs(state.zoomFactor - 1.0) < 0.01 ? t("fitZoom") : `${Math.round(state.zoomFactor * 100)}%`;
  }

  function setSmoothZoom(newFactor) {
    const clamped = Math.min(4.0, Math.max(0.35, Math.round(newFactor * 100) / 100));
    if (Math.abs(clamped - state.zoomFactor) < 0.005) return;
    state.zoomFactor = clamped;
    updateZoomReadout();

    if (!hasPages() || el.spreadViewContainer.classList.contains("hidden")) return;

    // Instant 60fps CSS resize before debounced HiDPI re-render
    if (isImposeMode()) {
      const plan = getCurrentImpositionPlan();
      const sh = plan.sheets[state.activeSheetIdx] || plan.sheets[0];
      if (sh) {
        const cssScale = state.baseFitScale * state.zoomFactor;
        el.spreadCanvas.style.width = `${Math.round(sh.wPt * cssScale)}px`;
        el.spreadCanvas.style.height = `${Math.round(sh.hPt * cssScale)}px`;
      }
    } else {
      const slot = state.pages[state.activeSlotIdx];
      if (slot) {
        const info = getSlotSizeInfo(slot);
        const cssScale = state.baseFitScale * state.zoomFactor;
        el.spreadCanvas.style.width = `${Math.round(info.wPt * cssScale)}px`;
        el.spreadCanvas.style.height = `${Math.round(info.hPt * cssScale)}px`;
        refreshCanvasOverlays();
      }
    }

    clearTimeout(state.wheelRenderTimer);
    state.wheelRenderTimer = setTimeout(() => {
      renderCanvasStage();
    }, 120);
  }

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!hasPages() || el.spreadViewContainer.classList.contains("hidden")) return;
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        setSmoothZoom(state.zoomFactor * factor);
      }
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "-" || e.key === "_" || e.key === "0")) {
      e.preventDefault();
      if (!hasPages()) return;
      if (e.key === "0") setSmoothZoom(1.0);
      else if (e.key === "-" || e.key === "_") setSmoothZoom(state.zoomFactor / 1.18);
      else setSmoothZoom(state.zoomFactor * 1.18);
    }
  });

  ["gesturestart", "gesturechange", "gestureend"].forEach((evName) => {
    window.addEventListener(evName, (e) => e.preventDefault(), { passive: false });
  });

  // =========================================================================
  // Loading & Merging Multiple PDFs into Unified Page Workspace
  // =========================================================================
  async function loadPdfFiles(fileListObj) {
    const incoming = Array.from(fileListObj).filter(
      (f) => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf"
    );
    if (!incoming.length) return;

    const wasEmpty = !hasPages();
    if (!wasEmpty) pushUndo();

    for (const file of incoming) {
      try {
        const buf = await file.arrayBuffer();
        const rawBytes = new Uint8Array(buf);
        const pdfJsDoc = await pdfjsLib.getDocument({ data: rawBytes.slice() }).promise;
        const origPages = [];
        const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        for (let p = 1; p <= pdfJsDoc.numPages; p++) {
          const pg = await pdfJsDoc.getPage(p);
          const vp = pg.getViewport({ scale: 1 });
          const textSpans = await window.ShibaPrepress.extractPageTextSpans(pdfJsDoc, p);
          origPages.push({
            wPt: vp.width,
            hPt: vp.height,
            wMm: vp.width / MM_TO_PT,
            hMm: vp.height / MM_TO_PT,
            rot: pg.rotate || 0,
            textSpans
          });
          state.pages.push({
            uid: `slot_${docId}_${p}_${Math.random().toString(36).slice(2, 6)}`,
            docId,
            origIdx: p - 1,
            extraRot: 0,
            selected: false,
            edits: []
          });
        }

        const preflight = await window.ShibaPrepress.runPrepressPreflight(rawBytes, pdfJsDoc, origPages);
        state.sourceDocs.set(docId, {
          id: docId,
          name: file.name,
          size: file.size,
          rawBytes,
          pdfJsDoc,
          origPages,
          preflight
        });
        state.docOrder.push(docId);
      } catch (err) {
        alert(t("errLoadPdf") + (err && err.message ? err.message : String(err)));
      }
    }

    if (wasEmpty) {
      state.activeSlotIdx = 0;
      state.activeSheetIdx = 0;
      state.zoomFactor = 1.0;
    }
    state.selectedTextId = null;
    state.activePfHighlights = [];
    state.selectedPfCardIdx = -1;
    el.compResultBox.classList.add("hidden");
    updateZoomReadout();
    renderFileList();
    refreshWorkspace(true);
  }

  function renderFileList() {
    el.fileList.innerHTML = "";
    state.docOrder.forEach((docId) => {
      const doc = state.sourceDocs.get(docId);
      if (!doc) return;
      const pageCount = state.pages.filter((s) => s.docId === docId).length;
      const row = document.createElement("div");
      row.className = "file-row";

      const left = document.createElement("div");
      left.className = "file-row-left";
      const iconSpan = document.createElement("span");
      iconSpan.style.display = "inline-flex";
      iconSpan.innerHTML = ICONS["file-text"] || "";
      const nameSpan = document.createElement("span");
      nameSpan.className = "file-row-name";
      nameSpan.textContent = `${doc.name} (${pageCount}p)`;
      left.appendChild(iconSpan);
      left.appendChild(nameSpan);

      const delBtn = document.createElement("button");
      delBtn.className = "del-icon-btn";
      delBtn.type = "button";
      delBtn.innerHTML = ICONS["trash-2"] || "✕";
      delBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        pushUndo();
        state.pages = state.pages.filter((s) => s.docId !== docId);
        state.docOrder = state.docOrder.filter((id) => id !== docId);
        state.sourceDocs.delete(docId);
        clampActiveIndices();
        state.selectedTextId = null;
        state.activePfHighlights = [];
        renderFileList();
        refreshWorkspace(true);
      });

      row.appendChild(left);
      row.appendChild(delBtn);
      el.fileList.appendChild(row);
    });
  }

  // =========================================================================
  // Cached Slot Thumbnail & Edits Painter
  // =========================================================================
  function paintSlotEditsOntoCanvas(ctx, w, h, slot) {
    if (!slot.edits || !slot.edits.length) return;
    const info = getSlotSizeInfo(slot);
    const scale = w / Math.max(1, info.wPt);
    slot.edits.forEach((ed) => {
      if (ed.maskBg && ed.origRect) {
        ctx.fillStyle = ed.bgColor || "#ffffff";
        ctx.fillRect(
          ed.origRect.u * w - 1,
          ed.origRect.v * h - 1,
          ed.origRect.uw * w + 2,
          ed.origRect.vh * h + 2
        );
      }
      if (ed.text && ed.text.trim()) {
        const fontPx = Math.max(7, ed.fontPt) * scale;
        const lineH = fontPx * 1.14;
        const asc = ed.ascent || 0.84;
        ctx.font = `${ed.italic ? "italic " : ""}${ed.bold ? "700" : "400"} ${fontPx}px ${window.ShibaPrepress.getCssFontStack(ed.fontKey)}`;
        const lines = ed.text.split("\n");
        if (!ed.origRect && ed.maskBg) {
          let mw = 8;
          lines.forEach((l) => { mw = Math.max(mw, ctx.measureText(l).width); });
          ctx.fillStyle = ed.bgColor || "#ffffff";
          ctx.fillRect(ed.u * w - 1, ed.v * h - 1, mw + 3, lines.length * lineH + 2);
        }
        ctx.fillStyle = ed.color || "#181817";
        ctx.textBaseline = "alphabetic";
        lines.forEach((ln, idx) => {
          ctx.fillText(ln, ed.u * w, ed.v * h + fontPx * asc + idx * lineH);
        });
      }
    });
  }

  async function getSlotPreviewCanvas(slotIdx) {
    const slot = state.pages[slotIdx];
    const docEntry = state.sourceDocs.get(slot.docId);
    const baseKey = `${slot.docId}_${slot.origIdx}_${slot.extraRot}`;
    let baseCv = state.bitmapCache.get(baseKey);

    if (!baseCv) {
      const page = await docEntry.pdfJsDoc.getPage(slot.origIdx + 1);
      const totalRot = (docEntry.origPages[slot.origIdx].rot + slot.extraRot) % 360;
      const vp1 = page.getViewport({ scale: 1, rotation: totalRot });
      const targetScale = Math.min(720 / Math.max(vp1.width, 1), 1.35);
      const vp = page.getViewport({ scale: targetScale, rotation: totalRot });

      baseCv = document.createElement("canvas");
      baseCv.width = Math.max(1, Math.round(vp.width));
      baseCv.height = Math.max(1, Math.round(vp.height));
      const ctx = baseCv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, baseCv.width, baseCv.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      state.bitmapCache.set(baseKey, baseCv);
    }

    if (!slot.edits || !slot.edits.length) return baseCv;

    const out = document.createElement("canvas");
    out.width = baseCv.width;
    out.height = baseCv.height;
    const oCtx = out.getContext("2d");
    oCtx.drawImage(baseCv, 0, 0);
    paintSlotEditsOntoCanvas(oCtx, out.width, out.height, slot);
    return out;
  }

  // =========================================================================
  // Pillar 1A: Organize, Multi-Select, Drag-Sort & Extract Grid
  // =========================================================================
  async function renderOrganizeGrid() {
    if (!hasPages()) return;
    const myToken = ++state.renderToken;
    el.sequenceGrid.innerHTML = "";

    for (let i = 0; i < state.pages.length; i++) {
      const slot = state.pages[i];
      const info = getSlotSizeInfo(slot);

      const card = document.createElement("div");
      card.className = "org-card" + (slot.selected ? " selected" : "");
      card.draggable = true;
      card.dataset.idx = String(i);

      // Selection checkmark pill
      const checkEl = document.createElement("div");
      checkEl.className = "org-check";
      checkEl.innerHTML = ICONS["check"] || "✓";
      card.appendChild(checkEl);

      // Hover quick actions: Edit Text, Rotate, Delete
      const qBox = document.createElement("div");
      qBox.className = "org-quick-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "org-mini-btn";
      editBtn.type = "button";
      editBtn.title = t("subTextEdit");
      editBtn.innerHTML = ICONS["square-pen"] || "✎";
      editBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state.activeSlotIdx = i;
        state.pagesSub = "text";
        refreshWorkspace(true);
      });

      const rotBtn = document.createElement("button");
      rotBtn.className = "org-mini-btn";
      rotBtn.type = "button";
      rotBtn.title = t("rotSelBtn");
      rotBtn.innerHTML = ICONS["rotate-cw"] || "↻";
      rotBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        pushUndo();
        slot.extraRot = (slot.extraRot + 90) % 360;
        refreshWorkspace(true);
      });

      const delBtn = document.createElement("button");
      delBtn.className = "org-mini-btn";
      delBtn.type = "button";
      delBtn.title = t("delSelBtn");
      delBtn.innerHTML = ICONS["trash-2"] || "✕";
      delBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (state.pages.length <= 1) return;
        pushUndo();
        state.pages.splice(i, 1);
        clampActiveIndices();
        renderFileList();
        refreshWorkspace(true);
      });

      qBox.appendChild(editBtn);
      if (state.pages.length > 1) qBox.appendChild(rotBtn);
      else qBox.appendChild(rotBtn);
      if (state.pages.length > 1) qBox.appendChild(delBtn);
      card.appendChild(qBox);

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "clean-thumb-wrap";
      const cv = document.createElement("canvas");
      thumbWrap.appendChild(cv);
      card.appendChild(thumbWrap);

      const cap = document.createElement("div");
      cap.className = "clean-caption";
      const st = document.createElement("strong");
      st.textContent = `P${i + 1}`;
      const dm = document.createElement("span");
      dm.textContent = `${info.wMm.toFixed(0)}×${info.hMm.toFixed(0)}mm`;
      cap.appendChild(st);
      cap.appendChild(dm);
      card.appendChild(cap);

      // Click to select / Shift+Click range select; Double-click to open Text Edit
      card.addEventListener("click", (ev) => {
        if (ev.shiftKey && state.lastClickedOrgIdx >= 0 && state.lastClickedOrgIdx < state.pages.length) {
          const a = Math.min(state.lastClickedOrgIdx, i);
          const b = Math.max(state.lastClickedOrgIdx, i);
          const targetVal = !slot.selected;
          for (let k = a; k <= b; k++) state.pages[k].selected = targetVal;
        } else {
          slot.selected = !slot.selected;
          state.lastClickedOrgIdx = i;
        }
        state.activeSlotIdx = i;
        syncOrganizeSelectionUI();
      });

      card.addEventListener("dblclick", () => {
        state.activeSlotIdx = i;
        state.pagesSub = "text";
        refreshWorkspace(true);
      });

      // Drag & Drop Page Reordering with dynamic grabbing cursor
      card.addEventListener("dragstart", (ev) => {
        state.draggingOrgIdx = i;
        card.classList.add("dragging");
        document.body.classList.add("is-sorting-pages");
        if (ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("text/plain", String(i));
        }
      });

      card.addEventListener("dragend", () => {
        state.draggingOrgIdx = -1;
        card.classList.remove("dragging");
        document.body.classList.remove("is-sorting-pages");
        el.sequenceGrid.querySelectorAll(".org-card.drag-over").forEach((n) => n.classList.remove("drag-over"));
      });

      card.addEventListener("dragover", (ev) => {
        if (state.draggingOrgIdx < 0 || state.draggingOrgIdx === i) return;
        ev.preventDefault();
        card.classList.add("drag-over");
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (ev) => {
        if (state.draggingOrgIdx < 0) return;
        ev.preventDefault();
        ev.stopPropagation();
        card.classList.remove("drag-over");
        document.body.classList.remove("is-sorting-pages");
        const fromIdx = state.draggingOrgIdx;
        state.draggingOrgIdx = -1;
        if (fromIdx === i) return;
        pushUndo();
        const [moved] = state.pages.splice(fromIdx, 1);
        state.pages.splice(i, 0, moved);
        state.activeSlotIdx = i;
        refreshWorkspace(true);
      });

      el.sequenceGrid.appendChild(card);

      // Async render thumbnail
      getSlotPreviewCanvas(i).then((srcCv) => {
        if (myToken !== state.renderToken) return;
        const maxThumb = 220;
        const sc = Math.min(maxThumb / Math.max(1, srcCv.width), maxThumb / Math.max(1, srcCv.height), 1);
        cv.width = Math.max(1, Math.round(srcCv.width * sc));
        cv.height = Math.max(1, Math.round(srcCv.height * sc));
        cv.getContext("2d").drawImage(srcCv, 0, 0, cv.width, cv.height);
      });
    }
  }

  function syncOrganizeSelectionUI() {
    const cards = el.sequenceGrid.querySelectorAll(".org-card");
    cards.forEach((c, idx) => {
      if (state.pages[idx]) c.classList.toggle("selected", Boolean(state.pages[idx].selected));
    });
    updateTopStripControls();
  }

  // =========================================================================
  // Pillar 1B: Zero-Shift Baseline Text Editor + Color Sampler + Dynamic Cursors
  // =========================================================================
  function rgbToHex(r, g, b) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
  }

  // Sample actual background & foreground ink colors directly from the rendered #spreadCanvas!
  function sampleColorsAroundSpan(sp) {
    const cv = el.spreadCanvas;
    if (!cv || !cv.width || !cv.height) return { fg: "#181817", bg: "#ffffff" };
    try {
      const ctx = cv.getContext("2d");
      const x = Math.max(0, Math.floor(sp.u * cv.width));
      const y = Math.max(0, Math.floor(sp.v * cv.height));
      const w = Math.max(4, Math.min(cv.width - x, Math.ceil(sp.uw * cv.width)));
      const h = Math.max(4, Math.min(cv.height - y, Math.ceil(sp.vh * cv.height)));

      // Sample 1px outside box perimeter for background color
      const bgPts = [
        [Math.max(0, x - 2), Math.max(0, y - 2)],
        [Math.min(cv.width - 1, x + w + 1), Math.max(0, y - 2)],
        [Math.max(0, x - 2), Math.min(cv.height - 1, y + h + 1)],
        [Math.min(cv.width - 1, x + Math.floor(w / 2)), Math.max(0, y - 2)]
      ];
      let br = 0, bg = 0, bb = 0;
      bgPts.forEach(([px, py]) => {
        const d = ctx.getImageData(px, py, 1, 1).data;
        br += d[0]; bg += d[1]; bb += d[2];
      });
      br /= bgPts.length; bg /= bgPts.length; bb /= bgPts.length;
      const bgHex = rgbToHex(br, bg, bb);

      // Find pixel inside span with maximum contrast from background for exact ink color!
      const block = ctx.getImageData(x, y, w, h).data;
      let maxDist = -1;
      let fr = 24, fg = 24, fb = 23;
      for (let i = 0; i < block.length; i += 4) {
        const r = block[i], g = block[i + 1], b = block[i + 2];
        const dist = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
        if (dist > maxDist) {
          maxDist = dist;
          fr = r; fg = g; fb = b;
        }
      }
      const fgHex = maxDist > 45 ? rgbToHex(fr, fg, fb) : "#181817";
      return { fg: fgHex, bg: bgHex };
    } catch (_) {
      return { fg: "#181817", bg: "#ffffff" };
    }
  }

  function getActiveSlot() {
    return hasPages() ? state.pages[state.activeSlotIdx] : null;
  }

  function getSelectedEditObj() {
    const slot = getActiveSlot();
    if (!slot || !state.selectedTextId) return null;
    return slot.edits.find((e) => e.id === state.selectedTextId) || null;
  }

  function positionTextFmtBar(targetWrapEl) {
    const ed = getSelectedEditObj();
    if (!ed || !targetWrapEl || state.pillar !== "pages" || state.pagesSub !== "text") {
      el.textFmtBar.classList.add("hidden");
      return;
    }
    el.textFmtBar.classList.remove("hidden");
    el.fmtFontSelect.value = ed.fontKey || "sans";
    el.fmtSizeLabel.textContent = String(Math.round(ed.fontPt));
    el.fmtBoldBtn.classList.toggle("active", Boolean(ed.bold));
    el.fmtItalicBtn.classList.toggle("active", Boolean(ed.italic));
    el.fmtColorInput.value = ed.color || "#181817";
    el.fmtMaskCheck.checked = Boolean(ed.maskBg);
    el.fmtBgInput.value = ed.bgColor || "#ffffff";

    const r = targetWrapEl.getBoundingClientRect();
    const barW = el.textFmtBar.offsetWidth || 310;
    const left = Math.max(12, Math.min(window.innerWidth - barW - 12, r.left));
    const top = r.top > 56 ? r.top - 46 : r.bottom + 10;
    el.textFmtBar.style.left = `${left}px`;
    el.textFmtBar.style.top = `${top}px`;
  }

  function renderTextEditorOverlay() {
    if (state.pillar !== "pages" || state.pagesSub !== "text" || !hasPages()) {
      el.textEditOverlay.classList.add("hidden");
      el.textFmtBar.classList.add("hidden");
      return;
    }

    const slot = getActiveSlot();
    const docEntry = state.sourceDocs.get(slot.docId);
    const origPage = docEntry.origPages[slot.origIdx];
    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height;
    if (!cssW || !cssH) return;

    const cssScale = cssW / Math.max(1, getSlotSizeInfo(slot).wPt);

    el.textEditOverlay.classList.remove("hidden");
    el.textEditOverlay.classList.toggle("placing-mode", state.placingNewText);
    el.textEditOverlay.innerHTML = "";

    const editedOrigIds = new Set(slot.edits.filter((e) => e.origId).map((e) => e.origId));

    // 1. Clickable hit targets for unedited original PDF spans (only when extraRot === 0 so coordinates match)
    if (slot.extraRot === 0 && !state.placingNewText) {
      (origPage.textSpans || []).forEach((sp) => {
        if (editedOrigIds.has(sp.id)) return;
        const hit = document.createElement("div");
        hit.className = "pdf-text-hit";
        hit.style.left = `${sp.u * cssW}px`;
        hit.style.top = `${sp.v * cssH}px`;
        hit.style.width = `${Math.max(10, sp.uw * cssW)}px`;
        hit.style.height = `${Math.max(10, sp.vh * cssH)}px`;
        hit.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const sampled = sampleColorsAroundSpan(sp);
          pushUndo();
          const newEd = {
            id: `ed_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            origId: sp.id,
            origRect: { u: sp.u, v: sp.v, uw: sp.uw, vh: sp.vh },
            u: sp.u,
            v: sp.v,
            boxWidthU: null,
            text: sp.str,
            fontPt: sp.fontPt,
            ascent: sp.ascent || 0.84,
            bold: Boolean(sp.bold),
            italic: Boolean(sp.italic),
            fontKey: sp.fontKey || "sans",
            color: sampled.fg,
            maskBg: true,
            bgColor: sampled.bg
          };
          slot.edits.push(newEd);
          state.selectedTextId = newEd.id;
          renderTextEditorOverlay();
          focusSelectedEditorNode();
        });
        el.textEditOverlay.appendChild(hit);
      });
    }

    // 2. Render background mask patches over original PDF text locations first
    slot.edits.forEach((ed) => {
      if (ed.maskBg && ed.origRect) {
        const patch = document.createElement("div");
        patch.className = "text-mask-patch";
        patch.style.left = `${ed.origRect.u * cssW - 1}px`;
        patch.style.top = `${ed.origRect.v * cssH - 1}px`;
        patch.style.width = `${ed.origRect.uw * cssW + 2}px`;
        patch.style.height = `${ed.origRect.vh * cssH + 2}px`;
        patch.style.backgroundColor = ed.bgColor || "#ffffff";
        el.textEditOverlay.appendChild(patch);
      }
    });

    // 3. Render interactive zero-offset text boxes with move & resize handles
    let selectedWrapEl = null;

    slot.edits.forEach((ed) => {
      // Pure erase-mask entry (deleted original text) has empty text & isn't selected
      if (!ed.text && ed.origRect && state.selectedTextId !== ed.id) return;

      const isSelected = state.selectedTextId === ed.id;
      const wrap = document.createElement("div");
      wrap.className = "text-box-wrap" + (isSelected ? " selected" : "");
      wrap.dataset.editId = ed.id;
      wrap.style.left = `${ed.u * cssW}px`;
      wrap.style.top = `${ed.v * cssH}px`;
      if (ed.boxWidthU && ed.boxWidthU > 0.02) {
        wrap.style.width = `${ed.boxWidthU * cssW}px`;
      }
      if (!ed.origRect && ed.maskBg) {
        wrap.style.backgroundColor = ed.bgColor || "#ffffff";
      }

      // Move Handle Bar (cursor: grab -> grabbing)
      const dragHandle = document.createElement("div");
      dragHandle.className = "text-drag-handle";
      dragHandle.innerHTML = (ICONS["move"] ? ICONS["move"].replace('class="lucide', 'style="width:10px;height:10px;" class="lucide') : "✥");
      wrap.appendChild(dragHandle);

      // Editable Text Node (zero padding so position matches PDF glyph box 1:1)
      const textNode = document.createElement("div");
      textNode.className = "editable-text-node";
      textNode.contentEditable = isSelected ? "true" : "false";
      textNode.spellcheck = false;
      textNode.textContent = ed.text;
      textNode.style.fontFamily = window.ShibaPrepress.getCssFontStack(ed.fontKey);
      textNode.style.fontSize = `${Math.max(7, ed.fontPt) * cssScale}px`;
      textNode.style.fontWeight = ed.bold ? "700" : "400";
      textNode.style.fontStyle = ed.italic ? "italic" : "normal";
      textNode.style.color = ed.color || "#181817";
      wrap.appendChild(textNode);

      // Resize Handles: Bottom-Right Corner (scales font size, cursor: nwse-resize) & Right Edge (adjusts wrap width, cursor: ew-resize)
      const seHandle = document.createElement("div");
      seHandle.className = "text-resize-handle se";
      wrap.appendChild(seHandle);

      const eHandle = document.createElement("div");
      eHandle.className = "text-resize-handle e";
      wrap.appendChild(eHandle);

      // --- Drag-Move Logic (from dragHandle OR unselected box body) ---
      function startMoveBox(downEv) {
        downEv.preventDefault();
        downEv.stopPropagation();
        const startX = downEv.clientX;
        const startY = downEv.clientY;
        const origU = ed.u;
        const origV = ed.v;
        let moved = false;

        document.body.classList.add("is-dragging-box");

        function onMove(mvEv) {
          const dx = mvEv.clientX - startX;
          const dy = mvEv.clientY - startY;
          if (!moved && Math.hypot(dx, dy) > 2) {
            moved = true;
            pushUndo();
          }
          if (moved) {
            ed.u = Math.min(0.97, Math.max(0, origU + dx / cssW));
            ed.v = Math.min(0.97, Math.max(0, origV + dy / cssH));
            wrap.style.left = `${ed.u * cssW}px`;
            wrap.style.top = `${ed.v * cssH}px`;
            if (isSelected) positionTextFmtBar(wrap);
          }
        }

        function onUp() {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          document.body.classList.remove("is-dragging-box");
          if (!moved && state.selectedTextId !== ed.id) {
            state.selectedTextId = ed.id;
            renderTextEditorOverlay();
            focusSelectedEditorNode();
          } else {
            updateTopStripControls();
          }
        }

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      }

      dragHandle.addEventListener("pointerdown", startMoveBox);

      wrap.addEventListener("pointerdown", (ev) => {
        if (ev.target === dragHandle || ev.target === seHandle || ev.target === eHandle) return;
        if (!isSelected) {
          startMoveBox(ev);
        } else {
          ev.stopPropagation();
        }
      });

      // --- Corner Scale Resize (SE Handle -> nwse-resize) ---
      seHandle.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        pushUndo();
        const startX = ev.clientX;
        const startY = ev.clientY;
        const startFontPt = ed.fontPt;
        const startRect = wrap.getBoundingClientRect();
        const baseDiag = Math.max(24, Math.hypot(startRect.width, startRect.height));

        document.body.classList.add("is-resizing-se");

        function onMove(mvEv) {
          const curDiag = Math.max(12, Math.hypot(startRect.width + (mvEv.clientX - startX), startRect.height + (mvEv.clientY - startY)));
          const ratio = curDiag / baseDiag;
          ed.fontPt = Math.min(140, Math.max(6, Math.round(startFontPt * ratio * 10) / 10));
          textNode.style.fontSize = `${ed.fontPt * cssScale}px`;
          el.fmtSizeLabel.textContent = String(Math.round(ed.fontPt));
          positionTextFmtBar(wrap);
        }

        function onUp() {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          document.body.classList.remove("is-resizing-se");
          updateTopStripControls();
        }

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });

      // --- Right-Edge Width Resize (E Handle -> ew-resize) ---
      eHandle.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        pushUndo();
        const startX = ev.clientX;
        const startW = wrap.getBoundingClientRect().width;

        document.body.classList.add("is-resizing-e");

        function onMove(mvEv) {
          const newPxW = Math.max(24, Math.min(cssW * (1 - ed.u), startW + (mvEv.clientX - startX)));
          ed.boxWidthU = newPxW / cssW;
          wrap.style.width = `${newPxW}px`;
          positionTextFmtBar(wrap);
        }

        function onUp() {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          document.body.classList.remove("is-resizing-e");
          updateTopStripControls();
        }

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });

      textNode.addEventListener("input", () => {
        ed.text = textNode.innerText;
        positionTextFmtBar(wrap);
      });

      textNode.addEventListener("click", (ev) => ev.stopPropagation());

      el.textEditOverlay.appendChild(wrap);
      if (isSelected) selectedWrapEl = wrap;
    });

    if (selectedWrapEl) {
      requestAnimationFrame(() => positionTextFmtBar(selectedWrapEl));
    } else {
      el.textFmtBar.classList.add("hidden");
    }
  }

  function focusSelectedEditorNode() {
    if (!state.selectedTextId) return;
    const wrap = el.textEditOverlay.querySelector(`.text-box-wrap[data-edit-id="${state.selectedTextId}"]`);
    if (!wrap) return;
    const node = wrap.querySelector(".editable-text-node");
    if (!node) return;
    node.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // =========================================================================
  // Pillar 2: Imposition & Split Spreads Plans
  // =========================================================================
  function isImposeMode() {
    return state.pillar === "prepress" && state.prepressSub === "impose";
  }

  function getCurrentImpositionPlan() {
    return window.ShibaImpose.computeImpositionPlan(
      state.pages,
      (slot) => getSlotSizeInfo(slot),
      {
        type: state.imposeType,
        nup: state.imposeNup,
        sheetPreset: state.sheetPreset,
        gutterMm: state.gutterMm,
        cropMarks: state.cropMarks,
        firstCoverAlone: state.firstCoverAlone
      }
    );
  }

  function computeSplitPlanForSlots(slots) {
    if (!slots.length) return [];
    const b = state.bleed;
    const trimMode = state.bleedAction === "trim";
    const items = [];

    slots.forEach((slot, slotIdx) => {
      const info = getSlotSizeInfo(slot);
      const wMm = info.wMm;
      const hMm = info.hMm;
      const isSpread = !state.onlyLandscape || wMm > hMm;

      const uL = Math.min(0.48, Math.max(0, b.left / wMm));
      const uR = Math.min(0.48, Math.max(0, b.right / wMm));
      const vT = Math.min(0.48, Math.max(0, b.top / hMm));
      const vB = Math.min(0.48, Math.max(0, b.bottom / hMm));

      if (!isSpread) {
        const trimNorm = { u: uL, v: vT, uw: Math.max(0.02, 1 - uL - uR), vh: Math.max(0.02, 1 - vT - vB) };
        const mainNorm = trimMode ? trimNorm : { u: 0, v: 0, uw: 1, vh: 1 };
        items.push({ slotIdx, slot, side: "single", mainNorm, trimNorm, outWMm: mainNorm.uw * wMm, outHMm: mainNorm.vh * hMm, role: "single" });
        return;
      }

      const leftTrimNorm = { u: uL, v: vT, uw: Math.max(0.02, 0.5 - uL), vh: Math.max(0.02, 1 - vT - vB) };
      const rightTrimNorm = { u: 0.5, v: vT, uw: Math.max(0.02, 0.5 - uR), vh: Math.max(0.02, 1 - vT - vB) };
      const leftMainNorm = trimMode ? leftTrimNorm : { u: 0, v: 0, uw: 0.5, vh: 1 };
      const rightMainNorm = trimMode ? rightTrimNorm : { u: 0.5, v: 0, uw: 0.5, vh: 1 };

      const leftItem = { slotIdx, slot, side: "left", mainNorm: leftMainNorm, trimNorm: leftTrimNorm, outWMm: leftMainNorm.uw * wMm, outHMm: leftMainNorm.vh * hMm, role: "normal" };
      const rightItem = { slotIdx, slot, side: "right", mainNorm: rightMainNorm, trimNorm: rightTrimNorm, outWMm: rightMainNorm.uw * wMm, outHMm: rightMainNorm.vh * hMm, role: "normal" };

      if (state.readingDir === "rtl") items.push(rightItem, leftItem);
      else items.push(leftItem, rightItem);
    });

    if (state.moveFirstToLast && items.length >= 2) {
      const firstMoved = items.shift();
      firstMoved.role = "backCover";
      items[0].role = "frontCover";
      items.push(firstMoved);
    }

    items.forEach((it, idx) => { it.finalPageNum = idx + 1; });
    return items;
  }

  async function renderSplitSequenceGrid() {
    if (!hasPages()) return;
    const myToken = ++state.renderToken;
    const plan = computeSplitPlanForSlots(state.pages);
    el.sequenceGrid.innerHTML = "";

    for (const item of plan) {
      if (myToken !== state.renderToken) return;
      const wrap = document.createElement("div");
      wrap.className = "org-card";
      wrap.style.cursor = "default";

      const thumbBox = document.createElement("div");
      thumbBox.className = "clean-thumb-wrap";
      const cv = document.createElement("canvas");
      thumbBox.appendChild(cv);

      const cap = document.createElement("div");
      cap.className = "clean-caption";
      const pStrong = document.createElement("strong");
      pStrong.textContent = `P${item.finalPageNum}`;
      const dimTxt = document.createElement("span");
      dimTxt.textContent = `${item.outWMm.toFixed(0)}×${item.outHMm.toFixed(0)}`;
      cap.appendChild(pStrong);
      cap.appendChild(dimTxt);

      if (item.role === "frontCover" || item.role === "backCover") {
        const tag = document.createElement("span");
        tag.className = "minimal-tag";
        tag.textContent = item.role === "frontCover" ? t("frontCover") : t("backCover");
        cap.appendChild(tag);
      }

      wrap.appendChild(thumbBox);
      wrap.appendChild(cap);
      el.sequenceGrid.appendChild(wrap);

      const srcCanvas = await getSlotPreviewCanvas(item.slotIdx);
      if (myToken !== state.renderToken) return;
      const sx = Math.round(item.mainNorm.u * srcCanvas.width);
      const sy = Math.round(item.mainNorm.v * srcCanvas.height);
      const sw = Math.max(1, Math.round(item.mainNorm.uw * srcCanvas.width));
      const sh = Math.max(1, Math.round(item.mainNorm.vh * srcCanvas.height));
      cv.width = sw;
      cv.height = sh;
      cv.getContext("2d").drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    }
  }

  // =========================================================================
  // Pillar 3: Aggregated 8-Point Preflight + Pinpoint Canvas Jump Highlights
  // =========================================================================
  function buildAggregatedPreflightItems() {
    if (!hasPages()) return [];

    // Map (docId, origIdx) -> first matching slotIdx in state.pages
    const keyToSlot = new Map();
    state.pages.forEach((s, slotIdx) => {
      const k = `${s.docId}_${s.origIdx}`;
      if (!keyToSlot.has(k)) keyToSlot.set(k, slotIdx);
    });

    let isEncrypted = false;
    let nonK100Pages = 0;
    const nonK100Locs = [];
    const lowDpiLocs = [];
    const rgbImgLocs = [];
    const placedDpis = [];
    let rgbImageCount = 0;
    let rgbVectorPages = 0;
    let smaskCount = 0;
    let gradientCount = 0;
    const fontMap = new Map();

    state.docOrder.forEach((docId) => {
      const doc = state.sourceDocs.get(docId);
      if (!doc || !doc.preflight) return;
      const pf = doc.preflight;
      if (pf.isEncrypted) isEncrypted = true;

      (pf.fonts || []).forEach(([fName, emb]) => {
        if (!fontMap.has(fName) || !emb) fontMap.set(fName, emb);
      });
      rgbImageCount += pf.rgbImageCount || 0;
      rgbVectorPages += pf.rgbVectorPages || 0;
      smaskCount += pf.smaskCount || 0;
      gradientCount += pf.gradientCount || 0;

      const activeOrigSet = new Set();
      (pf.nonK100Locs || []).forEach((l) => {
        const slotIdx = keyToSlot.get(`${docId}_${l.pageIdx}`);
        if (slotIdx !== undefined) {
          activeOrigSet.add(l.pageIdx);
          nonK100Locs.push({ ...l, slotIdx, label: t("pfTagNonK100") });
        }
      });
      nonK100Pages += activeOrigSet.size;

      (pf.placedDpis || []).forEach((d) => {
        if (keyToSlot.has(`${docId}_${d.pageIdx}`)) placedDpis.push(d);
      });
      (pf.lowDpiLocs || []).forEach((l) => {
        const slotIdx = keyToSlot.get(`${docId}_${l.pageIdx}`);
        if (slotIdx !== undefined) lowDpiLocs.push({ ...l, slotIdx, label: t("pfTagLowDpi", { dpi: l.dpi }) });
      });
      (pf.rgbImgLocs || []).forEach((l) => {
        const slotIdx = keyToSlot.get(`${docId}_${l.pageIdx}`);
        if (slotIdx !== undefined) rgbImgLocs.push({ ...l, slotIdx, label: t("pfTagRgbImg") });
      });
    });

    // Bleed & Page Size uniformity across active slots
    const firstSz = getSlotSizeInfo(state.pages[0]);
    const uniformSize = state.pages.every((s) => {
      const sz = getSlotSizeInfo(s);
      return Math.abs(sz.wMm - firstSz.wMm) <= 1.0 && Math.abs(sz.hMm - firstSz.hMm) <= 1.0;
    });
    let matchedBleed = null;
    if (uniformSize) {
      for (const spec of window.ShibaPrepress.KNOWN_NET_SIZES) {
        if (Math.abs(firstSz.wMm - spec.w) <= 0.9 && Math.abs(firstSz.hMm - spec.h) <= 0.9) { matchedBleed = 0; break; }
        for (const bCand of [3, 5]) {
          if (Math.abs(firstSz.wMm - (spec.w + 2 * bCand)) <= 0.9 && Math.abs(firstSz.hMm - (spec.h + 2 * bCand)) <= 0.9) {
            matchedBleed = bCand;
            break;
          }
        }
        if (matchedBleed !== null) break;
      }
    }

    let singleEquiv = 0;
    state.pages.forEach((s) => {
      const sz = getSlotSizeInfo(s);
      singleEquiv += sz.wMm > sz.hMm ? 2 : 1;
    });

    const items = [];

    // 1. Black Text & K100
    if (nonK100Pages > 0) {
      items.push({ status: "warn", title: t("pfBlackTitle"), desc: t("pfBlackWarn", { n: nonK100Pages }), fixAction: "exportK100", locations: nonK100Locs });
    } else {
      items.push({ status: "ok", title: t("pfBlackTitle"), desc: t("pfBlackOk"), locations: [] });
    }

    // 2. Bleed & Size
    if (!uniformSize) {
      items.push({ status: "warn", title: t("pfBleedTitle"), desc: t("pfBleedMixed"), locations: [] });
    } else if (matchedBleed === 0) {
      const noBleedLocs = state.pages.map((_, slotIdx) => ({
        slotIdx, u: 0.008, v: 0.01, uw: 0.984, vh: 0.98, isPerimeter: true, label: t("pfTagNoBleed")
      }));
      items.push({ status: "warn", title: t("pfBleedTitle"), desc: t("pfBleedNone", { w: firstSz.wMm.toFixed(1), h: firstSz.hMm.toFixed(1) }), locations: noBleedLocs });
    } else if (matchedBleed > 0) {
      items.push({ status: "ok", title: t("pfBleedTitle"), desc: t("pfBleedHas", { w: firstSz.wMm.toFixed(1), h: firstSz.hMm.toFixed(1), b: matchedBleed }), locations: [] });
    } else {
      items.push({ status: "ok", title: t("pfBleedTitle"), desc: t("pfBleedCustom", { w: firstSz.wMm.toFixed(1), h: firstSz.hMm.toFixed(1) }), locations: [] });
    }

    // 3. Fonts
    const fontsArr = Array.from(fontMap.entries());
    const unembedded = fontsArr.filter(([, emb]) => !emb).map(([n]) => n);
    if (unembedded.length > 0) items.push({ status: "err", title: t("pfFontTitle"), desc: `${t("pfFontErr", { n: unembedded.length })} (${unembedded.join(", ")})`, locations: [] });
    else if (fontsArr.length === 0) items.push({ status: "ok", title: t("pfFontTitle"), desc: t("pfFontNoFonts"), locations: [] });
    else items.push({ status: "ok", title: t("pfFontTitle"), desc: t("pfFontOk", { n: fontsArr.length }), locations: [] });

    // 4. Image DPI
    if (!placedDpis.length) {
      items.push({ status: "ok", title: t("pfDpiTitle"), desc: t("pfDpiNoImg"), locations: [] });
    } else {
      const dpis = placedDpis.map((x) => x.dpi);
      const minDpi = Math.min(...dpis);
      const maxDpi = Math.max(...dpis);
      if (minDpi < 150) items.push({ status: "err", title: t("pfDpiTitle"), desc: t("pfDpiErr", { min: minDpi }), locations: lowDpiLocs });
      else if (minDpi < 250) items.push({ status: "warn", title: t("pfDpiTitle"), desc: t("pfDpiWarn", { min: minDpi }), locations: lowDpiLocs });
      else items.push({ status: "ok", title: t("pfDpiTitle"), desc: t("pfDpiOk", { n: placedDpis.length, min: minDpi, max: maxDpi }), locations: [] });
    }

    // 5. Color Space
    if (rgbImageCount > 0 || rgbVectorPages > 0) {
      items.push({ status: "warn", title: t("pfColorTitle"), desc: t("pfColorWarn", { rgbImg: rgbImageCount, rgbVec: rgbVectorPages }), locations: rgbImgLocs });
    } else {
      items.push({ status: "ok", title: t("pfColorTitle"), desc: t("pfColorOk"), locations: [] });
    }

    // 6. Transparency
    items.push({
      status: "ok",
      title: t("pfTransTitle"),
      desc: smaskCount + gradientCount > 0 ? t("pfTransOk", { smask: smaskCount, grad: gradientCount }) : t("pfTransNone"),
      locations: []
    });

    // 7. Booklet 4P Multiple
    if (singleEquiv <= 2) items.push({ status: "ok", title: t("pfBookletTitle"), desc: t("pfBookletLeaflet", { p: singleEquiv }), locations: [] });
    else if (singleEquiv % 4 === 0) items.push({ status: "ok", title: t("pfBookletTitle"), desc: t("pfBookletOk", { p: singleEquiv }), locations: [] });
    else items.push({ status: "warn", title: t("pfBookletTitle"), desc: t("pfBookletWarn", { p: singleEquiv, prev: Math.floor(singleEquiv / 4) * 4, next: Math.ceil(singleEquiv / 4) * 4 }), locations: [] });

    // 8. Encryption
    items.push({ status: isEncrypted ? "warn" : "ok", title: t("pfSecTitle"), desc: isEncrypted ? t("pfSecWarn") : t("pfSecOk"), locations: [] });

    return items;
  }

  function renderPreflightBadgeAndDrawer() {
    if (!hasPages()) {
      el.navPreflightBadge.classList.add("hidden");
      el.preflightDrawer.innerHTML = "";
      return;
    }

    const items = buildAggregatedPreflightItems();
    const errCount = items.filter((i) => i.status === "err").length;
    const warnCount = items.filter((i) => i.status === "warn").length;
    const okCount = items.filter((i) => i.status === "ok").length;
    const issueTotal = errCount + warnCount;

    el.navPreflightBadge.classList.remove("hidden", "ok", "warn", "err");
    el.navPreflightBadge.textContent = issueTotal === 0 ? "✓" : String(issueTotal);
    el.navPreflightBadge.classList.add(issueTotal === 0 ? "ok" : errCount > 0 ? "err" : "warn");

    if (state.pillar !== "preflight") return;

    el.pfScorePills.innerHTML = "";
    const addPill = (cls, txt) => {
      const sp = document.createElement("span");
      sp.className = `status-pill ${cls}`;
      sp.textContent = txt;
      el.pfScorePills.appendChild(sp);
    };
    if (errCount > 0) addPill("err", t("pfErrCount", { n: errCount }));
    if (warnCount > 0) addPill("warn", t("pfWarnCount", { n: warnCount }));
    addPill("ok", t("pfPassCount", { n: okCount }));

    el.preflightDrawer.innerHTML = "";
    items.forEach((it, idx) => {
      const card = document.createElement("div");
      const hasLocs = it.locations && it.locations.length > 0;
      card.className = "pf-card" + (hasLocs ? " clickable" : "") + (state.selectedPfCardIdx === idx ? " selected" : "");

      const head = document.createElement("div");
      head.className = "pf-card-head";
      const ic = document.createElement("span");
      ic.className = `pf-icon ${it.status}`;
      ic.style.display = "inline-flex";
      ic.innerHTML = it.status === "ok" ? ICONS["check-circle-2"] : it.status === "err" ? ICONS["x-circle"] : ICONS["alert-triangle"];
      const ttl = document.createElement("div");
      ttl.className = "pf-card-title";
      ttl.textContent = it.title;
      head.appendChild(ic);
      head.appendChild(ttl);
      card.appendChild(head);

      const desc = document.createElement("div");
      desc.className = "pf-card-desc";
      desc.textContent = it.desc;
      card.appendChild(desc);

      if (hasLocs || it.fixAction) {
        const jumpRow = document.createElement("div");
        jumpRow.className = "pf-jump-row";
        const uniqueSlots = Array.from(new Set(it.locations.map((l) => l.slotIdx))).sort((a, b) => a - b);

        uniqueSlots.slice(0, 12).forEach((sIdx) => {
          const chip = document.createElement("button");
          chip.type = "button";
          const isCur = state.selectedPfCardIdx === idx && state.activeSlotIdx === sIdx && state.activePfHighlights.length > 0;
          chip.className = "pf-jump-chip" + (isCur ? " active" : "");
          chip.innerHTML = `${ICONS["crosshair"] || ""}<span>${t("pfLocatePage", { p: sIdx + 1 })}</span>`;
          chip.addEventListener("click", (ev) => {
            ev.stopPropagation();
            jumpToPreflightIssue(idx, it.locations, sIdx);
          });
          jumpRow.appendChild(chip);
        });

        if (it.fixAction === "exportK100") {
          const fixBtn = document.createElement("button");
          fixBtn.type = "button";
          fixBtn.className = "pf-jump-chip";
          fixBtn.innerHTML = `${ICONS["wrench"] || ""}<span>${t("pfFixK100Btn")}</span>`;
          fixBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            runPrimaryTopExport();
          });
          jumpRow.appendChild(fixBtn);
        }
        card.appendChild(jumpRow);
      }

      if (hasLocs) {
        card.addEventListener("click", () => {
          jumpToPreflightIssue(idx, it.locations, it.locations[0].slotIdx);
        });
      }
      el.preflightDrawer.appendChild(card);
    });
  }

  function jumpToPreflightIssue(cardIdx, allLocs, targetSlotIdx) {
    state.selectedPfCardIdx = cardIdx;
    state.activeSlotIdx = targetSlotIdx;
    state.activePfHighlights = allLocs.filter((l) => l.slotIdx === targetSlotIdx);
    renderPreflightBadgeAndDrawer();
    renderCanvasStage();
  }

  function renderPreflightHighlightBoxes() {
    if (state.pillar !== "preflight" || !state.activePfHighlights.length) {
      el.pfHighlightOverlay.classList.add("hidden");
      el.pfHighlightOverlay.innerHTML = "";
      return;
    }
    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height;
    if (!cssW || !cssH) return;

    el.pfHighlightOverlay.classList.remove("hidden");
    el.pfHighlightOverlay.innerHTML = "";

    state.activePfHighlights.forEach((hl, i) => {
      const box = document.createElement("div");
      box.className = "pf-highlight-box" + (hl.isPerimeter ? " perimeter" : "");
      box.style.left = `${hl.u * cssW}px`;
      box.style.top = `${hl.v * cssH}px`;
      box.style.width = `${Math.max(18, hl.uw * cssW)}px`;
      box.style.height = `${Math.max(16, hl.vh * cssH)}px`;

      if (i === 0 && hl.label) {
        const tag = document.createElement("span");
        tag.className = "pf-highlight-tag";
        tag.textContent = hl.label;
        if (hl.v * cssH < 26) {
          tag.style.bottom = "auto";
          tag.style.top = "4px";
        }
        box.appendChild(tag);
      }
      el.pfHighlightOverlay.appendChild(box);
    });
  }

  // =========================================================================
  // Canvas Stage & Guides Renderer
  // =========================================================================
  function updateSplitAndK100Guides() {
    const isSplit = state.pillar === "prepress" && state.prepressSub === "split" && state.splitTab === "spread";
    const isK100 = state.pillar === "prepress" && state.prepressSub === "k100";

    if (!isSplit && !isK100) {
      el.guidesOverlay.classList.add("hidden");
      return;
    }

    const slot = getActiveSlot();
    if (!slot) return;
    const info = getSlotSizeInfo(slot);
    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height;
    if (!cssW || !cssH) return;

    el.guidesOverlay.classList.remove("hidden");

    if (isK100) {
      [el.shadeTop, el.shadeBottom, el.shadeLeft, el.shadeRight, el.trimRect, el.centerLine, el.rightBadge].forEach((n) =>
        n.classList.add("hidden")
      );
      el.leftBadge.classList.remove("hidden");
      el.leftBadge.style.left = `${cssW / 2}px`;
      el.leftBadge.textContent = t("keepBadge", { p: state.activeSlotIdx + 1, w: info.wMm.toFixed(0), h: info.hMm.toFixed(0) });
      return;
    }

    [el.shadeTop, el.shadeBottom, el.shadeLeft, el.shadeRight, el.trimRect].forEach((n) => n.classList.remove("hidden"));
    const b = state.bleed;
    const uL = Math.min(0.48, Math.max(0, b.left / info.wMm));
    const uR = Math.min(0.48, Math.max(0, b.right / info.wMm));
    const vT = Math.min(0.48, Math.max(0, b.top / info.hMm));
    const vB = Math.min(0.48, Math.max(0, b.bottom / info.hMm));
    const pxL = uL * cssW, pxR = uR * cssW, pxT = vT * cssH, pxB = vB * cssH;

    Object.assign(el.shadeTop.style, { left: "0px", top: "0px", width: `${cssW}px`, height: `${pxT}px` });
    Object.assign(el.shadeBottom.style, { left: "0px", bottom: "0px", width: `${cssW}px`, height: `${pxB}px` });
    Object.assign(el.shadeLeft.style, { left: "0px", top: `${pxT}px`, width: `${pxL}px`, height: `${Math.max(0, cssH - pxT - pxB)}px` });
    Object.assign(el.shadeRight.style, { right: "0px", top: `${pxT}px`, width: `${pxR}px`, height: `${Math.max(0, cssH - pxT - pxB)}px` });
    Object.assign(el.trimRect.style, { left: `${pxL}px`, top: `${pxT}px`, width: `${Math.max(0, cssW - pxL - pxR)}px`, height: `${Math.max(0, cssH - pxT - pxB)}px` });

    const plan = computeSplitPlanForSlots(state.pages);
    const isSpread = !state.onlyLandscape || info.wMm > info.hMm;
    if (isSpread) {
      el.centerLine.classList.remove("hidden");
      Object.assign(el.centerLine.style, { left: `${cssW / 2}px`, top: "0px", height: `${cssH}px` });
      const leftPlan = plan.find((p) => p.slotIdx === state.activeSlotIdx && p.side === "left");
      const rightPlan = plan.find((p) => p.slotIdx === state.activeSlotIdx && p.side === "right");
      if (leftPlan) {
        el.leftBadge.classList.remove("hidden");
        el.leftBadge.style.left = `${(pxL + cssW / 2) / 2}px`;
        const rTxt = leftPlan.role === "frontCover" ? ` · ${t("frontCover")}` : leftPlan.role === "backCover" ? ` · ${t("backCover")}` : "";
        el.leftBadge.textContent = `P${leftPlan.finalPageNum}${rTxt}  ${leftPlan.outWMm.toFixed(0)}×${leftPlan.outHMm.toFixed(0)}`;
      }
      if (rightPlan) {
        el.rightBadge.classList.remove("hidden");
        el.rightBadge.style.left = `${(cssW / 2 + (cssW - pxR)) / 2}px`;
        const rTxt = rightPlan.role === "frontCover" ? ` · ${t("frontCover")}` : rightPlan.role === "backCover" ? ` · ${t("backCover")}` : "";
        el.rightBadge.textContent = `P${rightPlan.finalPageNum}${rTxt}  ${rightPlan.outWMm.toFixed(0)}×${rightPlan.outHMm.toFixed(0)}`;
      }
    } else {
      el.centerLine.classList.add("hidden");
      el.rightBadge.classList.add("hidden");
      const singlePlan = plan.find((p) => p.slotIdx === state.activeSlotIdx);
      if (singlePlan) {
        el.leftBadge.classList.remove("hidden");
        el.leftBadge.style.left = `${cssW / 2}px`;
        el.leftBadge.textContent = `P${singlePlan.finalPageNum} · ${t("singleKept")}  ${singlePlan.outWMm.toFixed(0)}×${singlePlan.outHMm.toFixed(0)}`;
      }
    }
  }

  function refreshCanvasOverlays() {
    updateSplitAndK100Guides();
    renderPreflightHighlightBoxes();
    renderTextEditorOverlay();
  }

  async function renderCanvasStage() {
    if (!hasPages()) return;
    const myToken = ++state.renderToken;

    if (isImposeMode()) {
      el.guidesOverlay.classList.add("hidden");
      el.pfHighlightOverlay.classList.add("hidden");
      el.textEditOverlay.classList.add("hidden");
      el.textFmtBar.classList.add("hidden");

      const plan = getCurrentImpositionPlan();
      if (!plan.sheets.length) return;
      if (state.activeSheetIdx >= plan.sheets.length) state.activeSheetIdx = plan.sheets.length - 1;
      if (state.activeSheetIdx < 0) state.activeSheetIdx = 0;

      const sheet = plan.sheets[state.activeSheetIdx];
      const availW = Math.max(320, el.stageViewport.clientWidth - 88);
      const availH = Math.max(240, el.stageViewport.clientHeight - 112);
      state.baseFitScale = Math.min(availW / sheet.wPt, availH / sheet.hPt, 1.4);

      await window.ShibaImpose.renderImposedSheetPreview(
        el.spreadCanvas,
        sheet,
        (sIdx) => getSlotPreviewCanvas(sIdx),
        state.cropMarks,
        t("blankPad")
      );
      if (myToken !== state.renderToken) return;

      // Apply user zoom factor cleanly to imposed sheet canvas
      const cssW = Math.round(sheet.wPt * state.baseFitScale * state.zoomFactor);
      const cssH = Math.round(sheet.hPt * state.baseFitScale * state.zoomFactor);
      el.spreadCanvas.style.width = `${cssW}px`;
      el.spreadCanvas.style.height = `${cssH}px`;
      updatePagerUI();
      return;
    }

    clampActiveIndices();
    const slot = state.pages[state.activeSlotIdx];
    const docEntry = state.sourceDocs.get(slot.docId);
    const page = await docEntry.pdfJsDoc.getPage(slot.origIdx + 1);
    if (myToken !== state.renderToken) return;

    const totalRot = (docEntry.origPages[slot.origIdx].rot + slot.extraRot) % 360;
    const baseVp = page.getViewport({ scale: 1, rotation: totalRot });
    const availW = Math.max(300, el.stageViewport.clientWidth - 84);
    const availH = Math.max(240, el.stageViewport.clientHeight - 108);
    state.baseFitScale = Math.min(availW / baseVp.width, availH / baseVp.height, 1.55);

    const cssScale = state.baseFitScale * state.zoomFactor;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderVp = page.getViewport({ scale: cssScale * dpr, rotation: totalRot });
    const cssW = Math.round(baseVp.width * cssScale);
    const cssH = Math.round(baseVp.height * cssScale);

    el.spreadCanvas.width = Math.max(1, Math.round(renderVp.width));
    el.spreadCanvas.height = Math.max(1, Math.round(renderVp.height));
    el.spreadCanvas.style.width = `${cssW}px`;
    el.spreadCanvas.style.height = `${cssH}px`;

    const ctx = el.spreadCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, el.spreadCanvas.width, el.spreadCanvas.height);
    await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
    if (myToken !== state.renderToken) return;

    // Burn active edits onto non-text-edit views (Split, K100, Preflight) so user edits show everywhere!
    if (!(state.pillar === "pages" && state.pagesSub === "text") && slot.edits && slot.edits.length) {
      paintSlotEditsOntoCanvas(ctx, el.spreadCanvas.width, el.spreadCanvas.height, slot);
    }

    updatePagerUI();
    refreshCanvasOverlays();
  }

  // =========================================================================
  // Master Progressive Workspace Synchronizer
  // =========================================================================
  function updatePagerUI() {
    if (isImposeMode()) {
      const plan = getCurrentImpositionPlan();
      const total = Math.max(1, plan.sheets.length);
      el.pageIndicator.textContent = `${state.activeSheetIdx + 1} / ${total}`;
      el.prevSpreadBtn.disabled = state.activeSheetIdx <= 0;
      el.nextSpreadBtn.disabled = state.activeSheetIdx >= total - 1;
    } else {
      const total = Math.max(1, state.pages.length);
      el.pageIndicator.textContent = `${state.activeSlotIdx + 1} / ${total}`;
      el.prevSpreadBtn.disabled = state.activeSlotIdx <= 0;
      el.nextSpreadBtn.disabled = state.activeSlotIdx >= total - 1;
    }
  }

  function updateTopStripControls() {
    const loaded = hasPages();
    el.navPagesBtn.classList.toggle("active", state.pillar === "pages");
    el.navPrepressBtn.classList.toggle("active", state.pillar === "prepress");
    el.navPreflightBtn.classList.toggle("active", state.pillar === "preflight");
    el.navConvertBtn.classList.toggle("active", state.pillar === "convert");

    el.railFilesBox.classList.toggle("hidden", state.docOrder.length === 0);
    el.sidebarUploadBtn.classList.toggle("hidden", state.docOrder.length > 0);
    renderPreflightBadgeAndDrawer();

    if (!loaded) {
      el.topStrip.classList.add("hidden");
      el.preflightDrawer.classList.add("hidden");
      el.emptyStage.classList.remove("hidden");
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.convertViewPanel.classList.add("hidden");
      el.bottomPager.classList.add("hidden");
      el.textFmtBar.classList.add("hidden");
      el.stageViewport.classList.remove("align-top");
      return;
    }

    el.emptyStage.classList.add("hidden");
    el.topStrip.classList.remove("hidden");
    el.exportBtn.disabled = state.busy;

    const isPages = state.pillar === "pages";
    const isPrep = state.pillar === "prepress";
    const isPf = state.pillar === "preflight";
    const isConv = state.pillar === "convert";

    el.stripPages.classList.toggle("hidden", !isPages);
    el.stripPrepress.classList.toggle("hidden", !isPrep);
    el.stripPreflight.classList.toggle("hidden", !isPf);
    el.stripConvert.classList.toggle("hidden", !isConv);
    el.preflightDrawer.classList.toggle("hidden", !isPf);
    el.stripRightGroup.classList.toggle("hidden", isConv);

    // Pillar 1 Sub-controls
    el.subOrgBtn.classList.toggle("active", state.pagesSub === "organize");
    el.subTextBtn.classList.toggle("active", state.pagesSub === "text");
    el.orgControls.classList.toggle("hidden", state.pagesSub !== "organize");
    el.textEditControls.classList.toggle("hidden", state.pagesSub !== "text");

    const selCount = getSelectedSlots().length;
    el.selNoneBtn.classList.toggle("hidden", selCount === 0);
    el.selActionGroup.classList.toggle("hidden", selCount === 0);
    el.extractSelText.textContent = t("extractSelBtn", { n: selCount });
    el.delSelBtn.disabled = selCount >= state.pages.length;

    el.deletePageBtn.disabled = state.pages.length <= 1;
    el.undoEditBtn.classList.toggle("hidden", state.undoStack.length === 0);
    el.addTextBtn.classList.toggle("active", state.placingNewText);
    el.editHintLabel.textContent = state.placingNewText ? t("editPlaceHint") : t("editClickHint");

    // Pillar 2 Sub-controls
    el.subImposeBtn.classList.toggle("active", state.prepressSub === "impose");
    el.subSplitBtn.classList.toggle("active", state.prepressSub === "split");
    el.subK100Btn.classList.toggle("active", state.prepressSub === "k100");
    el.imposeControls.classList.toggle("hidden", state.prepressSub !== "impose");
    el.splitControls.classList.toggle("hidden", state.prepressSub !== "split");
    el.k100InlineHint.classList.toggle("hidden", state.prepressSub !== "k100");

    el.impBookletBtn.classList.toggle("active", state.imposeType === "booklet");
    el.impSpreadBtn.classList.toggle("active", state.imposeType === "spread2up");
    el.impNupBtn.classList.toggle("active", state.imposeType === "nup");
    el.nupOnlyRows.classList.toggle("hidden", state.imposeType !== "nup");
    el.firstCoverRow.classList.toggle("hidden", state.imposeType !== "spread2up");
    el.nupChips.forEach((ch) => ch.classList.toggle("active", Number(ch.dataset.nup) === state.imposeNup));

    el.tabSpreadBtn.classList.toggle("active", state.splitTab === "spread");
    el.tabSeqBtn.classList.toggle("active", state.splitTab === "sequence");
    el.splitParamsSummary.textContent = t("splitSummaryFmt", { b: state.bleed.top });
    el.bleedTrimBtn.classList.toggle("active", state.bleedAction === "trim");
    el.bleedKeepBtn.classList.toggle("active", state.bleedAction === "keep");
    el.dirLtrBtn.classList.toggle("active", state.readingDir === "ltr");
    el.dirRtlBtn.classList.toggle("active", state.readingDir === "rtl");

    // Pillar 4 Sub-controls
    el.subCompBtn.classList.toggle("active", state.convertSub === "compress");
    el.subImgBtn.classList.toggle("active", state.convertSub === "img");
    el.subImgPdfBtn.classList.toggle("active", state.convertSub === "imgpdf");
    el.panelCompress.classList.toggle("hidden", state.convertSub !== "compress");
    el.panelExportImg.classList.toggle("hidden", state.convertSub !== "img");
    el.panelImgPdf.classList.toggle("hidden", state.convertSub !== "imgpdf");

    el.imgScopeAllBtn.textContent = t("imgScopeAll", { n: state.pages.length });
    el.imgScopeSelBtn.textContent = t("imgScopeSel", { n: selCount });
    el.imgScopeSelBtn.disabled = selCount === 0;
    if (selCount === 0 && state.imgScope === "selected") state.imgScope = "all";
    el.imgScopeAllBtn.classList.toggle("active", state.imgScope === "all");
    el.imgScopeSelBtn.classList.toggle("active", state.imgScope === "selected");

    // Top-right summary & Export button label
    const curSlot = state.pages[state.activeSlotIdx];
    const curInfo = getSlotSizeInfo(curSlot);

    if (isPages) {
      el.dimSummaryText.textContent = `${curInfo.wMm.toFixed(0)}×${curInfo.hMm.toFixed(0)}mm · ${state.pages.length}${t("pagesUnit")}`;
      el.exportBtnText.textContent = state.busy ? t("exportingBtn") : t("exportMergedBtn", { n: state.pages.length });
    } else if (isPrep && state.prepressSub === "impose") {
      const impPlan = getCurrentImpositionPlan();
      const padNote =
        state.imposeType === "booklet" && impPlan.paddedTotal > state.pages.length
          ? t("bookletPadHint", { orig: state.pages.length, pad: impPlan.paddedTotal })
          : "";
      el.dimSummaryText.textContent =
        t("imposeSheetMeta", {
          s: impPlan.sheets.length,
          w: impPlan.sheetWMm.toFixed(0),
          h: impPlan.sheetHMm.toFixed(0)
        }) + padNote;
      el.exportBtnText.textContent = state.busy ? t("exportingBtn") : t("imposeExportBtn");
    } else if (isPrep && state.prepressSub === "split") {
      const spPlan = computeSplitPlanForSlots(state.pages);
      const s0 = spPlan[0] || { outWMm: curInfo.wMm, outHMm: curInfo.hMm };
      el.dimSummaryText.textContent = `${s0.outWMm.toFixed(0)}×${s0.outHMm.toFixed(0)}mm · ${spPlan.length}${t("pagesUnit")}`;
      el.exportBtnText.textContent = state.busy ? t("exportingBtn") : t("exportSplitBtn");
    } else {
      el.dimSummaryText.textContent = `${curInfo.wMm.toFixed(0)}×${curInfo.hMm.toFixed(0)}mm · ${state.pages.length}${t("pagesUnit")}`;
      el.exportBtnText.textContent = state.busy ? t("exportingBtn") : t("exportKeepBtn");
    }
  }

  function refreshWorkspace(rerenderStage) {
    clampActiveIndices();
    updateTopStripControls();
    if (!hasPages()) return;

    const showOrgGrid = state.pillar === "pages" && state.pagesSub === "organize";
    const showSplitGrid = state.pillar === "prepress" && state.prepressSub === "split" && state.splitTab === "sequence";
    const showConvert = state.pillar === "convert";
    const showCanvas = !showOrgGrid && !showSplitGrid && !showConvert;

    el.stageViewport.classList.toggle("align-top", showOrgGrid || showSplitGrid || showConvert);
    el.spreadViewContainer.classList.toggle("hidden", !showCanvas);
    el.sequenceGrid.classList.toggle("hidden", !(showOrgGrid || showSplitGrid));
    el.convertViewPanel.classList.toggle("hidden", !showConvert);
    el.bottomPager.classList.toggle("hidden", !showCanvas);
    if (!showCanvas || state.pillar !== "pages" || state.pagesSub !== "text") {
      el.textFmtBar.classList.add("hidden");
    }

    if (!rerenderStage) return;
    if (showOrgGrid) renderOrganizeGrid();
    else if (showSplitGrid) renderSplitSequenceGrid();
    else if (showCanvas) renderCanvasStage();
  }

  // =========================================================================
  // Lossless Vector PDF Assembly Engine (Edits + Rotation + K100 + Split/Impose)
  // =========================================================================
  function hexToRgb01(hex) {
    const h = (hex || "#000000").replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255
    };
  }

  // Render user text edit at ~430 DPI with exact alphabetic baseline & zero-offset padding compensation!
  function renderTextEditStampPng(ed) {
    const scale = 6;
    const lines = (ed.text || "").split("\n");
    const fontPx = Math.max(7, ed.fontPt) * scale;
    const lineH = fontPx * 1.14;
    const ascRatio = ed.ascent || 0.84;
    const padPx = Math.ceil(fontPx * 0.14);
    const fontSpec = `${ed.italic ? "italic " : ""}${ed.bold ? "700" : "400"} ${fontPx}px ${window.ShibaPrepress.getCssFontStack(ed.fontKey)}`;

    const mCv = document.createElement("canvas");
    const mCtx = mCv.getContext("2d");
    mCtx.font = fontSpec;
    let maxW = 8;
    lines.forEach((ln) => {
      maxW = Math.max(maxW, mCtx.measureText(ln || " ").width);
    });

    const cv = document.createElement("canvas");
    cv.width = Math.ceil(maxW + padPx * 2);
    cv.height = Math.ceil(lines.length * lineH + padPx * 2);
    const ctx = cv.getContext("2d");

    if (!ed.origRect && ed.maskBg) {
      ctx.fillStyle = ed.bgColor || "#ffffff";
      ctx.fillRect(padPx - 2 * scale, padPx - scale, maxW + 4 * scale, lines.length * lineH + 2 * scale);
    }

    ctx.font = fontSpec;
    ctx.fillStyle = ed.color || "#181817";
    ctx.textBaseline = "alphabetic";
    lines.forEach((ln, idx) => {
      ctx.fillText(ln, padPx, padPx + fontPx * ascRatio + idx * lineH);
    });

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

  function normVisualToPdfRect(rawCrop, rotDeg, norm) {
    const x0 = rawCrop.x, y0 = rawCrop.y, rw = rawCrop.width, rh = rawCrop.height;
    const rot = ((rotDeg % 360) + 360) % 360;
    if (rot === 90) return { x: x0 + norm.v * rw, y: y0 + norm.u * rh, w: norm.vh * rw, h: norm.uw * rh };
    if (rot === 180) return { x: x0 + (1 - norm.u - norm.uw) * rw, y: y0 + norm.v * rh, w: norm.uw * rw, h: norm.vh * rh };
    if (rot === 270) return { x: x0 + (1 - norm.v - norm.vh) * rw, y: y0 + (1 - norm.u - norm.uw) * rh, w: norm.vh * rw, h: norm.uw * rh };
    return { x: x0 + norm.u * rw, y: y0 + (1 - norm.v - norm.vh) * rh, w: norm.uw * rw, h: norm.vh * rh };
  }

  // Assemble an array of slots into a clean vector PDFDocument (applying Pure K100, rotations & text edits!)
  async function assembleSlotsPdfDoc(slots, applyK100) {
    const outDoc = await PDFLib.PDFDocument.create();

    // Load each needed source PDFDocument once so shared XObjects/fonts aren't duplicated!
    const neededDocIds = Array.from(new Set(slots.map((s) => s.docId)));
    const loadedSrcMap = new Map();
    for (const dId of neededDocIds) {
      const entry = state.sourceDocs.get(dId);
      const doc = await PDFLib.PDFDocument.load(entry.rawBytes, { ignoreEncryption: true });
      if (applyK100) window.ShibaPrepress.applyPureBlackK100ToDoc(doc);
      loadedSrcMap.set(dId, doc);
    }

    // Batch copyPages per source document to keep PDF object references deduplicated
    const copiedByDoc = new Map();
    for (const dId of neededDocIds) {
      const srcDoc = loadedSrcMap.get(dId);
      const indices = [];
      const slotMap = [];
      slots.forEach((s, idx) => {
        if (s.docId === dId) {
          indices.push(s.origIdx);
          slotMap.push(idx);
        }
      });
      const copied = await outDoc.copyPages(srcDoc, indices);
      copiedByDoc.set(dId, { copied, slotMap });
    }

    const finalPages = new Array(slots.length);
    for (const [, bundle] of copiedByDoc.entries()) {
      bundle.copied.forEach((pg, k) => {
        finalPages[bundle.slotMap[k]] = pg;
      });
    }

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const pg = finalPages[i];
      outDoc.addPage(pg);

      const baseRot = pg.getRotation().angle || 0;
      const totalRot = (baseRot + slot.extraRot) % 360;
      pg.setRotation(PDFLib.degrees(totalRot));

      if (slot.edits && slot.edits.length) {
        const crop = pg.getCropBox();
        for (const ed of slot.edits) {
          if (ed.maskBg && ed.origRect) {
            const r = normVisualToPdfRect(crop, totalRot, ed.origRect);
            const bg = hexToRgb01(ed.bgColor);
            const isWhite = bg.r > 0.96 && bg.g > 0.96 && bg.b > 0.96;
            pg.drawRectangle({
              x: r.x - 1,
              y: r.y - 1,
              width: r.w + 2,
              height: r.h + 2,
              color: isWhite ? PDFLib.cmyk(0, 0, 0, 0) : PDFLib.rgb(bg.r, bg.g, bg.b)
            });
          }

          if (ed.text && ed.text.trim().length > 0) {
            const stamp = renderTextEditStampPng(ed);
            const pngImg = await outDoc.embedPng(stamp.bytes);
            const posRect = normVisualToPdfRect(crop, totalRot, {
              u: ed.u,
              v: ed.v,
              uw: stamp.ptW / Math.max(1, crop.width),
              vh: stamp.ptH / Math.max(1, crop.height)
            });
            pg.drawImage(pngImg, {
              x: posRect.x - stamp.padPt,
              y: posRect.y + stamp.padPt,
              width: stamp.ptW,
              height: stamp.ptH
            });
          }
        }
      }
    }

    return outDoc;
  }

  async function exportSplitSpreadsPdfBytes(slots) {
    // First prepare clean rotated/edited/K100 source doc for slots
    const prepDoc = await assembleSlotsPdfDoc(slots, state.pureBlackK100);
    const plan = computeSplitPlanForSlots(slots);

    const outDoc = await PDFLib.PDFDocument.create();
    const copyIndices = plan.map((it) => it.slotIdx);
    const copied = await outDoc.copyPages(prepDoc, copyIndices);

    copied.forEach((pdfPage, idx) => {
      const item = plan[idx];
      const srcPage = prepDoc.getPage(item.slotIdx);
      const rawCrop = srcPage.getCropBox();
      const rot = srcPage.getRotation().angle || 0;

      const mainBox = normVisualToPdfRect(rawCrop, rot, item.mainNorm);
      const trimBox = normVisualToPdfRect(rawCrop, rot, item.trimNorm);

      pdfPage.setMediaBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
      pdfPage.setCropBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
      pdfPage.setBleedBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
      pdfPage.setTrimBox(trimBox.x, trimBox.y, trimBox.w, trimBox.h);
      pdfPage.setArtBox(trimBox.x, trimBox.y, trimBox.w, trimBox.h);
      outDoc.addPage(pdfPage);
    });

    return await outDoc.save();
  }

  async function runPrimaryTopExport() {
    if (!hasPages() || state.busy) return;
    state.busy = true;
    updateTopStripControls();

    try {
      const stem = getPrimaryStem();

      if (state.pillar === "pages") {
        const doc = await assembleSlotsPdfDoc(state.pages, false);
        const bytes = await doc.save();
        triggerDownloadBlob(new Blob([bytes], { type: "application/pdf" }), `${stem}.pdf`);
      } else if (state.pillar === "prepress" && state.prepressSub === "impose") {
        const prepDoc = await assembleSlotsPdfDoc(state.pages, state.imposeK100);
        const plan = getCurrentImpositionPlan();
        const bytes = await window.ShibaImpose.exportImposedPdfBytes(prepDoc, plan, state.cropMarks);
        const suffix = state.imposeType === "booklet" ? "_骑马钉拼版" : state.imposeType === "spread2up" ? "_跨页拼版" : `_${state.imposeNup}拼大版`;
        triggerDownloadBlob(new Blob([bytes], { type: "application/pdf" }), `${stem}${suffix}.pdf`);
      } else if (state.pillar === "prepress" && state.prepressSub === "split") {
        const bytes = await exportSplitSpreadsPdfBytes(state.pages);
        const outName = stem.includes("对页")
          ? stem.replace("对页", "单页") + ".pdf"
          : stem.includes("跨页")
            ? stem.replace("跨页", "单页") + ".pdf"
            : `${stem}(单页).pdf`;
        triggerDownloadBlob(new Blob([bytes], { type: "application/pdf" }), outName);
      } else {
        // Pure K100 (either Prepress -> K100 or Preflight -> Export K100)
        const doc = await assembleSlotsPdfDoc(state.pages, true);
        const bytes = await doc.save();
        triggerDownloadBlob(new Blob([bytes], { type: "application/pdf" }), `${stem}_K100.pdf`);
      }
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      state.busy = false;
      updateTopStripControls();
    }
  }

  // =========================================================================
  // Event Bindings Across All 4 Pillars & Popovers
  // =========================================================================
  el.themeBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
  });

  el.langBtn.addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    applyLanguage();
  });

  // Left 4 Pillars
  function switchPillar(p) {
    if (state.pillar === p) return;
    state.pillar = p;
    state.placingNewText = false;
    state.selectedTextId = null;
    closeAllPopovers();
    refreshWorkspace(true);
  }

  el.navPagesBtn.addEventListener("click", () => switchPillar("pages"));
  el.navPrepressBtn.addEventListener("click", () => switchPillar("prepress"));
  el.navPreflightBtn.addEventListener("click", () => switchPillar("preflight"));
  el.navConvertBtn.addEventListener("click", () => switchPillar("convert"));

  // File Inputs & Global Drag-and-Drop Merge
  [el.sidebarUploadBtn, el.addMoreBtn, el.dropzone].forEach((btn) => {
    btn.addEventListener("click", () => el.fileInput.click());
  });

  el.fileInput.addEventListener("change", (ev) => {
    if (ev.target.files && ev.target.files.length) {
      loadPdfFiles(ev.target.files);
      ev.target.value = "";
    }
  });

  el.clearAllBtn.addEventListener("click", () => {
    state.sourceDocs.clear();
    state.docOrder = [];
    state.pages = [];
    state.undoStack = [];
    state.bitmapCache.clear();
    state.selectedTextId = null;
    state.activePfHighlights = [];
    renderFileList();
    refreshWorkspace(true);
  });

  window.addEventListener("dragover", (ev) => {
    if (state.draggingOrgIdx >= 0) return;
    ev.preventDefault();
    el.dropzone.classList.add("dragover");
  });

  window.addEventListener("dragleave", () => {
    el.dropzone.classList.remove("dragover");
  });

  window.addEventListener("drop", (ev) => {
    if (state.draggingOrgIdx >= 0) return;
    ev.preventDefault();
    el.dropzone.classList.remove("dragover");
    if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
      loadPdfFiles(ev.dataTransfer.files);
    }
  });

  // Offline Single-File App Download
  el.downloadOfflineBtn.addEventListener("click", () => {
    const blob = new Blob([BOOT_CLEAN_HTML], { type: "text/html;charset=utf-8" });
    triggerDownloadBlob(blob, "ShibaPDF_Offline_Studio.html");
  });

  // Pillar 1 Sub-tabs & Organize Selection Actions
  el.subOrgBtn.addEventListener("click", () => {
    state.pagesSub = "organize";
    state.placingNewText = false;
    state.selectedTextId = null;
    refreshWorkspace(true);
  });

  el.subTextBtn.addEventListener("click", () => {
    state.pagesSub = "text";
    refreshWorkspace(true);
  });

  el.selAllBtn.addEventListener("click", () => {
    const allSel = state.pages.every((s) => s.selected);
    state.pages.forEach((s) => { s.selected = !allSel; });
    syncOrganizeSelectionUI();
  });

  el.selNoneBtn.addEventListener("click", () => {
    state.pages.forEach((s) => { s.selected = false; });
    syncOrganizeSelectionUI();
  });

  el.rotSelBtn.addEventListener("click", () => {
    const sel = getSelectedSlots();
    if (!sel.length) return;
    pushUndo();
    sel.forEach((s) => { s.extraRot = (s.extraRot + 90) % 360; });
    refreshWorkspace(true);
  });

  el.delSelBtn.addEventListener("click", () => {
    const sel = getSelectedSlots();
    if (!sel.length || sel.length >= state.pages.length) return;
    pushUndo();
    state.pages = state.pages.filter((s) => !s.selected);
    clampActiveIndices();
    renderFileList();
    refreshWorkspace(true);
  });

  el.extractSelBtn.addEventListener("click", async () => {
    const sel = getSelectedSlots();
    if (!sel.length || state.busy) return;
    state.busy = true;
    updateTopStripControls();
    try {
      const doc = await assembleSlotsPdfDoc(sel, false);
      const bytes = await doc.save();
      triggerDownloadBlob(new Blob([bytes], { type: "application/pdf" }), `${getPrimaryStem()}_extracted_${sel.length}p.pdf`);
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      state.busy = false;
      updateTopStripControls();
    }
  });

  el.imgSelBtn.addEventListener("click", async () => {
    const sel = getSelectedSlots();
    if (!sel.length || state.busy) return;
    state.busy = true;
    updateTopStripControls();
    try {
      const res = await window.ShibaConvert.exportSlotsAsImages(state.sourceDocs, sel, `${getPrimaryStem()}_selected`, "png", 300);
      triggerDownloadBlob(res.blob, res.filename);
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      state.busy = false;
      updateTopStripControls();
    }
  });

  // Text Edit Controls & Floating Format Bar
  el.addTextBtn.addEventListener("click", () => {
    state.placingNewText = !state.placingNewText;
    state.selectedTextId = null;
    updateTopStripControls();
    renderTextEditorOverlay();
  });

  el.textEditOverlay.addEventListener("click", (ev) => {
    if (ev.target !== el.textEditOverlay) return;
    const slot = getActiveSlot();
    if (!slot) return;

    if (state.placingNewText) {
      const rect = el.textEditOverlay.getBoundingClientRect();
      const u = Math.min(0.92, Math.max(0.02, (ev.clientX - rect.left) / rect.width));
      const v = Math.min(0.92, Math.max(0.02, (ev.clientY - rect.top) / rect.height));
      pushUndo();
      const newEd = {
        id: `ed_${Date.now()}`,
        origId: null,
        origRect: null,
        u,
        v,
        boxWidthU: null,
        text: t("newTextDefault"),
        fontPt: 16,
        ascent: 0.84,
        bold: false,
        italic: false,
        fontKey: "sans",
        color: "#181817",
        maskBg: false,
        bgColor: "#ffffff"
      };
      slot.edits.push(newEd);
      state.placingNewText = false;
      state.selectedTextId = newEd.id;
      updateTopStripControls();
      renderTextEditorOverlay();
      focusSelectedEditorNode();
    } else if (state.selectedTextId) {
      state.selectedTextId = null;
      renderTextEditorOverlay();
    }
  });

  el.rotatePageBtn.addEventListener("click", () => {
    const slot = getActiveSlot();
    if (!slot) return;
    pushUndo();
    slot.extraRot = (slot.extraRot + 90) % 360;
    state.selectedTextId = null;
    refreshWorkspace(true);
  });

  el.deletePageBtn.addEventListener("click", () => {
    if (state.pages.length <= 1) return;
    pushUndo();
    state.pages.splice(state.activeSlotIdx, 1);
    clampActiveIndices();
    state.selectedTextId = null;
    renderFileList();
    refreshWorkspace(true);
  });

  el.undoEditBtn.addEventListener("click", () => {
    if (!state.undoStack.length) return;
    state.pages = JSON.parse(state.undoStack.pop());
    clampActiveIndices();
    state.selectedTextId = null;
    renderFileList();
    refreshWorkspace(true);
  });

  el.fmtFontSelect.addEventListener("change", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    pushUndo();
    ed.fontKey = el.fmtFontSelect.value;
    renderTextEditorOverlay();
  });

  el.fmtSmallerBtn.addEventListener("click", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.fontPt = Math.max(6, Math.round((ed.fontPt - 1.5) * 10) / 10);
    renderTextEditorOverlay();
  });

  el.fmtLargerBtn.addEventListener("click", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.fontPt = Math.min(140, Math.round((ed.fontPt + 1.5) * 10) / 10);
    renderTextEditorOverlay();
  });

  el.fmtBoldBtn.addEventListener("click", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.bold = !ed.bold;
    renderTextEditorOverlay();
  });

  el.fmtItalicBtn.addEventListener("click", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.italic = !ed.italic;
    renderTextEditorOverlay();
  });

  el.fmtColorInput.addEventListener("input", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.color = el.fmtColorInput.value;
    renderTextEditorOverlay();
  });

  el.fmtMaskCheck.addEventListener("change", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.maskBg = el.fmtMaskCheck.checked;
    renderTextEditorOverlay();
  });

  el.fmtBgInput.addEventListener("input", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.bgColor = el.fmtBgInput.value;
    ed.maskBg = true;
    el.fmtMaskCheck.checked = true;
    renderTextEditorOverlay();
  });

  el.fmtDeleteNodeBtn.addEventListener("click", () => {
    const slot = getActiveSlot();
    const ed = getSelectedEditObj();
    if (!slot || !ed) return;
    pushUndo();
    if (ed.origRect) {
      ed.text = "";
      ed.maskBg = true;
    } else {
      slot.edits = slot.edits.filter((x) => x.id !== ed.id);
    }
    state.selectedTextId = null;
    updateTopStripControls();
    renderTextEditorOverlay();
  });

  // Pillar 2: Impose & Split Controls + Popovers
  function closeAllPopovers() {
    el.imposePopover.classList.add("hidden");
    el.splitParamsPopover.classList.add("hidden");
  }

  document.addEventListener("click", (ev) => {
    if (!el.imposePopover.contains(ev.target) && !el.imposeParamsBtn.contains(ev.target)) {
      el.imposePopover.classList.add("hidden");
    }
    if (!el.splitParamsPopover.contains(ev.target) && !el.splitParamsBtn.contains(ev.target)) {
      el.splitParamsPopover.classList.add("hidden");
    }
  });

  el.subImposeBtn.addEventListener("click", () => {
    state.prepressSub = "impose";
    state.activeSheetIdx = 0;
    closeAllPopovers();
    refreshWorkspace(true);
  });

  el.subSplitBtn.addEventListener("click", () => {
    state.prepressSub = "split";
    closeAllPopovers();
    refreshWorkspace(true);
  });

  el.subK100Btn.addEventListener("click", () => {
    state.prepressSub = "k100";
    closeAllPopovers();
    refreshWorkspace(true);
  });

  el.impBookletBtn.addEventListener("click", () => {
    state.imposeType = "booklet";
    state.activeSheetIdx = 0;
    refreshWorkspace(true);
  });

  el.impSpreadBtn.addEventListener("click", () => {
    state.imposeType = "spread2up";
    state.activeSheetIdx = 0;
    refreshWorkspace(true);
  });

  el.impNupBtn.addEventListener("click", () => {
    state.imposeType = "nup";
    state.activeSheetIdx = 0;
    refreshWorkspace(true);
  });

  el.imposeParamsBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    el.splitParamsPopover.classList.add("hidden");
    el.imposePopover.classList.toggle("hidden");
  });

  el.nupChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.imposeNup = Number(chip.dataset.nup) || 4;
      state.activeSheetIdx = 0;
      refreshWorkspace(true);
    });
  });

  el.sheetPresetSelect.addEventListener("change", () => {
    state.sheetPreset = el.sheetPresetSelect.value;
    refreshWorkspace(true);
  });

  el.gutterInput.addEventListener("input", () => {
    state.gutterMm = Math.max(0, Math.min(40, parseFloat(el.gutterInput.value) || 0));
    refreshWorkspace(true);
  });

  el.firstCoverCheck.addEventListener("change", () => {
    state.firstCoverAlone = el.firstCoverCheck.checked;
    state.activeSheetIdx = 0;
    refreshWorkspace(true);
  });

  el.cropMarksCheck.addEventListener("change", () => {
    state.cropMarks = el.cropMarksCheck.checked;
    refreshWorkspace(true);
  });

  el.imposeK100Check.addEventListener("change", () => {
    state.imposeK100 = el.imposeK100Check.checked;
  });

  // Split Spreads Sub-controls
  el.tabSpreadBtn.addEventListener("click", () => {
    state.splitTab = "spread";
    refreshWorkspace(true);
  });

  el.tabSeqBtn.addEventListener("click", () => {
    state.splitTab = "sequence";
    refreshWorkspace(true);
  });

  el.splitParamsBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    el.imposePopover.classList.add("hidden");
    el.splitParamsPopover.classList.toggle("hidden");
  });

  function setUniformBleed(val) {
    const v = Math.max(0, Math.min(50, val));
    state.bleed = { top: v, bottom: v, left: v, right: v };
    el.bleedUniformInput.value = String(v);
    el.bleedTopInput.value = String(v);
    el.bleedBottomInput.value = String(v);
    el.bleedLeftInput.value = String(v);
    el.bleedRightInput.value = String(v);
    el.presetChips.forEach((c) => c.classList.toggle("active", parseFloat(c.dataset.bleed) === v));
    refreshWorkspace(state.splitTab === "sequence");
    if (state.splitTab === "spread") updateSplitAndK100Guides();
  }

  el.presetChips.forEach((chip) => {
    chip.addEventListener("click", () => setUniformBleed(parseFloat(chip.dataset.bleed) || 0));
  });

  el.bleedUniformInput.addEventListener("input", () => setUniformBleed(parseFloat(el.bleedUniformInput.value) || 0));

  el.toggleQuadLink.addEventListener("click", () => {
    el.quadGridPop.classList.toggle("hidden");
  });

  [
    ["top", el.bleedTopInput],
    ["bottom", el.bleedBottomInput],
    ["left", el.bleedLeftInput],
    ["right", el.bleedRightInput]
  ].forEach(([side, inp]) => {
    inp.addEventListener("input", () => {
      state.bleed[side] = Math.max(0, Math.min(50, parseFloat(inp.value) || 0));
      el.presetChips.forEach((c) => c.classList.remove("active"));
      refreshWorkspace(state.splitTab === "sequence");
      if (state.splitTab === "spread") updateSplitAndK100Guides();
    });
  });

  el.moveFirstCheck.addEventListener("change", () => {
    state.moveFirstToLast = el.moveFirstCheck.checked;
    refreshWorkspace(state.splitTab === "sequence");
    if (state.splitTab === "spread") updateSplitAndK100Guides();
  });

  el.pureBlackCheck.addEventListener("change", () => {
    state.pureBlackK100 = el.pureBlackCheck.checked;
  });

  el.onlyLandscapeCheck.addEventListener("change", () => {
    state.onlyLandscape = el.onlyLandscapeCheck.checked;
    refreshWorkspace(state.splitTab === "sequence");
    if (state.splitTab === "spread") updateSplitAndK100Guides();
  });

  el.bleedTrimBtn.addEventListener("click", () => {
    state.bleedAction = "trim";
    refreshWorkspace(state.splitTab === "sequence");
    if (state.splitTab === "spread") updateSplitAndK100Guides();
  });

  el.bleedKeepBtn.addEventListener("click", () => {
    state.bleedAction = "keep";
    refreshWorkspace(state.splitTab === "sequence");
    if (state.splitTab === "spread") updateSplitAndK100Guides();
  });

  el.dirLtrBtn.addEventListener("click", () => {
    state.readingDir = "ltr";
    refreshWorkspace(state.splitTab === "sequence");
    if (state.splitTab === "spread") updateSplitAndK100Guides();
  });

  el.dirRtlBtn.addEventListener("click", () => {
    state.readingDir = "rtl";
    refreshWorkspace(state.splitTab === "sequence");
    if (state.splitTab === "spread") updateSplitAndK100Guides();
  });

  // Pillar 4: Convert & Compress Controls
  el.subCompBtn.addEventListener("click", () => {
    state.convertSub = "compress";
    refreshWorkspace(false);
  });

  el.subImgBtn.addEventListener("click", () => {
    state.convertSub = "img";
    refreshWorkspace(false);
  });

  el.subImgPdfBtn.addEventListener("click", () => {
    state.convertSub = "imgpdf";
    refreshWorkspace(false);
  });

  el.compCards.forEach((card) => {
    card.addEventListener("click", () => {
      state.compPreset = card.dataset.preset || "balanced";
      el.compCards.forEach((c) => c.classList.toggle("active", c === card));
    });
  });

  el.compKeepVecCheck.addEventListener("change", () => {
    state.compKeepVec = el.compKeepVecCheck.checked;
  });

  el.runCompressBtn.addEventListener("click", async () => {
    if (!hasPages() || state.busy) return;
    state.busy = true;
    el.runCompressBtn.disabled = true;
    el.compResultBox.classList.add("hidden");

    try {
      const prepDoc = await assembleSlotsPdfDoc(state.pages, false);
      const prepBytes = await prepDoc.save();
      let origSizeBytes = prepBytes.length;
      if (state.docOrder.length === 1) {
        const d0 = state.sourceDocs.get(state.docOrder[0]);
        if (d0 && state.pages.length === d0.origPages.length) origSizeBytes = Math.max(origSizeBytes, d0.size);
      }

      const outBytes = await window.ShibaConvert.compressPreparedPdfBytes(
        prepBytes,
        state.sourceDocs,
        state.pages,
        state.compPreset,
        state.compKeepVec,
        (c, tot) => {
          el.runCompressText.textContent = t("progressWorking", { c, t: tot });
        }
      );

      const finalBytes = outBytes.length < origSizeBytes ? outBytes : prepBytes;
      const origMb = (origSizeBytes / (1024 * 1024)).toFixed(2);
      const outMb = (finalBytes.length / (1024 * 1024)).toFixed(2);
      const savedPct = Math.max(0, Math.round((1 - finalBytes.length / Math.max(1, origSizeBytes)) * 100));

      el.compResultBox.textContent = t("compResultBanner", { orig: origMb, out: outMb, pct: savedPct });
      el.compResultBox.classList.remove("hidden");

      triggerDownloadBlob(new Blob([finalBytes], { type: "application/pdf" }), `${getPrimaryStem()}_compressed.pdf`);
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      state.busy = false;
      el.runCompressBtn.disabled = false;
      el.runCompressText.textContent = t("compRunBtn");
      updateTopStripControls();
    }
  });

  el.imgFmtChips.forEach((ch) => {
    ch.addEventListener("click", () => {
      state.imgFmt = ch.dataset.fmt || "png";
      el.imgFmtChips.forEach((x) => x.classList.toggle("active", x === ch));
    });
  });

  el.imgDpiChips.forEach((ch) => {
    ch.addEventListener("click", () => {
      state.imgDpi = Number(ch.dataset.dpi) || 300;
      el.imgDpiChips.forEach((x) => x.classList.toggle("active", x === ch));
    });
  });

  el.imgScopeAllBtn.addEventListener("click", () => {
    state.imgScope = "all";
    updateTopStripControls();
  });

  el.imgScopeSelBtn.addEventListener("click", () => {
    if (getSelectedSlots().length > 0) {
      state.imgScope = "selected";
      updateTopStripControls();
    }
  });

  el.runExportImgBtn.addEventListener("click", async () => {
    if (!hasPages() || state.busy) return;
    const targetSlots = state.imgScope === "selected" && getSelectedSlots().length ? getSelectedSlots() : state.pages;
    state.busy = true;
    el.runExportImgBtn.disabled = true;

    try {
      const res = await window.ShibaConvert.exportSlotsAsImages(
        state.sourceDocs,
        targetSlots,
        getPrimaryStem(),
        state.imgFmt,
        state.imgDpi,
        (c, tot) => {
          el.runExportImgText.textContent = t("progressWorking", { c, t: tot });
        }
      );
      triggerDownloadBlob(res.blob, res.filename);
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      state.busy = false;
      el.runExportImgBtn.disabled = false;
      el.runExportImgText.textContent = t("imgRunBtn");
      updateTopStripControls();
    }
  });

  el.imgPdfDpiChips.forEach((ch) => {
    ch.addEventListener("click", () => {
      state.imgPdfDpi = Number(ch.dataset.dpi) || 220;
      el.imgPdfDpiChips.forEach((x) => x.classList.toggle("active", x === ch));
    });
  });

  el.runImgPdfBtn.addEventListener("click", async () => {
    if (!hasPages() || state.busy) return;
    state.busy = true;
    el.runImgPdfBtn.disabled = true;

    try {
      const bytes = await window.ShibaConvert.buildRasterizedPdfBytes(
        state.sourceDocs,
        state.pages,
        state.imgPdfDpi,
        0.88,
        (c, tot) => {
          el.runImgPdfText.textContent = t("progressWorking", { c, t: tot });
        }
      );
      triggerDownloadBlob(new Blob([bytes], { type: "application/pdf" }), `${getPrimaryStem()}_image_locked.pdf`);
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      state.busy = false;
      el.runImgPdfBtn.disabled = false;
      el.runImgPdfText.textContent = t("imgPdfRunBtn");
      updateTopStripControls();
    }
  });

  // Top Export & Bottom Pager / Zoom
  el.exportBtn.addEventListener("click", runPrimaryTopExport);

  el.prevSpreadBtn.addEventListener("click", () => {
    if (isImposeMode()) {
      if (state.activeSheetIdx > 0) {
        state.activeSheetIdx--;
        renderCanvasStage();
      }
    } else if (state.activeSlotIdx > 0) {
      state.activeSlotIdx--;
      state.selectedTextId = null;
      state.activePfHighlights = [];
      renderCanvasStage();
    }
  });

  el.nextSpreadBtn.addEventListener("click", () => {
    if (isImposeMode()) {
      const plan = getCurrentImpositionPlan();
      if (state.activeSheetIdx < plan.sheets.length - 1) {
        state.activeSheetIdx++;
        renderCanvasStage();
      }
    } else if (state.activeSlotIdx < state.pages.length - 1) {
      state.activeSlotIdx++;
      state.selectedTextId = null;
      state.activePfHighlights = [];
      renderCanvasStage();
    }
  });

  el.zoomOutBtn.addEventListener("click", () => setSmoothZoom(state.zoomFactor / 1.18));
  el.zoomInBtn.addEventListener("click", () => setSmoothZoom(state.zoomFactor * 1.18));
  el.zoomFitBtn.addEventListener("click", () => setSmoothZoom(1.0));

  window.addEventListener("resize", () => {
    if (hasPages() && !el.spreadViewContainer.classList.contains("hidden")) {
      clearTimeout(state.wheelRenderTimer);
      state.wheelRenderTimer = setTimeout(() => renderCanvasStage(), 150);
    }
  });

  // Initialize App
  applyTheme();
  applyLanguage();
})();
