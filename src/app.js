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

    // Navigation: 4 Collapsible Left Groups ('pages' | 'prepress' | 'preflight' | 'convert')
    pillar: "pages",
    openGroups: { pages: true, prepress: false, convert: false },
    pagesSub: "organize", // 'organize' | 'text' | 'annotate'
    prepressSub: "impose", // 'impose' | 'split' | 'k100'
    convertSub: "compress", // 'compress' | 'img' | 'imgpdf'

    // Unified Multi-PDF Workspace
    sourceDocs: new Map(), // docId -> { id, name, size, rawBytes, pdfJsDoc, origPages, preflight }
    docOrder: [], // [docId]
    pages: [], // [{ uid, docId, origIdx, extraRot, selected, edits }]
    undoStack: [],
    bitmapCache: new Map(),
    activeSlotIdx: 0,
    previewSlotIdx: 0,
    orgGridScale: 1.0,
    orgPreviewOpen: localStorage.getItem("shibapdf_org_prev") !== "0",
    lastClickedOrgIdx: -1,
    draggingOrgIdx: -1,

    // Content Editor State (Text, Images, Multi-Selection & Right Inspector)
    editPropsOpen: localStorage.getItem("shibapdf_edit_props") !== "0",
    placingNewText: false,
    selectedTextId: null,
    selectedOrigImgId: null,
    selectedImgEditId: null,
    multiSelection: [], // [{ kind: 'text' | 'img', id }]
    suppressNextOverlayClick: false,
    textSessionInitial: null,
    abortAnnDrawFn: null,
    imgInputMode: "replace",

    // Browser IndexedDB Workspace Cache State
    bootRestoreDone: false,
    cacheSaved: false,
    cacheRestoredMsg: false,
    saveCacheTimer: null,

    // Freeform Designer Annotation Board State
    annotations: [],
    annUndoStack: [],
    annTool: "rect", // 'pan' | 'select' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'note'
    annColor: "#e03e3e",
    annStrokeW: 3.5,
    selectedAnnId: null,
    annPanX: 48,
    annPanY: 36,
    annScale: 0.72,
    annNeedsFit: true,
    spacePressed: false,
    dragDepth: 0,

    // Imposition State (Default Multi-Sheet Grid Overview + Smart Reader-Spread Auto-Split)
    imposeView: "grid", // 'grid' | 'single'
    imposeGridScale: 1.0,
    imposeAutoSplitSpreads: true,
    imposeSpreadFirstBackFront: true,
    imposeSpreadBleedMm: 0,
    hiResSlotCache: new Map(),
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

    // Preflight & PDF Document Info Modal State
    activePfHighlights: [],
    selectedPfCardIdx: -1,
    flatPfSteps: [],
    pfStepCursor: -1,
    infoModalTab: "meta", // 'meta' | 'fonts'
    infoTargetDocId: "__all__",
    fontFilterMode: "all", // 'all' | 'unemb' | 'emb'
    fontSearchQuery: "",

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

    // Left Collapsible Groups & Pillars
    grpPages: document.getElementById("grpPages"),
    grpPrepress: document.getElementById("grpPrepress"),
    grpConvert: document.getElementById("grpConvert"),
    navPagesBtn: document.getElementById("navPagesBtn"),
    navPrepressBtn: document.getElementById("navPrepressBtn"),
    navPreflightBtn: document.getElementById("navPreflightBtn"),
    navConvertBtn: document.getElementById("navConvertBtn"),
    navPreflightBadge: document.getElementById("navPreflightBadge"),

    // Rail Footer & Files
    fileInput: document.getElementById("fileInput"),
    railFilesBox: document.getElementById("railFilesBox"),
    railDocInfoBtn: document.getElementById("railDocInfoBtn"),
    addMoreBtn: document.getElementById("addMoreBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    fileList: document.getElementById("fileList"),
    sidebarUploadBtn: document.getElementById("sidebarUploadBtn"),
    downloadOfflineBtn: document.getElementById("downloadOfflineBtn"),

    // Top Action Strip & Left Sub-Items
    topStrip: document.getElementById("topStrip"),
    stripPages: document.getElementById("stripPages"),
    subOrgBtn: document.getElementById("subOrgBtn"),
    subTextBtn: document.getElementById("subTextBtn"),
    subAnnotateBtn: document.getElementById("subAnnotateBtn"),
    orgControls: document.getElementById("orgControls"),
    selAllBtn: document.getElementById("selAllBtn"),
    selNoneBtn: document.getElementById("selNoneBtn"),
    toggleOrgPreviewBtn: document.getElementById("toggleOrgPreviewBtn"),
    selActionGroup: document.getElementById("selActionGroup"),
    rotSelBtn: document.getElementById("rotSelBtn"),
    delSelBtn: document.getElementById("delSelBtn"),
    imgSelBtn: document.getElementById("imgSelBtn"),
    extractSelBtn: document.getElementById("extractSelBtn"),
    extractSelText: document.getElementById("extractSelText"),

    textEditControls: document.getElementById("textEditControls"),
    imgFileInput: document.getElementById("imgFileInput"),
    addTextBtn: document.getElementById("addTextBtn"),
    addImgBtn: document.getElementById("addImgBtn"),
    rotatePageBtn: document.getElementById("rotatePageBtn"),
    deletePageBtn: document.getElementById("deletePageBtn"),
    multiAlignGroup: document.getElementById("multiAlignGroup"),
    alignOpBtns: Array.from(document.querySelectorAll(".align-op-btn")),
    distOpBtns: Array.from(document.querySelectorAll(".dist-op-btn")),
    undoEditBtn: document.getElementById("undoEditBtn"),
    toggleEditPropsBtn: document.getElementById("toggleEditPropsBtn"),
    cancelEditTaskBtn: document.getElementById("cancelEditTaskBtn"),
    editHintLabel: document.getElementById("editHintLabel"),

    // Right Edit Property Inspector Drawer
    editPropsDrawer: document.getElementById("editPropsDrawer"),
    closeEditPropsBtn: document.getElementById("closeEditPropsBtn"),
    propDrawerTitle: document.getElementById("propDrawerTitle"),
    propEmptySection: document.getElementById("propEmptySection"),
    propQuickAddTextBtn: document.getElementById("propQuickAddTextBtn"),
    propQuickAddImgBtn: document.getElementById("propQuickAddImgBtn"),
    propAlignSection: document.getElementById("propAlignSection"),
    propAlignTargetBadge: document.getElementById("propAlignTargetBadge"),
    propCoordRow: document.getElementById("propCoordRow"),
    propPosXInput: document.getElementById("propPosXInput"),
    propPosYInput: document.getElementById("propPosYInput"),
    propWidthMmInput: document.getElementById("propWidthMmInput"),
    propTextSection: document.getElementById("propTextSection"),
    propFontSelect: document.getElementById("propFontSelect"),
    propSizeDecBtn: document.getElementById("propSizeDecBtn"),
    propSizeIncBtn: document.getElementById("propSizeIncBtn"),
    propSizeInput: document.getElementById("propSizeInput"),
    propBoldBtn: document.getElementById("propBoldBtn"),
    propItalicBtn: document.getElementById("propItalicBtn"),
    propUnderlineBtn: document.getElementById("propUnderlineBtn"),
    propStrikeBtn: document.getElementById("propStrikeBtn"),
    propSizeChips: Array.from(document.querySelectorAll(".prop-chip-btn")),
    propParaBtns: Array.from(document.querySelectorAll(".prop-para-btn")),
    propLineHeightInput: document.getElementById("propLineHeightInput"),
    propLetterSpacingInput: document.getElementById("propLetterSpacingInput"),
    propTextColorInput: document.getElementById("propTextColorInput"),
    propSwatches: Array.from(document.querySelectorAll(".prop-swatch")),
    propColorHex: document.getElementById("propColorHex"),
    propOpacityRange: document.getElementById("propOpacityRange"),
    propOpacityVal: document.getElementById("propOpacityVal"),
    propMaskCheck: document.getElementById("propMaskCheck"),
    propBgColorInput: document.getElementById("propBgColorInput"),
    propImgSection: document.getElementById("propImgSection"),
    propImgReplaceBtn: document.getElementById("propImgReplaceBtn"),
    propImgFitWrap: document.getElementById("propImgFitWrap"),
    propImgFitBtns: Array.from(document.querySelectorAll(".prop-img-fit-btn")),
    propImgRestoreBtn: document.getElementById("propImgRestoreBtn"),
    propActionSection: document.getElementById("propActionSection"),
    propDuplicateBtn: document.getElementById("propDuplicateBtn"),
    propDeleteSelBtn: document.getElementById("propDeleteSelBtn"),

    annotateControls: document.getElementById("annotateControls"),
    annToolBtns: Array.from(document.querySelectorAll(".ann-tool-btn")),
    annColorDots: Array.from(document.querySelectorAll(".ann-color-dot")),
    annColorInput: document.getElementById("annColorInput"),
    annWidthBtns: Array.from(document.querySelectorAll(".ann-width-btn")),
    annUndoBtn: document.getElementById("annUndoBtn"),
    annClearBtn: document.getElementById("annClearBtn"),
    annExportPngBtn: document.getElementById("annExportPngBtn"),

    stripPrepress: document.getElementById("stripPrepress"),
    subImposeBtn: document.getElementById("subImposeBtn"),
    subSplitBtn: document.getElementById("subSplitBtn"),
    subK100Btn: document.getElementById("subK100Btn"),
    imposeControls: document.getElementById("imposeControls"),
    impViewGridBtn: document.getElementById("impViewGridBtn"),
    impViewSingleBtn: document.getElementById("impViewSingleBtn"),
    impBookletBtn: document.getElementById("impBookletBtn"),
    impSpreadBtn: document.getElementById("impSpreadBtn"),
    impNupBtn: document.getElementById("impNupBtn"),
    impSpreadAutoBtn: document.getElementById("impSpreadAutoBtn"),
    impSpreadAutoText: document.getElementById("impSpreadAutoText"),
    imposeParamsBtn: document.getElementById("imposeParamsBtn"),
    imposePopover: document.getElementById("imposePopover"),
    impAutoSplitCheck: document.getElementById("impAutoSplitCheck"),
    impSpreadDetailRows: document.getElementById("impSpreadDetailRows"),
    impSpreadCoverCheck: document.getElementById("impSpreadCoverCheck"),
    impSpreadBleedInput: document.getElementById("impSpreadBleedInput"),
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
    pfNavGroup: document.getElementById("pfNavGroup"),
    pfPrevIssueBtn: document.getElementById("pfPrevIssueBtn"),
    pfNextIssueBtn: document.getElementById("pfNextIssueBtn"),
    pfIssueCounter: document.getElementById("pfIssueCounter"),

    stripConvert: document.getElementById("stripConvert"),
    subCompBtn: document.getElementById("subCompBtn"),
    subImgBtn: document.getElementById("subImgBtn"),
    subImgPdfBtn: document.getElementById("subImgPdfBtn"),

    stripRightGroup: document.getElementById("stripRightGroup"),
    dimSummaryText: document.getElementById("dimSummaryText"),
    docInfoBtn: document.getElementById("docInfoBtn"),
    exportBtn: document.getElementById("exportBtn"),
    exportBtnText: document.getElementById("exportBtnText"),

    // Main Body & Right-Side Drawers
    rightSplitter: document.getElementById("rightSplitter"),
    preflightDrawer: document.getElementById("preflightDrawer"),
    orgPreviewDrawer: document.getElementById("orgPreviewDrawer"),
    orgPreviewTitle: document.getElementById("orgPreviewTitle"),
    orgPreviewCanvas: document.getElementById("orgPreviewCanvas"),
    orgPreviewMeta: document.getElementById("orgPreviewMeta"),
    orgPrevEditPageBtn: document.getElementById("orgPrevEditPageBtn"),
    closeOrgPreviewBtn: document.getElementById("closeOrgPreviewBtn"),
    reopenOrgPreviewTab: document.getElementById("reopenOrgPreviewTab"),
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
    annotateBoardWrap: document.getElementById("annotateBoardWrap"),
    annotateStageInner: document.getElementById("annotateStageInner"),
    annotateBaseCanvas: document.getElementById("annotateBaseCanvas"),
    annotateDrawCanvas: document.getElementById("annotateDrawCanvas"),
    annotateNotesLayer: document.getElementById("annotateNotesLayer"),

    dragOverlay: document.getElementById("dragOverlay"),
    dragOverlayText: document.getElementById("dragOverlayText"),
    loadProgressOverlay: document.getElementById("loadProgressOverlay"),
    loadProgressTitle: document.getElementById("loadProgressTitle"),
    loadProgressPct: document.getElementById("loadProgressPct"),
    loadProgressFile: document.getElementById("loadProgressFile"),
    loadProgressFill: document.getElementById("loadProgressFill"),
    loadProgressStep: document.getElementById("loadProgressStep"),

    // PDF Document Properties & Font Inspector Modal
    pdfInfoModal: document.getElementById("pdfInfoModal"),
    pdfInfoDocSelect: document.getElementById("pdfInfoDocSelect"),
    closePdfInfoBtn: document.getElementById("closePdfInfoBtn"),
    infoTabMetaBtn: document.getElementById("infoTabMetaBtn"),
    infoTabFontsBtn: document.getElementById("infoTabFontsBtn"),
    infoFontsBadge: document.getElementById("infoFontsBadge"),
    fontFilterGroup: document.getElementById("fontFilterGroup"),
    fontFltBtns: Array.from(document.querySelectorAll(".font-flt-btn")),
    fontSearchInput: document.getElementById("fontSearchInput"),
    infoPaneMeta: document.getElementById("infoPaneMeta"),
    infoPaneFonts: document.getElementById("infoPaneFonts"),
    infoFontBanner: document.getElementById("infoFontBanner"),
    infoFontList: document.getElementById("infoFontList"),
    copyPdfInfoBtn: document.getElementById("copyPdfInfoBtn"),
    copyPdfInfoText: document.getElementById("copyPdfInfoText"),
    closePdfInfoFootBtn: document.getElementById("closePdfInfoFootBtn"),

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
    fmtDiscardBtn: document.getElementById("fmtDiscardBtn"),
    fmtDoneBtn: document.getElementById("fmtDoneBtn"),

    // Floating Image Replacement & Fit Bar
    imgFmtBar: document.getElementById("imgFmtBar"),
    imgReplaceDialogBtn: document.getElementById("imgReplaceDialogBtn"),
    imgFitGroup: document.getElementById("imgFitGroup"),
    imgFitChips: Array.from(document.querySelectorAll(".img-fit-chip")),
    imgRestoreBtn: document.getElementById("imgRestoreBtn"),
    imgDeleteNodeBtn: document.getElementById("imgDeleteNodeBtn"),
    imgCancelSelBtn: document.getElementById("imgCancelSelBtn"),

    // Bottom Pager & Fixed Left/Right Status Bars
    bottomPager: document.getElementById("bottomPager"),
    prevSpreadBtn: document.getElementById("prevSpreadBtn"),
    nextSpreadBtn: document.getElementById("nextSpreadBtn"),
    pageIndicator: document.getElementById("pageIndicator"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomFitBtn: document.getElementById("zoomFitBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomLabel: document.getElementById("zoomLabel"),
    leftStatusText: document.getElementById("leftStatusText"),
    rightStatusBadge: document.getElementById("rightStatusBadge"),
    rightStatusMain: document.getElementById("rightStatusMain"),
    rightStatusMeta: document.getElementById("rightStatusMeta")
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
    state.cacheRestoredMsg = false;
    state.undoStack.push(JSON.stringify(state.pages));
    if (state.undoStack.length > 25) state.undoStack.shift();
    scheduleWorkspaceCacheSave();
  }

  function scheduleWorkspaceCacheSave() {
    if (!window.ShibaStorage || !state.bootRestoreDone) return;
    clearTimeout(state.saveCacheTimer);
    state.saveCacheTimer = setTimeout(async () => {
      if (!hasPages() || !state.docOrder.length) {
        state.cacheSaved = false;
        await window.ShibaStorage.clearWorkspaceSnapshot();
        updateStatusBars();
        return;
      }
      const docs = [];
      state.docOrder.forEach((docId) => {
        const d = state.sourceDocs.get(docId);
        if (d) docs.push({ id: d.id, name: d.name, size: d.size, rawBytes: d.rawBytes });
      });
      const ok = await window.ShibaStorage.saveWorkspaceSnapshot({
        savedAt: Date.now(),
        pillar: state.pillar,
        pagesSub: state.pagesSub,
        prepressSub: state.prepressSub,
        convertSub: state.convertSub,
        activeSlotIdx: state.activeSlotIdx,
        bleed: state.bleed,
        bleedAction: state.bleedAction,
        imposeType: state.imposeType,
        imposeNup: state.imposeNup,
        imposeAutoSplitSpreads: state.imposeAutoSplitSpreads,
        imposeSpreadFirstBackFront: state.imposeSpreadFirstBackFront,
        imposeSpreadBleedMm: state.imposeSpreadBleedMm,
        annotations: state.annotations,
        docOrder: state.docOrder,
        docs,
        pages: state.pages
      });
      state.cacheSaved = Boolean(ok);
      updateStatusBars();
    }, 450);
  }

  async function restoreCachedProjectOnBoot() {
    if (!window.ShibaStorage) {
      state.bootRestoreDone = true;
      return;
    }
    const snap = await window.ShibaStorage.loadWorkspaceSnapshot();
    if (!snap || !snap.docs || !snap.docs.length || !snap.pages || !snap.pages.length || hasPages()) {
      state.bootRestoreDone = true;
      return;
    }

    try {
      updateLoadModal(10, t("loadModalTitle", { c: 1, t: snap.docs.length }), snap.docs[0].name, t("loadStepRead"));
      await nextUiFrame();

      for (let i = 0; i < snap.docs.length; i++) {
        const item = snap.docs[i];
        const rawBytes = item.rawBytes instanceof Uint8Array ? item.rawBytes : new Uint8Array(item.rawBytes);
        const pdfJsDoc = await pdfjsLib.getDocument({ data: rawBytes.slice() }).promise;
        const origPages = [];
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
        }
        const preflight = await window.ShibaPrepress.runPrepressPreflight(rawBytes, pdfJsDoc, origPages);
        state.sourceDocs.set(item.id, {
          id: item.id,
          name: item.name,
          size: item.size || rawBytes.byteLength,
          rawBytes,
          pdfJsDoc,
          origPages,
          preflight
        });
      }

      state.docOrder = snap.docOrder.filter((id) => state.sourceDocs.has(id));
      state.pages = snap.pages.filter((s) => state.sourceDocs.has(s.docId));
      state.annotations = Array.isArray(snap.annotations) ? snap.annotations : [];
      if (snap.pillar) state.pillar = snap.pillar;
      if (snap.pagesSub) state.pagesSub = snap.pagesSub;
      if (snap.prepressSub) state.prepressSub = snap.prepressSub;
      if (snap.convertSub) state.convertSub = snap.convertSub;
      if (typeof snap.activeSlotIdx === "number") state.activeSlotIdx = snap.activeSlotIdx;
      if (snap.bleed) state.bleed = Object.assign({ top: 3, bottom: 3, left: 3, right: 3 }, snap.bleed);
      if (snap.bleedAction) state.bleedAction = snap.bleedAction;
      if (snap.imposeType) state.imposeType = snap.imposeType;
      if (snap.imposeNup) state.imposeNup = snap.imposeNup;
      if (typeof snap.imposeAutoSplitSpreads === "boolean") state.imposeAutoSplitSpreads = snap.imposeAutoSplitSpreads;
      if (typeof snap.imposeSpreadFirstBackFront === "boolean") state.imposeSpreadFirstBackFront = snap.imposeSpreadFirstBackFront;
      if (typeof snap.imposeSpreadBleedMm === "number") state.imposeSpreadBleedMm = snap.imposeSpreadBleedMm;

      if (window.ShibaImageEdit) {
        const imgTasks = [];
        state.pages.forEach((s) => {
          (s.imgEdits || []).forEach((ie) => {
            if (ie.dataUrl) imgTasks.push(window.ShibaImageEdit.ensureCachedImage(ie.dataUrl).catch(() => null));
          });
        });
        await Promise.all(imgTasks);
      }

      state.cacheSaved = true;
      state.cacheRestoredMsg = true;
      clampActiveIndices();
      renderFileList();
      refreshWorkspace(true);
    } catch (err) {
      console.warn("[ShibaPDF] Failed to restore cached workspace:", err);
    } finally {
      state.bootRestoreDone = true;
      el.loadProgressOverlay.classList.add("hidden");
    }
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

  function isOrganizeMode() {
    return state.pillar === "pages" && state.pagesSub === "organize";
  }

  function isAnnotateMode() {
    return state.pillar === "pages" && state.pagesSub === "annotate";
  }

  function isImposeGridMode() {
    return isImposeMode() && state.imposeView === "grid";
  }

  function updateZoomReadout() {
    if (isAnnotateMode()) {
      el.zoomLabel.textContent = `${Math.round(state.annScale * 100)}%`;
      updateStatusBars();
      return;
    }
    if (isOrganizeMode()) {
      el.zoomLabel.textContent =
        Math.abs(state.orgGridScale - 1.0) < 0.02 ? "100%" : `${Math.round(state.orgGridScale * 100)}%`;
      updateStatusBars();
      return;
    }
    if (isImposeGridMode()) {
      el.zoomLabel.textContent =
        Math.abs(state.imposeGridScale - 1.0) < 0.02 ? "100%" : `${Math.round(state.imposeGridScale * 100)}%`;
      updateStatusBars();
      return;
    }
    el.zoomLabel.textContent =
      Math.abs(state.zoomFactor - 1.0) < 0.01 ? t("fitZoom") : `${Math.round(state.zoomFactor * 100)}%`;
    updateStatusBars();
  }

  function setOrgGridZoom(newScale) {
    const clamped = Math.min(2.4, Math.max(0.5, Math.round(newScale * 100) / 100));
    if (Math.abs(clamped - state.orgGridScale) < 0.005) return;
    state.orgGridScale = clamped;
    el.sequenceGrid.style.setProperty("--org-min-w", `${Math.round(172 * clamped)}px`);
    updateZoomReadout();
    clearTimeout(state.wheelRenderTimer);
    state.wheelRenderTimer = setTimeout(() => {
      if (isOrganizeMode()) renderOrganizeGrid();
    }, 150);
  }

  function setImposeGridZoom(newScale) {
    const clamped = Math.min(2.6, Math.max(0.5, Math.round(newScale * 100) / 100));
    if (Math.abs(clamped - state.imposeGridScale) < 0.005) return;
    state.imposeGridScale = clamped;
    el.sequenceGrid.style.setProperty("--imp-min-w", `${Math.round(390 * clamped)}px`);
    updateZoomReadout();
    clearTimeout(state.wheelRenderTimer);
    state.wheelRenderTimer = setTimeout(() => {
      if (isImposeGridMode()) renderImposeMultiSheetGrid();
    }, 150);
  }

  function setSmoothZoom(newFactor) {
    if (isOrganizeMode()) {
      setOrgGridZoom(newFactor);
      return;
    }
    if (isImposeGridMode()) {
      setImposeGridZoom(newFactor);
      return;
    }
    if (isAnnotateMode()) {
      const clampedAnn = Math.min(4.0, Math.max(0.18, newFactor));
      const wrapRect = el.annotateBoardWrap.getBoundingClientRect();
      const cx = wrapRect.width / 2;
      const cy = wrapRect.height / 2;
      state.annPanX = cx - (cx - state.annPanX) * (clampedAnn / state.annScale);
      state.annPanY = cy - (cy - state.annPanY) * (clampedAnn / state.annScale);
      state.annScale = clampedAnn;
      applyAnnotateTransform();
      updateZoomReadout();
      return;
    }

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
      if (isAnnotateMode() && hasPages() && !el.annotateBoardWrap.classList.contains("hidden")) {
        e.preventDefault();
        e.stopPropagation();
        const rect = el.annotateBoardWrap.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (e.ctrlKey || e.metaKey) {
          const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
          const nextSc = Math.min(4.0, Math.max(0.18, state.annScale * factor));
          state.annPanX = mx - (mx - state.annPanX) * (nextSc / state.annScale);
          state.annPanY = my - (my - state.annPanY) * (nextSc / state.annScale);
          state.annScale = nextSc;
          applyAnnotateTransform();
          updateZoomReadout();
        } else {
          state.annPanX -= e.deltaX;
          state.annPanY -= e.deltaY;
          applyAnnotateTransform();
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!hasPages()) return;
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        if (isOrganizeMode()) {
          setOrgGridZoom(state.orgGridScale * factor);
          return;
        }
        if (isImposeGridMode()) {
          setImposeGridZoom(state.imposeGridScale * factor);
          return;
        }
        if (el.spreadViewContainer.classList.contains("hidden")) return;
        setSmoothZoom(state.zoomFactor * factor);
      }
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    // Universal Escape Hatch — Cancel active task, discard uncommitted edit, or clear selection anywhere!
    if (e.key === "Escape") {
      e.preventDefault();
      if (el.pdfInfoModal && !el.pdfInfoModal.classList.contains("hidden")) {
        closePdfInfoModal();
        return;
      }
      if (state.abortAnnDrawFn) {
        state.abortAnnDrawFn();
        return;
      }
      if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }
      if (!el.imposePopover.classList.contains("hidden") || !el.splitParamsPopover.classList.contains("hidden")) {
        closeAllPopovers();
        return;
      }
      if (isAnnotateMode()) {
        if (state.selectedAnnId) {
          state.selectedAnnId = null;
          redrawAnnotateLayer(null);
          updateTopStripControls();
        } else if (state.annTool !== "select" && state.annTool !== "pan") {
          state.annTool = "select";
          syncAnnotateCursor();
          redrawAnnotateLayer(null);
          updateTopStripControls();
        }
        return;
      }
      if (state.placingNewText) {
        state.placingNewText = false;
        updateTopStripControls();
        renderTextEditorOverlay();
        return;
      }
      if (state.multiSelection.length > 0) {
        clearAllContentSelections();
        updateTopStripControls();
        renderTextEditorOverlay();
        return;
      }
      if (state.selectedTextId) {
        discardActiveTextSession();
        return;
      }
      if (state.selectedOrigImgId || state.selectedImgEditId) {
        clearAllContentSelections();
        updateTopStripControls();
        renderTextEditorOverlay();
        return;
      }
      if (isImposeMode() && state.imposeView === "single") {
        state.imposeView = "grid";
        refreshWorkspace(true);
        return;
      }
      if (state.pillar === "pages" && state.pagesSub === "organize" && getSelectedSlots().length > 0) {
        state.pages.forEach((s) => { s.selected = false; });
        syncOrganizeSelectionUI();
        return;
      }
      if (state.pillar === "preflight" && state.activePfHighlights.length > 0) {
        state.activePfHighlights = [];
        state.selectedPfCardIdx = -1;
        renderPreflightBadgeAndDrawer();
        renderPreflightHighlightBoxes();
        return;
      }
      return;
    }

    const activeTag = document.activeElement ? document.activeElement.tagName : "";
    const inEditable =
      activeTag === "INPUT" ||
      activeTag === "TEXTAREA" ||
      (document.activeElement && document.activeElement.isContentEditable);

    if (e.code === "Space" && !inEditable && isAnnotateMode()) {
      e.preventDefault();
      if (!state.spacePressed) {
        state.spacePressed = true;
        syncAnnotateCursor();
      }
      return;
    }

    if ((e.key === "Delete" || e.key === "Backspace") && !inEditable && state.pillar === "pages" && state.pagesSub === "text") {
      if (state.multiSelection.length > 0 || state.selectedTextId || state.selectedImgEditId || state.selectedOrigImgId) {
        e.preventDefault();
        deleteSelectedEditElements();
        return;
      }
    }

    if ((e.key === "Delete" || e.key === "Backspace") && !inEditable && isAnnotateMode() && state.selectedAnnId) {
      e.preventDefault();
      pushAnnUndo();
      state.annotations = state.annotations.filter((a) => a.id !== state.selectedAnnId);
      state.selectedAnnId = null;
      redrawAnnotateLayer();
      updateTopStripControls();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
      if (hasPages()) {
        e.preventDefault();
        openPdfInfoModal();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "-" || e.key === "_" || e.key === "0")) {
      e.preventDefault();
      if (!hasPages()) return;
      if (isAnnotateMode()) {
        if (e.key === "0") fitAnnotateBoard();
        else if (e.key === "-" || e.key === "_") setSmoothZoom(state.annScale / 1.18);
        else setSmoothZoom(state.annScale * 1.18);
        return;
      }
      if (e.key === "0") setSmoothZoom(1.0);
      else if (e.key === "-" || e.key === "_") setSmoothZoom(state.zoomFactor / 1.18);
      else setSmoothZoom(state.zoomFactor * 1.18);
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" && state.spacePressed) {
      state.spacePressed = false;
      syncAnnotateCursor();
    }
  });

  ["gesturestart", "gesturechange", "gestureend"].forEach((evName) => {
    window.addEventListener(evName, (e) => e.preventDefault(), { passive: false });
  });

  // =========================================================================
  // Loading & Merging Multiple PDFs with Smooth Real-Time Progress Modal
  // =========================================================================
  function nextUiFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  }

  function updateLoadModal(pct, titleStr, fileName, stepStr) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    el.loadProgressOverlay.classList.remove("hidden");
    el.loadProgressTitle.textContent = titleStr;
    el.loadProgressPct.textContent = `${clamped}%`;
    el.loadProgressFile.textContent = fileName || "";
    el.loadProgressFill.style.width = `${clamped}%`;
    el.loadProgressStep.textContent = stepStr || "";
  }

  async function loadPdfFiles(fileListObj) {
    const incoming = Array.from(fileListObj).filter(
      (f) => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf"
    );
    if (!incoming.length) return;

    const wasEmpty = !hasPages();
    if (!wasEmpty) pushUndo();

    updateLoadModal(2, t("loadModalTitle", { c: 1, t: incoming.length }), incoming[0].name, t("loadStepRead"));
    await nextUiFrame();

    try {
      for (let fIdx = 0; fIdx < incoming.length; fIdx++) {
        const file = incoming[fIdx];
        const basePct = (fIdx / incoming.length) * 100;
        const spanPct = 100 / incoming.length;
        const modalTitle = t("loadModalTitle", { c: fIdx + 1, t: incoming.length });

        try {
          updateLoadModal(basePct + spanPct * 0.05, modalTitle, file.name, t("loadStepRead"));
          await nextUiFrame();

          const buf = await file.arrayBuffer();
          const rawBytes = new Uint8Array(buf);
          const pdfJsDoc = await pdfjsLib.getDocument({ data: rawBytes.slice() }).promise;
          const origPages = [];
          const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const totalP = pdfJsDoc.numPages;
          const yieldEvery = totalP > 24 ? 2 : 1;

          for (let p = 1; p <= totalP; p++) {
            if (p === 1 || p % yieldEvery === 0 || p === totalP) {
              updateLoadModal(
                basePct + spanPct * (0.10 + 0.65 * (p / totalP)),
                modalTitle,
                file.name,
                t("loadStepPage", { p, n: totalP })
              );
              await nextUiFrame();
            }
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
              edits: [],
              imgEdits: []
            });
          }

          updateLoadModal(basePct + spanPct * 0.82, modalTitle, file.name, t("loadStepPreflight"));
          await nextUiFrame();

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

      updateLoadModal(100, t("loadModalTitle", { c: incoming.length, t: incoming.length }), incoming[incoming.length - 1].name, t("loadStepReady"));
      await nextUiFrame();
    } finally {
      el.loadProgressOverlay.classList.add("hidden");
    }

    if (wasEmpty) {
      state.activeSlotIdx = 0;
      state.activeSheetIdx = 0;
      state.zoomFactor = 1.0;
    }
    state.annNeedsFit = true;
    state.selectedTextId = null;
    state.selectedOrigImgId = null;
    state.selectedImgEditId = null;
    state.activePfHighlights = [];
    state.selectedPfCardIdx = -1;
    el.compResultBox.classList.add("hidden");
    state.cacheRestoredMsg = false;
    updateZoomReadout();
    renderFileList();
    refreshWorkspace(true);
    scheduleWorkspaceCacheSave();
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
      left.style.cursor = "pointer";
      left.title = t("infoModalTitle");
      left.addEventListener("click", () => openPdfInfoModal(docId, "meta"));
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
    if (window.ShibaImageEdit && slot.imgEdits && slot.imgEdits.length) {
      window.ShibaImageEdit.paintSlotImageEditsSync(ctx, w, h, slot);
    }
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
        if (window.ShibaEditProps) {
          window.ShibaEditProps.drawFormattedTextBlock(
            ctx,
            ed,
            ed.u * w,
            ed.v * h,
            scale,
            info.wPt,
            window.ShibaPrepress.getCssFontStack
          );
        }
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
      const targetScale = Math.min(1320 / Math.max(vp1.width, 1), 2.0);
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

    const hasEdits = (slot.edits && slot.edits.length) || (slot.imgEdits && slot.imgEdits.length);
    if (!hasEdits) return baseCv;

    const out = document.createElement("canvas");
    out.width = baseCv.width;
    out.height = baseCv.height;
    const oCtx = out.getContext("2d");
    oCtx.drawImage(baseCv, 0, 0);
    paintSlotEditsOntoCanvas(oCtx, out.width, out.height, slot);
    return out;
  }

  // True HiDPI Direct PDF Vector Rasterizer for Imposed Sheet Cells (Supports Half-Spread Cropping & Zoomed Retina Clarity!)
  async function getHiResImposeUnitCanvas(unit, reqDevicePxW) {
    if (!unit) return null;
    const slot = state.pages[unit.slotIdx];
    if (!slot) return null;
    const docEntry = state.sourceDocs.get(slot.docId);
    if (!docEntry) return null;

    const fullReqPxW = Math.round(reqDevicePxW / Math.max(0.15, unit.uw || 1));
    let bucketW = 1080;
    if (fullReqPxW > 2200) bucketW = 3000;
    else if (fullReqPxW > 1500) bucketW = 2200;
    else if (fullReqPxW > 1080) bucketW = 1560;

    const cacheKey = `${slot.docId}_${slot.origIdx}_${slot.extraRot}_${bucketW}`;
    let baseFullCv = state.hiResSlotCache.get(cacheKey);

    if (!baseFullCv) {
      const page = await docEntry.pdfJsDoc.getPage(slot.origIdx + 1);
      const totalRot = (docEntry.origPages[slot.origIdx].rot + slot.extraRot) % 360;
      const vp1 = page.getViewport({ scale: 1, rotation: totalRot });
      const targetScale = Math.min(bucketW / Math.max(vp1.width, 1), 3.6);
      const vp = page.getViewport({ scale: targetScale, rotation: totalRot });

      baseFullCv = document.createElement("canvas");
      baseFullCv.width = Math.max(1, Math.round(vp.width));
      baseFullCv.height = Math.max(1, Math.round(vp.height));
      const ctx = baseFullCv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, baseFullCv.width, baseFullCv.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      if (state.hiResSlotCache.size >= 28) {
        const oldestKey = state.hiResSlotCache.keys().next().value;
        state.hiResSlotCache.delete(oldestKey);
      }
      state.hiResSlotCache.set(cacheKey, baseFullCv);
    }

    const hasEdits = (slot.edits && slot.edits.length) || (slot.imgEdits && slot.imgEdits.length);
    let srcFull = baseFullCv;
    if (hasEdits) {
      srcFull = document.createElement("canvas");
      srcFull.width = baseFullCv.width;
      srcFull.height = baseFullCv.height;
      const eCtx = srcFull.getContext("2d");
      eCtx.drawImage(baseFullCv, 0, 0);
      paintSlotEditsOntoCanvas(eCtx, srcFull.width, srcFull.height, slot);
    }

    if (unit.side === "full" && unit.u === 0 && unit.v === 0 && unit.uw === 1 && unit.vh === 1) {
      return srcFull;
    }

    const sx = Math.max(0, Math.round(unit.u * srcFull.width));
    const sy = Math.max(0, Math.round(unit.v * srcFull.height));
    const sw = Math.max(1, Math.min(srcFull.width - sx, Math.round(unit.uw * srcFull.width)));
    const sh = Math.max(1, Math.min(srcFull.height - sy, Math.round(unit.vh * srcFull.height)));

    const cropCv = document.createElement("canvas");
    cropCv.width = sw;
    cropCv.height = sh;
    cropCv.getContext("2d").drawImage(srcFull, sx, sy, sw, sh, 0, 0, sw, sh);
    return cropCv;
  }

  // =========================================================================
  // Pillar 1A: Organize, Multi-Select, Drag-Sort & Extract Grid
  // =========================================================================
  function updateRightOrgPreview(slotIdx) {
    if (!hasPages() || !window.ShibaUX) return;
    const idx = Math.max(0, Math.min(state.pages.length - 1, slotIdx));
    state.previewSlotIdx = idx;
    const slot = state.pages[idx];
    const info = getSlotSizeInfo(slot);
    const docEntry = state.sourceDocs.get(slot.docId);
    const docName = docEntry ? docEntry.name : "";
    window.ShibaUX.renderOrgPreviewPane(
      idx,
      `P${idx + 1} / ${state.pages.length}`,
      `${info.wMm.toFixed(0)}×${info.hMm.toFixed(0)}mm · ${docName}`,
      (sIdx) => getSlotPreviewCanvas(sIdx)
    );
    updateStatusBars();
  }

  async function renderOrganizeGrid() {
    if (!hasPages()) return;
    const myToken = ++state.renderToken;
    el.sequenceGrid.classList.remove("impose-grid");
    el.sequenceGrid.style.setProperty("--org-min-w", `${Math.round(172 * state.orgGridScale)}px`);
    el.sequenceGrid.innerHTML = "";
    updateRightOrgPreview(state.activeSlotIdx);

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

      // Hover: update right preview pane immediately + schedule floating large loupe on desktop
      card.addEventListener("pointerenter", (ev) => {
        if (ev.pointerType === "touch") return;
        updateRightOrgPreview(i);
        if (window.ShibaUX) {
          window.ShibaUX.scheduleHoverLoupe(
            card,
            i,
            `P${i + 1} · ${info.wMm.toFixed(0)}×${info.hMm.toFixed(0)}mm`,
            (sIdx) => getSlotPreviewCanvas(sIdx)
          );
        }
      });

      card.addEventListener("pointerleave", () => {
        if (window.ShibaUX) window.ShibaUX.hideHoverLoupe();
        updateRightOrgPreview(state.activeSlotIdx);
      });

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
        updateRightOrgPreview(i);
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

      // Async render thumbnail (scales crispness up when grid is zoomed in!)
      getSlotPreviewCanvas(i).then((srcCv) => {
        if (myToken !== state.renderToken) return;
        const maxThumb = Math.round(220 * Math.max(1, state.orgGridScale));
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
    syncEditPropsPanel();
    const ed = getSelectedEditObj();
    if (!ed || !targetWrapEl || state.pillar !== "pages" || state.pagesSub !== "text" || (state.editPropsOpen && window.innerWidth > 900)) {
      el.textFmtBar.classList.add("hidden");
      updateStatusBars();
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
    updateStatusBars();
  }

  function getSelectedImgEditObj() {
    const slot = getActiveSlot();
    if (!slot || !slot.imgEdits || !state.selectedImgEditId) return null;
    return slot.imgEdits.find((e) => e.id === state.selectedImgEditId) || null;
  }

  function clearAllContentSelections() {
    state.selectedTextId = null;
    state.selectedOrigImgId = null;
    state.selectedImgEditId = null;
    state.multiSelection = [];
    state.textSessionInitial = null;
  }

  function isInMultiSelection(kind, id) {
    return state.multiSelection.some((m) => m.kind === kind && m.id === id);
  }

  function toggleMultiSelectItem(kind, id) {
    // Seed multiSelection with any active single selection first
    if (state.multiSelection.length === 0) {
      if (state.selectedTextId) state.multiSelection.push({ kind: "text", id: state.selectedTextId });
      else if (state.selectedImgEditId) state.multiSelection.push({ kind: "img", id: state.selectedImgEditId });
    }
    const idx = state.multiSelection.findIndex((m) => m.kind === kind && m.id === id);
    if (idx >= 0) state.multiSelection.splice(idx, 1);
    else state.multiSelection.push({ kind, id });

    applyMultiSelectionNormalize();
  }

  function applyMultiSelectionNormalize() {
    state.selectedOrigImgId = null;
    state.textSessionInitial = null;
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    if (state.multiSelection.length === 1) {
      const only = state.multiSelection[0];
      state.multiSelection = [];
      state.selectedTextId = only.kind === "text" ? only.id : null;
      state.selectedImgEditId = only.kind === "img" ? only.id : null;
    } else {
      state.selectedTextId = null;
      state.selectedImgEditId = null;
    }
    updateTopStripControls();
    renderTextEditorOverlay();
  }

  function promoteOrigSpanToEdit(slot, sp) {
    const sampled = sampleColorsAroundSpan(sp);
    const newEd = {
      id: `ed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
      underline: false,
      strike: false,
      textAlign: "left",
      lineHeight: 1.16,
      letterSpacing: 0,
      opacity: 1,
      fontKey: sp.fontKey || "sans",
      color: sampled.fg,
      maskBg: true,
      bgColor: sampled.bg
    };
    slot.edits.push(newEd);
    return newEd;
  }

  function getSelectedTextObjects() {
    const slot = getActiveSlot();
    if (!slot || !slot.edits) return [];
    if (state.multiSelection.length >= 2) {
      const ids = new Set(state.multiSelection.filter((m) => m.kind === "text").map((m) => m.id));
      return slot.edits.filter((e) => ids.has(e.id));
    }
    const single = getSelectedEditObj();
    return single ? [single] : [];
  }

  function measureItemBoxNorm(kind, obj) {
    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width || 600;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height || 800;
    if (kind === "img") {
      return { kind: "img", ref: obj, u: obj.u, v: obj.v, uw: obj.uw || 0.2, vh: obj.vh || 0.2 };
    }
    const domWrap = el.textEditOverlay.querySelector(`.text-box-wrap[data-edit-id="${obj.id}"]`);
    let uw = obj.boxWidthU || (obj.origRect ? obj.origRect.uw : 0.14);
    let vh = obj.origRect ? obj.origRect.vh : 0.035;
    if (domWrap) {
      const r = domWrap.getBoundingClientRect();
      if (r.width > 2) uw = r.width / cssW;
      if (r.height > 2) vh = r.height / cssH;
    }
    return { kind: "text", ref: obj, u: obj.u, v: obj.v, uw, vh };
  }

  function getAllSelectedBoxMetrics() {
    const slot = getActiveSlot();
    if (!slot) return [];
    const out = [];
    if (state.multiSelection.length >= 2) {
      state.multiSelection.forEach((m) => {
        if (m.kind === "text") {
          const ed = (slot.edits || []).find((x) => x.id === m.id);
          if (ed) out.push(measureItemBoxNorm("text", ed));
        } else if (m.kind === "img") {
          const im = (slot.imgEdits || []).find((x) => x.id === m.id && !x.deleted);
          if (im) out.push(measureItemBoxNorm("img", im));
        }
      });
      return out;
    }
    const ed = getSelectedEditObj();
    if (ed) return [measureItemBoxNorm("text", ed)];
    const im = getSelectedImgEditObj();
    if (im) return [measureItemBoxNorm("img", im)];
    return [];
  }

  function runAlignDistributeOp(op) {
    if (!window.ShibaEditProps) return;
    const items = getAllSelectedBoxMetrics();
    if (!items.length) return;
    if ((op === "distribute-h" || op === "distribute-v") && items.length < 3) return;
    pushUndo();
    const changed = window.ShibaEditProps.alignAndDistributeItems(items, op);
    if (changed) {
      renderTextEditorOverlay();
      updateTopStripControls();
      scheduleWorkspaceCacheSave();
    }
  }

  function deleteSelectedEditElements() {
    const slot = getActiveSlot();
    if (!slot) return;
    slot.imgEdits = slot.imgEdits || [];
    if (state.multiSelection.length >= 2) {
      pushUndo();
      const txtIds = new Set(state.multiSelection.filter((m) => m.kind === "text").map((m) => m.id));
      const imgIds = new Set(state.multiSelection.filter((m) => m.kind === "img").map((m) => m.id));
      slot.edits = (slot.edits || []).filter((ed) => {
        if (!txtIds.has(ed.id)) return true;
        if (ed.origRect) {
          ed.text = "";
          ed.maskBg = true;
          return true;
        }
        return false;
      });
      slot.imgEdits = slot.imgEdits.filter((im) => {
        if (!imgIds.has(im.id)) return true;
        if (im.origId) {
          im.deleted = true;
          return true;
        }
        return false;
      });
      clearAllContentSelections();
      renderTextEditorOverlay();
      updateTopStripControls();
      return;
    }
    if (state.selectedTextId) {
      el.fmtDeleteNodeBtn.click();
    } else if (state.selectedImgEditId || state.selectedOrigImgId) {
      el.imgDeleteNodeBtn.click();
    }
  }

  function duplicateSelectedEditElements() {
    const slot = getActiveSlot();
    if (!slot) return;
    const items = getAllSelectedBoxMetrics();
    if (!items.length) return;
    pushUndo();
    const newMulti = [];
    items.forEach((b, idx) => {
      const copyObj = JSON.parse(JSON.stringify(b.ref));
      copyObj.id = `${b.kind === "text" ? "ed" : "imed"}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`;
      copyObj.origId = null;
      copyObj.origRect = null;
      copyObj.u = Math.min(0.94, b.ref.u + 0.025);
      copyObj.v = Math.min(0.94, b.ref.v + 0.025);
      if (b.kind === "text") {
        slot.edits.push(copyObj);
        newMulti.push({ kind: "text", id: copyObj.id });
      } else {
        copyObj.xObjKey = null;
        copyObj.moved = true;
        slot.imgEdits.push(copyObj);
        newMulti.push({ kind: "img", id: copyObj.id });
      }
    });
    state.multiSelection = newMulti;
    applyMultiSelectionNormalize();
  }

  function syncEditPropsPanel() {
    if (!el.editPropsDrawer || state.pillar !== "pages" || state.pagesSub !== "text" || !hasPages()) return;
    const slot = getActiveSlot();
    const info = getSlotSizeInfo(slot);
    const multiCnt = state.multiSelection.length;
    const selTexts = getSelectedTextObjects();
    const selImg = getSelectedImgEditObj();
    const hasOrigImg = Boolean(state.selectedOrigImgId) && !selImg && multiCnt === 0;
    const boxMetrics = getAllSelectedBoxMetrics();
    const totalSel = hasOrigImg ? 1 : boxMetrics.length;

    el.propDrawerTitle.textContent =
      multiCnt >= 2 ? t("propMultiTitle", { n: multiCnt }) : t("propDrawerTitle");

    el.propEmptySection.classList.toggle("hidden", totalSel > 0);
    el.propAlignSection.classList.toggle("hidden", boxMetrics.length === 0);
    el.propActionSection.classList.toggle("hidden", totalSel === 0);
    el.propDuplicateBtn.classList.toggle("hidden", hasOrigImg);

    if (boxMetrics.length > 0) {
      el.propAlignTargetBadge.textContent =
        boxMetrics.length >= 2 ? t("propRelSel", { n: boxMetrics.length }) : t("propRelPage");
      el.distOpBtns.forEach((btn) => {
        btn.disabled = boxMetrics.length < 3;
      });
      el.propCoordRow.classList.toggle("hidden", boxMetrics.length !== 1);
      if (boxMetrics.length === 1) {
        const b0 = boxMetrics[0];
        if (document.activeElement !== el.propPosXInput) {
          el.propPosXInput.value = (b0.u * info.wMm).toFixed(1);
        }
        if (document.activeElement !== el.propPosYInput) {
          el.propPosYInput.value = (b0.v * info.hMm).toFixed(1);
        }
        if (document.activeElement !== el.propWidthMmInput) {
          el.propWidthMmInput.value = (b0.uw * info.wMm).toFixed(1);
        }
      }
    }

    // Text Inspector Section
    const showText = selTexts.length > 0;
    el.propTextSection.classList.toggle("hidden", !showText);
    if (showText) {
      const t0 = selTexts[0];
      el.propFontSelect.value = t0.fontKey || "sans";
      if (document.activeElement !== el.propSizeInput) {
        el.propSizeInput.value = String(Math.round(t0.fontPt * 10) / 10);
      }
      el.propSizeChips.forEach((ch) =>
        ch.classList.toggle("active", Math.abs(parseFloat(ch.dataset.pt) - t0.fontPt) < 0.25)
      );
      el.propBoldBtn.classList.toggle("active", Boolean(t0.bold));
      el.propItalicBtn.classList.toggle("active", Boolean(t0.italic));
      el.propUnderlineBtn.classList.toggle("active", Boolean(t0.underline));
      el.propStrikeBtn.classList.toggle("active", Boolean(t0.strike));

      const alignVal = t0.textAlign || "left";
      el.propParaBtns.forEach((pb) => pb.classList.toggle("active", pb.dataset.textAlign === alignVal));

      if (document.activeElement !== el.propLineHeightInput) {
        el.propLineHeightInput.value = String(typeof t0.lineHeight === "number" ? t0.lineHeight : 1.16);
      }
      if (document.activeElement !== el.propLetterSpacingInput) {
        el.propLetterSpacingInput.value = String(t0.letterSpacing || 0);
      }

      const col = t0.color || "#181817";
      el.propTextColorInput.value = col;
      el.propColorHex.textContent = col.toUpperCase();
      const opPct = Math.round((typeof t0.opacity === "number" ? t0.opacity : 1) * 100);
      el.propOpacityRange.value = String(opPct);
      el.propOpacityVal.textContent = `${opPct}%`;
      el.propMaskCheck.checked = Boolean(t0.maskBg);
      el.propBgColorInput.value = t0.bgColor || "#ffffff";
    }

    // Image Inspector Section
    const showImg = (Boolean(selImg) || hasOrigImg) && multiCnt < 2;
    el.propImgSection.classList.toggle("hidden", !showImg);
    if (showImg) {
      el.propImgFitWrap.classList.toggle("hidden", hasOrigImg);
      el.propImgRestoreBtn.classList.toggle("hidden", !(selImg && selImg.origId));
      if (selImg) {
        el.propImgFitBtns.forEach((b) => b.classList.toggle("active", b.dataset.fit === (selImg.fitMode || "cover")));
      }
    }
  }

  function discardActiveTextSession() {
    const slot = getActiveSlot();
    const sess = state.textSessionInitial;
    if (slot && sess && state.selectedTextId === sess.edId) {
      if (sess.isNew) {
        slot.edits = slot.edits.filter((x) => x.id !== sess.edId);
        if (sess.pushedUndo && state.undoStack.length) state.undoStack.pop();
      } else if (sess.snapshot) {
        const target = slot.edits.find((x) => x.id === sess.edId);
        if (target) Object.assign(target, JSON.parse(sess.snapshot));
      }
    }
    state.placingNewText = false;
    clearAllContentSelections();
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    updateTopStripControls();
    renderTextEditorOverlay();
  }

  function commitAndDeselectContent() {
    const slot = getActiveSlot();
    const sess = state.textSessionInitial;
    if (slot && sess && sess.isNew && state.selectedTextId === sess.edId) {
      const ed = slot.edits.find((x) => x.id === sess.edId);
      if (ed && ed.origId && JSON.stringify(ed) === sess.snapshot) {
        // User clicked an original text span and didn't change anything -> clean up no-op box!
        slot.edits = slot.edits.filter((x) => x.id !== sess.edId);
        if (sess.pushedUndo && state.undoStack.length) state.undoStack.pop();
      }
    }
    state.placingNewText = false;
    clearAllContentSelections();
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    updateTopStripControls();
    renderTextEditorOverlay();
  }

  function openImageFileDialog(mode) {
    state.imgInputMode = mode || "replace";
    el.imgFileInput.click();
  }

  async function applyImageFileToTarget(file, explicitOrigSpan, explicitImgEd) {
    if (!file || !window.ShibaImageEdit || !window.ShibaImageEdit.isImageFile(file)) return;
    const slot = getActiveSlot();
    if (!slot) return;
    slot.imgEdits = slot.imgEdits || [];
    const docEntry = state.sourceDocs.get(slot.docId);
    const origPage = docEntry.origPages[slot.origIdx];
    const meta = await window.ShibaImageEdit.readImageFileMeta(file);

    const targetImgEd = explicitImgEd || (state.imgInputMode !== "add" ? getSelectedImgEditObj() : null);
    const targetOrigSpan =
      explicitOrigSpan ||
      (!targetImgEd && state.imgInputMode !== "add" && state.selectedOrigImgId
        ? (origPage.imageSpans || []).find((s) => s.id === state.selectedOrigImgId)
        : null);

    pushUndo();

    if (targetImgEd) {
      targetImgEd.dataUrl = meta.dataUrl;
      targetImgEd.natW = meta.natW;
      targetImgEd.natH = meta.natH;
      targetImgEd.hasAlpha = meta.hasAlpha;
      targetImgEd.deleted = false;
      state.selectedTextId = null;
      state.selectedOrigImgId = null;
      state.selectedImgEditId = targetImgEd.id;
    } else if (targetOrigSpan) {
      const sampled = sampleColorsAroundSpan(targetOrigSpan);
      const newImEd = {
        id: `imed_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        origId: targetOrigSpan.id,
        xObjKey: targetOrigSpan.xObjKey,
        inForm: Boolean(targetOrigSpan.inForm),
        sharedOnPage: Boolean(targetOrigSpan.sharedOnPage),
        flipX: Boolean(targetOrigSpan.flipX),
        flipY: Boolean(targetOrigSpan.flipY),
        origRect: { u: targetOrigSpan.u, v: targetOrigSpan.v, uw: targetOrigSpan.uw, vh: targetOrigSpan.vh },
        u: targetOrigSpan.u,
        v: targetOrigSpan.v,
        uw: targetOrigSpan.uw,
        vh: targetOrigSpan.vh,
        moved: false,
        deleted: false,
        fitMode: "cover",
        dataUrl: meta.dataUrl,
        natW: meta.natW,
        natH: meta.natH,
        hasAlpha: meta.hasAlpha,
        bgMaskColor: sampled.bg
      };
      slot.imgEdits.push(newImEd);
      state.selectedTextId = null;
      state.selectedOrigImgId = null;
      state.selectedImgEditId = newImEd.id;
    } else {
      // Add new standalone image centered on current page preserving natural aspect ratio
      const sz = getSlotSizeInfo(slot);
      const uw = 0.36;
      const rawVh = (uw * sz.wPt * (meta.natH / Math.max(1, meta.natW))) / Math.max(1, sz.hPt);
      const vh = Math.min(0.75, Math.max(0.06, rawVh));
      const newImEd = {
        id: `imed_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        origId: null,
        xObjKey: null,
        inForm: false,
        sharedOnPage: false,
        flipX: false,
        flipY: false,
        origRect: null,
        u: (1 - uw) / 2,
        v: (1 - vh) / 2,
        uw,
        vh,
        moved: true,
        deleted: false,
        fitMode: "fill",
        dataUrl: meta.dataUrl,
        natW: meta.natW,
        natH: meta.natH,
        hasAlpha: meta.hasAlpha,
        bgMaskColor: "#ffffff"
      };
      slot.imgEdits.push(newImEd);
      state.selectedTextId = null;
      state.selectedOrigImgId = null;
      state.selectedImgEditId = newImEd.id;
    }

    updateTopStripControls();
    renderTextEditorOverlay();
  }

  function positionImgFmtBar(targetEl) {
    syncEditPropsPanel();
    if (!targetEl || state.pillar !== "pages" || state.pagesSub !== "text" || (state.editPropsOpen && window.innerWidth > 900)) {
      el.imgFmtBar.classList.add("hidden");
      updateStatusBars();
      return;
    }
    const imEd = getSelectedImgEditObj();
    const isOrigOnly = Boolean(state.selectedOrigImgId) && !imEd;
    if (!imEd && !isOrigOnly) {
      el.imgFmtBar.classList.add("hidden");
      return;
    }

    el.imgFmtBar.classList.remove("hidden");
    el.imgFitGroup.classList.toggle("hidden", isOrigOnly);
    el.imgRestoreBtn.classList.toggle("hidden", !(imEd && imEd.origId));
    if (imEd) {
      el.imgFitChips.forEach((ch) => ch.classList.toggle("active", ch.dataset.fit === (imEd.fitMode || "cover")));
    }

    const r = targetEl.getBoundingClientRect();
    const barW = el.imgFmtBar.offsetWidth || 280;
    const left = Math.max(12, Math.min(window.innerWidth - barW - 12, r.left));
    const top = r.top > 56 ? r.top - 46 : r.bottom + 10;
    el.imgFmtBar.style.left = `${left}px`;
    el.imgFmtBar.style.top = `${top}px`;
  }

  function renderTextEditorOverlay() {
    if (state.pillar !== "pages" || state.pagesSub !== "text" || !hasPages()) {
      el.textEditOverlay.classList.add("hidden");
      el.textFmtBar.classList.add("hidden");
      el.imgFmtBar.classList.add("hidden");
      return;
    }

    const slot = getActiveSlot();
    slot.imgEdits = slot.imgEdits || [];
    const docEntry = state.sourceDocs.get(slot.docId);
    const origPage = docEntry.origPages[slot.origIdx];
    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height;
    if (!cssW || !cssH) return;

    const cssScale = cssW / Math.max(1, getSlotSizeInfo(slot).wPt);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    el.textEditOverlay.classList.remove("hidden");
    el.textEditOverlay.classList.toggle("placing-mode", state.placingNewText);
    el.textEditOverlay.innerHTML = "";

    let selectedImgTargetEl = null;
    const editedOrigImgIds = new Set(slot.imgEdits.filter((e) => e.origId).map((e) => e.origId));

    // 0A. Clickable & Drop-Replaceable Original PDF Image Hit Boxes
    if (slot.extraRot === 0 && !state.placingNewText) {
      (origPage.imageSpans || []).forEach((sp) => {
        if (editedOrigImgIds.has(sp.id)) return;
        const isSelOrig = state.selectedOrigImgId === sp.id;
        const imgHit = document.createElement("div");
        imgHit.className = "pdf-img-hit" + (isSelOrig ? " selected-orig" : "");
        imgHit.dataset.origImgId = sp.id;
        imgHit.title = t("imgHoverHint");
        imgHit.style.left = `${sp.u * cssW}px`;
        imgHit.style.top = `${sp.v * cssH}px`;
        imgHit.style.width = `${Math.max(16, sp.uw * cssW)}px`;
        imgHit.style.height = `${Math.max(16, sp.vh * cssH)}px`;

        let promptEl = null;
        if (isSelOrig) {
          promptEl = document.createElement("div");
          promptEl.className = "img-drop-prompt";
          promptEl.textContent = t("imgSelectedPrompt");
          imgHit.appendChild(promptEl);
          selectedImgTargetEl = imgHit;
        }

        imgHit.addEventListener("click", (ev) => {
          ev.stopPropagation();
          // If user was editing text and clicked outside onto a background photo, commit & exit text first!
          if (state.selectedTextId) {
            commitAndDeselectContent();
            return;
          }
          // Clicking an already-selected original image toggles selection OFF cleanly!
          if (isSelOrig) {
            clearAllContentSelections();
            updateTopStripControls();
            renderTextEditorOverlay();
            return;
          }
          clearAllContentSelections();
          state.selectedOrigImgId = sp.id;
          updateTopStripControls();
          renderTextEditorOverlay();
        });

        imgHit.addEventListener("dblclick", (ev) => {
          ev.stopPropagation();
          state.selectedTextId = null;
          state.selectedImgEditId = null;
          state.selectedOrigImgId = sp.id;
          openImageFileDialog("replace");
        });

        imgHit.addEventListener("dragover", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          imgHit.classList.add("drag-hover");
          if (promptEl) promptEl.textContent = t("imgDropActivePrompt");
        });

        imgHit.addEventListener("dragleave", () => {
          imgHit.classList.remove("drag-hover");
          if (promptEl) promptEl.textContent = t("imgSelectedPrompt");
        });

        imgHit.addEventListener("drop", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          imgHit.classList.remove("drag-hover");
          const files = ev.dataTransfer && ev.dataTransfer.files ? Array.from(ev.dataTransfer.files) : [];
          const imgFile = files.find((f) => window.ShibaImageEdit.isImageFile(f));
          if (imgFile) applyImageFileToTarget(imgFile, sp, null);
        });

        el.textEditOverlay.appendChild(imgHit);
      });
    }

    // 0B. Background Masks for Moved/Deleted/Replaced Original PDF Images + Interactive Replaced/Added Image Boxes
    slot.imgEdits.forEach((imEd) => {
      if (imEd.origRect && (imEd.moved || imEd.deleted || !imEd.hasAlpha || imEd.fitMode === "contain")) {
        const mPatch = document.createElement("div");
        mPatch.className = "text-mask-patch";
        mPatch.style.zIndex = "3";
        mPatch.style.left = `${imEd.origRect.u * cssW - 0.5}px`;
        mPatch.style.top = `${imEd.origRect.v * cssH - 0.5}px`;
        mPatch.style.width = `${imEd.origRect.uw * cssW + 1}px`;
        mPatch.style.height = `${imEd.origRect.vh * cssH + 1}px`;
        mPatch.style.backgroundColor = imEd.bgMaskColor || "#ffffff";
        el.textEditOverlay.appendChild(mPatch);
      }

      if (imEd.deleted || !imEd.dataUrl) return;

      const isImgSel = state.selectedImgEditId === imEd.id;
      const isImgMulti = isInMultiSelection("img", imEd.id);
      const iWrap = document.createElement("div");
      iWrap.className = "img-box-wrap" + (isImgSel ? " selected" : "") + (isImgMulti ? " multi-selected" : "");
      iWrap.dataset.imgEditId = imEd.id;
      const boxPxW = Math.max(20, imEd.uw * cssW);
      const boxPxH = Math.max(20, imEd.vh * cssH);
      iWrap.style.left = `${imEd.u * cssW}px`;
      iWrap.style.top = `${imEd.v * cssH}px`;
      iWrap.style.width = `${boxPxW}px`;
      iWrap.style.height = `${boxPxH}px`;

      const liveCv = document.createElement("canvas");
      liveCv.className = "img-live-cv";
      liveCv.width = Math.max(1, Math.round(boxPxW * dpr));
      liveCv.height = Math.max(1, Math.round(boxPxH * dpr));
      window.ShibaImageEdit.ensureCachedImage(imEd.dataUrl).then((imgEl) => {
        if (!imgEl) return;
        const c2d = liveCv.getContext("2d");
        c2d.clearRect(0, 0, liveCv.width, liveCv.height);
        window.ShibaImageEdit.drawImageWithFit(c2d, imgEl, 0, 0, liveCv.width, liveCv.height, imEd.fitMode || "cover");
      });
      iWrap.appendChild(liveCv);

      const dragHandle = document.createElement("div");
      dragHandle.className = "text-drag-handle";
      dragHandle.innerHTML = (ICONS["move"] ? ICONS["move"].replace('class="lucide', 'style="width:10px;height:10px;" class="lucide') : "✥");
      iWrap.appendChild(dragHandle);

      const seH = document.createElement("div");
      seH.className = "text-resize-handle se";
      const eH = document.createElement("div");
      eH.className = "text-resize-handle e";
      const sH = document.createElement("div");
      sH.className = "text-resize-handle s";
      iWrap.appendChild(seH);
      iWrap.appendChild(eH);
      iWrap.appendChild(sH);

      function startMoveImg(downEv) {
        downEv.preventDefault();
        downEv.stopPropagation();
        if (downEv.shiftKey || downEv.ctrlKey || downEv.metaKey) {
          toggleMultiSelectItem("img", imEd.id);
          return;
        }
        const sx = downEv.clientX;
        const sy = downEv.clientY;
        const oU = imEd.u;
        const oV = imEd.v;
        const groupMode = isImgMulti && state.multiSelection.length >= 2;
        const groupSnap = groupMode
          ? getAllSelectedBoxMetrics().map((b) => ({
              ref: b.ref,
              kind: b.kind,
              u0: b.ref.u,
              v0: b.ref.v,
              el:
                b.kind === "text"
                  ? el.textEditOverlay.querySelector(`.text-box-wrap[data-edit-id="${b.ref.id}"]`)
                  : el.textEditOverlay.querySelector(`.img-box-wrap[data-img-edit-id="${b.ref.id}"]`)
            }))
          : null;
        let didMove = false;
        document.body.classList.add("is-dragging-box");

        function onMv(mvEv) {
          const dx = mvEv.clientX - sx;
          const dy = mvEv.clientY - sy;
          if (!didMove && Math.hypot(dx, dy) > 2) {
            didMove = true;
            pushUndo();
          }
          if (didMove) {
            if (groupSnap) {
              groupSnap.forEach((g) => {
                g.ref.u = Math.min(0.98, Math.max(-0.2, g.u0 + dx / cssW));
                g.ref.v = Math.min(0.98, Math.max(-0.2, g.v0 + dy / cssH));
                if (g.kind === "img") g.ref.moved = true;
                if (g.el) {
                  g.el.style.left = `${g.ref.u * cssW}px`;
                  g.el.style.top = `${g.ref.v * cssH}px`;
                }
              });
            } else {
              imEd.u = Math.min(0.98, Math.max(-0.2, oU + dx / cssW));
              imEd.v = Math.min(0.98, Math.max(-0.2, oV + dy / cssH));
              imEd.moved = true;
              iWrap.style.left = `${imEd.u * cssW}px`;
              iWrap.style.top = `${imEd.v * cssH}px`;
              if (isImgSel) positionImgFmtBar(iWrap);
            }
          }
        }

        function onUp() {
          window.removeEventListener("pointermove", onMv);
          window.removeEventListener("pointerup", onUp);
          document.body.classList.remove("is-dragging-box");
          if (!didMove && !isImgSel) {
            clearAllContentSelections();
            state.selectedImgEditId = imEd.id;
            updateTopStripControls();
            renderTextEditorOverlay();
          } else if (didMove) {
            renderTextEditorOverlay();
            updateTopStripControls();
          }
        }

        window.addEventListener("pointermove", onMv);
        window.addEventListener("pointerup", onUp);
      }

      dragHandle.addEventListener("pointerdown", startMoveImg);
      iWrap.addEventListener("pointerdown", (ev) => {
        if (ev.target === seH || ev.target === eH || ev.target === sH || ev.target === dragHandle) return;
        startMoveImg(ev);
      });

      iWrap.addEventListener("dblclick", (ev) => {
        ev.stopPropagation();
        state.selectedTextId = null;
        state.selectedOrigImgId = null;
        state.selectedImgEditId = imEd.id;
        openImageFileDialog("replace");
      });

      // Resize handles (SE / E / S) with dynamic cursors
      function bindImgResize(handleEl, mode, bodyCls) {
        handleEl.addEventListener("pointerdown", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          pushUndo();
          const sx = ev.clientX;
          const sy = ev.clientY;
          const oUw = imEd.uw;
          const oVh = imEd.vh;
          const aspect = oUw / Math.max(0.01, oVh);
          document.body.classList.add(bodyCls);

          function onMv(mvEv) {
            const du = (mvEv.clientX - sx) / cssW;
            const dv = (mvEv.clientY - sy) / cssH;
            if (mode === "se") {
              imEd.uw = Math.max(0.03, Math.min(1.2, oUw + du));
              imEd.vh = mvEv.shiftKey ? Math.max(0.03, oVh + dv) : Math.max(0.03, imEd.uw / aspect);
            } else if (mode === "e") {
              imEd.uw = Math.max(0.03, Math.min(1.2, oUw + du));
            } else {
              imEd.vh = Math.max(0.03, Math.min(1.2, oVh + dv));
            }
            imEd.moved = true;
            iWrap.style.width = `${imEd.uw * cssW}px`;
            iWrap.style.height = `${imEd.vh * cssH}px`;
            positionImgFmtBar(iWrap);
          }

          function onUp() {
            window.removeEventListener("pointermove", onMv);
            window.removeEventListener("pointerup", onUp);
            document.body.classList.remove(bodyCls);
            renderTextEditorOverlay();
            updateTopStripControls();
          }

          window.addEventListener("pointermove", onMv);
          window.addEventListener("pointerup", onUp);
        });
      }

      bindImgResize(seH, "se", "is-resizing-se");
      bindImgResize(eH, "e", "is-resizing-e");
      bindImgResize(sH, "s", "is-resizing-s");

      // Drag & Drop another image file onto this replaced/added image box!
      iWrap.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        iWrap.classList.add("drag-hover");
      });
      iWrap.addEventListener("dragleave", () => iWrap.classList.remove("drag-hover"));
      iWrap.addEventListener("drop", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        iWrap.classList.remove("drag-hover");
        const files = ev.dataTransfer && ev.dataTransfer.files ? Array.from(ev.dataTransfer.files) : [];
        const imgFile = files.find((f) => window.ShibaImageEdit.isImageFile(f));
        if (imgFile) applyImageFileToTarget(imgFile, null, imEd);
      });

      el.textEditOverlay.appendChild(iWrap);
      if (isImgSel) selectedImgTargetEl = iWrap;
    });

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
        hit.dataset.spanId = sp.id;
        hit.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (ev.shiftKey || ev.ctrlKey || ev.metaKey) {
            if (state.multiSelection.length === 0 && state.selectedTextId) {
              state.multiSelection.push({ kind: "text", id: state.selectedTextId });
            } else if (state.multiSelection.length === 0 && state.selectedImgEditId) {
              state.multiSelection.push({ kind: "img", id: state.selectedImgEditId });
            }
            pushUndo();
            const newEd = promoteOrigSpanToEdit(slot, sp);
            state.multiSelection.push({ kind: "text", id: newEd.id });
            applyMultiSelectionNormalize();
            return;
          }
          commitAndDeselectContent();
          pushUndo();
          const newEd = promoteOrigSpanToEdit(slot, sp);
          state.selectedOrigImgId = null;
          state.selectedImgEditId = null;
          state.selectedTextId = newEd.id;
          state.textSessionInitial = {
            isNew: true,
            edId: newEd.id,
            pushedUndo: true,
            snapshot: JSON.stringify(newEd)
          };
          updateTopStripControls();
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
      const isMulti = isInMultiSelection("text", ed.id);
      const wrap = document.createElement("div");
      wrap.className = "text-box-wrap" + (isSelected ? " selected" : "") + (isMulti ? " multi-selected" : "");
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
      const isSingleJustify = ed.textAlign === "justify" && !String(ed.text || "").includes("\n");
      const textNode = document.createElement("div");
      textNode.className = "editable-text-node" + (isSingleJustify ? " single-line-justify" : "");
      textNode.contentEditable = isSelected ? "true" : "false";
      textNode.spellcheck = false;
      textNode.textContent = ed.text;
      textNode.style.fontFamily = window.ShibaPrepress.getCssFontStack(ed.fontKey);
      textNode.style.fontSize = `${Math.max(7, ed.fontPt) * cssScale}px`;
      textNode.style.fontWeight = ed.bold ? "700" : "400";
      textNode.style.fontStyle = ed.italic ? "italic" : "normal";
      textNode.style.lineHeight = String(typeof ed.lineHeight === "number" ? ed.lineHeight : 1.16);
      textNode.style.letterSpacing = ed.letterSpacing ? `${ed.letterSpacing * cssScale}px` : "normal";
      textNode.style.textAlign = ed.textAlign || "left";
      const decs = [];
      if (ed.underline) decs.push("underline");
      if (ed.strike) decs.push("line-through");
      textNode.style.textDecoration = decs.length ? decs.join(" ") : "none";
      textNode.style.opacity = String(typeof ed.opacity === "number" ? ed.opacity : 1);
      textNode.style.color = ed.color || "#181817";
      wrap.appendChild(textNode);

      // Resize Handles: Bottom-Right Corner (scales font size, cursor: nwse-resize) & Right Edge (adjusts wrap width, cursor: ew-resize)
      const seHandle = document.createElement("div");
      seHandle.className = "text-resize-handle se";
      wrap.appendChild(seHandle);

      const eHandle = document.createElement("div");
      eHandle.className = "text-resize-handle e";
      wrap.appendChild(eHandle);

      // --- Drag-Move Logic (Supports Both Single Box & Multi-Selection Group Move!) ---
      function startMoveBox(downEv) {
        downEv.preventDefault();
        downEv.stopPropagation();
        if (downEv.shiftKey || downEv.ctrlKey || downEv.metaKey) {
          toggleMultiSelectItem("text", ed.id);
          return;
        }
        const startX = downEv.clientX;
        const startY = downEv.clientY;
        const origU = ed.u;
        const origV = ed.v;
        const groupMode = isMulti && state.multiSelection.length >= 2;
        const groupSnap = groupMode
          ? getAllSelectedBoxMetrics().map((b) => ({
              ref: b.ref,
              kind: b.kind,
              u0: b.ref.u,
              v0: b.ref.v,
              el:
                b.kind === "text"
                  ? el.textEditOverlay.querySelector(`.text-box-wrap[data-edit-id="${b.ref.id}"]`)
                  : el.textEditOverlay.querySelector(`.img-box-wrap[data-img-edit-id="${b.ref.id}"]`)
            }))
          : null;
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
            if (groupSnap) {
              groupSnap.forEach((g) => {
                g.ref.u = Math.min(0.97, Math.max(0, g.u0 + dx / cssW));
                g.ref.v = Math.min(0.97, Math.max(0, g.v0 + dy / cssH));
                if (g.kind === "img") g.ref.moved = true;
                if (g.el) {
                  g.el.style.left = `${g.ref.u * cssW}px`;
                  g.el.style.top = `${g.ref.v * cssH}px`;
                }
              });
            } else {
              ed.u = Math.min(0.97, Math.max(0, origU + dx / cssW));
              ed.v = Math.min(0.97, Math.max(0, origV + dy / cssH));
              wrap.style.left = `${ed.u * cssW}px`;
              wrap.style.top = `${ed.v * cssH}px`;
              if (isSelected) positionTextFmtBar(wrap);
            }
          }
        }

        function onUp() {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          document.body.classList.remove("is-dragging-box");
          if (!moved && state.selectedTextId !== ed.id) {
            commitAndDeselectContent();
            state.selectedTextId = ed.id;
            state.textSessionInitial = {
              isNew: false,
              edId: ed.id,
              pushedUndo: false,
              snapshot: JSON.stringify(ed)
            };
            updateTopStripControls();
            renderTextEditorOverlay();
            focusSelectedEditorNode();
          } else {
            syncEditPropsPanel();
            updateTopStripControls();
          }
        }

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      }

      dragHandle.addEventListener("pointerdown", startMoveBox);

      wrap.addEventListener("pointerdown", (ev) => {
        if (ev.target === dragHandle || ev.target === seHandle || ev.target === eHandle) return;
        if (ev.shiftKey || ev.ctrlKey || ev.metaKey) {
          ev.preventDefault();
          ev.stopPropagation();
          toggleMultiSelectItem("text", ed.id);
          return;
        }
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
        scheduleWorkspaceCacheSave();
      });

      textNode.addEventListener("click", (ev) => ev.stopPropagation());

      el.textEditOverlay.appendChild(wrap);
      if (isSelected) selectedWrapEl = wrap;
    });

    syncEditPropsPanel();
    if (selectedWrapEl) {
      el.imgFmtBar.classList.add("hidden");
      requestAnimationFrame(() => positionTextFmtBar(selectedWrapEl));
    } else {
      el.textFmtBar.classList.add("hidden");
      if (selectedImgTargetEl) {
        requestAnimationFrame(() => positionImgFmtBar(selectedImgTargetEl));
      } else {
        el.imgFmtBar.classList.add("hidden");
      }
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
        firstCoverAlone: state.firstCoverAlone,
        autoSplitSpreads: state.imposeAutoSplitSpreads,
        spreadFirstBackFront: state.imposeSpreadFirstBackFront,
        spreadBleedMm: state.imposeSpreadBleedMm
      }
    );
  }

  async function renderImposeMultiSheetGrid() {
    if (!hasPages() || !isImposeMode()) return;
    const myToken = ++state.renderToken;
    const plan = getCurrentImpositionPlan();
    el.sequenceGrid.classList.add("impose-grid");
    el.sequenceGrid.style.setProperty("--imp-min-w", `${Math.round(390 * state.imposeGridScale)}px`);
    el.sequenceGrid.innerHTML = "";
    updatePagerUI();

    const targetCardCssW = Math.max(420, Math.min(1260, Math.round(520 * state.imposeGridScale)));

    for (let i = 0; i < plan.sheets.length; i++) {
      if (myToken !== state.renderToken) return;
      const sh = plan.sheets[i];
      const card = document.createElement("div");
      card.className = "impose-sheet-card";
      card.dataset.sheetIdx = String(i);

      const cv = document.createElement("canvas");
      card.appendChild(cv);

      const cap = document.createElement("div");
      cap.className = "clean-caption";
      const st = document.createElement("strong");
      st.textContent = t("impSheetTitleFmt", { i: i + 1 });
      cap.appendChild(st);

      if (sh.duplexSide) {
        const dup = document.createElement("span");
        dup.className = "duplex-pill";
        dup.textContent = sh.duplexSide === "front" ? t("impDuplexFront") : t("impDuplexBack");
        cap.appendChild(dup);
      }

      const pgSpan = document.createElement("span");
      pgSpan.textContent = sh.pageSummary;
      cap.appendChild(pgSpan);

      const dimSpan = document.createElement("span");
      dimSpan.style.color = "var(--text-3)";
      dimSpan.textContent = `${plan.sheetWMm.toFixed(0)}×${plan.sheetHMm.toFixed(0)}mm`;
      cap.appendChild(dimSpan);
      card.appendChild(cap);

      card.addEventListener("click", () => {
        state.activeSheetIdx = i;
        state.imposeView = "single";
        state.zoomFactor = 1.0;
        refreshWorkspace(true);
      });

      el.sequenceGrid.appendChild(card);

      await window.ShibaImpose.renderImposedSheetPreview(
        cv,
        sh,
        targetCardCssW,
        getHiResImposeUnitCanvas,
        state.cropMarks,
        t("blankPad")
      );
    }
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
    el.sequenceGrid.classList.remove("impose-grid");
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

    // Build flat ordered step list across all locate-able preflight issues for Prev/Next auto-jump!
    const flatSteps = [];
    items.forEach((it, cardIdx) => {
      if (!it.locations || !it.locations.length) return;
      const uniqueSlots = Array.from(new Set(it.locations.map((l) => l.slotIdx))).sort((a, b) => a - b);
      uniqueSlots.forEach((sIdx) => {
        flatSteps.push({ cardIdx, slotIdx: sIdx, locations: it.locations });
      });
    });
    state.flatPfSteps = flatSteps;

    if (flatSteps.length > 0) {
      el.pfNavGroup.classList.remove("hidden");
      const matchedCursor = flatSteps.findIndex(
        (st) =>
          st.cardIdx === state.selectedPfCardIdx &&
          st.slotIdx === state.activeSlotIdx &&
          state.activePfHighlights.length > 0
      );
      if (matchedCursor >= 0) state.pfStepCursor = matchedCursor;
      const dispIdx = state.pfStepCursor >= 0 ? state.pfStepCursor + 1 : 0;
      el.pfIssueCounter.textContent = `${dispIdx} / ${flatSteps.length}`;
    } else {
      el.pfNavGroup.classList.add("hidden");
      state.pfStepCursor = -1;
    }

    el.preflightDrawer.innerHTML = "";
    items.forEach((it, idx) => {
      const card = document.createElement("div");
      const hasLocs = it.locations && it.locations.length > 0;
      card.className = "pf-card" + (hasLocs ? " clickable" : "") + (state.selectedPfCardIdx === idx ? " selected" : "");
      card.dataset.pfIdx = String(idx);

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
    const stepIdx = state.flatPfSteps.findIndex((s) => s.cardIdx === cardIdx && s.slotIdx === targetSlotIdx);
    if (stepIdx >= 0) state.pfStepCursor = stepIdx;
    renderPreflightBadgeAndDrawer();
    renderCanvasStage();
    requestAnimationFrame(() => {
      const activeCard = el.preflightDrawer.querySelector(`.pf-card[data-pf-idx="${cardIdx}"]`);
      if (activeCard && typeof activeCard.scrollIntoView === "function") {
        activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  function stepPreflightIssue(delta) {
    if (!state.flatPfSteps.length) return;
    let next = state.pfStepCursor;
    if (next < 0) next = delta > 0 ? 0 : state.flatPfSteps.length - 1;
    else next = (next + delta + state.flatPfSteps.length) % state.flatPfSteps.length;
    state.pfStepCursor = next;
    const st = state.flatPfSteps[next];
    jumpToPreflightIssue(st.cardIdx, st.locations, st.slotIdx);
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
      state.baseFitScale = Math.min(availW / sheet.wPt, availH / sheet.hPt, 1.55);
      const cssW = Math.max(160, Math.round(sheet.wPt * state.baseFitScale * state.zoomFactor));

      await window.ShibaImpose.renderImposedSheetPreview(
        el.spreadCanvas,
        sheet,
        cssW,
        getHiResImposeUnitCanvas,
        state.cropMarks,
        t("blankPad")
      );
      if (myToken !== state.renderToken) return;
      updatePagerUI();
      return;
    }

    clampActiveIndices();
    updatePagerUI();
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
    const hasAnySlotEdits = (slot.edits && slot.edits.length) || (slot.imgEdits && slot.imgEdits.length);
    if (!(state.pillar === "pages" && state.pagesSub === "text") && hasAnySlotEdits) {
      paintSlotEditsOntoCanvas(ctx, el.spreadCanvas.width, el.spreadCanvas.height, slot);
    }

    updatePagerUI();
    refreshCanvasOverlays();
  }

  // =========================================================================
  // Freeform Infinite Pan & Zoom Designer Annotation Artboard Controller
  // =========================================================================
  function getAnnotateLayout() {
    return window.ShibaAnnotate.computeBoardLayout(state.pages, getSlotSizeInfo);
  }

  function pushAnnUndo() {
    state.cacheRestoredMsg = false;
    state.annUndoStack.push(JSON.stringify(state.annotations));
    if (state.annUndoStack.length > 35) state.annUndoStack.shift();
    scheduleWorkspaceCacheSave();
  }

  function syncAnnotateCursor(isDraggingNow) {
    if (!el.annotateBoardWrap) return;
    if (isDraggingNow) {
      el.annotateBoardWrap.setAttribute("data-cursor", "panning");
      return;
    }
    if (state.spacePressed || state.annTool === "pan") el.annotateBoardWrap.setAttribute("data-cursor", "pan");
    else if (state.annTool === "select") el.annotateBoardWrap.setAttribute("data-cursor", "select");
    else if (state.annTool === "note") el.annotateBoardWrap.setAttribute("data-cursor", "note");
    else el.annotateBoardWrap.setAttribute("data-cursor", "draw");
  }

  function applyAnnotateTransform() {
    el.annotateStageInner.style.transform = `translate3d(${Math.round(state.annPanX)}px, ${Math.round(state.annPanY)}px, 0) scale(${state.annScale})`;
  }

  function fitAnnotateBoard() {
    if (!hasPages()) return;
    const layout = getAnnotateLayout();
    const vw = Math.max(320, el.annotateBoardWrap.clientWidth || el.stageViewport.clientWidth);
    const vh = Math.max(260, el.annotateBoardWrap.clientHeight || el.stageViewport.clientHeight);
    const fitSc = Math.min(1.15, (vw - 48) / Math.max(1, layout.boardW), (vh - 64) / Math.max(1, layout.boardH));
    state.annScale = Math.max(0.22, Math.round(fitSc * 100) / 100);
    state.annPanX = (vw - layout.boardW * state.annScale) / 2;
    state.annPanY = Math.max(18, (vh - layout.boardH * state.annScale) / 2);
    state.annNeedsFit = false;
    applyAnnotateTransform();
    updateZoomReadout();
  }

  function clientToBoardCoords(clientX, clientY) {
    const rect = el.annotateBoardWrap.getBoundingClientRect();
    return {
      bx: (clientX - rect.left - state.annPanX) / state.annScale,
      by: (clientY - rect.top - state.annPanY) / state.annScale
    };
  }

  async function renderAnnotateBoard() {
    if (!hasPages() || !isAnnotateMode()) return;
    const myToken = ++state.renderToken;
    const layout = getAnnotateLayout();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    el.annotateStageInner.style.width = `${layout.boardW}px`;
    el.annotateStageInner.style.height = `${layout.boardH}px`;

    [el.annotateBaseCanvas, el.annotateDrawCanvas].forEach((cv) => {
      cv.width = Math.max(1, Math.round(layout.boardW * dpr));
      cv.height = Math.max(1, Math.round(layout.boardH * dpr));
      cv.style.width = `${layout.boardW}px`;
      cv.style.height = `${layout.boardH}px`;
    });

    if (state.annNeedsFit) fitAnnotateBoard();
    else applyAnnotateTransform();

    const ctx = el.annotateBaseCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.boardW, layout.boardH);

    for (const pl of layout.placements) {
      if (myToken !== state.renderToken) return;
      ctx.save();
      ctx.shadowColor = "rgba(15,15,15,0.14)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.restore();

      const bmp = await getSlotPreviewCanvas(pl.slotIdx);
      if (myToken !== state.renderToken) return;
      ctx.drawImage(bmp, pl.x, pl.y, pl.w, pl.h);

      ctx.fillStyle = state.theme === "dark" ? "#9d9d9a" : "#63625e";
      ctx.font = '600 12px -apple-system, "PingFang SC", sans-serif';
      ctx.fillText(`P${pl.slotIdx + 1}`, pl.x, pl.y - 10);
    }

    syncAnnotateCursor();
    redrawAnnotateLayer(null);
    updatePagerUI();
  }

  function redrawAnnotateLayer(previewShape) {
    if (!isAnnotateMode() || !hasPages()) return;
    const layout = getAnnotateLayout();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = el.annotateDrawCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.boardW, layout.boardH);

    state.annotations.forEach((ann) => {
      if (ann.type !== "note") {
        window.ShibaAnnotate.drawSingleAnnotationOnCtx(ctx, ann, state.selectedAnnId === ann.id);
      }
    });

    if (previewShape) {
      window.ShibaAnnotate.drawSingleAnnotationOnCtx(ctx, previewShape, false);
    }

    // Sync Callout Note DOM Cards
    el.annotateNotesLayer.innerHTML = "";
    state.annotations
      .filter((a) => a.type === "note")
      .forEach((ann) => {
        const card = document.createElement("div");
        card.className = "ann-callout-card" + (state.selectedAnnId === ann.id ? " selected" : "");
        card.dataset.noteId = ann.id;
        card.style.left = `${ann.x}px`;
        card.style.top = `${ann.y}px`;
        card.style.borderLeftColor = ann.color || "#e03e3e";

        const txt = document.createElement("div");
        txt.className = "ann-callout-text";
        txt.contentEditable = "true";
        txt.spellcheck = false;
        txt.textContent = ann.text;
        txt.addEventListener("input", () => {
          ann.text = txt.innerText;
          scheduleWorkspaceCacheSave();
        });
        txt.addEventListener("pointerdown", (ev) => {
          state.selectedAnnId = ann.id;
          ev.stopPropagation();
        });

        const del = document.createElement("button");
        del.className = "ann-callout-del";
        del.type = "button";
        del.textContent = "×";
        del.addEventListener("pointerdown", (ev) => ev.stopPropagation());
        del.addEventListener("click", (ev) => {
          ev.stopPropagation();
          pushAnnUndo();
          state.annotations = state.annotations.filter((x) => x.id !== ann.id);
          if (state.selectedAnnId === ann.id) state.selectedAnnId = null;
          redrawAnnotateLayer(null);
          updateTopStripControls();
        });

        card.addEventListener("pointerdown", (ev) => {
          if (ev.target === txt || ev.target === del) return;
          ev.preventDefault();
          ev.stopPropagation();
          state.selectedAnnId = ann.id;
          const sPt = clientToBoardCoords(ev.clientX, ev.clientY);
          const ox = ann.x;
          const oy = ann.y;
          let moved = false;
          document.body.classList.add("is-dragging-box");

          function onMv(mvEv) {
            const cPt = clientToBoardCoords(mvEv.clientX, mvEv.clientY);
            const dx = cPt.bx - sPt.bx;
            const dy = cPt.by - sPt.by;
            if (!moved && Math.hypot(dx, dy) > 2) {
              moved = true;
              pushAnnUndo();
            }
            if (moved) {
              ann.x = ox + dx;
              ann.y = oy + dy;
              card.style.left = `${ann.x}px`;
              card.style.top = `${ann.y}px`;
            }
          }

          function onUp() {
            window.removeEventListener("pointermove", onMv);
            window.removeEventListener("pointerup", onUp);
            document.body.classList.remove("is-dragging-box");
            updateTopStripControls();
          }

          window.addEventListener("pointermove", onMv);
          window.addEventListener("pointerup", onUp);
        });

        card.appendChild(txt);
        card.appendChild(del);
        el.annotateNotesLayer.appendChild(card);
      });
  }

  // =========================================================================
  // Master Progressive Workspace Synchronizer
  // =========================================================================
  function updatePagerUI() {
    if (isAnnotateMode() || isOrganizeMode()) {
      el.pageIndicator.textContent = `${state.pages.length}${t("pagesUnit")}`;
      el.prevSpreadBtn.classList.add("hidden");
      el.nextSpreadBtn.classList.add("hidden");
      updateZoomReadout();
      return;
    }
    if (isImposeGridMode()) {
      const plan = getCurrentImpositionPlan();
      el.pageIndicator.textContent = `${plan.sheets.length} ${t("impSheetTitleFmt", { i: "" }).trim()}`;
      el.prevSpreadBtn.classList.add("hidden");
      el.nextSpreadBtn.classList.add("hidden");
      updateZoomReadout();
      return;
    }
    el.prevSpreadBtn.classList.remove("hidden");
    el.nextSpreadBtn.classList.remove("hidden");
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
    updateZoomReadout();
  }

  function updateTopStripControls() {
    const loaded = hasPages();

    // Sync Left-Rail Collapsible Groups & Sub-Items
    el.grpPages.classList.toggle("open", Boolean(state.openGroups.pages));
    el.grpPrepress.classList.toggle("open", Boolean(state.openGroups.prepress));
    el.grpConvert.classList.toggle("open", Boolean(state.openGroups.convert));

    el.navPagesBtn.classList.toggle("active", state.pillar === "pages");
    el.navPrepressBtn.classList.toggle("active", state.pillar === "prepress");
    el.navPreflightBtn.classList.toggle("active", state.pillar === "preflight");
    el.navConvertBtn.classList.toggle("active", state.pillar === "convert");

    el.subOrgBtn.classList.toggle("active", state.pillar === "pages" && state.pagesSub === "organize");
    el.subTextBtn.classList.toggle("active", state.pillar === "pages" && state.pagesSub === "text");
    el.subAnnotateBtn.classList.toggle("active", state.pillar === "pages" && state.pagesSub === "annotate");

    el.subImposeBtn.classList.toggle("active", state.pillar === "prepress" && state.prepressSub === "impose");
    el.subSplitBtn.classList.toggle("active", state.pillar === "prepress" && state.prepressSub === "split");
    el.subK100Btn.classList.toggle("active", state.pillar === "prepress" && state.prepressSub === "k100");

    el.subCompBtn.classList.toggle("active", state.pillar === "convert" && state.convertSub === "compress");
    el.subImgBtn.classList.toggle("active", state.pillar === "convert" && state.convertSub === "img");
    el.subImgPdfBtn.classList.toggle("active", state.pillar === "convert" && state.convertSub === "imgpdf");

    el.railFilesBox.classList.toggle("hidden", state.docOrder.length === 0);
    el.sidebarUploadBtn.classList.toggle("hidden", state.docOrder.length > 0);
    renderPreflightBadgeAndDrawer();

    if (!loaded) {
      el.topStrip.classList.add("hidden");
      el.topStrip.classList.remove("center-tools");
      el.rightSplitter.classList.add("hidden");
      el.preflightDrawer.classList.add("hidden");
      el.orgPreviewDrawer.classList.add("hidden");
      el.editPropsDrawer.classList.add("hidden");
      el.reopenOrgPreviewTab.classList.add("hidden");
      el.emptyStage.classList.remove("hidden");
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.annotateBoardWrap.classList.add("hidden");
      el.convertViewPanel.classList.add("hidden");
      el.bottomPager.classList.add("hidden");
      el.textFmtBar.classList.add("hidden");
      el.imgFmtBar.classList.add("hidden");
      el.stageViewport.classList.remove("align-top", "freeform-mode");
      updateStatusBars();
      return;
    }

    el.emptyStage.classList.add("hidden");
    const isPages = state.pillar === "pages";
    const isPrep = state.pillar === "prepress";
    const isPf = state.pillar === "preflight";
    const isConv = state.pillar === "convert";
    const isAnn = isAnnotateMode();
    const isOrg = isOrganizeMode();
    const isTextEdit = isPages && state.pagesSub === "text";
    const isEditOp = isTextEdit || isAnn;

    // Top Strip only shows parameters/tools; center tools horizontally during Edit & Annotate operations!
    el.topStrip.classList.toggle("hidden", isConv);
    el.topStrip.classList.toggle("center-tools", isEditOp);
    el.exportBtn.disabled = state.busy;

    el.stripPages.classList.toggle("hidden", !isPages);
    el.stripPrepress.classList.toggle("hidden", !isPrep);
    el.stripPreflight.classList.toggle("hidden", !isPf);
    el.preflightDrawer.classList.toggle("hidden", !isPf);
    const showOrgPreview = isOrg && state.orgPreviewOpen;
    const showEditProps = isTextEdit && state.editPropsOpen;
    el.orgPreviewDrawer.classList.toggle("hidden", !showOrgPreview);
    el.editPropsDrawer.classList.toggle("hidden", !showEditProps);
    el.reopenOrgPreviewTab.classList.toggle(
      "hidden",
      !((isOrg && !state.orgPreviewOpen) || (isTextEdit && !state.editPropsOpen))
    );
    el.rightSplitter.classList.toggle("hidden", !(isPf || showOrgPreview || showEditProps));
    el.toggleOrgPreviewBtn.classList.toggle("active", state.orgPreviewOpen);
    el.toggleEditPropsBtn.classList.toggle("active", state.editPropsOpen);
    el.stripRightGroup.classList.toggle("hidden", isConv);
    el.annExportPngBtn.classList.toggle("hidden", !isAnn);
    el.annExportPngBtn.disabled = state.busy;

    // Pillar 1 Parameter Controls
    el.orgControls.classList.toggle("hidden", state.pagesSub !== "organize");
    el.textEditControls.classList.toggle("hidden", state.pagesSub !== "text");
    el.annotateControls.classList.toggle("hidden", state.pagesSub !== "annotate");

    const selCount = getSelectedSlots().length;
    el.selNoneBtn.classList.toggle("hidden", selCount === 0);
    el.selActionGroup.classList.toggle("hidden", selCount === 0);
    el.extractSelText.textContent = t("extractSelBtn", { n: selCount });
    el.delSelBtn.disabled = selCount >= state.pages.length;

    el.deletePageBtn.disabled = state.pages.length <= 1;
    el.undoEditBtn.classList.toggle("hidden", state.undoStack.length === 0);
    const multiCnt = state.multiSelection.length;
    el.multiAlignGroup.classList.toggle("hidden", multiCnt < 2);
    el.distOpBtns.forEach((b) => {
      b.disabled = multiCnt < 3;
    });
    const hasActiveEditTask = Boolean(
      state.placingNewText || state.selectedTextId || state.selectedOrigImgId || state.selectedImgEditId || multiCnt >= 2
    );
    el.cancelEditTaskBtn.classList.toggle("hidden", !hasActiveEditTask);
    el.addTextBtn.classList.toggle("active", state.placingNewText);
    el.editHintLabel.textContent = state.placingNewText ? t("editPlaceHint") : t("editClickHint");
    if (showEditProps) syncEditPropsPanel();

    // Designer Annotation Controls
    el.annToolBtns.forEach((b) => b.classList.toggle("active", b.dataset.tool === state.annTool));
    el.annColorDots.forEach((d) => d.classList.toggle("active", d.dataset.color.toLowerCase() === state.annColor.toLowerCase()));
    el.annColorInput.value = state.annColor;
    el.annWidthBtns.forEach((w) => w.classList.toggle("active", parseFloat(w.dataset.w) === state.annStrokeW));
    el.annUndoBtn.classList.toggle("hidden", state.annUndoStack.length === 0);
    el.annClearBtn.classList.toggle("hidden", state.annotations.length === 0);

    // Pillar 2 Parameter Controls
    el.imposeControls.classList.toggle("hidden", state.prepressSub !== "impose");
    el.splitControls.classList.toggle("hidden", state.prepressSub !== "split");
    el.k100InlineHint.classList.toggle("hidden", state.prepressSub !== "k100");

    el.impViewGridBtn.classList.toggle("active", state.imposeView === "grid");
    el.impViewSingleBtn.classList.toggle("active", state.imposeView === "single");
    el.impBookletBtn.classList.toggle("active", state.imposeType === "booklet");
    el.impSpreadBtn.classList.toggle("active", state.imposeType === "spread2up");
    el.impNupBtn.classList.toggle("active", state.imposeType === "nup");
    el.nupOnlyRows.classList.toggle("hidden", state.imposeType !== "nup");
    el.firstCoverRow.classList.toggle("hidden", state.imposeType !== "spread2up");
    el.nupChips.forEach((ch) => ch.classList.toggle("active", Number(ch.dataset.nup) === state.imposeNup));
    el.impAutoSplitCheck.checked = Boolean(state.imposeAutoSplitSpreads);
    el.impSpreadCoverCheck.checked = Boolean(state.imposeSpreadFirstBackFront);
    el.impSpreadDetailRows.classList.toggle("hidden", !state.imposeAutoSplitSpreads);
    if (isPrep && state.prepressSub === "impose") {
      const impCheck = getCurrentImpositionPlan();
      el.impSpreadAutoBtn.classList.toggle("hidden", !impCheck.hasAnySpread);
      el.impSpreadAutoBtn.classList.toggle("active", Boolean(state.imposeAutoSplitSpreads));
      el.impSpreadAutoText.textContent = state.imposeAutoSplitSpreads
        ? t("impAutoSplitPillOn", { p: impCheck.origLogicalCount })
        : t("impAutoSplitPillOff");
    } else {
      el.impSpreadAutoBtn.classList.add("hidden");
    }

    el.tabSpreadBtn.classList.toggle("active", state.splitTab === "spread");
    el.tabSeqBtn.classList.toggle("active", state.splitTab === "sequence");
    el.splitParamsSummary.textContent = t("splitSummaryFmt", { b: state.bleed.top });
    el.bleedTrimBtn.classList.toggle("active", state.bleedAction === "trim");
    el.bleedKeepBtn.classList.toggle("active", state.bleedAction === "keep");
    el.dirLtrBtn.classList.toggle("active", state.readingDir === "ltr");
    el.dirRtlBtn.classList.toggle("active", state.readingDir === "rtl");

    // Pillar 4 Cards
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

    if (isAnn) {
      el.dimSummaryText.textContent = "";
      el.exportBtnText.textContent = state.busy ? t("exportingBtn") : t("annExportPdfBtn");
    } else if (isPages) {
      el.dimSummaryText.textContent = `${curInfo.wMm.toFixed(0)}×${curInfo.hMm.toFixed(0)}mm · ${state.pages.length}${t("pagesUnit")}`;
      el.exportBtnText.textContent = state.busy ? t("exportingBtn") : t("exportMergedBtn", { n: state.pages.length });
    } else if (isPrep && state.prepressSub === "impose") {
      const impPlan = getCurrentImpositionPlan();
      const padNote =
        state.imposeType === "booklet" && impPlan.paddedTotal > impPlan.origLogicalCount
          ? t("bookletPadHint", { orig: impPlan.origLogicalCount, pad: impPlan.paddedTotal })
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

    updateStatusBars();
  }

  function getCurrentModuleLabel() {
    if (state.pillar === "pages") {
      if (state.pagesSub === "organize") return t("navSubOrg");
      if (state.pagesSub === "text") return t("navSubEdit");
      return t("navSubAnnotate");
    }
    if (state.pillar === "prepress") {
      if (state.prepressSub === "impose") return t("navSubImpose");
      if (state.prepressSub === "split") return t("navSubSplit");
      return t("navSubK100");
    }
    if (state.pillar === "preflight") return t("pillarPreflight");
    if (state.convertSub === "compress") return t("navSubCompress");
    if (state.convertSub === "img") return t("navSubExportImg");
    return t("navSubImgPdf");
  }

  function getTotalLoadedBytes() {
    let sum = 0;
    state.docOrder.forEach((docId) => {
      const d = state.sourceDocs.get(docId);
      if (d && d.size) sum += d.size;
    });
    return sum;
  }

  function updateStatusBars() {
    if (!el.leftStatusText || !el.rightStatusBadge || !el.rightStatusMain || !el.rightStatusMeta) return;

    // 1. Left Column Fixed Status Bar (GitHub + Wonvy on left, local offline / cached files summary on right)
    if (!state.docOrder.length || !hasPages()) {
      el.leftStatusText.textContent = t("stLeftIdle");
    } else {
      const mbStr = Math.max(0.01, getTotalLoadedBytes() / (1024 * 1024)).toFixed(2);
      el.leftStatusText.textContent = state.cacheSaved
        ? t("stCacheSaved", { f: state.docOrder.length, mb: mbStr })
        : t("stLeftLoaded", { f: state.docOrder.length, mb: mbStr });
    }

    // 2. Right Column Fixed Contextual Status Bar
    el.rightStatusBadge.className = "right-status-badge";
    const modLabel = getCurrentModuleLabel();

    if (state.busy) {
      el.rightStatusBadge.classList.add("busy");
      el.rightStatusBadge.textContent = t("stBadgeBusy");
      el.rightStatusMain.textContent = t("stBusyMsg");
      el.rightStatusMeta.textContent = hasPages() ? `${state.pages.length}${t("pagesUnit")}` : "";
      return;
    }

    if (!hasPages()) {
      el.rightStatusBadge.textContent = t("stBadgeReady");
      el.rightStatusMain.textContent = t("stEmptyMsg");
      el.rightStatusMeta.textContent = t("stEmptyRight", { m: modLabel });
      return;
    }

    clampActiveIndices();
    const curSlot = state.pages[state.activeSlotIdx] || state.pages[0];
    const curInfo = getSlotSizeInfo(curSlot);
    const zoomDisp =
      Math.abs(state.zoomFactor - 1.0) < 0.01 ? t("fitZoom") : `${Math.round(state.zoomFactor * 100)}%`;
    const rotSuffix = curInfo.totalRot ? ` · ${curInfo.totalRot}°` : "";
    const stdPageRight = t("stPageRight", {
      p: state.activeSlotIdx + 1,
      total: state.pages.length,
      w: curInfo.wMm.toFixed(0),
      h: curInfo.hMm.toFixed(0),
      rot: rotSuffix,
      z: zoomDisp
    });

    if (state.cacheRestoredMsg) {
      el.rightStatusBadge.classList.add("ok");
      el.rightStatusBadge.textContent = modLabel;
      el.rightStatusMain.textContent = t("stCacheRestored", { p: state.pages.length });
      el.rightStatusMeta.textContent = stdPageRight;
      return;
    }

    if (state.pillar === "pages" && state.pagesSub === "organize") {
      const selCount = getSelectedSlots().length;
      const pIdx = Math.max(0, Math.min(state.pages.length - 1, state.previewSlotIdx || state.activeSlotIdx));
      const pInfo = getSlotSizeInfo(state.pages[pIdx]);
      el.rightStatusBadge.textContent = modLabel;
      if (selCount > 0) {
        el.rightStatusBadge.classList.add("ok");
        el.rightStatusMain.textContent = t("stOrgSel", { sel: selCount, total: state.pages.length });
      } else {
        el.rightStatusMain.textContent = t("stOrgIdle", {
          total: state.pages.length,
          docs: Math.max(1, state.docOrder.length)
        });
      }
      el.rightStatusMeta.textContent = t("stOrgRight", {
        p: pIdx + 1,
        w: pInfo.wMm.toFixed(0),
        h: pInfo.hMm.toFixed(0),
        z: Math.round(state.orgGridScale * 100)
      });
      return;
    }

    if (state.pillar === "pages" && state.pagesSub === "text") {
      el.rightStatusBadge.textContent = modLabel;
      if (state.placingNewText) {
        el.rightStatusBadge.classList.add("warn");
        el.rightStatusMain.textContent = t("stEditPlace");
      } else if (state.multiSelection.length >= 2) {
        el.rightStatusBadge.classList.add("ok");
        el.rightStatusMain.textContent = t("stMultiSel", { n: state.multiSelection.length });
      } else if (state.selectedTextId) {
        const ed = getSelectedEditObj();
        el.rightStatusBadge.classList.add("ok");
        el.rightStatusMain.textContent = t("stEditTextSel", { pt: ed ? Math.round(ed.fontPt) : 14 });
      } else if (state.selectedOrigImgId || state.selectedImgEditId) {
        el.rightStatusBadge.classList.add("ok");
        el.rightStatusMain.textContent = t("stEditImgSel");
      } else {
        const pageEdits = (curSlot.edits ? curSlot.edits.length : 0) + (curSlot.imgEdits ? curSlot.imgEdits.length : 0);
        let totalEdits = 0;
        state.pages.forEach((s) => {
          totalEdits += (s.edits ? s.edits.length : 0) + (s.imgEdits ? s.imgEdits.length : 0);
        });
        el.rightStatusMain.textContent = t("stEditIdle", { pe: pageEdits, te: totalEdits });
      }
      el.rightStatusMeta.textContent = stdPageRight;
      return;
    }

    if (state.pillar === "pages" && state.pagesSub === "annotate") {
      const toolKeyMap = {
        pan: "annPan",
        select: "annSelect",
        rect: "annRect",
        ellipse: "annEllipse",
        arrow: "annArrow",
        pen: "annPen",
        note: "annNote"
      };
      const toolLabel = t(toolKeyMap[state.annTool] || "annRect");
      el.rightStatusBadge.textContent = modLabel;
      if (state.selectedAnnId) {
        el.rightStatusBadge.classList.add("ok");
        el.rightStatusMain.textContent = t("stAnnSelected");
      } else {
        el.rightStatusMain.textContent = t("stAnnIdle", { tool: toolLabel, n: state.annotations.length });
      }
      el.rightStatusMeta.textContent = t("stAnnRight", {
        total: state.pages.length,
        z: Math.round(state.annScale * 100)
      });
      return;
    }

    if (state.pillar === "prepress" && state.prepressSub === "impose") {
      const impPlan = getCurrentImpositionPlan();
      const modeName =
        state.imposeType === "booklet"
          ? t("imposeBooklet")
          : state.imposeType === "spread2up"
          ? t("imposeSpread2Up")
          : `${t("imposeNUp")} (${state.imposeNup})`;
      const sTotal = Math.max(1, impPlan.sheets.length);
      const sCur = Math.min(sTotal, Math.max(1, state.activeSheetIdx + 1));
      const splitNote = impPlan.didSplitSpreads ? ` · ${t("impAutoSplitPillOn", { p: impPlan.origLogicalCount })}` : "";
      const gridNote = state.imposeView === "grid" ? t("impClickZoomHint") : "";
      el.rightStatusBadge.textContent = modLabel;
      el.rightStatusMain.textContent =
        t("stImpMsg", {
          mode: modeName,
          s: impPlan.sheets.length,
          crop: state.cropMarks ? t("stImpCropOn") : t("stImpCropOff"),
          k100: state.imposeK100 ? t("stImpK100On") : t("stImpK100Off")
        }) + splitNote + gridNote;
      el.rightStatusMeta.textContent = t("stImpRight", {
        i: state.imposeView === "grid" ? sTotal : sCur,
        s: sTotal,
        w: impPlan.sheetWMm.toFixed(0),
        h: impPlan.sheetHMm.toFixed(0),
        z: state.imposeView === "grid" ? `${Math.round(state.imposeGridScale * 100)}%` : zoomDisp
      });
      return;
    }

    if (state.pillar === "prepress" && state.prepressSub === "split") {
      const spPlan = computeSplitPlanForSlots(state.pages);
      const s0 = spPlan[0] || { outWMm: curInfo.wMm, outHMm: curInfo.hMm };
      const bleedVal = state.bleed.top;
      const actLabel = state.bleedAction === "trim" ? t("actionTrimShort") : t("actionKeepShort");
      const viewLabel =
        state.splitTab === "spread"
          ? `P${state.activeSlotIdx + 1} / ${state.pages.length}`
          : t("tabSequence");
      el.rightStatusBadge.textContent = modLabel;
      el.rightStatusMain.textContent = t("stSplitMsg", {
        orig: state.pages.length,
        out: spPlan.length,
        b: bleedVal,
        act: actLabel
      });
      el.rightStatusMeta.textContent = t("stSplitRight", {
        view: viewLabel,
        w: s0.outWMm.toFixed(0),
        h: s0.outHMm.toFixed(0)
      });
      return;
    }

    if (state.pillar === "prepress" && state.prepressSub === "k100") {
      el.rightStatusBadge.textContent = modLabel;
      el.rightStatusMain.textContent = t("stK100Msg");
      el.rightStatusMeta.textContent = stdPageRight;
      return;
    }

    if (state.pillar === "preflight") {
      const items = buildAggregatedPreflightItems();
      const errCount = items.filter((i) => i.status === "err").length;
      const warnCount = items.filter((i) => i.status === "warn").length;
      const okCount = items.filter((i) => i.status === "ok").length;
      el.rightStatusBadge.textContent = modLabel;
      if (errCount === 0 && warnCount === 0) {
        el.rightStatusBadge.classList.add("ok");
        el.rightStatusMain.textContent = t("stPfAllOk");
      } else {
        el.rightStatusBadge.classList.add(errCount > 0 ? "err" : "warn");
        const stepTxt =
          state.flatPfSteps.length > 0 && state.pfStepCursor >= 0
            ? t("stPfStep", { c: state.pfStepCursor + 1, t: state.flatPfSteps.length })
            : "";
        el.rightStatusMain.textContent = t("stPfIssues", {
          err: errCount,
          warn: warnCount,
          ok: okCount,
          step: stepTxt
        });
      }
      el.rightStatusMeta.textContent = stdPageRight;
      return;
    }

    const totalMb = Math.max(0.01, getTotalLoadedBytes() / (1024 * 1024)).toFixed(2);
    el.rightStatusBadge.textContent = modLabel;
    if (state.convertSub === "compress") {
      const presetKey =
        state.compPreset === "high"
          ? "compPresetHigh"
          : state.compPreset === "max"
          ? "compPresetMax"
          : "compPresetBalanced";
      el.rightStatusMain.textContent = t("stCompMsg", {
        preset: t(presetKey),
        vec: state.compKeepVec ? t("stCompVecOn") : t("stCompVecOff")
      });
      el.rightStatusMeta.textContent = t("stConvRight", { total: state.pages.length, mb: totalMb });
    } else if (state.convertSub === "img") {
      const selCount = getSelectedSlots().length;
      const useSel = state.imgScope === "selected" && selCount > 0;
      const targetN = useSel ? selCount : state.pages.length;
      const scopeLabel = useSel
        ? t("imgScopeSel", { n: selCount })
        : t("imgScopeAll", { n: state.pages.length });
      el.rightStatusMain.textContent = t("stImgMsg", {
        fmt: state.imgFmt.toUpperCase(),
        dpi: state.imgDpi,
        scope: scopeLabel
      });
      el.rightStatusMeta.textContent = t("stImgRight", {
        n: targetN,
        zip: targetN > 1 ? t("stImgZip") : ""
      });
    } else {
      el.rightStatusMain.textContent = t("stImgPdfMsg", { dpi: state.imgPdfDpi });
      el.rightStatusMeta.textContent = t("stConvRight", { total: state.pages.length, mb: totalMb });
    }
  }

  function refreshWorkspace(rerenderStage) {
    clampActiveIndices();
    updateTopStripControls();
    if (!hasPages()) return;

    const showOrgGrid = state.pillar === "pages" && state.pagesSub === "organize";
    const showAnnotate = isAnnotateMode();
    const showImposeGrid = isImposeGridMode();
    const showSplitGrid = state.pillar === "prepress" && state.prepressSub === "split" && state.splitTab === "sequence";
    const showConvert = state.pillar === "convert";
    const showCanvas = !showOrgGrid && !showAnnotate && !showImposeGrid && !showSplitGrid && !showConvert;

    el.stageViewport.classList.toggle("align-top", showOrgGrid || showImposeGrid || showSplitGrid || showConvert);
    el.stageViewport.classList.toggle("freeform-mode", showAnnotate);
    el.spreadViewContainer.classList.toggle("hidden", !showCanvas);
    el.sequenceGrid.classList.toggle("hidden", !(showOrgGrid || showImposeGrid || showSplitGrid));
    el.annotateBoardWrap.classList.toggle("hidden", !showAnnotate);
    el.convertViewPanel.classList.toggle("hidden", !showConvert);
    el.bottomPager.classList.toggle("hidden", !(showCanvas || showAnnotate || showOrgGrid || showImposeGrid));
    if (showOrgGrid || showImposeGrid) updatePagerUI();
    if (!showCanvas || state.pillar !== "pages" || state.pagesSub !== "text") {
      el.textFmtBar.classList.add("hidden");
      el.imgFmtBar.classList.add("hidden");
    }

    if (!rerenderStage) return;
    if (showOrgGrid) renderOrganizeGrid();
    else if (showAnnotate) renderAnnotateBoard();
    else if (showImposeGrid) renderImposeMultiSheetGrid();
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

  function renderTextEditStampPng(ed, pageWPt) {
    return window.ShibaEditProps.renderRichTextStampPng(
      ed,
      pageWPt || 595,
      window.ShibaPrepress.getCssFontStack
    );
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

      if (slot.imgEdits && slot.imgEdits.length && window.ShibaImageEdit) {
        const crop = pg.getCropBox();
        await window.ShibaImageEdit.applySlotImageEditsToPdfPage(
          outDoc,
          pg,
          slot,
          crop,
          totalRot,
          normVisualToPdfRect,
          hexToRgb01
        );
      }

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
            const stamp = renderTextEditStampPng(ed, getSlotSizeInfo(slot).wPt);
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

      if (isAnnotateMode()) {
        const prepDoc = await assembleSlotsPdfDoc(state.pages, false);
        const layout = getAnnotateLayout();
        const bytes = await window.ShibaAnnotate.exportAnnotatedPdfBytes(prepDoc, layout, state.annotations);
        triggerDownloadBlob(new Blob([bytes], { type: "application/pdf" }), `${stem}_审稿批注.pdf`);
      } else if (state.pillar === "pages") {
        const doc = await assembleSlotsPdfDoc(state.pages, false);
        const bytes = await doc.save();
        triggerDownloadBlob(new Blob([bytes], { type: "application/pdf" }), `${stem}.pdf`);
      } else if (state.pillar === "prepress" && state.prepressSub === "impose") {
        const prepDoc = await assembleSlotsPdfDoc(state.pages, state.imposeK100);
        const plan = getCurrentImpositionPlan();
        const bytes = await window.ShibaImpose.exportImposedPdfBytes(prepDoc, plan, state.cropMarks, normVisualToPdfRect);
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

  // Left Collapsible Groups & Pillars
  function toggleOrActivateGroup(p) {
    if (p in state.openGroups) {
      if (state.pillar === p) {
        state.openGroups[p] = !state.openGroups[p];
        updateTopStripControls();
        return;
      }
      state.openGroups[p] = true;
    }
    state.pillar = p;
    state.placingNewText = false;
    clearAllContentSelections();
    closeAllPopovers();
    refreshWorkspace(true);
  }

  el.navPagesBtn.addEventListener("click", () => toggleOrActivateGroup("pages"));
  el.navPrepressBtn.addEventListener("click", () => toggleOrActivateGroup("prepress"));
  el.navPreflightBtn.addEventListener("click", () => toggleOrActivateGroup("preflight"));
  el.navConvertBtn.addEventListener("click", () => toggleOrActivateGroup("convert"));

  // File Inputs & Global Drag-and-Drop Merge + Visual Drag Feedback
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
    state.annotations = [];
    state.annUndoStack = [];
    state.bitmapCache.clear();
    state.hiResSlotCache.clear();
    state.cacheSaved = false;
    state.cacheRestoredMsg = false;
    if (window.ShibaStorage) window.ShibaStorage.clearWorkspaceSnapshot();
    clearAllContentSelections();
    state.activePfHighlights = [];
    renderFileList();
    refreshWorkspace(true);
  });

  window.addEventListener("dragenter", (ev) => {
    if (state.draggingOrgIdx >= 0) return;
    if (ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes("Files")) {
      state.dragDepth++;
      el.dragOverlayText.textContent = t("dragDropTitle");
      el.dragOverlay.classList.remove("hidden");
    }
  });

  window.addEventListener("dragover", (ev) => {
    if (state.draggingOrgIdx >= 0) return;
    ev.preventDefault();
    el.dropzone.classList.add("dragover");
  });

  window.addEventListener("dragleave", () => {
    el.dropzone.classList.remove("dragover");
    state.dragDepth = Math.max(0, state.dragDepth - 1);
    if (state.dragDepth === 0) el.dragOverlay.classList.add("hidden");
  });

  window.addEventListener("drop", (ev) => {
    state.dragDepth = 0;
    el.dragOverlay.classList.add("hidden");
    if (state.draggingOrgIdx >= 0) return;
    ev.preventDefault();
    el.dropzone.classList.remove("dragover");
    const files = ev.dataTransfer && ev.dataTransfer.files ? Array.from(ev.dataTransfer.files) : [];
    if (!files.length) return;

    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf");
    const imgFiles = window.ShibaImageEdit ? files.filter((f) => window.ShibaImageEdit.isImageFile(f)) : [];

    if (pdfFiles.length) {
      loadPdfFiles(pdfFiles);
      return;
    }
    if (imgFiles.length && hasPages()) {
      const hasSelTarget = Boolean(state.selectedOrigImgId || state.selectedImgEditId);
      if (state.pillar !== "pages" || state.pagesSub !== "text") {
        state.pillar = "pages";
        state.pagesSub = "text";
        state.openGroups.pages = true;
        refreshWorkspace(true);
      }
      state.imgInputMode = hasSelTarget ? "replace" : "add";
      applyImageFileToTarget(imgFiles[0], null, null);
    }
  });

  // Offline Single-File App Download
  el.downloadOfflineBtn.addEventListener("click", () => {
    const blob = new Blob([BOOT_CLEAN_HTML], { type: "text/html;charset=utf-8" });
    triggerDownloadBlob(blob, "ShibaPDF_Offline_Studio.html");
  });

  // Pillar 1 Sub-items & Freeform Designer Annotation Interactions
  el.subOrgBtn.addEventListener("click", () => {
    state.pillar = "pages";
    state.openGroups.pages = true;
    state.pagesSub = "organize";
    state.placingNewText = false;
    clearAllContentSelections();
    refreshWorkspace(true);
  });

  el.subTextBtn.addEventListener("click", () => {
    state.pillar = "pages";
    state.openGroups.pages = true;
    state.pagesSub = "text";
    refreshWorkspace(true);
  });

  el.subAnnotateBtn.addEventListener("click", () => {
    state.pillar = "pages";
    state.openGroups.pages = true;
    state.pagesSub = "annotate";
    state.placingNewText = false;
    clearAllContentSelections();
    refreshWorkspace(true);
  });

  // Annotation Tool Palette Events
  el.annToolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.annTool = btn.dataset.tool || "rect";
      if (state.annTool !== "select") state.selectedAnnId = null;
      syncAnnotateCursor();
      redrawAnnotateLayer(null);
      updateTopStripControls();
    });
  });

  el.annColorDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      state.annColor = dot.dataset.color || "#e03e3e";
      if (state.selectedAnnId) {
        const sel = state.annotations.find((a) => a.id === state.selectedAnnId);
        if (sel) sel.color = state.annColor;
        redrawAnnotateLayer(null);
      }
      updateTopStripControls();
    });
  });

  el.annColorInput.addEventListener("input", () => {
    state.annColor = el.annColorInput.value;
    if (state.selectedAnnId) {
      const sel = state.annotations.find((a) => a.id === state.selectedAnnId);
      if (sel) sel.color = state.annColor;
      redrawAnnotateLayer(null);
    }
    updateTopStripControls();
  });

  el.annWidthBtns.forEach((wBtn) => {
    wBtn.addEventListener("click", () => {
      state.annStrokeW = parseFloat(wBtn.dataset.w) || 3.5;
      if (state.selectedAnnId) {
        const sel = state.annotations.find((a) => a.id === state.selectedAnnId);
        if (sel && sel.strokeW) sel.strokeW = state.annStrokeW;
        redrawAnnotateLayer(null);
      }
      updateTopStripControls();
    });
  });

  el.annUndoBtn.addEventListener("click", () => {
    if (!state.annUndoStack.length) return;
    state.annotations = JSON.parse(state.annUndoStack.pop());
    state.selectedAnnId = null;
    redrawAnnotateLayer(null);
    updateTopStripControls();
  });

  el.annClearBtn.addEventListener("click", () => {
    if (!state.annotations.length) return;
    pushAnnUndo();
    state.annotations = [];
    state.selectedAnnId = null;
    redrawAnnotateLayer(null);
    updateTopStripControls();
  });

  el.annExportPngBtn.addEventListener("click", async () => {
    if (!hasPages() || state.busy) return;
    state.busy = true;
    updateTopStripControls();
    try {
      const layout = getAnnotateLayout();
      const blob = await window.ShibaAnnotate.exportReviewBoardPngBlob(
        layout,
        (sIdx) => getSlotPreviewCanvas(sIdx),
        state.annotations
      );
      triggerDownloadBlob(blob, `${getPrimaryStem()}_审稿批注图.png`);
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      state.busy = false;
      updateTopStripControls();
    }
  });

  // Freeform Canvas Pointer Pan / Draw / Select / Note Handler
  el.annotateBoardWrap.addEventListener("pointerdown", (ev) => {
    if (!isAnnotateMode() || !hasPages()) return;
    if (ev.target.closest(".ann-callout-card")) return;

    const wantPan = ev.button === 1 || state.spacePressed || state.annTool === "pan";
    if (wantPan) {
      ev.preventDefault();
      const sx = ev.clientX;
      const sy = ev.clientY;
      const ox = state.annPanX;
      const oy = state.annPanY;
      syncAnnotateCursor(true);
      document.body.classList.add("is-dragging-box");

      function onPanMove(mvEv) {
        state.annPanX = ox + (mvEv.clientX - sx);
        state.annPanY = oy + (mvEv.clientY - sy);
        applyAnnotateTransform();
      }
      function onPanUp() {
        window.removeEventListener("pointermove", onPanMove);
        window.removeEventListener("pointerup", onPanUp);
        document.body.classList.remove("is-dragging-box");
        syncAnnotateCursor(false);
      }
      window.addEventListener("pointermove", onPanMove);
      window.addEventListener("pointerup", onPanUp);
      return;
    }

    if (ev.button !== 0) return;
    const startPt = clientToBoardCoords(ev.clientX, ev.clientY);

    if (state.annTool === "note") {
      ev.preventDefault();
      pushAnnUndo();
      const newNote = {
        id: `ann_${Date.now()}`,
        type: "note",
        x: Math.round(startPt.bx),
        y: Math.round(startPt.by),
        text: t("annNoteDefault"),
        color: state.annColor
      };
      state.annotations.push(newNote);
      state.selectedAnnId = newNote.id;
      redrawAnnotateLayer(null);
      updateTopStripControls();
      requestAnimationFrame(() => {
        const card = el.annotateNotesLayer.querySelector(`.ann-callout-card[data-note-id="${newNote.id}"] .ann-callout-text`);
        if (card) {
          card.focus();
          const sel = window.getSelection();
          if (sel) {
            const rng = document.createRange();
            rng.selectNodeContents(card);
            sel.removeAllRanges();
            sel.addRange(rng);
          }
        }
      });
      return;
    }

    if (state.annTool === "select") {
      const hit = window.ShibaAnnotate.hitTestShapes(state.annotations, startPt.bx, startPt.by);
      if (!hit) {
        state.selectedAnnId = null;
        redrawAnnotateLayer(null);
        return;
      }
      state.selectedAnnId = hit.id;
      redrawAnnotateLayer(null);
      let lastPt = startPt;
      let movedAny = false;
      document.body.classList.add("is-dragging-box");

      function onSelMove(mvEv) {
        const curPt = clientToBoardCoords(mvEv.clientX, mvEv.clientY);
        const dx = curPt.bx - lastPt.bx;
        const dy = curPt.by - lastPt.by;
        if (!movedAny && Math.hypot(curPt.bx - startPt.bx, curPt.by - startPt.by) > 2) {
          movedAny = true;
          pushAnnUndo();
        }
        if (movedAny) {
          window.ShibaAnnotate.moveAnnotation(hit, dx, dy);
          lastPt = curPt;
          redrawAnnotateLayer(null);
        }
      }
      function onSelUp() {
        window.removeEventListener("pointermove", onSelMove);
        window.removeEventListener("pointerup", onSelUp);
        document.body.classList.remove("is-dragging-box");
        updateTopStripControls();
      }
      window.addEventListener("pointermove", onSelMove);
      window.addEventListener("pointerup", onSelUp);
      return;
    }

    // Drawing Tools: rect | ellipse | arrow | pen
    ev.preventDefault();
    state.selectedAnnId = null;
    const tool = state.annTool;
    const penPts = [[startPt.bx, startPt.by]];
    let liveShape = null;

    function onDrawMove(mvEv) {
      const curPt = clientToBoardCoords(mvEv.clientX, mvEv.clientY);
      if (tool === "rect" || tool === "ellipse") {
        liveShape = {
          id: "preview",
          type: tool,
          x: Math.min(startPt.bx, curPt.bx),
          y: Math.min(startPt.by, curPt.by),
          w: Math.abs(curPt.bx - startPt.bx),
          h: Math.abs(curPt.by - startPt.by),
          color: state.annColor,
          strokeW: state.annStrokeW
        };
      } else if (tool === "arrow") {
        liveShape = {
          id: "preview",
          type: "arrow",
          x1: startPt.bx,
          y1: startPt.by,
          x2: curPt.bx,
          y2: curPt.by,
          color: state.annColor,
          strokeW: state.annStrokeW
        };
      } else if (tool === "pen") {
        penPts.push([curPt.bx, curPt.by]);
        liveShape = {
          id: "preview",
          type: "pen",
          pts: penPts,
          color: state.annColor,
          strokeW: state.annStrokeW
        };
      }
      redrawAnnotateLayer(liveShape);
    }

    function cleanupDrawListeners() {
      window.removeEventListener("pointermove", onDrawMove);
      window.removeEventListener("pointerup", onDrawUp);
      state.abortAnnDrawFn = null;
    }

    state.abortAnnDrawFn = () => {
      cleanupDrawListeners();
      liveShape = null;
      redrawAnnotateLayer(null);
      updateTopStripControls();
    };

    function onDrawUp() {
      cleanupDrawListeners();
      if (!liveShape) return;
      const valid =
        (liveShape.type === "pen" && liveShape.pts.length >= 2) ||
        (liveShape.type === "arrow" && Math.hypot(liveShape.x2 - liveShape.x1, liveShape.y2 - liveShape.y1) > 6) ||
        ((liveShape.type === "rect" || liveShape.type === "ellipse") && (liveShape.w > 4 || liveShape.h > 4));
      if (valid) {
        pushAnnUndo();
        liveShape.id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        state.annotations.push(liveShape);
      }
      redrawAnnotateLayer(null);
      updateTopStripControls();
    }

    window.addEventListener("pointermove", onDrawMove);
    window.addEventListener("pointerup", onDrawUp);
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

  // Content Edit Controls (Text & Images), Cancel/Deselect & Floating Format Bars
  el.cancelEditTaskBtn.addEventListener("click", () => {
    if (state.selectedTextId) commitAndDeselectContent();
    else {
      state.placingNewText = false;
      clearAllContentSelections();
      updateTopStripControls();
      renderTextEditorOverlay();
    }
  });

  el.fmtDiscardBtn.addEventListener("click", () => {
    discardActiveTextSession();
  });

  el.fmtDoneBtn.addEventListener("click", () => {
    commitAndDeselectContent();
  });

  el.imgCancelSelBtn.addEventListener("click", () => {
    clearAllContentSelections();
    updateTopStripControls();
    renderTextEditorOverlay();
  });

  // Clicking empty workspace background (#stageViewport / #sequenceGrid gap) deselects & exits active tasks!
  el.stageViewport.addEventListener("click", (ev) => {
    if (ev.target !== el.stageViewport && ev.target !== el.sequenceGrid) return;
    if (state.pillar === "pages" && state.pagesSub === "text") {
      commitAndDeselectContent();
    } else if (state.pillar === "pages" && state.pagesSub === "organize" && getSelectedSlots().length > 0) {
      state.pages.forEach((s) => { s.selected = false; });
      syncOrganizeSelectionUI();
    } else if (state.pillar === "preflight" && state.activePfHighlights.length > 0) {
      state.activePfHighlights = [];
      state.selectedPfCardIdx = -1;
      renderPreflightBadgeAndDrawer();
      renderPreflightHighlightBoxes();
    }
  });

  el.addTextBtn.addEventListener("click", () => {
    const nextVal = !state.placingNewText;
    commitAndDeselectContent();
    state.placingNewText = nextVal;
    updateTopStripControls();
    renderTextEditorOverlay();
  });

  el.addImgBtn.addEventListener("click", () => {
    state.placingNewText = false;
    clearAllContentSelections();
    updateTopStripControls();
    openImageFileDialog("add");
  });

  el.imgFileInput.addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    await applyImageFileToTarget(file, null, null);
  });

  el.imgReplaceDialogBtn.addEventListener("click", () => {
    openImageFileDialog("replace");
  });

  el.imgFitChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const imEd = getSelectedImgEditObj();
      if (!imEd) return;
      pushUndo();
      imEd.fitMode = chip.dataset.fit || "cover";
      renderTextEditorOverlay();
      updateTopStripControls();
    });
  });

  el.imgRestoreBtn.addEventListener("click", () => {
    const slot = getActiveSlot();
    const imEd = getSelectedImgEditObj();
    if (!slot || !imEd) return;
    pushUndo();
    slot.imgEdits = (slot.imgEdits || []).filter((x) => x.id !== imEd.id);
    clearAllContentSelections();
    renderTextEditorOverlay();
    updateTopStripControls();
  });

  el.imgDeleteNodeBtn.addEventListener("click", () => {
    const slot = getActiveSlot();
    if (!slot) return;
    slot.imgEdits = slot.imgEdits || [];
    const imEd = getSelectedImgEditObj();
    if (imEd) {
      pushUndo();
      if (imEd.origId) {
        imEd.deleted = true;
      } else {
        slot.imgEdits = slot.imgEdits.filter((x) => x.id !== imEd.id);
      }
      clearAllContentSelections();
      renderTextEditorOverlay();
      updateTopStripControls();
      return;
    }
    if (state.selectedOrigImgId) {
      const docEntry = state.sourceDocs.get(slot.docId);
      const sp = (docEntry.origPages[slot.origIdx].imageSpans || []).find((s) => s.id === state.selectedOrigImgId);
      if (sp) {
        const sampled = sampleColorsAroundSpan(sp);
        pushUndo();
        slot.imgEdits.push({
          id: `imed_${Date.now()}`,
          origId: sp.id,
          xObjKey: sp.xObjKey,
          inForm: Boolean(sp.inForm),
          sharedOnPage: Boolean(sp.sharedOnPage),
          flipX: Boolean(sp.flipX),
          flipY: Boolean(sp.flipY),
          origRect: { u: sp.u, v: sp.v, uw: sp.uw, vh: sp.vh },
          u: sp.u,
          v: sp.v,
          uw: sp.uw,
          vh: sp.vh,
          moved: false,
          deleted: true,
          fitMode: "cover",
          dataUrl: "",
          natW: 0,
          natH: 0,
          hasAlpha: false,
          bgMaskColor: sampled.bg
        });
      }
      clearAllContentSelections();
      renderTextEditorOverlay();
      updateTopStripControls();
    }
  });

  // Marquee Rubber-Band Multi-Selection on Blank Overlay Space
  el.textEditOverlay.addEventListener("pointerdown", (ev) => {
    if (ev.target !== el.textEditOverlay || ev.button !== 0 || state.placingNewText) return;
    const slot = getActiveSlot();
    if (!slot) return;

    const ovRect = el.textEditOverlay.getBoundingClientRect();
    const sx = ev.clientX;
    const sy = ev.clientY;
    let marqueeEl = null;
    let dragged = false;

    function onMv(mvEv) {
      const dx = mvEv.clientX - sx;
      const dy = mvEv.clientY - sy;
      if (!dragged && Math.hypot(dx, dy) > 5) {
        dragged = true;
        marqueeEl = document.createElement("div");
        marqueeEl.className = "selection-marquee-box";
        el.textEditOverlay.appendChild(marqueeEl);
      }
      if (dragged && marqueeEl) {
        const x0 = Math.max(0, Math.min(sx, mvEv.clientX) - ovRect.left);
        const y0 = Math.max(0, Math.min(sy, mvEv.clientY) - ovRect.top);
        const x1 = Math.min(ovRect.width, Math.max(sx, mvEv.clientX) - ovRect.left);
        const y1 = Math.min(ovRect.height, Math.max(sy, mvEv.clientY) - ovRect.top);
        marqueeEl.style.left = `${x0}px`;
        marqueeEl.style.top = `${y0}px`;
        marqueeEl.style.width = `${Math.max(1, x1 - x0)}px`;
        marqueeEl.style.height = `${Math.max(1, y1 - y0)}px`;
      }
    }

    function onUp(upEv) {
      window.removeEventListener("pointermove", onMv);
      window.removeEventListener("pointerup", onUp);
      if (!dragged) return;
      state.suppressNextOverlayClick = true;
      if (marqueeEl && marqueeEl.parentNode) marqueeEl.parentNode.removeChild(marqueeEl);

      const mLeft = Math.min(sx, upEv.clientX);
      const mRight = Math.max(sx, upEv.clientX);
      const mTop = Math.min(sy, upEv.clientY);
      const mBottom = Math.max(sy, upEv.clientY);

      const hits = [];
      el.textEditOverlay.querySelectorAll(".text-box-wrap").forEach((wEl) => {
        const r = wEl.getBoundingClientRect();
        if (r.right >= mLeft && r.left <= mRight && r.bottom >= mTop && r.top <= mBottom) {
          hits.push({ kind: "text", id: wEl.dataset.editId });
        }
      });
      el.textEditOverlay.querySelectorAll(".img-box-wrap").forEach((iEl) => {
        const r = iEl.getBoundingClientRect();
        if (r.right >= mLeft && r.left <= mRight && r.bottom >= mTop && r.top <= mBottom) {
          hits.push({ kind: "img", id: iEl.dataset.imgEditId });
        }
      });

      // If no existing edit boxes were inside marquee, promote intersected original PDF text spans (up to 24)
      if (hits.length === 0 && slot.extraRot === 0) {
        const docEntry = state.sourceDocs.get(slot.docId);
        const origSpans = (docEntry && docEntry.origPages[slot.origIdx].textSpans) || [];
        const matchedOrig = [];
        el.textEditOverlay.querySelectorAll(".pdf-text-hit").forEach((hEl) => {
          const r = hEl.getBoundingClientRect();
          if (r.right >= mLeft && r.left <= mRight && r.bottom >= mTop && r.top <= mBottom) {
            const sp = origSpans.find((s) => s.id === hEl.dataset.spanId);
            if (sp) matchedOrig.push(sp);
          }
        });
        if (matchedOrig.length > 0 && matchedOrig.length <= 24) {
          pushUndo();
          matchedOrig.forEach((sp) => {
            const newEd = promoteOrigSpanToEdit(slot, sp);
            hits.push({ kind: "text", id: newEd.id });
          });
        }
      }

      if (hits.length > 0) {
        state.multiSelection = hits;
        applyMultiSelectionNormalize();
      } else {
        commitAndDeselectContent();
      }
    }

    window.addEventListener("pointermove", onMv);
    window.addEventListener("pointerup", onUp);
  });

  el.textEditOverlay.addEventListener("click", (ev) => {
    if (state.suppressNextOverlayClick) {
      state.suppressNextOverlayClick = false;
      return;
    }
    if (ev.target !== el.textEditOverlay) return;
    const slot = getActiveSlot();
    if (!slot) return;

    if (state.placingNewText) {
      const rect = el.textEditOverlay.getBoundingClientRect();
      const u = Math.min(0.92, Math.max(0.02, (ev.clientX - rect.left) / rect.width));
      const v = Math.min(0.92, Math.max(0.02, (ev.clientY - rect.top) / rect.height));
      pushUndo();
      const newEd = {
        id: `ed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
        underline: false,
        strike: false,
        textAlign: "left",
        lineHeight: 1.16,
        letterSpacing: 0,
        opacity: 1,
        fontKey: "sans",
        color: "#181817",
        maskBg: false,
        bgColor: "#ffffff"
      };
      slot.edits.push(newEd);
      state.placingNewText = false;
      clearAllContentSelections();
      state.selectedTextId = newEd.id;
      state.textSessionInitial = null;
      updateTopStripControls();
      renderTextEditorOverlay();
      focusSelectedEditorNode();
    } else if (state.multiSelection.length > 0 || state.selectedTextId || state.selectedOrigImgId || state.selectedImgEditId) {
      commitAndDeselectContent();
    }
  });

  el.rotatePageBtn.addEventListener("click", () => {
    const slot = getActiveSlot();
    if (!slot) return;
    pushUndo();
    slot.extraRot = (slot.extraRot + 90) % 360;
    clearAllContentSelections();
    refreshWorkspace(true);
  });

  el.deletePageBtn.addEventListener("click", () => {
    if (state.pages.length <= 1) return;
    pushUndo();
    state.pages.splice(state.activeSlotIdx, 1);
    clampActiveIndices();
    clearAllContentSelections();
    renderFileList();
    refreshWorkspace(true);
  });

  el.undoEditBtn.addEventListener("click", async () => {
    if (!state.undoStack.length) return;
    state.pages = JSON.parse(state.undoStack.pop());
    clampActiveIndices();
    clearAllContentSelections();
    if (window.ShibaImageEdit) {
      const tasks = [];
      state.pages.forEach((s) => {
        (s.imgEdits || []).forEach((ie) => {
          if (ie.dataUrl) tasks.push(window.ShibaImageEdit.ensureCachedImage(ie.dataUrl).catch(() => null));
        });
      });
      await Promise.all(tasks);
    }
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
    state.pillar = "prepress";
    state.openGroups.prepress = true;
    state.prepressSub = "impose";
    state.activeSheetIdx = 0;
    closeAllPopovers();
    refreshWorkspace(true);
  });

  el.impViewGridBtn.addEventListener("click", () => {
    state.imposeView = "grid";
    refreshWorkspace(true);
  });

  el.impViewSingleBtn.addEventListener("click", () => {
    state.imposeView = "single";
    refreshWorkspace(true);
  });

  el.impSpreadAutoBtn.addEventListener("click", () => {
    state.imposeAutoSplitSpreads = !state.imposeAutoSplitSpreads;
    state.activeSheetIdx = 0;
    refreshWorkspace(true);
    scheduleWorkspaceCacheSave();
  });

  el.impAutoSplitCheck.addEventListener("change", () => {
    state.imposeAutoSplitSpreads = el.impAutoSplitCheck.checked;
    state.activeSheetIdx = 0;
    refreshWorkspace(true);
    scheduleWorkspaceCacheSave();
  });

  el.impSpreadCoverCheck.addEventListener("change", () => {
    state.imposeSpreadFirstBackFront = el.impSpreadCoverCheck.checked;
    state.activeSheetIdx = 0;
    refreshWorkspace(true);
    scheduleWorkspaceCacheSave();
  });

  el.impSpreadBleedInput.addEventListener("input", () => {
    state.imposeSpreadBleedMm = Math.max(0, Math.min(30, parseFloat(el.impSpreadBleedInput.value) || 0));
    refreshWorkspace(true);
    scheduleWorkspaceCacheSave();
  });

  el.subSplitBtn.addEventListener("click", () => {
    state.pillar = "prepress";
    state.openGroups.prepress = true;
    state.prepressSub = "split";
    closeAllPopovers();
    refreshWorkspace(true);
  });

  el.subK100Btn.addEventListener("click", () => {
    state.pillar = "prepress";
    state.openGroups.prepress = true;
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
    updateStatusBars();
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

  // Pillar 4: Convert & Compress Sub-items
  el.subCompBtn.addEventListener("click", () => {
    state.pillar = "convert";
    state.openGroups.convert = true;
    state.convertSub = "compress";
    refreshWorkspace(false);
  });

  el.subImgBtn.addEventListener("click", () => {
    state.pillar = "convert";
    state.openGroups.convert = true;
    state.convertSub = "img";
    refreshWorkspace(false);
  });

  el.subImgPdfBtn.addEventListener("click", () => {
    state.pillar = "convert";
    state.openGroups.convert = true;
    state.convertSub = "imgpdf";
    refreshWorkspace(false);
  });

  el.compCards.forEach((card) => {
    card.addEventListener("click", () => {
      state.compPreset = card.dataset.preset || "balanced";
      el.compCards.forEach((c) => c.classList.toggle("active", c === card));
      updateStatusBars();
    });
  });

  el.compKeepVecCheck.addEventListener("change", () => {
    state.compKeepVec = el.compKeepVecCheck.checked;
    updateStatusBars();
  });

  el.runCompressBtn.addEventListener("click", async () => {
    if (!hasPages() || state.busy) return;
    state.busy = true;
    el.runCompressBtn.disabled = true;
    el.compResultBox.classList.add("hidden");
    updateStatusBars();

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
      updateStatusBars();
    });
  });

  el.imgDpiChips.forEach((ch) => {
    ch.addEventListener("click", () => {
      state.imgDpi = Number(ch.dataset.dpi) || 300;
      el.imgDpiChips.forEach((x) => x.classList.toggle("active", x === ch));
      updateStatusBars();
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
    updateStatusBars();

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
      updateStatusBars();
    });
  });

  el.runImgPdfBtn.addEventListener("click", async () => {
    if (!hasPages() || state.busy) return;
    state.busy = true;
    el.runImgPdfBtn.disabled = true;
    updateStatusBars();

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
      clearAllContentSelections();
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
      clearAllContentSelections();
      state.activePfHighlights = [];
      renderCanvasStage();
    }
  });

  function setOrgPreviewOpen(val) {
    state.orgPreviewOpen = Boolean(val);
    localStorage.setItem("shibapdf_org_prev", state.orgPreviewOpen ? "1" : "0");
    updateTopStripControls();
    if (state.orgPreviewOpen && isOrganizeMode()) {
      updateRightOrgPreview(state.previewSlotIdx || state.activeSlotIdx);
    }
  }

  function setEditPropsOpen(val) {
    state.editPropsOpen = Boolean(val);
    localStorage.setItem("shibapdf_edit_props", state.editPropsOpen ? "1" : "0");
    updateTopStripControls();
    if (hasPages() && !el.spreadViewContainer.classList.contains("hidden")) {
      renderCanvasStage();
    }
  }

  el.toggleOrgPreviewBtn.addEventListener("click", () => setOrgPreviewOpen(!state.orgPreviewOpen));
  el.closeOrgPreviewBtn.addEventListener("click", () => setOrgPreviewOpen(false));
  el.toggleEditPropsBtn.addEventListener("click", () => setEditPropsOpen(!state.editPropsOpen));
  el.closeEditPropsBtn.addEventListener("click", () => setEditPropsOpen(false));
  el.reopenOrgPreviewTab.addEventListener("click", () => {
    if (state.pillar === "pages" && state.pagesSub === "text") setEditPropsOpen(true);
    else setOrgPreviewOpen(true);
  });

  // Right Property Inspector & Multi-Selection Alignment/Distribution Events
  el.propQuickAddTextBtn.addEventListener("click", () => el.addTextBtn.click());
  el.propQuickAddImgBtn.addEventListener("click", () => el.addImgBtn.click());

  el.alignOpBtns.forEach((btn) => {
    btn.addEventListener("click", () => runAlignDistributeOp(btn.dataset.alignOp));
  });

  function applyBatchTextProp(mutatorFn) {
    const targets = getSelectedTextObjects();
    if (!targets.length) return;
    state.textSessionInitial = null;
    pushUndo();
    targets.forEach((ed) => mutatorFn(ed));
    renderTextEditorOverlay();
    updateTopStripControls();
  }

  el.propFontSelect.addEventListener("change", () => {
    applyBatchTextProp((ed) => { ed.fontKey = el.propFontSelect.value; });
  });

  el.propSizeDecBtn.addEventListener("click", () => {
    applyBatchTextProp((ed) => { ed.fontPt = Math.max(6, Math.round((ed.fontPt - 1) * 10) / 10); });
  });

  el.propSizeIncBtn.addEventListener("click", () => {
    applyBatchTextProp((ed) => { ed.fontPt = Math.min(160, Math.round((ed.fontPt + 1) * 10) / 10); });
  });

  el.propSizeInput.addEventListener("change", () => {
    const v = Math.min(160, Math.max(6, parseFloat(el.propSizeInput.value) || 14));
    applyBatchTextProp((ed) => { ed.fontPt = v; });
  });

  el.propSizeChips.forEach((ch) => {
    ch.addEventListener("click", () => {
      const v = parseFloat(ch.dataset.pt) || 14;
      applyBatchTextProp((ed) => { ed.fontPt = v; });
    });
  });

  el.propBoldBtn.addEventListener("click", () => {
    const t0 = getSelectedTextObjects()[0];
    if (!t0) return;
    const nextVal = !t0.bold;
    applyBatchTextProp((ed) => { ed.bold = nextVal; });
  });

  el.propItalicBtn.addEventListener("click", () => {
    const t0 = getSelectedTextObjects()[0];
    if (!t0) return;
    const nextVal = !t0.italic;
    applyBatchTextProp((ed) => { ed.italic = nextVal; });
  });

  el.propUnderlineBtn.addEventListener("click", () => {
    const t0 = getSelectedTextObjects()[0];
    if (!t0) return;
    const nextVal = !t0.underline;
    applyBatchTextProp((ed) => { ed.underline = nextVal; });
  });

  el.propStrikeBtn.addEventListener("click", () => {
    const t0 = getSelectedTextObjects()[0];
    if (!t0) return;
    const nextVal = !t0.strike;
    applyBatchTextProp((ed) => { ed.strike = nextVal; });
  });

  el.propParaBtns.forEach((pb) => {
    pb.addEventListener("click", () => {
      const align = pb.dataset.textAlign || "left";
      applyBatchTextProp((ed) => {
        ed.textAlign = align;
        if (align !== "left" && (!ed.boxWidthU || ed.boxWidthU < 0.03)) {
          const m = measureItemBoxNorm("text", ed);
          const minW = align === "justify" && !String(ed.text || "").includes("\n")
            ? Math.min(0.92 - ed.u, Math.max(m.uw * 1.28, m.uw + 0.045))
            : Math.max(m.uw, 0.14);
          ed.boxWidthU = Math.round(minW * 10000) / 10000;
        }
      });
    });
  });

  el.propLineHeightInput.addEventListener("input", () => {
    const lh = Math.min(3.0, Math.max(0.85, parseFloat(el.propLineHeightInput.value) || 1.16));
    applyBatchTextProp((ed) => { ed.lineHeight = lh; });
  });

  el.propLetterSpacingInput.addEventListener("input", () => {
    const ls = Math.min(24, Math.max(-2, parseFloat(el.propLetterSpacingInput.value) || 0));
    applyBatchTextProp((ed) => { ed.letterSpacing = ls; });
  });

  el.propTextColorInput.addEventListener("input", () => {
    applyBatchTextProp((ed) => { ed.color = el.propTextColorInput.value; });
  });

  el.propSwatches.forEach((sw) => {
    sw.addEventListener("click", () => {
      applyBatchTextProp((ed) => { ed.color = sw.dataset.col || "#181817"; });
    });
  });

  el.propOpacityRange.addEventListener("input", () => {
    const op = Math.max(0.1, Math.min(1, (parseInt(el.propOpacityRange.value, 10) || 100) / 100));
    el.propOpacityVal.textContent = `${Math.round(op * 100)}%`;
    applyBatchTextProp((ed) => { ed.opacity = op; });
  });

  el.propMaskCheck.addEventListener("change", () => {
    applyBatchTextProp((ed) => { ed.maskBg = el.propMaskCheck.checked; });
  });

  el.propBgColorInput.addEventListener("input", () => {
    applyBatchTextProp((ed) => {
      ed.bgColor = el.propBgColorInput.value;
      ed.maskBg = true;
    });
  });

  [el.propPosXInput, el.propPosYInput, el.propWidthMmInput].forEach((inp, idx) => {
    inp.addEventListener("change", () => {
      const slot = getActiveSlot();
      const items = getAllSelectedBoxMetrics();
      if (!slot || items.length !== 1) return;
      const info = getSlotSizeInfo(slot);
      const b0 = items[0];
      pushUndo();
      if (idx === 0) b0.ref.u = Math.min(0.96, Math.max(0, (parseFloat(inp.value) || 0) / info.wMm));
      else if (idx === 1) b0.ref.v = Math.min(0.96, Math.max(0, (parseFloat(inp.value) || 0) / info.hMm));
      else {
        const wU = Math.min(0.98, Math.max(0.03, (parseFloat(inp.value) || 20) / info.wMm));
        if (b0.kind === "text") b0.ref.boxWidthU = wU;
        else b0.ref.uw = wU;
      }
      if (b0.kind === "img") b0.ref.moved = true;
      renderTextEditorOverlay();
      updateTopStripControls();
    });
  });

  el.propImgReplaceBtn.addEventListener("click", () => openImageFileDialog("replace"));
  el.propImgFitBtns.forEach((b) => {
    b.addEventListener("click", () => {
      const imEd = getSelectedImgEditObj();
      if (!imEd) return;
      pushUndo();
      imEd.fitMode = b.dataset.fit || "cover";
      renderTextEditorOverlay();
      updateTopStripControls();
    });
  });
  el.propImgRestoreBtn.addEventListener("click", () => el.imgRestoreBtn.click());
  el.propDuplicateBtn.addEventListener("click", duplicateSelectedEditElements);
  el.propDeleteSelBtn.addEventListener("click", deleteSelectedEditElements);
  el.orgPrevEditPageBtn.addEventListener("click", () => {
    if (!hasPages()) return;
    state.activeSlotIdx = state.previewSlotIdx || 0;
    state.pagesSub = "text";
    refreshWorkspace(true);
  });

  el.pfPrevIssueBtn.addEventListener("click", () => stepPreflightIssue(-1));
  el.pfNextIssueBtn.addEventListener("click", () => stepPreflightIssue(1));

  // PDF Document Properties & Font Embedding Inspector Modal Logic
  function closePdfInfoModal() {
    if (el.pdfInfoModal) el.pdfInfoModal.classList.add("hidden");
  }

  function openPdfInfoModal(preferredDocId, preferredTab) {
    if (!hasPages() || !window.ShibaPdfInfo) return;
    if (preferredTab) state.infoModalTab = preferredTab;
    if (preferredDocId && state.sourceDocs.has(preferredDocId)) {
      state.infoTargetDocId = preferredDocId;
    } else if (state.docOrder.length > 1) {
      state.infoTargetDocId = "__all__";
    } else {
      state.infoTargetDocId = state.docOrder[0];
    }

    el.fontSearchInput.placeholder = t("fontSearchPh");
    el.copyPdfInfoText.textContent = t("infoCopyBtn");

    // Populate multi-PDF selector if >= 2 PDFs are loaded
    el.pdfInfoDocSelect.innerHTML = "";
    if (state.docOrder.length > 1) {
      el.pdfInfoDocSelect.classList.remove("hidden");
      const allOpt = document.createElement("option");
      allOpt.value = "__all__";
      allOpt.textContent = t("infoAllDocsOpt", { n: state.docOrder.length });
      el.pdfInfoDocSelect.appendChild(allOpt);
      state.docOrder.forEach((id) => {
        const d = state.sourceDocs.get(id);
        if (!d) return;
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = d.name;
        el.pdfInfoDocSelect.appendChild(opt);
      });
      el.pdfInfoDocSelect.value = state.infoTargetDocId;
    } else {
      el.pdfInfoDocSelect.classList.add("hidden");
    }

    renderPdfInfoModalContents();
    el.pdfInfoModal.classList.remove("hidden");
  }

  function renderPdfInfoModalContents() {
    if (!window.ShibaPdfInfo || !hasPages()) return;
    const data = window.ShibaPdfInfo.buildInspectData(
      state.infoTargetDocId,
      state.sourceDocs,
      state.docOrder,
      state.pages,
      t
    );
    if (!data) return;

    const isMeta = state.infoModalTab === "meta";
    el.infoTabMetaBtn.classList.toggle("active", isMeta);
    el.infoTabFontsBtn.classList.toggle("active", !isMeta);
    el.infoPaneMeta.classList.toggle("hidden", !isMeta);
    el.infoPaneFonts.classList.toggle("hidden", isMeta);
    el.fontFilterGroup.classList.toggle("hidden", isMeta || data.fonts.length === 0);
    el.infoFontsBadge.textContent = String(data.fonts.length);

    // 1. Render Tab 1: Document Metadata & Prepress Specs
    const makeRow = (kLabel, vStr, onClickFn) => {
      const row = document.createElement("div");
      row.className = "info-kv-row";
      const k = document.createElement("span");
      k.className = "info-kv-key";
      k.textContent = kLabel;
      const v = document.createElement("span");
      v.className = "info-kv-val";
      v.textContent = vStr || t("infoNone");
      if (onClickFn) {
        v.style.cursor = "pointer";
        v.style.color = data.unembeddedCount > 0 ? "var(--err)" : "var(--ok)";
        v.style.textDecoration = "underline";
        v.addEventListener("click", onClickFn);
      }
      row.appendChild(k);
      row.appendChild(v);
      return row;
    };

    el.infoPaneMeta.innerHTML = "";
    const basicCard = document.createElement("div");
    basicCard.className = "info-sec-card";
    const bTitle = document.createElement("div");
    bTitle.className = "info-sec-title";
    bTitle.textContent = t("infoSecBasic");
    basicCard.appendChild(bTitle);
    basicCard.appendChild(makeRow(t("infoFileName"), data.fileName));
    basicCard.appendChild(makeRow(t("infoFileSize"), data.fileSizeStr));
    basicCard.appendChild(makeRow(t("infoPdfVer"), data.pdfVerStr));
    basicCard.appendChild(makeRow(t("infoTitle"), data.title));
    basicCard.appendChild(makeRow(t("infoAuthor"), data.author));
    if (data.subject) basicCard.appendChild(makeRow(t("infoSubject"), data.subject));
    if (data.keywords) basicCard.appendChild(makeRow(t("infoKeywords"), data.keywords));
    basicCard.appendChild(makeRow(t("infoCreator"), data.creator));
    basicCard.appendChild(makeRow(t("infoProducer"), data.producer));
    basicCard.appendChild(makeRow(t("infoCreated"), data.created));
    basicCard.appendChild(makeRow(t("infoModified"), data.modified));

    const techCard = document.createElement("div");
    techCard.className = "info-sec-card";
    const tTitle = document.createElement("div");
    tTitle.className = "info-sec-title";
    tTitle.textContent = t("infoSecTech");
    techCard.appendChild(tTitle);
    techCard.appendChild(makeRow(t("infoPages"), data.pagesStr));
    techCard.appendChild(makeRow(t("infoPageSize"), data.sizeStr));
    techCard.appendChild(makeRow(t("infoBoxes"), data.boxesStr));

    const fontSumTxt =
      data.fonts.length === 0
        ? "0 (Outlined)"
        : data.unembeddedCount > 0
        ? `${data.fonts.length} (${data.unembeddedCount} ${t("fontNotEmb")} ▸)`
        : `${data.fonts.length} (${t("fontEmbFull")} ✓ ▸)`;
    techCard.appendChild(
      makeRow(t("infoFontsSummary"), fontSumTxt, () => {
        state.infoModalTab = "fonts";
        renderPdfInfoModalContents();
      })
    );
    techCard.appendChild(makeRow(t("infoImagesSummary"), data.imgStr));
    techCard.appendChild(makeRow(t("infoSecurity"), data.isEncrypted ? t("infoSecLocked") : t("infoSecOpen")));

    el.infoPaneMeta.appendChild(basicCard);
    el.infoPaneMeta.appendChild(techCard);

    // 2. Render Tab 2: Detailed Font List & Embedding Status
    el.infoFontBanner.innerHTML = "";
    const bannerSpan = document.createElement("span");
    if (data.fonts.length === 0) {
      el.infoFontBanner.className = "info-font-banner ok";
      bannerSpan.textContent = t("fontZeroBanner");
      el.infoFontBanner.appendChild(bannerSpan);
    } else if (data.unembeddedCount === 0) {
      el.infoFontBanner.className = "info-font-banner ok";
      bannerSpan.textContent = t("fontAllEmbBanner", { n: data.fonts.length });
      el.infoFontBanner.appendChild(bannerSpan);
    } else {
      el.infoFontBanner.className = "info-font-banner err";
      bannerSpan.textContent = t("fontUnembBanner", { t: data.fonts.length, u: data.unembeddedCount });
      const lockBtn = document.createElement("button");
      lockBtn.className = "primary-btn";
      lockBtn.style.height = "28px";
      lockBtn.style.padding = "0 10px";
      lockBtn.style.fontSize = "11.5px";
      lockBtn.type = "button";
      lockBtn.textContent = t("fontFixLockBtn");
      lockBtn.addEventListener("click", () => {
        closePdfInfoModal();
        state.pillar = "convert";
        state.openGroups.convert = true;
        state.convertSub = "imgpdf";
        refreshWorkspace(false);
      });
      el.infoFontBanner.appendChild(bannerSpan);
      el.infoFontBanner.appendChild(lockBtn);
    }

    el.fontFltBtns.forEach((b) => b.classList.toggle("active", b.dataset.flt === state.fontFilterMode));
    const q = (state.fontSearchQuery || "").trim().toLowerCase();
    const filteredFonts = data.fonts.filter((f) => {
      if (state.fontFilterMode === "unemb" && f.embedded) return false;
      if (state.fontFilterMode === "emb" && !f.embedded) return false;
      if (q && !f.name.toLowerCase().includes(q) && !f.fontType.toLowerCase().includes(q)) return false;
      return true;
    });

    el.infoFontList.innerHTML = "";
    filteredFonts.forEach((f) => {
      const card = document.createElement("div");
      card.className = "info-font-card" + (f.embedded ? "" : " unembedded");

      const head = document.createElement("div");
      head.className = "info-font-head";

      const nmWrap = document.createElement("div");
      nmWrap.className = "info-font-name";
      const nmTxt = document.createElement("span");
      nmTxt.textContent = f.name;
      nmWrap.appendChild(nmTxt);
      if (f.isSubset) {
        const subTag = document.createElement("span");
        subTag.className = "version-pill";
        subTag.textContent = t("fontSubsetTag");
        nmWrap.appendChild(subTag);
      }

      const stBadge = document.createElement("span");
      stBadge.className = "status-pill " + (f.embedded ? "ok" : "err");
      stBadge.textContent = f.embedded ? (f.isSubset ? `✓ ${t("fontEmbSub")}` : `✓ ${t("fontEmbFull")}`) : `✕ ${t("fontNotEmb")}`;

      head.appendChild(nmWrap);
      head.appendChild(stBadge);
      card.appendChild(head);

      const meta = document.createElement("div");
      meta.className = "info-font-meta";
      const fmtSuffix = f.streamFormat && !f.fontType.includes(f.streamFormat) ? ` · ${f.streamFormat}` : "";
      const tpSpan = document.createElement("span");
      tpSpan.textContent = `${t("fontTypeLabel")}: ${f.fontType}${fmtSuffix}`;
      const encSpan = document.createElement("span");
      encSpan.textContent = `${t("fontEncLabel")}: ${f.encoding}`;
      meta.appendChild(tpSpan);
      meta.appendChild(encSpan);
      card.appendChild(meta);

      if (f.pages && f.pages.length > 0) {
        const pgRow = document.createElement("div");
        pgRow.className = "info-font-pages";
        const lbl = document.createElement("span");
        lbl.textContent = t("fontPagesLabel");
        pgRow.appendChild(lbl);

        f.pages.slice(0, 18).forEach((pNum) => {
          const ch = document.createElement("button");
          ch.className = "info-page-chip";
          ch.type = "button";
          ch.textContent = `P${pNum}`;
          ch.addEventListener("click", () => {
            closePdfInfoModal();
            const targetSlot = Math.max(0, Math.min(state.pages.length - 1, pNum - 1));
            state.activeSlotIdx = targetSlot;
            if (state.pillar === "convert" || (state.pillar === "pages" && state.pagesSub === "organize")) {
              state.pillar = "pages";
              state.openGroups.pages = true;
              state.pagesSub = "text";
            }
            refreshWorkspace(true);
          });
          pgRow.appendChild(ch);
        });
        if (f.pages.length > 18) {
          const more = document.createElement("span");
          more.textContent = `+${f.pages.length - 18}`;
          pgRow.appendChild(more);
        }
        card.appendChild(pgRow);
      }

      el.infoFontList.appendChild(card);
    });
  }

  [el.docInfoBtn, el.railDocInfoBtn, el.dimSummaryText].forEach((trigger) => {
    if (trigger) trigger.addEventListener("click", () => openPdfInfoModal());
  });

  el.closePdfInfoBtn.addEventListener("click", closePdfInfoModal);
  el.closePdfInfoFootBtn.addEventListener("click", closePdfInfoModal);
  el.pdfInfoModal.addEventListener("click", (ev) => {
    if (ev.target === el.pdfInfoModal) closePdfInfoModal();
  });

  el.pdfInfoDocSelect.addEventListener("change", () => {
    state.infoTargetDocId = el.pdfInfoDocSelect.value;
    renderPdfInfoModalContents();
  });

  el.infoTabMetaBtn.addEventListener("click", () => {
    state.infoModalTab = "meta";
    renderPdfInfoModalContents();
  });

  el.infoTabFontsBtn.addEventListener("click", () => {
    state.infoModalTab = "fonts";
    renderPdfInfoModalContents();
  });

  el.fontFltBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.fontFilterMode = btn.dataset.flt || "all";
      renderPdfInfoModalContents();
    });
  });

  el.fontSearchInput.addEventListener("input", () => {
    state.fontSearchQuery = el.fontSearchInput.value || "";
    renderPdfInfoModalContents();
  });

  el.copyPdfInfoBtn.addEventListener("click", async () => {
    if (!window.ShibaPdfInfo || !hasPages()) return;
    const data = window.ShibaPdfInfo.buildInspectData(
      state.infoTargetDocId,
      state.sourceDocs,
      state.docOrder,
      state.pages,
      t
    );
    if (!data) return;
    const reportStr = window.ShibaPdfInfo.formatPlainTextReport(data, t);
    try {
      await navigator.clipboard.writeText(reportStr);
      el.copyPdfInfoText.textContent = t("infoCopiedBtn");
      setTimeout(() => {
        el.copyPdfInfoText.textContent = t("infoCopyBtn");
      }, 1800);
    } catch (_) {}
  });

  el.zoomOutBtn.addEventListener("click", () => {
    if (isOrganizeMode()) setOrgGridZoom(state.orgGridScale / 1.18);
    else if (isImposeGridMode()) setImposeGridZoom(state.imposeGridScale / 1.18);
    else setSmoothZoom(isAnnotateMode() ? state.annScale / 1.2 : state.zoomFactor / 1.18);
  });
  el.zoomInBtn.addEventListener("click", () => {
    if (isOrganizeMode()) setOrgGridZoom(state.orgGridScale * 1.18);
    else if (isImposeGridMode()) setImposeGridZoom(state.imposeGridScale * 1.18);
    else setSmoothZoom(isAnnotateMode() ? state.annScale * 1.2 : state.zoomFactor * 1.18);
  });
  el.zoomFitBtn.addEventListener("click", () => {
    if (isOrganizeMode()) setOrgGridZoom(1.0);
    else if (isImposeGridMode()) setImposeGridZoom(1.0);
    else if (isAnnotateMode()) fitAnnotateBoard();
    else setSmoothZoom(1.0);
  });

  window.addEventListener("resize", () => {
    if (hasPages() && !el.spreadViewContainer.classList.contains("hidden")) {
      clearTimeout(state.wheelRenderTimer);
      state.wheelRenderTimer = setTimeout(() => renderCanvasStage(), 150);
    }
  });

  // Initialize Splitters, Mobile Drawer & Touch Pinch-Zoom
  if (window.ShibaUX) {
    window.ShibaUX.initColumnSplitters(() => {
      if (hasPages() && !el.spreadViewContainer.classList.contains("hidden")) renderCanvasStage();
      else if (isAnnotateMode() && hasPages()) fitAnnotateBoard();
    });
    window.ShibaUX.initMobileAndTouchUX(
      (ratio, midX, midY) => {
        if (!hasPages()) return;
        if (isOrganizeMode()) {
          setOrgGridZoom(state.orgGridScale * ratio);
        } else if (isImposeGridMode()) {
          setImposeGridZoom(state.imposeGridScale * ratio);
        } else if (isAnnotateMode()) {
          const rect = el.annotateBoardWrap.getBoundingClientRect();
          const mx = midX - rect.left;
          const my = midY - rect.top;
          const nextSc = Math.min(4.0, Math.max(0.18, state.annScale * ratio));
          state.annPanX = mx - (mx - state.annPanX) * (nextSc / state.annScale);
          state.annPanY = my - (my - state.annPanY) * (nextSc / state.annScale);
          state.annScale = nextSc;
          applyAnnotateTransform();
          updateZoomReadout();
        } else if (!el.spreadViewContainer.classList.contains("hidden")) {
          setSmoothZoom(state.zoomFactor * ratio);
        }
      },
      () => el.fileInput.click()
    );
  }

  // Initialize App & Auto-Restore Cached Project from Browser IndexedDB
  applyTheme();
  applyLanguage();
  restoreCachedProjectOnBoot();
})();
