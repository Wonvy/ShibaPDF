(function () {
  "use strict";

  const MM_TO_PT = 72.0 / 25.4;
  const ICONS = window.LUCIDE_SVGS || {};
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
      console.warn("Worker fallback:", err);
    }
  })();

  const I18N = {
    zh: {
      modeEdit: "编辑页面",
      modeEditSub: "修改或添加文字 · 旋转与删页",
      modePreflight: "印前检查",
      modePreflightSub: "8 项规范体检 · 点击定位高亮",
      modeKeepK100: "印前单黑",
      modeKeepSub: "原尺寸直出 · 四色黑转 K100",
      modeSplit: "跨页拆单页",
      modeSplitSub: "双页切单页 · 出血与封底归位",
      secFiles: "当前文档",
      addBtn: "添加",
      clearAll: "清空",
      addPdfBtn: "打开 PDF 文件",
      downloadOfflineBtn: "下载单文件离线版",
      addTextBtn: "添加文字",
      rotatePageBtn: "旋转本页",
      deletePageBtn: "删除本页",
      undoBtn: "撤销",
      editClickHint: "点选画布上的原有文字可直接修改，按住边框可拖动位置",
      editPlaceHint: "请在页面任意位置点击以放置新文字...",
      maskBgLabel: "遮底",
      preflightReportTitle: "印前规范检查",
      viewSingle: "单张查看",
      tabSpread: "裁切预览",
      tabSequence: "全部页面",
      keepDescInline: "保持原跨页尺寸与出血 · 自动转单色黑 K100 并保留透明度",
      splitSummaryFmt: "出血 {b}mm · 拆分设置",
      secBleed: "四周出血尺寸",
      preset0: "无 0",
      bleedUniformLabel: "统一出血",
      toggleQuadText: "展开上/下/左/右独立微调 ▾",
      sideTop: "上",
      sideBottom: "下",
      sideLeft: "左",
      sideRight: "右",
      moveFirstShort: "首张左页（封底）移至末页",
      pureBlackShort: "同步转为印刷单色黑 K100",
      onlyLandscapeShort: "仅拆分横向跨页",
      actionTrimShort: "裁除出血",
      actionKeepShort: "保留外出血",
      dirLtrShort: "左 → 右",
      dirRtlShort: "右 → 左",
      exportPdfBtn: "导出 PDF",
      exportSplitBtn: "导出单页 PDF",
      exportKeepBtn: "导出印前 K100",
      exportBatchBtn: "导出 {n} 个文件",
      exportingBtn: "处理中...",
      emptyHeading: "打开或拖入 PDF 文件",
      emptySub: "左侧选择工具，即可在本地完成页面文字编辑、印前规范定位体检、四色黑修复或跨页拆分",
      chooseBtn: "选择 PDF 文件",
      localFootnote: "100% 浏览器本地处理 · 支持 Ctrl + 滚轮无级缩放画布",
      frontCover: "封面",
      backCover: "封底",
      singleKept: "单页",
      pagesUnit: "页",
      fitZoom: "适应",
      keepBadge: "P{p} · {w}×{h}mm · 单色黑 K100",
      outEditSuffix: "_已编辑",
      outSplitSuffix: "(单页)",
      outKeepSuffix: "_K100",
      newTextDefault: "输入文字",
      errLoadPdf: "读取 PDF 失败：",
      errExportPdf: "导出 PDF 失败：",
      // Preflight
      pfPassCount: "{n} 通过",
      pfWarnCount: "{n} 留意",
      pfErrCount: "{n} 风险",
      pfLocatePage: "定位 P{p}",
      pfFixK100Btn: "一键修复导出 K100",
      pfTagNonK100: "非单黑文字 (易重影)",
      pfTagLowDpi: "低清图片 {dpi} DPI",
      pfTagRgbImg: "RGB 图片",
      pfTagNoBleed: "缺少 3mm 出血边缘",
      pfBlackTitle: "黑色文字与四色黑检测",
      pfBlackOk: "透明混合空间为 CMYK，黑/灰文字与线条均为纯单黑通道。",
      pfBlackWarn: "检测到透明混合空间为 DeviceRGB 或含非单黑文字（共 {n} 页）。点击下方页码可在右侧画布高亮查看具体文字。",
      pfBleedTitle: "页面尺寸与出血位检测",
      pfBleedMixed: "文档内存在不同页面尺寸混排，送印前请确认规格。",
      pfBleedHas: "尺寸统一（{w}×{h} mm），已含四周 {b}mm 出血。",
      pfBleedNone: "尺寸统一（{w}×{h} mm），疑似无出血净尺寸稿件，点击定位可查看裁切风险边缘。",
      pfBleedCustom: "尺寸统一（{w}×{h} mm），请确认四周已预留 3mm 出血。",
      pfFontTitle: "字体嵌入完整性",
      pfFontOk: "全部 {n} 款字体均已嵌入（或已转曲），无缺字乱码风险。",
      pfFontNoFonts: "文字均已转曲或无外部活动字体，安全。",
      pfFontErr: "发现 {n} 款字体未嵌入文件，印刷厂打开可能缺字变体！",
      pfDpiTitle: "图片印刷分辨率 (300 DPI 标准)",
      pfDpiNoImg: "纯矢量与文字版面（无位图），任意放大均清晰。",
      pfDpiOk: "共 {n} 处位图，最低 {min} DPI（最高 {max} DPI），符合高清印刷要求。",
      pfDpiWarn: "最低分辨率 {min} DPI，略低于 300 DPI 标准，点击下方页码可定位该图片。",
      pfDpiErr: "发现低于 150 DPI 的低清图片（最低 {min} DPI），点击下方页码高亮查看！",
      pfColorTitle: "色彩空间审计 (CMYK / RGB)",
      pfColorOk: "全部采用 CMYK 或灰阶印刷色彩空间。",
      pfColorWarn: "含 {rgbImg} 张 RGB 图片与 {rgbVec} 页 RGB 矢量色，点击可定位 RGB 图片位置。",
      pfTransTitle: "半透明与矢量渐变",
      pfTransOk: "含 {smask} 处软蒙版与 {grad} 处矢量渐变，均保持原生未压平高清状态。",
      pfTransNone: "无复杂透明蒙版叠加，RIP 输出极速安全。",
      pfBookletTitle: "骑马钉 4P 页数模数",
      pfBookletOk: "折算单页共 {p} 页（4 的倍数），符合骑马钉装订模数。",
      pfBookletLeaflet: "折算单页 {p} 页（单张/折页规格）。",
      pfBookletWarn: "折算单页共 {p} 页（非 4 的倍数），骑马钉需凑 {prev} 或 {next} 页。",
      pfSecTitle: "文档加密锁检查",
      pfSecOk: "无权限密码限制，印前系统可正常读取。",
      pfSecWarn: "含加密字典，建议导出无锁副本送印。"
    },
    en: {
      modeEdit: "Edit Page",
      modeEditSub: "Edit/add text · Rotate & delete",
      modePreflight: "Preflight Check",
      modePreflightSub: "8-point audit · Click to highlight",
      modeKeepK100: "Pure K100 Fix",
      modeKeepSub: "Keep spread size · Fix rich black",
      modeSplit: "Split Spreads",
      modeSplitSub: "Slice spreads · Bleed & covers",
      secFiles: "Documents",
      addBtn: "Add",
      clearAll: "Clear",
      addPdfBtn: "Open PDF File",
      downloadOfflineBtn: "Download Offline App",
      addTextBtn: "Add Text",
      rotatePageBtn: "Rotate",
      deletePageBtn: "Delete Page",
      undoBtn: "Undo",
      editClickHint: "Click any existing text on page to edit, or drag border to move",
      editPlaceHint: "Click anywhere on the page to place new text...",
      maskBgLabel: "Mask",
      preflightReportTitle: "Prepress Preflight",
      viewSingle: "Single Page",
      tabSpread: "Cut Preview",
      tabSequence: "All Pages",
      keepDescInline: "Keep original spread size & bleed · Convert to Pure K100 with live transparency",
      splitSummaryFmt: "Bleed {b}mm · Settings",
      secBleed: "Bleed Margin",
      preset0: "None 0",
      bleedUniformLabel: "Uniform Bleed",
      toggleQuadText: "Custom Top/Bottom/Left/Right ▾",
      sideTop: "Top",
      sideBottom: "Bottom",
      sideLeft: "Left",
      sideRight: "Right",
      moveFirstShort: "Move 1st left half (Back Cover) to end",
      pureBlackShort: "Convert black text to Pure K100",
      onlyLandscapeShort: "Split landscape spreads only",
      actionTrimShort: "Trim Bleed",
      actionKeepShort: "Keep Outer",
      dirLtrShort: "Left → Right",
      dirRtlShort: "Right → Left",
      exportPdfBtn: "Export PDF",
      exportSplitBtn: "Export Single PDF",
      exportKeepBtn: "Export K100 PDF",
      exportBatchBtn: "Export {n} PDFs",
      exportingBtn: "Processing...",
      emptyHeading: "Open or Drop PDF Files",
      emptySub: "Pick a tool on the left to edit page text, locate preflight issues, fix 4-color black, or split spreads",
      chooseBtn: "Choose PDF Files",
      localFootnote: "100% Local in Browser · Ctrl + Scroll Wheel to Zoom Canvas Smoothly",
      frontCover: "Front Cover",
      backCover: "Back Cover",
      singleKept: "Single",
      pagesUnit: "p",
      fitZoom: "Fit",
      keepBadge: "P{p} · {w}×{h}mm · Pure K100",
      outEditSuffix: "_edited",
      outSplitSuffix: "_single",
      outKeepSuffix: "_K100",
      newTextDefault: "Type text",
      errLoadPdf: "Failed to read PDF: ",
      errExportPdf: "Failed to export PDF: ",
      pfPassCount: "{n} Passed",
      pfWarnCount: "{n} Warnings",
      pfErrCount: "{n} Errors",
      pfLocatePage: "Locate P{p}",
      pfFixK100Btn: "Fix & Export K100",
      pfTagNonK100: "Non-K100 Black Text",
      pfTagLowDpi: "Low Res {dpi} DPI",
      pfTagRgbImg: "RGB Image",
      pfTagNoBleed: "No 3mm Bleed Edge",
      pfBlackTitle: "Black Text & 4-Color Rich Black",
      pfBlackOk: "CMYK blending active; all black/gray text uses pure single-channel K.",
      pfBlackWarn: "DeviceRGB blending or non-K100 black text on {n} page(s). Click a page chip below to highlight on canvas.",
      pfBleedTitle: "Page Size & Bleed Margin",
      pfBleedMixed: "Mixed page sizes detected across the PDF.",
      pfBleedHas: "Uniform size ({w}×{h} mm) including {b}mm bleed.",
      pfBleedNone: "Uniform net size ({w}×{h} mm) WITHOUT 3mm bleed. Click Locate to inspect trim danger edge.",
      pfBleedCustom: "Uniform custom size ({w}×{h} mm). Confirm 3mm bleed margin.",
      pfFontTitle: "Font Embedding",
      pfFontOk: "All {n} font(s) are 100% embedded.",
      pfFontNoFonts: "All text outlined or pure vector/raster — safe.",
      pfFontErr: "{n} unembedded font(s) detected — risk of missing glyphs!",
      pfDpiTitle: "Image Print Resolution (300 DPI)",
      pfDpiNoImg: "Pure vector layout (0 raster images).",
      pfDpiOk: "Scanned {n} image(s): min {min} DPI (max {max} DPI).",
      pfDpiWarn: "Lowest image is {min} DPI — click page chip below to highlight.",
      pfDpiErr: "Low-res image (<150 DPI, min {min} DPI) — click below to locate!",
      pfColorTitle: "Color Space (CMYK / RGB)",
      pfColorOk: "All elements use CMYK or Grayscale.",
      pfColorWarn: "{rgbImg} RGB image(s) & {rgbVec} RGB vector page(s). Click below to locate RGB images.",
      pfTransTitle: "Transparency & Gradients",
      pfTransOk: "{smask} soft-mask(s) & {grad} vector gradient(s) preserved unflattened.",
      pfTransNone: "No complex transparency masks.",
      pfBookletTitle: "Saddle-Stitch 4P Multiple",
      pfBookletOk: "Total {p} single pages (multiple of 4).",
      pfBookletLeaflet: "Total {p} pages (leaflet).",
      pfBookletWarn: "{p} single pages (not divisible by 4; booklet needs {prev}p or {next}p).",
      pfSecTitle: "Encryption & RIP Access",
      pfSecOk: "Unrestricted PDF.",
      pfSecWarn: "Encrypted dictionary detected."
    }
  };

  const KNOWN_NET_SIZES = [
    { w: 420, h: 285 }, { w: 420, h: 297 }, { w: 297, h: 210 },
    { w: 594, h: 420 }, { w: 370, h: 260 }, { w: 570, h: 210 },
    { w: 210, h: 285 }, { w: 210, h: 297 }, { w: 148.5, h: 210 }
  ];

  const state = {
    lang: localStorage.getItem("shibapdf_lang") || "zh",
    theme: localStorage.getItem("shibapdf_theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    workMode: "edit", // 'edit' | 'preflight' | 'keep' | 'split'
    bleed: { top: 3, bottom: 3, left: 3, right: 3 },
    bleedAction: "trim",
    moveFirstToLast: true,
    pureBlackK100: true,
    onlyLandscape: true,
    readingDir: "ltr",
    viewTab: "spread",
    zoomFactor: 1.0,
    baseFitScale: 1.0,
    placingNewText: false,
    selectedTextId: null,
    activePfHighlights: [], // [{ pageIdx, u, v, uw, vh, isPerimeter, label }]
    selectedPfCardIdx: -1,
    files: [],
    activeFileIndex: -1,
    activePageSlot: 0, // index into file.workingPages
    renderToken: 0,
    wheelRenderTimer: null
  };

  const el = {
    html: document.documentElement,
    langBtn: document.getElementById("langBtn"),
    langLabel: document.getElementById("langLabel"),
    themeBtn: document.getElementById("themeBtn"),
    iconMoon: document.getElementById("iconMoon"),
    iconSun: document.getElementById("iconSun"),
    navEditBtn: document.getElementById("navEditBtn"),
    navPreflightBtn: document.getElementById("navPreflightBtn"),
    navKeepBtn: document.getElementById("navKeepBtn"),
    navSplitBtn: document.getElementById("navSplitBtn"),
    navPreflightBadge: document.getElementById("navPreflightBadge"),
    fileInput: document.getElementById("fileInput"),
    railFilesBox: document.getElementById("railFilesBox"),
    addMoreBtn: document.getElementById("addMoreBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    fileList: document.getElementById("fileList"),
    sidebarUploadBtn: document.getElementById("sidebarUploadBtn"),
    downloadOfflineBtn: document.getElementById("downloadOfflineBtn"),
    topStrip: document.getElementById("topStrip"),
    stripEditTools: document.getElementById("stripEditTools"),
    addTextBtn: document.getElementById("addTextBtn"),
    rotatePageBtn: document.getElementById("rotatePageBtn"),
    deletePageBtn: document.getElementById("deletePageBtn"),
    undoEditBtn: document.getElementById("undoEditBtn"),
    editHintLabel: document.getElementById("editHintLabel"),
    stripPreflightTools: document.getElementById("stripPreflightTools"),
    pfScorePills: document.getElementById("pfScorePills"),
    stripKeepTools: document.getElementById("stripKeepTools"),
    keepTabSingle: document.getElementById("keepTabSingle"),
    keepTabAll: document.getElementById("keepTabAll"),
    stripSplitTools: document.getElementById("stripSplitTools"),
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
    dimSummaryText: document.getElementById("dimSummaryText"),
    exportBtn: document.getElementById("exportBtn"),
    exportBtnText: document.getElementById("exportBtnText"),
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
    textFmtBar: document.getElementById("textFmtBar"),
    fmtSmallerBtn: document.getElementById("fmtSmallerBtn"),
    fmtLargerBtn: document.getElementById("fmtLargerBtn"),
    fmtSizeLabel: document.getElementById("fmtSizeLabel"),
    fmtBoldBtn: document.getElementById("fmtBoldBtn"),
    fmtColorInput: document.getElementById("fmtColorInput"),
    fmtMaskCheck: document.getElementById("fmtMaskCheck"),
    fmtBgInput: document.getElementById("fmtBgInput"),
    fmtDeleteNodeBtn: document.getElementById("fmtDeleteNodeBtn"),
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
    const dict = I18N[state.lang] || I18N.zh;
    let str = dict[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { str = str.replace(`{${k}}`, vars[k]); });
    return str;
  }

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
    updateZoomReadout();
    localStorage.setItem("shibapdf_lang", state.lang);
    renderFileList();
    updateUIState();
    if (state.workMode === "preflight") renderPreflightDrawer();
    if (state.viewTab === "sequence" && (state.workMode === "split" || state.workMode === "keep")) renderSequenceView();
  }

  function getActiveFile() {
    if (state.activeFileIndex < 0 || state.activeFileIndex >= state.files.length) return null;
    return state.files[state.activeFileIndex];
  }

  function getActivePageObj(active) {
    if (!active || !active.workingPages.length) return null;
    if (state.activePageSlot >= active.workingPages.length) state.activePageSlot = active.workingPages.length - 1;
    if (state.activePageSlot < 0) state.activePageSlot = 0;
    return active.workingPages[state.activePageSlot];
  }

  // =========================================================================
  // 5. Block Browser Native Zoom & Smooth Ctrl + Wheel Canvas Zoom
  // =========================================================================
  function setSmoothZoom(newFactor) {
    const clamped = Math.min(4.0, Math.max(0.35, Math.round(newFactor * 100) / 100));
    if (Math.abs(clamped - state.zoomFactor) < 0.005) return;
    state.zoomFactor = clamped;
    updateZoomReadout();

    const active = getActiveFile();
    const pageSlot = getActivePageObj(active);
    if (!active || !pageSlot || el.spreadViewContainer.classList.contains("hidden")) return;

    // Instant 60fps CSS resize before debounced HiDPI re-render
    const info = getEffectivePageSize(active, pageSlot);
    const cssScale = state.baseFitScale * state.zoomFactor;
    const cssW = Math.round(info.wPt * cssScale);
    const cssH = Math.round(info.hPt * cssScale);
    el.spreadCanvas.style.width = `${cssW}px`;
    el.spreadCanvas.style.height = `${cssH}px`;

    refreshAllCanvasOverlays(active);

    clearTimeout(state.wheelRenderTimer);
    state.wheelRenderTimer = setTimeout(() => {
      renderActiveSpreadCanvas();
    }, 130);
  }

  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!getActiveFile() || el.spreadViewContainer.classList.contains("hidden")) return;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setSmoothZoom(state.zoomFactor * factor);
    }
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "-" || e.key === "_" || e.key === "0")) {
      e.preventDefault();
      if (!getActiveFile()) return;
      if (e.key === "0") setSmoothZoom(1.0);
      else if (e.key === "-" || e.key === "_") setSmoothZoom(state.zoomFactor / 1.18);
      else setSmoothZoom(state.zoomFactor * 1.18);
    }
  });

  ["gesturestart", "gesturechange", "gestureend"].forEach((evName) => {
    window.addEventListener(evName, (e) => e.preventDefault(), { passive: false });
  });

  function getEffectivePageSize(active, pageSlot) {
    const base = active.origPages[pageSlot.origIdx];
    const swap = pageSlot.extraRot % 180 !== 0;
    return {
      wPt: swap ? base.hPt : base.wPt,
      hPt: swap ? base.wPt : base.hPt,
      wMm: swap ? base.hMm : base.wMm,
      hMm: swap ? base.wMm : base.hMm,
      totalRot: (base.rot + pageSlot.extraRot) % 360
    };
  }

  // =========================================================================
  // PDF Lexical Scanner + Pinpoint Preflight Issue Locator
  // =========================================================================
  function uint8ToLatin1(u8) {
    const CHUNK = 0x8000;
    const parts = [];
    for (let i = 0; i < u8.length; i += CHUNK) parts.push(String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK)));
    return parts.join("");
  }

  function latin1ToUint8(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out;
  }

  function isPdfWsCode(c) {
    return c === 0 || c === 9 || c === 10 || c === 12 || c === 13 || c === 32;
  }

  function isPdfDelimChar(ch) {
    return ch === "(" || ch === ")" || ch === "<" || ch === ">" ||
           ch === "[" || ch === "]" || ch === "{" || ch === "}" ||
           ch === "/" || ch === "%";
  }

  function tokenizePdfContentStream(latin1) {
    const len = latin1.length;
    let pos = 0;
    const tokens = [];
    let trailingWs = "";

    while (pos < len) {
      const wsStart = pos;
      while (pos < len) {
        const c = latin1.charCodeAt(pos);
        if (isPdfWsCode(c)) pos++;
        else if (c === 37) {
          while (pos < len && latin1.charCodeAt(pos) !== 10 && latin1.charCodeAt(pos) !== 13) pos++;
        } else break;
      }
      const wsBefore = latin1.slice(wsStart, pos);
      if (pos >= len) { trailingWs = wsBefore; break; }

      const ch = latin1[pos];
      if (ch === "(") {
        const start = pos++;
        let depth = 1;
        while (pos < len && depth > 0) {
          const cur = latin1[pos];
          if (cur === "\\") pos += 2;
          else { if (cur === "(") depth++; else if (cur === ")") depth--; pos++; }
        }
        tokens.push({ type: "str", raw: latin1.slice(start, pos), wsBefore });
      } else if (ch === "<") {
        if (latin1[pos + 1] === "<") { tokens.push({ type: "dictOpen", raw: "<<", wsBefore }); pos += 2; }
        else {
          const start = pos++;
          while (pos < len && latin1[pos] !== ">") pos++;
          if (pos < len) pos++;
          tokens.push({ type: "hex", raw: latin1.slice(start, pos), wsBefore });
        }
      } else if (ch === ">") {
        if (latin1[pos + 1] === ">") { tokens.push({ type: "dictClose", raw: ">>", wsBefore }); pos += 2; }
        else { tokens.push({ type: "other", raw: ">", wsBefore }); pos++; }
      } else if (ch === "[") { tokens.push({ type: "arrOpen", raw: "[", wsBefore }); pos++; }
      else if (ch === "]") { tokens.push({ type: "arrClose", raw: "]", wsBefore }); pos++; }
      else if (ch === "{" || ch === "}" || ch === ")") { tokens.push({ type: "other", raw: ch, wsBefore }); pos++; }
      else if (ch === "/") {
        const start = pos++;
        while (pos < len && !isPdfWsCode(latin1.charCodeAt(pos)) && !isPdfDelimChar(latin1[pos])) pos++;
        tokens.push({ type: "name", raw: latin1.slice(start, pos), wsBefore });
      } else {
        const start = pos;
        while (pos < len && !isPdfWsCode(latin1.charCodeAt(pos)) && !isPdfDelimChar(latin1[pos])) pos++;
        const word = latin1.slice(start, pos);

        if (word === "BI") {
          while (pos < len) {
            if (latin1[pos] === "I" && latin1[pos + 1] === "D" && pos > start &&
                (isPdfWsCode(latin1.charCodeAt(pos - 1)) || isPdfDelimChar(latin1[pos - 1])) &&
                (pos + 2 >= len || isPdfWsCode(latin1.charCodeAt(pos + 2)))) { pos += 3; break; }
            pos++;
          }
          while (pos < len) {
            if (latin1[pos] === "E" && latin1[pos + 1] === "I" &&
                isPdfWsCode(latin1.charCodeAt(pos - 1)) &&
                (pos + 2 >= len || isPdfWsCode(latin1.charCodeAt(pos + 2)) || isPdfDelimChar(latin1[pos + 2]))) { pos += 2; break; }
            pos++;
          }
          tokens.push({ type: "inlineImg", raw: latin1.slice(start, pos), wsBefore });
        } else if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(word)) {
          tokens.push({ type: "num", raw: word, wsBefore });
        } else {
          tokens.push({ type: "op", raw: word, wsBefore });
        }
      }
    }
    return { tokens, trailingWs };
  }

  function multiplyCtm(m1, m2) {
    return [
      m1[0] * m2[0] + m1[1] * m2[2],
      m1[0] * m2[1] + m1[1] * m2[3],
      m1[2] * m2[0] + m1[3] * m2[2],
      m1[2] * m2[1] + m1[3] * m2[3],
      m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
      m1[4] * m2[1] + m1[5] * m2[3] + m2[5]
    ];
  }

  function pdfBoxToVisualNorm(rawCrop, ctm) {
    // Transform unit square [0,0]..[1,1] via ctm into visual top-left [0..1]
    const pts = [
      [ctm[4], ctm[5]],
      [ctm[0] + ctm[4], ctm[1] + ctm[5]],
      [ctm[2] + ctm[4], ctm[3] + ctm[5]],
      [ctm[0] + ctm[2] + ctm[4], ctm[1] + ctm[3] + ctm[5]]
    ];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.max(rawCrop.x, Math.min(...xs));
    const maxX = Math.min(rawCrop.x + rawCrop.width, Math.max(...xs));
    const minY = Math.max(rawCrop.y, Math.min(...ys));
    const maxY = Math.min(rawCrop.y + rawCrop.height, Math.max(...ys));

    const u = Math.max(0, (minX - rawCrop.x) / rawCrop.width);
    const uw = Math.max(0.02, (maxX - minX) / rawCrop.width);
    const v = Math.max(0, 1 - (maxY - rawCrop.y) / rawCrop.height);
    const vh = Math.max(0.02, (maxY - minY) / rawCrop.height);
    return { u, v, uw, vh };
  }

  async function extractPageTextSpans(pdfJsDoc, pageOneBased) {
    const pg = await pdfJsDoc.getPage(pageOneBased);
    const vp = pg.getViewport({ scale: 1 });
    const tc = await pg.getTextContent();
    const spans = [];

    tc.items.forEach((item, idx) => {
      if (!item.str || !item.str.trim()) return;
      const tx = pdfjsLib.Util.transform(vp.transform, item.transform);
      const fontH = Math.max(8, Math.hypot(tx[2], tx[3]));
      const left = tx[4];
      const bottom = tx[5];
      const top = bottom - fontH * 0.86;
      const w = Math.max(fontH * 0.6, item.width || fontH * item.str.length * 0.6);

      const u = Math.min(0.98, Math.max(0, left / vp.width));
      const v = Math.min(0.98, Math.max(0, top / vp.height));
      const uw = Math.min(1 - u, Math.max(0.012, w / vp.width));
      const vh = Math.min(1 - v, Math.max(0.014, (fontH * 1.12) / vp.height));

      spans.push({
        id: `orig_${pageOneBased}_${idx}`,
        str: item.str,
        u,
        v,
        uw,
        vh,
        fontPt: Math.round(fontH * 10) / 10
      });
    });
    return spans;
  }

  async function runPrepressPreflight(rawBytes, pdfJsDoc, origPages) {
    const doc = await PDFLib.PDFDocument.load(rawBytes, { ignoreEncryption: true });
    const pages = doc.getPages();

    const nonK100PageIndices = new Set();
    const nonK100Locs = [];
    const lowDpiLocs = [];
    const rgbImgLocs = [];

    let rgbImageCount = 0;
    let rgbVectorPages = 0;
    let smaskCount = 0;
    let gradientCount = 0;

    const allFonts = new Map();
    const placedDpis = [];
    const seenImgRefs = new Set();

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const page = pages[pIdx];
      const rawCrop = page.getCropBox();
      const res = page.node.lookup(PDFLib.PDFName.of("Resources"));
      let hasRgbGroup = false;
      const grp = page.node.lookup(PDFLib.PDFName.of("Group"));
      if (grp && grp instanceof PDFLib.PDFDict) {
        const cs = grp.get(PDFLib.PDFName.of("CS"));
        if (cs && cs.toString() === "/DeviceRGB") hasRgbGroup = true;
      }

      const fontDict = res && res instanceof PDFLib.PDFDict ? res.lookup(PDFLib.PDFName.of("Font")) : null;
      if (fontDict && fontDict instanceof PDFLib.PDFDict) {
        for (const [, fRef] of fontDict.entries()) {
          const fObj = doc.context.lookup(fRef);
          if (!fObj || !(fObj instanceof PDFLib.PDFDict)) continue;
          const rawName = (fObj.get(PDFLib.PDFName.of("BaseFont")) || "").toString().replace(/^\//, "").replace(/^[A-Z]{6}\+/, "") || "Font";
          const subType = (fObj.get(PDFLib.PDFName.of("Subtype")) || "").toString();
          let embedded = subType === "/Type3";

          let desc = fObj.lookup(PDFLib.PDFName.of("FontDescriptor"));
          if (!desc) {
            const descArr = fObj.lookup(PDFLib.PDFName.of("DescendantFonts"));
            if (descArr && descArr instanceof PDFLib.PDFArray && descArr.size() > 0) {
              const cidFont = doc.context.lookup(descArr.get(0));
              if (cidFont && cidFont instanceof PDFLib.PDFDict) desc = cidFont.lookup(PDFLib.PDFName.of("FontDescriptor"));
            }
          }
          if (desc && desc instanceof PDFLib.PDFDict) {
            if (desc.get(PDFLib.PDFName.of("FontFile")) || desc.get(PDFLib.PDFName.of("FontFile2")) || desc.get(PDFLib.PDFName.of("FontFile3"))) embedded = true;
          }
          if (!allFonts.has(rawName) || !embedded) allFonts.set(rawName, embedded);
        }
      }

      const extDict = res && res instanceof PDFLib.PDFDict ? res.lookup(PDFLib.PDFName.of("ExtGState")) : null;
      if (extDict && extDict instanceof PDFLib.PDFDict) {
        for (const [, gsRef] of extDict.entries()) {
          const gs = doc.context.lookup(gsRef);
          if (gs && gs instanceof PDFLib.PDFDict && gs.get(PDFLib.PDFName.of("SMask"))) smaskCount++;
        }
      }
      const patDict = res && res instanceof PDFLib.PDFDict ? res.lookup(PDFLib.PDFName.of("Pattern")) : null;
      if (patDict && patDict instanceof PDFLib.PDFDict) {
        for (const [, pRef] of patDict.entries()) {
          const pat = doc.context.lookup(pRef);
          if (pat && pat instanceof PDFLib.PDFDict && pat.get(PDFLib.PDFName.of("Shading"))) gradientCount++;
        }
      }

      const pageImages = new Map();
      const xObjDict = res && res instanceof PDFLib.PDFDict ? res.lookup(PDFLib.PDFName.of("XObject")) : null;
      if (xObjDict && xObjDict instanceof PDFLib.PDFDict) {
        for (const [kName, xRef] of xObjDict.entries()) {
          const xObj = doc.context.lookup(xRef);
          if (!xObj || !(xObj instanceof PDFLib.PDFRawStream)) continue;
          const sub = (xObj.dict.get(PDFLib.PDFName.of("Subtype")) || "").toString();
          if (sub === "/Image") {
            const wObj = xObj.dict.lookup(PDFLib.PDFName.of("Width"));
            const hObj = xObj.dict.lookup(PDFLib.PDFName.of("Height"));
            const pxW = wObj && typeof wObj.asNumber === "function" ? wObj.asNumber() : 0;
            const pxH = hObj && typeof hObj.asNumber === "function" ? hObj.asNumber() : 0;
            const csEntry = xObj.dict.lookup(PDFLib.PDFName.of("ColorSpace"));
            const csStr = csEntry ? csEntry.toString() : "";
            const isRgb = csStr.includes("DeviceRGB") || csStr.includes("/N 3");
            pageImages.set(kName.toString(), { pxW, pxH, isRgb });

            const refKey = xRef.toString();
            if (!seenImgRefs.has(refKey)) {
              seenImgRefs.add(refKey);
              if (isRgb) rgbImageCount++;
            }
          }
        }
      }

      let combinedStr = "";
      const cEntry = page.node.get(PDFLib.PDFName.of("Contents"));
      const refs = [];
      if (cEntry instanceof PDFLib.PDFRef) refs.push(cEntry);
      else {
        const arr = page.node.lookup(PDFLib.PDFName.of("Contents"));
        if (arr && arr instanceof PDFLib.PDFArray) {
          for (let i = 0; i < arr.size(); i++) refs.push(arr.get(i));
        }
      }
      refs.forEach((r) => {
        const st = doc.context.lookup(r);
        if (st && st instanceof PDFLib.PDFRawStream) {
          try { combinedStr += uint8ToLatin1(PDFLib.decodePDFRawStream(st).decode()) + "\n"; } catch (_) {}
        }
      });

      if (combinedStr) {
        const { tokens } = tokenizePdfContentStream(combinedStr);
        let ctm = [1, 0, 0, 1, 0, 0];
        const ctmStack = [];
        let pageHasNonK100 = false;
        let pageHasRgbVec = false;

        for (let i = 0; i < tokens.length; i++) {
          const tok = tokens[i];
          if (tok.type !== "op") continue;
          const op = tok.raw;

          if (op === "q") ctmStack.push(ctm.slice());
          else if (op === "Q") { if (ctmStack.length) ctm = ctmStack.pop(); }
          else if (op === "cm" && i >= 6) {
            const nums = tokens.slice(i - 6, i);
            if (nums.every((x) => x.type === "num")) ctm = multiplyCtm(nums.map((x) => parseFloat(x.raw)), ctm);
          } else if (op === "Do" && i >= 1 && tokens[i - 1].type === "name") {
            const imInfo = pageImages.get(tokens[i - 1].raw);
            if (imInfo && imInfo.pxW > 8 && imInfo.pxH > 8) {
              const box = pdfBoxToVisualNorm(rawCrop, ctm);
              const wIn = Math.hypot(ctm[0], ctm[1]) / 72.0;
              const hIn = Math.hypot(ctm[2], ctm[3]) / 72.0;
              if (wIn > 0.05 && hIn > 0.05) {
                const effDpi = Math.round(Math.min(imInfo.pxW / wIn, imInfo.pxH / hIn));
                if (effDpi > 10 && effDpi < 20000) {
                  placedDpis.push({ pageIdx: pIdx, dpi: effDpi });
                  if (effDpi < 250) {
                    lowDpiLocs.push({ pageIdx: pIdx, ...box, dpi: effDpi, kind: "lowDpi" });
                  }
                }
              }
              if (imInfo.isRgb) {
                rgbImgLocs.push({ pageIdx: pIdx, ...box, kind: "rgbImg" });
              }
            }
          } else if ((op === "g" || op === "G") && i >= 1 && tokens[i - 1].type === "num") {
            if (hasRgbGroup && parseFloat(tokens[i - 1].raw) < 0.95) pageHasNonK100 = true;
          } else if ((op === "rg" || op === "RG") && i >= 3) {
            const n3 = tokens.slice(i - 3, i);
            if (n3.every((x) => x.type === "num")) {
              const [r, g, b] = n3.map((x) => parseFloat(x.raw));
              if (Math.max(r, g, b) - Math.min(r, g, b) <= 0.02 && r < 0.95) pageHasNonK100 = true;
              else pageHasRgbVec = true;
            }
          } else if ((op === "k" || op === "K") && i >= 4) {
            const n4 = tokens.slice(i - 4, i);
            if (n4.every((x) => x.type === "num")) {
              const [c, m, y, k] = n4.map((x) => parseFloat(x.raw));
              if (c >= 0.45 && m >= 0.40 && y >= 0.40 && k >= 0.80) pageHasNonK100 = true;
            }
          }
        }

        if (pageHasNonK100) nonK100PageIndices.add(pIdx);
        if (pageHasRgbVec) rgbVectorPages++;
      }
    }

    // Locate specific dark/black text spans on nonK100 pages for visual canvas spotlighting!
    for (const pIdx of nonK100PageIndices) {
      const spans = origPages[pIdx].textSpans || [];
      // Render small bitmap once to check which spans actually paint dark neutral ink
      const pg = await pdfJsDoc.getPage(pIdx + 1);
      const vp = pg.getViewport({ scale: 0.45 });
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(vp.width));
      off.height = Math.max(1, Math.round(vp.height));
      const ctx = off.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, off.width, off.height);
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
      const imgData = ctx.getImageData(0, 0, off.width, off.height).data;

      let matchedOnPage = 0;
      for (const sp of spans) {
        const x0 = Math.max(0, Math.floor(sp.u * off.width));
        const y0 = Math.max(0, Math.floor(sp.v * off.height));
        const x1 = Math.min(off.width - 1, Math.ceil((sp.u + sp.uw) * off.width));
        const y1 = Math.min(off.height - 1, Math.ceil((sp.v + sp.vh) * off.height));
        let foundDarkNeutral = false;
        for (let py = y0; py <= y1 && !foundDarkNeutral; py += 2) {
          for (let px = x0; px <= x1; px += 2) {
            const k = (py * off.width + px) * 4;
            const r = imgData[k], g = imgData[k + 1], b = imgData[k + 2];
            if (r < 95 && g < 95 && b < 95 && (Math.max(r, g, b) - Math.min(r, g, b) < 28)) {
              foundDarkNeutral = true;
              break;
            }
          }
        }
        if (foundDarkNeutral) {
          nonK100Locs.push({ pageIdx: pIdx, u: sp.u, v: sp.v, uw: sp.uw, vh: sp.vh, kind: "nonK100" });
          matchedOnPage++;
          if (matchedOnPage >= 18) break; // keep overlay crisp without 500 overlapping boxes
        }
      }
      if (matchedOnPage === 0) {
        nonK100Locs.push({ pageIdx: pIdx, u: 0.04, v: 0.04, uw: 0.92, vh: 0.92, isPerimeter: true, kind: "nonK100" });
      }
    }

    const p0 = origPages[0];
    const uniformSize = origPages.every((p) => Math.abs(p.wMm - p0.wMm) <= 1.0 && Math.abs(p.hMm - p0.hMm) <= 1.0);
    let matchedBleed = null;
    if (uniformSize && p0) {
      for (const spec of KNOWN_NET_SIZES) {
        if (Math.abs(p0.wMm - spec.w) <= 0.9 && Math.abs(p0.hMm - spec.h) <= 0.9) { matchedBleed = 0; break; }
        for (const bCand of [3, 5]) {
          if (Math.abs(p0.wMm - (spec.w + 2 * bCand)) <= 0.9 && Math.abs(p0.hMm - (spec.h + 2 * bCand)) <= 0.9) {
            matchedBleed = bCand;
            break;
          }
        }
        if (matchedBleed !== null) break;
      }
    }

    let singleEquivPages = 0;
    origPages.forEach((p) => { singleEquivPages += p.wMm > p.hMm ? 2 : 1; });

    return {
      isEncrypted: doc.isEncrypted,
      nonK100Pages: nonK100PageIndices.size,
      nonK100Locs,
      lowDpiLocs,
      rgbImgLocs,
      uniformSize,
      firstWMm: p0 ? p0.wMm : 0,
      firstHMm: p0 ? p0.hMm : 0,
      matchedBleed,
      fonts: Array.from(allFonts.entries()),
      placedDpis,
      rgbImageCount,
      rgbVectorPages,
      smaskCount,
      gradientCount,
      singleEquivPages
    };
  }

  function buildPreflightReportItems(pf, workingPages) {
    // Map original page index -> current working slot index
    const origToSlot = new Map();
    workingPages.forEach((wp, slot) => {
      if (!origToSlot.has(wp.origIdx)) origToSlot.set(wp.origIdx, slot);
    });

    function mapLocs(rawLocs, labelFn) {
      return (rawLocs || [])
        .filter((l) => origToSlot.has(l.pageIdx))
        .map((l) => ({ ...l, slotIdx: origToSlot.get(l.pageIdx), label: labelFn(l) }));
    }

    const items = [];

    // 1. Black Text & Rich Black
    if (pf.nonK100Pages > 0) {
      items.push({
        status: "warn",
        title: t("pfBlackTitle"),
        desc: t("pfBlackWarn", { n: pf.nonK100Pages }),
        fixAction: "exportK100",
        locations: mapLocs(pf.nonK100Locs, () => t("pfTagNonK100"))
      });
    } else {
      items.push({ status: "ok", title: t("pfBlackTitle"), desc: t("pfBlackOk"), locations: [] });
    }

    // 2. Bleed & Size
    if (!pf.uniformSize) {
      items.push({ status: "warn", title: t("pfBleedTitle"), desc: t("pfBleedMixed"), locations: [] });
    } else if (pf.matchedBleed === 0) {
      const noBleedLocs = workingPages.map((_, slotIdx) => ({
        slotIdx, u: 0.008, v: 0.01, uw: 0.984, vh: 0.98, isPerimeter: true, label: t("pfTagNoBleed")
      }));
      items.push({
        status: "warn",
        title: t("pfBleedTitle"),
        desc: t("pfBleedNone", { w: pf.firstWMm.toFixed(1), h: pf.firstHMm.toFixed(1) }),
        locations: noBleedLocs
      });
    } else if (pf.matchedBleed > 0) {
      items.push({ status: "ok", title: t("pfBleedTitle"), desc: t("pfBleedHas", { w: pf.firstWMm.toFixed(1), h: pf.firstHMm.toFixed(1), b: pf.matchedBleed }), locations: [] });
    } else {
      items.push({ status: "ok", title: t("pfBleedTitle"), desc: t("pfBleedCustom", { w: pf.firstWMm.toFixed(1), h: pf.firstHMm.toFixed(1) }), locations: [] });
    }

    // 3. Fonts
    const unembedded = pf.fonts.filter(([, emb]) => !emb).map(([name]) => name);
    if (unembedded.length > 0) items.push({ status: "err", title: t("pfFontTitle"), desc: t("pfFontErr", { n: unembedded.length }) + " (" + unembedded.join(", ") + ")", locations: [] });
    else if (pf.fonts.length === 0) items.push({ status: "ok", title: t("pfFontTitle"), desc: t("pfFontNoFonts"), locations: [] });
    else items.push({ status: "ok", title: t("pfFontTitle"), desc: t("pfFontOk", { n: pf.fonts.length }), locations: [] });

    // 4. Image DPI
    if (pf.placedDpis.length === 0) {
      items.push({ status: "ok", title: t("pfDpiTitle"), desc: t("pfDpiNoImg"), locations: [] });
    } else {
      const dpis = pf.placedDpis.map((x) => x.dpi);
      const minDpi = Math.min(...dpis);
      const maxDpi = Math.max(...dpis);
      const mappedDpiLocs = mapLocs(pf.lowDpiLocs, (l) => t("pfTagLowDpi", { dpi: l.dpi }));
      if (minDpi < 150) {
        items.push({ status: "err", title: t("pfDpiTitle"), desc: t("pfDpiErr", { min: minDpi }), locations: mappedDpiLocs });
      } else if (minDpi < 250) {
        items.push({ status: "warn", title: t("pfDpiTitle"), desc: t("pfDpiWarn", { min: minDpi }), locations: mappedDpiLocs });
      } else {
        items.push({ status: "ok", title: t("pfDpiTitle"), desc: t("pfDpiOk", { n: pf.placedDpis.length, min: minDpi, max: maxDpi }), locations: [] });
      }
    }

    // 5. Color Space
    if (pf.rgbImageCount > 0 || pf.rgbVectorPages > 0) {
      items.push({
        status: "warn",
        title: t("pfColorTitle"),
        desc: t("pfColorWarn", { rgbImg: pf.rgbImageCount, rgbVec: pf.rgbVectorPages }),
        locations: mapLocs(pf.rgbImgLocs, () => t("pfTagRgbImg"))
      });
    } else {
      items.push({ status: "ok", title: t("pfColorTitle"), desc: t("pfColorOk"), locations: [] });
    }

    // 6. Transparency
    if (pf.smaskCount > 0 || pf.gradientCount > 0) items.push({ status: "ok", title: t("pfTransTitle"), desc: t("pfTransOk", { smask: pf.smaskCount, grad: pf.gradientCount }), locations: [] });
    else items.push({ status: "ok", title: t("pfTransTitle"), desc: t("pfTransNone"), locations: [] });

    // 7. Saddle-stitch 4P
    const sp = pf.singleEquivPages;
    if (sp <= 2) items.push({ status: "ok", title: t("pfBookletTitle"), desc: t("pfBookletLeaflet", { p: sp }), locations: [] });
    else if (sp % 4 === 0) items.push({ status: "ok", title: t("pfBookletTitle"), desc: t("pfBookletOk", { p: sp }), locations: [] });
    else items.push({ status: "warn", title: t("pfBookletTitle"), desc: t("pfBookletWarn", { p: sp, prev: Math.floor(sp / 4) * 4, next: Math.ceil(sp / 4) * 4 }), locations: [] });

    // 8. Encryption
    items.push({ status: pf.isEncrypted ? "warn" : "ok", title: t("pfSecTitle"), desc: pf.isEncrypted ? t("pfSecWarn") : t("pfSecOk"), locations: [] });

    return items;
  }

  function jumpToPreflightLocations(cardIdx, allLocs, targetSlot) {
    state.selectedPfCardIdx = cardIdx;
    state.activePfHighlights = allLocs;
    if (typeof targetSlot === "number" && targetSlot !== state.activePageSlot) {
      state.activePageSlot = targetSlot;
      renderActiveSpreadCanvas().then(() => scrollFirstHighlightIntoView());
    } else {
      renderPreflightHighlightBoxes();
      scrollFirstHighlightIntoView();
    }
    renderPreflightDrawer();
  }

  function scrollFirstHighlightIntoView() {
    const firstBox = el.pfHighlightOverlay.querySelector(".pf-highlight-box");
    if (firstBox) {
      firstBox.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }

  function renderPreflightHighlightBoxes() {
    el.pfHighlightOverlay.innerHTML = "";
    if (state.workMode !== "preflight" || !state.activePfHighlights.length) {
      el.pfHighlightOverlay.classList.add("hidden");
      return;
    }
    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height;
    if (!cssW || !cssH) return;

    const onThisPage = state.activePfHighlights.filter((l) => l.slotIdx === state.activePageSlot);
    if (!onThisPage.length) {
      el.pfHighlightOverlay.classList.add("hidden");
      return;
    }

    el.pfHighlightOverlay.classList.remove("hidden");
    onThisPage.forEach((loc, idx) => {
      const box = document.createElement("div");
      box.className = "pf-highlight-box" + (loc.isPerimeter ? " perimeter" : "");
      const pad = loc.isPerimeter ? 0 : 4;
      box.style.left = `${Math.max(0, loc.u * cssW - pad)}px`;
      box.style.top = `${Math.max(0, loc.v * cssH - pad)}px`;
      box.style.width = `${Math.min(cssW, loc.uw * cssW + pad * 2)}px`;
      box.style.height = `${Math.min(cssH, loc.vh * cssH + pad * 2)}px`;

      if (idx === 0 && loc.label) {
        const tag = document.createElement("span");
        tag.className = "pf-highlight-tag";
        tag.textContent = loc.label;
        if (loc.v * cssH < 26) {
          tag.style.bottom = "auto";
          tag.style.top = "4px";
        }
        box.appendChild(tag);
      }
      el.pfHighlightOverlay.appendChild(box);
    });
  }

  function renderPreflightDrawer() {
    const active = getActiveFile();
    if (!active || !active.preflight) return;

    const items = buildPreflightReportItems(active.preflight, active.workingPages);
    const okCount = items.filter((i) => i.status === "ok").length;
    const warnCount = items.filter((i) => i.status === "warn").length;
    const errCount = items.filter((i) => i.status === "err").length;

    el.pfScorePills.innerHTML = "";
    const addPill = (cls, txt) => {
      const s = document.createElement("span");
      s.className = `status-pill ${cls}`;
      s.textContent = txt;
      el.pfScorePills.appendChild(s);
    };
    addPill("ok", t("pfPassCount", { n: okCount }));
    if (warnCount > 0) addPill("warn", t("pfWarnCount", { n: warnCount }));
    if (errCount > 0) addPill("err", t("pfErrCount", { n: errCount }));

    el.preflightDrawer.innerHTML = "";
    items.forEach((item, cIdx) => {
      const card = document.createElement("div");
      const hasLocs = item.locations && item.locations.length > 0;
      card.className = "pf-card" + (hasLocs ? " clickable" : "") + (state.selectedPfCardIdx === cIdx ? " selected" : "");

      const head = document.createElement("div");
      head.className = "pf-card-head";

      const ic = document.createElement("span");
      ic.className = `pf-icon ${item.status}`;
      ic.innerHTML = item.status === "ok" ? (ICONS["check-circle-2"] || "✓") : item.status === "err" ? (ICONS["x-circle"] || "✕") : (ICONS["alert-triangle"] || "!");

      const title = document.createElement("div");
      title.className = "pf-card-title";
      title.textContent = item.title;

      head.appendChild(ic);
      head.appendChild(title);
      card.appendChild(head);

      const desc = document.createElement("div");
      desc.className = "pf-card-desc";
      desc.textContent = item.desc;
      card.appendChild(desc);

      if (hasLocs || item.fixAction) {
        const jumpRow = document.createElement("div");
        jumpRow.className = "pf-jump-row";

        // Unique page slots with issues
        const uniqueSlots = Array.from(new Set(item.locations.map((l) => l.slotIdx))).slice(0, 8);
        uniqueSlots.forEach((slotIdx) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "pf-jump-chip" + (state.selectedPfCardIdx === cIdx && state.activePageSlot === slotIdx ? " active" : "");
          btn.innerHTML = `${ICONS["crosshair"] || ""}<span>${t("pfLocatePage", { p: slotIdx + 1 })}</span>`;
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            jumpToPreflightLocations(cIdx, item.locations, slotIdx);
          });
          jumpRow.appendChild(btn);
        });

        if (item.fixAction === "exportK100") {
          const fixBtn = document.createElement("button");
          fixBtn.type = "button";
          fixBtn.className = "pf-jump-chip";
          fixBtn.innerHTML = `${ICONS["wrench"] || ""}<span>${t("pfFixK100Btn")}</span>`;
          fixBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            state.workMode = "keep";
            state.pureBlackK100 = true;
            updateUIState();
            handleExportClick();
          });
          jumpRow.appendChild(fixBtn);
        }

        card.appendChild(jumpRow);
      }

      if (hasLocs) {
        card.addEventListener("click", () => {
          jumpToPreflightLocations(cIdx, item.locations, item.locations[0].slotIdx);
        });
      }

      el.preflightDrawer.appendChild(card);
    });
  }

  // =========================================================================
  // 4. Interactive Page & Text Editor
  // =========================================================================
  function pushUndoSnapshot(active) {
    if (!active) return;
    const snap = JSON.stringify(active.workingPages);
    active.undoStack.push(snap);
    if (active.undoStack.length > 30) active.undoStack.shift();
    el.undoEditBtn.classList.toggle("hidden", active.undoStack.length === 0);
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
  }

  function sampleSpanColorsFromCanvas(u, v, uw, vh) {
    const cv = el.spreadCanvas;
    if (!cv.width || !cv.height) return { bg: "#ffffff", fg: "#181817" };
    const ctx = cv.getContext("2d");
    const x = Math.max(1, Math.floor(u * cv.width));
    const y = Math.max(1, Math.floor(v * cv.height));
    const w = Math.max(2, Math.floor(uw * cv.width));
    const h = Math.max(2, Math.floor(vh * cv.height));

    // Sample perimeter corners for background color
    const corners = [
      ctx.getImageData(Math.max(0, x - 2), Math.max(0, y - 2), 1, 1).data,
      ctx.getImageData(Math.min(cv.width - 1, x + w + 1), Math.max(0, y - 2), 1, 1).data,
      ctx.getImageData(Math.max(0, x - 2), Math.min(cv.height - 1, y + h + 1), 1, 1).data,
      ctx.getImageData(Math.min(cv.width - 1, x + w + 1), Math.min(cv.height - 1, y + h + 1), 1, 1).data
    ];
    const bgR = Math.round((corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4);
    const bgG = Math.round((corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4);
    const bgB = Math.round((corners[0][2] + corners[1][2] + corners[2][2] + corners[3][2]) / 4);

    // Sample interior for most contrasting text ink color
    const block = ctx.getImageData(x, y, Math.min(cv.width - x, w), Math.min(cv.height - y, h)).data;
    let bestDist = -1;
    let fgR = 24, fgG = 24, fgB = 23;
    for (let i = 0; i < block.length; i += 16) {
      const r = block[i], g = block[i + 1], b = block[i + 2];
      const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      if (dist > bestDist) {
        bestDist = dist;
        fgR = r; fgG = g; fgB = b;
      }
    }
    return { bg: rgbToHex(bgR, bgG, bgB), fg: bestDist > 40 ? rgbToHex(fgR, fgG, fgB) : "#181817" };
  }

  function renderTextEditorOverlay(active) {
    el.textEditOverlay.innerHTML = "";
    if (state.workMode !== "edit" || !active) {
      el.textEditOverlay.classList.add("hidden");
      el.textFmtBar.classList.add("hidden");
      return;
    }

    const pageSlot = getActivePageObj(active);
    if (!pageSlot) return;

    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height;
    if (!cssW || !cssH) return;

    el.textEditOverlay.classList.remove("hidden");
    el.textEditOverlay.style.cursor = state.placingNewText ? "crosshair" : "default";

    const effSize = getEffectivePageSize(active, pageSlot);
    const ptToCssPx = cssW / effSize.wPt;
    const origSpans = pageSlot.extraRot === 0 ? (active.origPages[pageSlot.origIdx].textSpans || []) : [];
    const editedIds = new Set(pageSlot.edits.map((e) => e.origId).filter(Boolean));

    // 1. Render clickable hit-boxes for unmodified original PDF text
    origSpans.forEach((sp) => {
      if (editedIds.has(sp.id)) return;
      const hit = document.createElement("div");
      hit.className = "pdf-text-hit";
      hit.style.left = `${sp.u * cssW}px`;
      hit.style.top = `${sp.v * cssH}px`;
      hit.style.width = `${sp.uw * cssW}px`;
      hit.style.height = `${sp.vh * cssH}px`;
      hit.title = sp.str;
      hit.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (state.placingNewText) return;
        pushUndoSnapshot(active);
        const sampled = sampleSpanColorsFromCanvas(sp.u, sp.v, sp.uw, sp.vh);
        const newEdit = {
          id: "ed_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          origId: sp.id,
          origRect: { u: sp.u, v: sp.v, uw: sp.uw, vh: sp.vh },
          u: sp.u,
          v: sp.v,
          text: sp.str,
          fontPt: sp.fontPt,
          bold: false,
          color: sampled.fg,
          maskBg: true,
          bgColor: sampled.bg
        };
        pageSlot.edits.push(newEdit);
        state.selectedTextId = newEdit.id;
        renderTextEditorOverlay(active);
        focusSelectedEditorNode();
      });
      el.textEditOverlay.appendChild(hit);
    });

    // 2. Render masks & active editable text nodes
    pageSlot.edits.forEach((ed) => {
      // Mask over original underlying text location if maskBg is enabled and origRect exists
      if (ed.maskBg && ed.origRect) {
        const maskDiv = document.createElement("div");
        maskDiv.style.position = "absolute";
        maskDiv.style.left = `${ed.origRect.u * cssW - 1}px`;
        maskDiv.style.top = `${ed.origRect.v * cssH - 1}px`;
        maskDiv.style.width = `${ed.origRect.uw * cssW + 3}px`;
        maskDiv.style.height = `${ed.origRect.vh * cssH + 3}px`;
        maskDiv.style.background = ed.bgColor;
        maskDiv.style.pointerEvents = "none";
        el.textEditOverlay.appendChild(maskDiv);
      }

      const node = document.createElement("div");
      const isSelected = state.selectedTextId === ed.id;
      node.className = "editable-text-node" + (isSelected ? " selected" : "");
      node.dataset.editId = ed.id;
      node.contentEditable = "true";
      node.spellcheck = false;
      node.textContent = ed.text;
      node.style.left = `${ed.u * cssW}px`;
      node.style.top = `${ed.v * cssH}px`;
      node.style.fontSize = `${Math.max(8, ed.fontPt * ptToCssPx)}px`;
      node.style.fontWeight = ed.bold ? "700" : "400";
      node.style.color = ed.color;
      node.style.background = (!ed.origRect && ed.maskBg) ? ed.bgColor : "transparent";

      node.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
        if (state.selectedTextId !== ed.id) {
          state.selectedTextId = ed.id;
          node.classList.add("selected");
          positionTextFormatBar(node, ed);
        }
        // Allow dragging if user drags near top/left border or holds Alt, or drag when not focused yet
        const rect = node.getBoundingClientRect();
        const nearBorder = (ev.clientY - rect.top < 6) || (ev.clientX - rect.left < 6);
        if (nearBorder) {
          ev.preventDefault();
          const startX = ev.clientX, startY = ev.clientY;
          const origU = ed.u, origV = ed.v;
          const onMove = (me) => {
            ed.u = Math.min(0.96, Math.max(0, origU + (me.clientX - startX) / cssW));
            ed.v = Math.min(0.96, Math.max(0, origV + (me.clientY - startY) / cssH));
            node.style.left = `${ed.u * cssW}px`;
            node.style.top = `${ed.v * cssH}px`;
            positionTextFormatBar(node, ed);
          };
          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }
      });

      node.addEventListener("focus", () => {
        state.selectedTextId = ed.id;
        node.classList.add("selected");
        positionTextFormatBar(node, ed);
      });

      node.addEventListener("input", () => {
        ed.text = node.innerText.replace(/\n$/, "");
      });

      el.textEditOverlay.appendChild(node);
      if (isSelected) {
        setTimeout(() => positionTextFormatBar(node, ed), 0);
      }
    });

    if (!state.selectedTextId) {
      el.textFmtBar.classList.add("hidden");
    }
  }

  function focusSelectedEditorNode() {
    if (!state.selectedTextId) return;
    const node = el.textEditOverlay.querySelector(`[data-edit-id="${state.selectedTextId}"]`);
    if (node) {
      node.focus();
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function positionTextFormatBar(nodeEl, ed) {
    const r = nodeEl.getBoundingClientRect();
    if (!r.width && !r.height) return;
    el.textFmtBar.classList.remove("hidden");
    el.fmtSizeLabel.textContent = String(Math.round(ed.fontPt));
    el.fmtColorInput.value = ed.color || "#181817";
    el.fmtMaskCheck.checked = Boolean(ed.maskBg);
    el.fmtBgInput.value = ed.bgColor || "#ffffff";
    const topPos = Math.max(8, r.top - 44);
    const leftPos = Math.min(window.innerWidth - 280, Math.max(8, r.left));
    el.textFmtBar.style.top = `${topPos}px`;
    el.textFmtBar.style.left = `${leftPos}px`;
  }

  function getSelectedEditObj() {
    const active = getActiveFile();
    const pageSlot = getActivePageObj(active);
    if (!pageSlot || !state.selectedTextId) return null;
    return pageSlot.edits.find((e) => e.id === state.selectedTextId) || null;
  }

  // Click blank canvas in Edit Mode: either place new text or deselect
  el.textEditOverlay.addEventListener("click", (ev) => {
    if (ev.target !== el.textEditOverlay) return;
    const active = getActiveFile();
    const pageSlot = getActivePageObj(active);
    if (!active || !pageSlot) return;

    if (state.placingNewText) {
      const rect = el.textEditOverlay.getBoundingClientRect();
      const u = Math.min(0.92, Math.max(0.02, (ev.clientX - rect.left) / rect.width));
      const v = Math.min(0.92, Math.max(0.02, (ev.clientY - rect.top) / rect.height));
      pushUndoSnapshot(active);
      const newEd = {
        id: "ed_" + Date.now(),
        origId: null,
        origRect: null,
        u,
        v,
        text: t("newTextDefault"),
        fontPt: 16,
        bold: false,
        color: "#181817",
        maskBg: false,
        bgColor: "#ffffff"
      };
      pageSlot.edits.push(newEd);
      state.placingNewText = false;
      el.addTextBtn.classList.remove("active");
      el.editHintLabel.textContent = t("editClickHint");
      state.selectedTextId = newEd.id;
      renderTextEditorOverlay(active);
      focusSelectedEditorNode();
    } else if (state.selectedTextId) {
      state.selectedTextId = null;
      renderTextEditorOverlay(active);
    }
  });

  // Format bar controls
  el.fmtSmallerBtn.addEventListener("click", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.fontPt = Math.max(6, Math.round((ed.fontPt - 1.5) * 10) / 10);
    renderTextEditorOverlay(getActiveFile());
  });
  el.fmtLargerBtn.addEventListener("click", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.fontPt = Math.min(120, Math.round((ed.fontPt + 1.5) * 10) / 10);
    renderTextEditorOverlay(getActiveFile());
  });
  el.fmtBoldBtn.addEventListener("click", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.bold = !ed.bold;
    renderTextEditorOverlay(getActiveFile());
  });
  el.fmtColorInput.addEventListener("input", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.color = el.fmtColorInput.value;
    renderTextEditorOverlay(getActiveFile());
  });
  el.fmtMaskCheck.addEventListener("change", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.maskBg = el.fmtMaskCheck.checked;
    renderTextEditorOverlay(getActiveFile());
  });
  el.fmtBgInput.addEventListener("input", () => {
    const ed = getSelectedEditObj();
    if (!ed) return;
    ed.bgColor = el.fmtBgInput.value;
    ed.maskBg = true;
    el.fmtMaskCheck.checked = true;
    renderTextEditorOverlay(getActiveFile());
  });
  el.fmtDeleteNodeBtn.addEventListener("click", () => {
    const active = getActiveFile();
    const pageSlot = getActivePageObj(active);
    const ed = getSelectedEditObj();
    if (!active || !pageSlot || !ed) return;
    pushUndoSnapshot(active);
    if (ed.origRect) {
      // Keep background mask with empty text so original underlying PDF text is cleanly erased!
      ed.text = "";
      ed.maskBg = true;
    } else {
      pageSlot.edits = pageSlot.edits.filter((x) => x.id !== ed.id);
    }
    state.selectedTextId = null;
    renderTextEditorOverlay(active);
  });

  el.addTextBtn.addEventListener("click", () => {
    state.placingNewText = !state.placingNewText;
    el.addTextBtn.classList.toggle("active", state.placingNewText);
    el.editHintLabel.textContent = state.placingNewText ? t("editPlaceHint") : t("editClickHint");
    renderTextEditorOverlay(getActiveFile());
  });

  el.rotatePageBtn.addEventListener("click", () => {
    const active = getActiveFile();
    const pageSlot = getActivePageObj(active);
    if (!active || !pageSlot) return;
    pushUndoSnapshot(active);
    pageSlot.extraRot = (pageSlot.extraRot + 90) % 360;
    state.selectedTextId = null;
    active.spreadCache.clear();
    renderActiveSpreadCanvas();
  });

  el.deletePageBtn.addEventListener("click", () => {
    const active = getActiveFile();
    if (!active || active.workingPages.length <= 1) return;
    pushUndoSnapshot(active);
    active.workingPages.splice(state.activePageSlot, 1);
    if (state.activePageSlot >= active.workingPages.length) {
      state.activePageSlot = active.workingPages.length - 1;
    }
    state.selectedTextId = null;
    updateUIState();
    renderActiveSpreadCanvas();
  });

  el.undoEditBtn.addEventListener("click", () => {
    const active = getActiveFile();
    if (!active || !active.undoStack.length) return;
    active.workingPages = JSON.parse(active.undoStack.pop());
    el.undoEditBtn.classList.toggle("hidden", active.undoStack.length === 0);
    state.selectedTextId = null;
    active.spreadCache.clear();
    updateUIState();
    renderActiveSpreadCanvas();
  });

  // =========================================================================
  // Split Geometry & Unified UI State
  // =========================================================================
  function computeSplitPlan(fileEntry) {
    if (!fileEntry || !fileEntry.workingPages.length) return [];

    if (state.workMode !== "split") {
      return fileEntry.workingPages.map((wp, slotIdx) => {
        const info = getEffectivePageSize(fileEntry, wp);
        return {
          slotIdx,
          wp,
          side: "keep",
          mainNorm: { u: 0, v: 0, uw: 1, vh: 1 },
          trimNorm: { u: 0, v: 0, uw: 1, vh: 1 },
          outWMm: info.wMm,
          outHMm: info.hMm,
          role: "keep",
          finalPageNum: slotIdx + 1
        };
      });
    }

    const b = state.bleed;
    const trimMode = state.bleedAction === "trim";
    const items = [];

    fileEntry.workingPages.forEach((wp, slotIdx) => {
      const info = getEffectivePageSize(fileEntry, wp);
      const wMm = info.wMm, hMm = info.hMm;
      const isSpread = !state.onlyLandscape || wMm > hMm;

      const uL = Math.min(0.48, Math.max(0, b.left / wMm));
      const uR = Math.min(0.48, Math.max(0, b.right / wMm));
      const vT = Math.min(0.48, Math.max(0, b.top / hMm));
      const vB = Math.min(0.48, Math.max(0, b.bottom / hMm));

      if (!isSpread) {
        const trimNorm = { u: uL, v: vT, uw: Math.max(0.02, 1 - uL - uR), vh: Math.max(0.02, 1 - vT - vB) };
        const mainNorm = trimMode ? trimNorm : { u: 0, v: 0, uw: 1, vh: 1 };
        items.push({ slotIdx, wp, side: "single", mainNorm, trimNorm, outWMm: mainNorm.uw * wMm, outHMm: mainNorm.vh * hMm, role: "single" });
        return;
      }

      const leftTrimNorm = { u: uL, v: vT, uw: Math.max(0.02, 0.5 - uL), vh: Math.max(0.02, 1 - vT - vB) };
      const rightTrimNorm = { u: 0.5, v: vT, uw: Math.max(0.02, 0.5 - uR), vh: Math.max(0.02, 1 - vT - vB) };
      const leftMainNorm = trimMode ? leftTrimNorm : { u: 0, v: 0, uw: 0.5, vh: 1 };
      const rightMainNorm = trimMode ? rightTrimNorm : { u: 0.5, v: 0, uw: 0.5, vh: 1 };

      const leftItem = { slotIdx, wp, side: "left", mainNorm: leftMainNorm, trimNorm: leftTrimNorm, outWMm: leftMainNorm.uw * wMm, outHMm: leftMainNorm.vh * hMm, role: "normal" };
      const rightItem = { slotIdx, wp, side: "right", mainNorm: rightMainNorm, trimNorm: rightTrimNorm, outWMm: rightMainNorm.uw * wMm, outHMm: rightMainNorm.vh * hMm, role: "normal" };

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

  function updateZoomReadout() {
    el.zoomLabel.textContent = Math.abs(state.zoomFactor - 1.0) < 0.01 ? t("fitZoom") : `${Math.round(state.zoomFactor * 100)}%`;
  }

  function renderPreflightBadge(active) {
    if (!active || !active.preflight) {
      el.navPreflightBadge.classList.add("hidden");
      return;
    }
    const items = buildPreflightReportItems(active.preflight, active.workingPages);
    const errCount = items.filter((i) => i.status === "err").length;
    const warnCount = items.filter((i) => i.status === "warn").length;
    const total = errCount + warnCount;

    el.navPreflightBadge.classList.remove("hidden", "ok", "warn", "err");
    el.navPreflightBadge.textContent = total === 0 ? "✓" : String(total);
    el.navPreflightBadge.classList.add(total === 0 ? "ok" : errCount > 0 ? "err" : "warn");
  }

  function refreshAllCanvasOverlays(active) {
    if (!active) return;
    const plan = computeSplitPlan(active);
    updateCutOverlayGeometry(active, plan);
    renderPreflightHighlightBoxes();
    renderTextEditorOverlay(active);
  }

  function updateUIState() {
    const active = getActiveFile();
    const hasFiles = Boolean(active);

    el.navEditBtn.classList.toggle("active", state.workMode === "edit");
    el.navPreflightBtn.classList.toggle("active", state.workMode === "preflight");
    el.navKeepBtn.classList.toggle("active", state.workMode === "keep");
    el.navSplitBtn.classList.toggle("active", state.workMode === "split");

    el.railFilesBox.classList.toggle("hidden", state.files.length === 0);
    el.sidebarUploadBtn.classList.toggle("hidden", state.files.length > 0);
    renderPreflightBadge(active);

    if (!hasFiles) {
      el.topStrip.classList.add("hidden");
      el.preflightDrawer.classList.add("hidden");
      el.emptyStage.classList.remove("hidden");
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.bottomPager.classList.add("hidden");
      el.textFmtBar.classList.add("hidden");
      el.stageViewport.classList.remove("align-top");
      return;
    }

    el.emptyStage.classList.add("hidden");
    el.topStrip.classList.remove("hidden");
    el.exportBtn.disabled = false;

    const isEdit = state.workMode === "edit";
    const isPf = state.workMode === "preflight";
    const isKeep = state.workMode === "keep";
    const isSplit = state.workMode === "split";

    el.stripEditTools.classList.toggle("hidden", !isEdit);
    el.stripPreflightTools.classList.toggle("hidden", !isPf);
    el.stripKeepTools.classList.toggle("hidden", !isKeep);
    el.stripSplitTools.classList.toggle("hidden", !isSplit);
    el.preflightDrawer.classList.toggle("hidden", !isPf);

    el.deletePageBtn.disabled = active.workingPages.length <= 1;
    el.undoEditBtn.classList.toggle("hidden", !active.undoStack.length);
    el.splitParamsSummary.textContent = t("splitSummaryFmt", { b: state.bleed.top });

    el.exportBtnText.textContent = state.files.length > 1
      ? t("exportBatchBtn", { n: state.files.length })
      : isSplit ? t("exportSplitBtn") : isKeep ? t("exportKeepBtn") : t("exportPdfBtn");

    const plan = computeSplitPlan(active);
    const curSlot = getActivePageObj(active);
    const curInfo = getEffectivePageSize(active, curSlot);
    const sampleOut = plan.find((x) => x.slotIdx === state.activePageSlot) || plan[0];

    if (sampleOut) {
      el.dimSummaryText.textContent = isSplit
        ? `${sampleOut.outWMm.toFixed(0)}×${sampleOut.outHMm.toFixed(0)}mm · ${plan.length}${t("pagesUnit")}`
        : `${curInfo.wMm.toFixed(0)}×${curInfo.hMm.toFixed(0)}mm · ${active.workingPages.length}${t("pagesUnit")}`;
    }

    if (isPf) renderPreflightDrawer();

    // Edit & Preflight always show live single-page canvas so user can edit or inspect highlights!
    const showGrid = (isSplit || isKeep) && state.viewTab === "sequence";
    el.pageIndicator.textContent = `${state.activePageSlot + 1} / ${active.workingPages.length}`;
    el.prevSpreadBtn.disabled = state.activePageSlot <= 0;
    el.nextSpreadBtn.disabled = state.activePageSlot >= active.workingPages.length - 1;

    if (showGrid) {
      el.stageViewport.classList.add("align-top");
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.remove("hidden");
      el.bottomPager.classList.add("hidden");
    } else {
      el.stageViewport.classList.remove("align-top");
      el.spreadViewContainer.classList.remove("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.bottomPager.classList.remove("hidden");
      refreshAllCanvasOverlays(active);
    }
  }

  function updateCutOverlayGeometry(active, plan) {
    if (state.workMode !== "split" && state.workMode !== "keep") {
      el.guidesOverlay.classList.add("hidden");
      return;
    }
    el.guidesOverlay.classList.remove("hidden");

    const pageSlot = getActivePageObj(active);
    const info = getEffectivePageSize(active, pageSlot);
    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height;
    if (!cssW || !cssH) return;

    if (state.workMode === "keep") {
      [el.shadeTop, el.shadeBottom, el.shadeLeft, el.shadeRight, el.trimRect, el.centerLine, el.rightBadge].forEach((n) => n.classList.add("hidden"));
      el.leftBadge.classList.remove("hidden");
      el.leftBadge.style.left = `${cssW / 2}px`;
      el.leftBadge.textContent = t("keepBadge", { p: state.activePageSlot + 1, w: info.wMm.toFixed(0), h: info.hMm.toFixed(0) });
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

    const isSpread = !state.onlyLandscape || info.wMm > info.hMm;
    if (isSpread) {
      el.centerLine.classList.remove("hidden");
      Object.assign(el.centerLine.style, { left: `${cssW / 2}px`, top: "0px", height: `${cssH}px` });

      const leftPlan = plan.find((p) => p.slotIdx === state.activePageSlot && p.side === "left");
      const rightPlan = plan.find((p) => p.slotIdx === state.activePageSlot && p.side === "right");

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
      const singlePlan = plan.find((p) => p.slotIdx === state.activePageSlot);
      if (singlePlan) {
        el.leftBadge.classList.remove("hidden");
        el.leftBadge.style.left = `${cssW / 2}px`;
        el.leftBadge.textContent = `P${singlePlan.finalPageNum} · ${t("singleKept")}  ${singlePlan.outWMm.toFixed(0)}×${singlePlan.outHMm.toFixed(0)}`;
      }
    }
  }

  async function renderActiveSpreadCanvas() {
    const active = getActiveFile();
    const pageSlot = getActivePageObj(active);
    if (!active || !pageSlot || !active.pdfJsDoc) return;

    const myToken = ++state.renderToken;
    const page = await active.pdfJsDoc.getPage(pageSlot.origIdx + 1);
    if (myToken !== state.renderToken) return;

    const totalRot = (active.origPages[pageSlot.origIdx].rot + pageSlot.extraRot) % 360;
    const baseVp = page.getViewport({ scale: 1, rotation: totalRot });
    const availW = Math.max(300, el.stageViewport.clientWidth - 84);
    const availH = Math.max(240, el.stageViewport.clientHeight - 108);
    state.baseFitScale = Math.min(availW / baseVp.width, availH / baseVp.height, 1.55);

    const cssScale = state.baseFitScale * state.zoomFactor;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const renderVp = page.getViewport({ scale: cssScale * dpr, rotation: totalRot });
    const cssW = Math.round(baseVp.width * cssScale);
    const cssH = Math.round(baseVp.height * cssScale);

    el.spreadCanvas.width = Math.round(renderVp.width);
    el.spreadCanvas.height = Math.round(renderVp.height);
    el.spreadCanvas.style.width = `${cssW}px`;
    el.spreadCanvas.style.height = `${cssH}px`;

    const ctx = el.spreadCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, el.spreadCanvas.width, el.spreadCanvas.height);

    await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
    if (myToken !== state.renderToken) return;

    updateUIState();
  }

  async function getCachedSlotBitmapCanvas(active, slotIdx) {
    const wp = active.workingPages[slotIdx];
    const cacheKey = `${wp.origIdx}_${wp.extraRot}`;
    if (active.spreadCache.has(cacheKey)) return active.spreadCache.get(cacheKey);

    const page = await active.pdfJsDoc.getPage(wp.origIdx + 1);
    const totalRot = (active.origPages[wp.origIdx].rot + wp.extraRot) % 360;
    const vp1 = page.getViewport({ scale: 1, rotation: totalRot });
    const targetScale = Math.min(900 / Math.max(vp1.width, 1), 1.4);
    const vp = page.getViewport({ scale: targetScale, rotation: totalRot });

    const off = document.createElement("canvas");
    off.width = Math.round(vp.width);
    off.height = Math.round(vp.height);
    const ctx = off.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, off.width, off.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    active.spreadCache.set(cacheKey, off);
    return off;
  }

  async function renderSequenceView() {
    const active = getActiveFile();
    if (!active || !active.pdfJsDoc) return;

    const myToken = ++state.renderToken;
    const plan = computeSplitPlan(active);
    el.sequenceGrid.innerHTML = "";

    for (const item of plan) {
      if (myToken !== state.renderToken) return;

      const wrap = document.createElement("div");
      wrap.className = "clean-page-item";

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

      const srcCanvas = await getCachedSlotBitmapCanvas(active, item.slotIdx);
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

  function renderFileList() {
    el.fileList.innerHTML = "";
    state.files.forEach((f, idx) => {
      const row = document.createElement("div");
      row.className = "file-row" + (idx === state.activeFileIndex ? " active" : "");

      const left = document.createElement("div");
      left.className = "file-row-left";
      const iconSpan = document.createElement("span");
      iconSpan.style.display = "inline-flex";
      iconSpan.innerHTML = ICONS["file-text"] || "";
      const nameSpan = document.createElement("span");
      nameSpan.className = "file-row-name";
      nameSpan.textContent = f.name;
      left.appendChild(iconSpan);
      left.appendChild(nameSpan);

      const delBtn = document.createElement("button");
      delBtn.className = "del-icon-btn";
      delBtn.type = "button";
      delBtn.innerHTML = ICONS["trash-2"] || "✕";
      delBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state.files.splice(idx, 1);
        if (state.activeFileIndex >= state.files.length) state.activeFileIndex = state.files.length - 1;
        state.activePageSlot = 0;
        state.selectedTextId = null;
        state.activePfHighlights = [];
        renderFileList();
        updateUIState();
        if (getActiveFile()) renderActiveSpreadCanvas();
      });

      row.appendChild(left);
      row.appendChild(delBtn);
      row.addEventListener("click", () => {
        if (state.activeFileIndex === idx) return;
        state.activeFileIndex = idx;
        state.activePageSlot = 0;
        state.selectedTextId = null;
        state.activePfHighlights = [];
        renderFileList();
        updateUIState();
        renderActiveSpreadCanvas();
      });

      el.fileList.appendChild(row);
    });
  }

  async function loadPdfFiles(fileListObj) {
    const incoming = Array.from(fileListObj).filter((f) => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf");
    if (!incoming.length) return;

    for (const file of incoming) {
      try {
        const buf = await file.arrayBuffer();
        const rawBytes = new Uint8Array(buf);
        const pdfJsDoc = await pdfjsLib.getDocument({ data: rawBytes.slice() }).promise;
        const origPages = [];
        const workingPages = [];

        for (let p = 1; p <= pdfJsDoc.numPages; p++) {
          const pg = await pdfJsDoc.getPage(p);
          const vp = pg.getViewport({ scale: 1 });
          const textSpans = await extractPageTextSpans(pdfJsDoc, p);
          origPages.push({
            wPt: vp.width,
            hPt: vp.height,
            wMm: vp.width / MM_TO_PT,
            hMm: vp.height / MM_TO_PT,
            rot: pg.rotate || 0,
            textSpans
          });
          workingPages.push({ origIdx: p - 1, extraRot: 0, edits: [] });
        }

        const preflight = await runPrepressPreflight(rawBytes, pdfJsDoc, origPages);
        state.files.push({
          id: `${Date.now()}_${Math.random()}`,
          name: file.name,
          size: file.size,
          rawBytes,
          pdfJsDoc,
          origPages,
          workingPages,
          undoStack: [],
          preflight,
          spreadCache: new Map()
        });
      } catch (err) {
        alert(t("errLoadPdf") + (err && err.message ? err.message : String(err)));
      }
    }

    state.activeFileIndex = state.files.length - 1;
    state.activePageSlot = 0;
    state.zoomFactor = 1.0;
    state.selectedTextId = null;
    state.activePfHighlights = [];
    state.selectedPfCardIdx = -1;
    updateZoomReadout();
    renderFileList();
    updateUIState();
    if (getActiveFile()) renderActiveSpreadCanvas();
  }

  // =========================================================================
  // Export Engine (Applies Page Edits, 600-DPI CJK Text Edits, K100 & Split)
  // =========================================================================
  function fmtCmykVal(v) {
    return Number(Math.min(1, Math.max(0, v)).toFixed(4)).toString();
  }

  function rewritePdfContentStreamToK100(latin1, prependInitK100) {
    const { tokens, trailingWs } = tokenizePdfContentStream(latin1);
    const outStack = [];
    let bracketDepth = 0;

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok.type === "arrOpen" || tok.type === "dictOpen") bracketDepth++;
      else if (tok.type === "arrClose" || tok.type === "dictClose") bracketDepth = Math.max(0, bracketDepth - 1);

      if (bracketDepth === 0 && tok.type === "op") {
        if ((tok.raw === "g" || tok.raw === "G") && outStack.length >= 1 && outStack[outStack.length - 1].type === "num") {
          const t1 = outStack[outStack.length - 1];
          const v = parseFloat(t1.raw);
          if (v >= 0 && v <= 1) {
            outStack.pop();
            outStack.push({ type: "rewritten", wsBefore: t1.wsBefore, raw: `0 0 0 ${fmtCmykVal(1 - v)} ${tok.raw === "g" ? "k" : "K"}` });
            continue;
          }
        }
        if ((tok.raw === "rg" || tok.raw === "RG") && outStack.length >= 3 &&
            outStack[outStack.length - 1].type === "num" && outStack[outStack.length - 2].type === "num" && outStack[outStack.length - 3].type === "num") {
          const tR = outStack[outStack.length - 3], tG = outStack[outStack.length - 2], tB = outStack[outStack.length - 1];
          const r = parseFloat(tR.raw), g = parseFloat(tG.raw), b = parseFloat(tB.raw);
          if (r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1 && (Math.max(r, g, b) - Math.min(r, g, b) <= 0.02)) {
            outStack.pop(); outStack.pop(); outStack.pop();
            outStack.push({ type: "rewritten", wsBefore: tR.wsBefore, raw: `0 0 0 ${fmtCmykVal(1 - (r + g + b) / 3)} ${tok.raw === "rg" ? "k" : "K"}` });
            continue;
          }
        }
        if ((tok.raw === "k" || tok.raw === "K") && outStack.length >= 4 &&
            outStack[outStack.length - 1].type === "num" && outStack[outStack.length - 2].type === "num" &&
            outStack[outStack.length - 3].type === "num" && outStack[outStack.length - 4].type === "num") {
          const tC = outStack[outStack.length - 4], tM = outStack[outStack.length - 3], tY = outStack[outStack.length - 2], tK = outStack[outStack.length - 1];
          const c = parseFloat(tC.raw), m = parseFloat(tM.raw), y = parseFloat(tY.raw), k = parseFloat(tK.raw);
          if (c >= 0.45 && m >= 0.40 && y >= 0.40 && k >= 0.80) {
            outStack.pop(); outStack.pop(); outStack.pop(); outStack.pop();
            outStack.push({ type: "rewritten", wsBefore: tC.wsBefore, raw: `0 0 0 1 ${tok.raw}` });
            continue;
          }
        }
      }
      outStack.push(tok);
    }

    const prefix = prependInitK100 ? "0 0 0 1 k 0 0 0 1 K\n" : "";
    let body = "";
    for (let i = 0; i < outStack.length; i++) body += outStack[i].wsBefore + outStack[i].raw;
    return prefix + body + trailingWs;
  }

  function convertStreamRefToK100(pdfDoc, streamRef, visitedRefs, prependInitK100) {
    if (!streamRef || !(streamRef instanceof PDFLib.PDFRef)) return;
    const key = streamRef.toString();
    if (visitedRefs.has(key)) return;
    visitedRefs.add(key);

    const rawStream = pdfDoc.context.lookup(streamRef);
    if (!rawStream || !(rawStream instanceof PDFLib.PDFRawStream)) return;
    try {
      const decodedBytes = PDFLib.decodePDFRawStream(rawStream).decode();
      const rewrittenStr = rewritePdfContentStreamToK100(uint8ToLatin1(decodedBytes), prependInitK100);
      const flated = pdfDoc.context.flateStream(latin1ToUint8(rewrittenStr));
      for (const [k, v] of rawStream.dict.entries()) {
        const ks = k.toString();
        if (ks !== "/Filter" && ks !== "/DecodeParms" && ks !== "/Length") flated.dict.set(k, v);
      }
      pdfDoc.context.assign(streamRef, flated);
    } catch (_) {}
  }

  function fixTransparencyGroupToCmyk(dictObj) {
    if (!dictObj || typeof dictObj.lookup !== "function") return;
    const group = dictObj.lookup(PDFLib.PDFName.of("Group"));
    if (group && group instanceof PDFLib.PDFDict) {
      const sType = group.get(PDFLib.PDFName.of("S"));
      const csVal = group.get(PDFLib.PDFName.of("CS"));
      if (sType && sType.toString() === "/Transparency" && (!csVal || csVal.toString() === "/DeviceRGB")) {
        group.set(PDFLib.PDFName.of("CS"), PDFLib.PDFName.of("DeviceCMYK"));
      }
    }
  }

  function applyPureBlackK100ToDoc(pdfDoc) {
    const visitedStreams = new Set();
    const visitedRes = new Set();

    function processResources(resDict) {
      if (!resDict || !(resDict instanceof PDFLib.PDFDict)) return;
      const xObjDict = resDict.lookup(PDFLib.PDFName.of("XObject"));
      if (xObjDict && xObjDict instanceof PDFLib.PDFDict) {
        for (const [, valRef] of xObjDict.entries()) {
          if (!(valRef instanceof PDFLib.PDFRef)) continue;
          const rKey = valRef.toString();
          if (visitedRes.has(rKey)) continue;
          visitedRes.add(rKey);
          const xObj = pdfDoc.context.lookup(valRef);
          if (xObj && xObj instanceof PDFLib.PDFRawStream) {
            const sub = xObj.dict.get(PDFLib.PDFName.of("Subtype"));
            if (sub && sub.toString() === "/Form") {
              fixTransparencyGroupToCmyk(xObj.dict);
              convertStreamRefToK100(pdfDoc, valRef, visitedStreams, false);
              processResources(xObj.dict.lookup(PDFLib.PDFName.of("Resources")));
            }
          }
        }
      }
    }

    pdfDoc.getPages().forEach((page) => {
      fixTransparencyGroupToCmyk(page.node);
      const contentsEntry = page.node.get(PDFLib.PDFName.of("Contents"));
      if (contentsEntry instanceof PDFLib.PDFRef) convertStreamRefToK100(pdfDoc, contentsEntry, visitedStreams, true);
      else {
        const arr = page.node.lookup(PDFLib.PDFName.of("Contents"));
        if (arr && arr instanceof PDFLib.PDFArray) {
          for (let i = 0; i < arr.size(); i++) convertStreamRefToK100(pdfDoc, arr.get(i), visitedStreams, i === 0);
        }
      }
      processResources(page.node.lookup(PDFLib.PDFName.of("Resources")));
    });
  }

  function hexToRgb01(hex) {
    const h = (hex || "#000000").replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255
    };
  }

  function renderTextEditToPngBytes(ed) {
    const scale = 5; // ~360-500 DPI super-sharp print text bitmap supporting full CJK
    const lines = (ed.text || "").split("\n");
    const fontPx = Math.max(8, ed.fontPt) * scale;
    const lineH = fontPx * 1.18;
    const fontSpec = `${ed.bold ? "700" : "400"} ${fontPx}px -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif`;

    const measureCv = document.createElement("canvas");
    const mCtx = measureCv.getContext("2d");
    mCtx.font = fontSpec;
    let maxW = 10;
    lines.forEach((ln) => { maxW = Math.max(maxW, mCtx.measureText(ln || " ").width); });

    const cv = document.createElement("canvas");
    cv.width = Math.ceil(maxW + fontPx * 0.3);
    cv.height = Math.ceil(lines.length * lineH + fontPx * 0.2);
    const ctx = cv.getContext("2d");
    if (!ed.origRect && ed.maskBg) {
      ctx.fillStyle = ed.bgColor || "#ffffff";
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
    ctx.font = fontSpec;
    ctx.fillStyle = ed.color || "#181817";
    ctx.textBaseline = "top";
    lines.forEach((ln, idx) => {
      ctx.fillText(ln, fontPx * 0.1, fontPx * 0.08 + idx * lineH);
    });

    const dataUrl = cv.toDataURL("image/png");
    const bin = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, ptW: cv.width / scale, ptH: cv.height / scale };
  }

  function normVisualToPdfRect(rawCrop, rotDeg, norm) {
    const x0 = rawCrop.x, y0 = rawCrop.y, rw = rawCrop.width, rh = rawCrop.height;
    const rot = ((rotDeg % 360) + 360) % 360;
    if (rot === 90) return { x: x0 + norm.v * rw, y: y0 + norm.u * rh, w: norm.vh * rw, h: norm.uw * rh };
    if (rot === 180) return { x: x0 + (1 - norm.u - norm.uw) * rw, y: y0 + norm.v * rh, w: norm.uw * rw, h: norm.vh * rh };
    if (rot === 270) return { x: x0 + (1 - norm.v - norm.vh) * rw, y: y0 + (1 - norm.u - norm.uw) * rh, w: norm.vh * rw, h: norm.uw * rh };
    return { x: x0 + norm.u * rw, y: y0 + (1 - norm.v - norm.vh) * rh, w: norm.uw * rw, h: norm.vh * rh };
  }

  function buildOutputFilename(origName) {
    const dot = origName.lastIndexOf(".");
    const stem = dot > 0 ? origName.slice(0, dot) : origName;
    const ext = dot > 0 ? origName.slice(dot) : ".pdf";

    if (state.workMode === "edit") return stem + t("outEditSuffix") + ext;
    if (state.workMode === "keep" || state.workMode === "preflight") return stem + t("outKeepSuffix") + ext;

    const rules = [
      [/\(对页\)/, "(单页)"], [/（对页）/, "（单页）"],
      [/\(跨页\)/, "(单页)"], [/（跨页）/, "（单页）"],
      [/对页/, "单页"], [/跨页/, "单页"], [/spreads?/i, "single"]
    ];
    for (const [pat, rep] of rules) {
      if (pat.test(stem)) return stem.replace(pat, rep) + ext;
    }
    return stem + t("outSplitSuffix") + ext;
  }

  async function applySlotEditsOntoPdfDoc(pdfDoc, fileEntry) {
    // Apply text masks & text overlays onto source pages before copying/splitting
    for (const wp of fileEntry.workingPages) {
      if (!wp.edits || !wp.edits.length) continue;
      const page = pdfDoc.getPage(wp.origIdx);
      const crop = page.getCropBox();

      for (const ed of wp.edits) {
        if (ed.maskBg && ed.origRect) {
          const r = normVisualToPdfRect(crop, 0, ed.origRect);
          const bg = hexToRgb01(ed.bgColor);
          const isWhite = bg.r > 0.96 && bg.g > 0.96 && bg.b > 0.96;
          page.drawRectangle({
            x: r.x - 1,
            y: r.y - 1,
            width: r.w + 2,
            height: r.h + 2,
            color: isWhite ? PDFLib.cmyk(0, 0, 0, 0) : PDFLib.rgb(bg.r, bg.g, bg.b)
          });
        }

        if (ed.text && ed.text.trim().length > 0) {
          const rendered = renderTextEditToPngBytes(ed);
          const pngImg = await pdfDoc.embedPng(rendered.bytes);
          const xPt = crop.x + ed.u * crop.width;
          const yPt = crop.y + crop.height - ed.v * crop.height - rendered.ptH;
          page.drawImage(pngImg, { x: xPt, y: yPt, width: rendered.ptW, height: rendered.ptH });
        }
      }
    }
  }

  async function exportSinglePdfEntry(fileEntry) {
    const srcDoc = await PDFLib.PDFDocument.load(fileEntry.rawBytes, { ignoreEncryption: true });

    const shouldK100 = state.workMode === "keep" || state.workMode === "preflight" || (state.workMode === "split" && state.pureBlackK100);
    if (shouldK100) applyPureBlackK100ToDoc(srcDoc);

    await applySlotEditsOntoPdfDoc(srcDoc, fileEntry);

    const outDoc = await PDFLib.PDFDocument.create();
    const plan = computeSplitPlan(fileEntry);
    const origIndicesToCopy = plan.map((item) => item.wp.origIdx);
    const copiedPages = await outDoc.copyPages(srcDoc, origIndicesToCopy);

    copiedPages.forEach((pdfPage, idx) => {
      const item = plan[idx];
      const srcPage = srcDoc.getPage(item.wp.origIdx);
      const origRot = srcPage.getRotation().angle || 0;
      const newRot = (origRot + item.wp.extraRot) % 360;
      pdfPage.setRotation(PDFLib.degrees(newRot));

      if (state.workMode === "split") {
        const rawCrop = srcPage.getCropBox();
        const mainBox = normVisualToPdfRect(rawCrop, newRot, item.mainNorm);
        const trimBox = normVisualToPdfRect(rawCrop, newRot, item.trimNorm);
        pdfPage.setMediaBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
        pdfPage.setCropBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
        pdfPage.setBleedBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
        pdfPage.setTrimBox(trimBox.x, trimBox.y, trimBox.w, trimBox.h);
        pdfPage.setArtBox(trimBox.x, trimBox.y, trimBox.w, trimBox.h);
      }

      outDoc.addPage(pdfPage);
    });

    const outBytes = await outDoc.save();
    const blob = new Blob([outBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildOutputFilename(fileEntry.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function handleExportClick() {
    if (!state.files.length) return;
    el.exportBtn.disabled = true;
    const prevText = el.exportBtnText.textContent;
    el.exportBtnText.textContent = t("exportingBtn");

    try {
      for (const entry of state.files) await exportSinglePdfEntry(entry);
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      el.exportBtn.disabled = false;
      el.exportBtnText.textContent = prevText;
      updateUIState();
    }
  }

  // =========================================================================
  // UI Event Wiring
  // =========================================================================
  function switchWorkMode(mode) {
    if (state.workMode === mode) return;
    state.workMode = mode;
    state.placingNewText = false;
    state.selectedTextId = null;
    el.addTextBtn.classList.remove("active");
    el.splitParamsPopover.classList.add("hidden");

    if (mode !== "preflight") {
      state.activePfHighlights = [];
      state.selectedPfCardIdx = -1;
    } else {
      // Auto-select first issue with locations when entering Preflight!
      const active = getActiveFile();
      if (active && active.preflight) {
        const items = buildPreflightReportItems(active.preflight, active.workingPages);
        const firstIdx = items.findIndex((it) => it.locations && it.locations.length > 0);
        if (firstIdx >= 0) {
          state.selectedPfCardIdx = firstIdx;
          state.activePfHighlights = items[firstIdx].locations;
          state.activePageSlot = items[firstIdx].locations[0].slotIdx;
        }
      }
    }

    updateUIState();
    if (getActiveFile()) {
      const useGrid = (mode === "split" || mode === "keep") && state.viewTab === "sequence";
      useGrid ? renderSequenceView() : renderActiveSpreadCanvas();
    }
  }

  el.navEditBtn.addEventListener("click", () => switchWorkMode("edit"));
  el.navPreflightBtn.addEventListener("click", () => switchWorkMode("preflight"));
  el.navKeepBtn.addEventListener("click", () => switchWorkMode("keep"));
  el.navSplitBtn.addEventListener("click", () => switchWorkMode("split"));

  el.themeBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
  });

  el.langBtn.addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    applyLanguage();
  });

  el.splitParamsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    el.splitParamsPopover.classList.toggle("hidden");
  });
  el.splitParamsPopover.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => el.splitParamsPopover.classList.add("hidden"));

  el.toggleQuadLink.addEventListener("click", () => {
    el.quadGridPop.classList.toggle("hidden");
  });

  function parseNonNeg(val) {
    const n = parseFloat(val);
    return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 100) / 100, 100) : 0;
  }

  function syncPresetChips() {
    const b = state.bleed;
    const isU = b.top === b.bottom && b.top === b.left && b.top === b.right;
    el.presetChips.forEach((c) => c.classList.toggle("active", isU && Math.abs(b.top - parseFloat(c.dataset.bleed)) < 0.001));
  }

  function setUniformBleed(val) {
    const v = parseNonNeg(val);
    state.bleed = { top: v, bottom: v, left: v, right: v };
    el.bleedUniformInput.value = String(v);
    el.bleedTopInput.value = String(v);
    el.bleedBottomInput.value = String(v);
    el.bleedLeftInput.value = String(v);
    el.bleedRightInput.value = String(v);
    syncPresetChips();
    updateUIState();
    if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
  }

  el.presetChips.forEach((c) => c.addEventListener("click", () => setUniformBleed(c.dataset.bleed)));
  el.bleedUniformInput.addEventListener("input", () => setUniformBleed(el.bleedUniformInput.value));

  [["top", el.bleedTopInput], ["bottom", el.bleedBottomInput], ["left", el.bleedLeftInput], ["right", el.bleedRightInput]].forEach(([side, inp]) => {
    inp.addEventListener("input", () => {
      state.bleed[side] = parseNonNeg(inp.value);
      syncPresetChips();
      updateUIState();
      if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
    });
  });

  el.moveFirstCheck.addEventListener("change", () => {
    state.moveFirstToLast = el.moveFirstCheck.checked;
    updateUIState();
    if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
  });
  el.pureBlackCheck.addEventListener("change", () => { state.pureBlackK100 = el.pureBlackCheck.checked; });
  el.onlyLandscapeCheck.addEventListener("change", () => {
    state.onlyLandscape = el.onlyLandscapeCheck.checked;
    updateUIState();
    if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
  });

  el.bleedTrimBtn.addEventListener("click", () => {
    state.bleedAction = "trim";
    el.bleedTrimBtn.classList.add("active");
    el.bleedKeepBtn.classList.remove("active");
    updateUIState();
    if (state.viewTab === "sequence") renderSequenceView();
  });
  el.bleedKeepBtn.addEventListener("click", () => {
    state.bleedAction = "keep";
    el.bleedKeepBtn.classList.add("active");
    el.bleedTrimBtn.classList.remove("active");
    updateUIState();
    if (state.viewTab === "sequence") renderSequenceView();
  });

  el.dirLtrBtn.addEventListener("click", () => {
    state.readingDir = "ltr";
    el.dirLtrBtn.classList.add("active");
    el.dirRtlBtn.classList.remove("active");
    updateUIState();
    if (state.viewTab === "sequence") renderSequenceView();
  });
  el.dirRtlBtn.addEventListener("click", () => {
    state.readingDir = "rtl";
    el.dirRtlBtn.classList.add("active");
    el.dirLtrBtn.classList.remove("active");
    updateUIState();
    if (state.viewTab === "sequence") renderSequenceView();
  });

  function setViewSubTab(tab) {
    state.viewTab = tab;
    const isSp = tab === "spread";
    el.tabSpreadBtn.classList.toggle("active", isSp);
    el.tabSeqBtn.classList.toggle("active", !isSp);
    el.keepTabSingle.classList.toggle("active", isSp);
    el.keepTabAll.classList.toggle("active", !isSp);
    updateUIState();
    isSp ? renderActiveSpreadCanvas() : renderSequenceView();
  }

  el.tabSpreadBtn.addEventListener("click", () => setViewSubTab("spread"));
  el.tabSeqBtn.addEventListener("click", () => setViewSubTab("sequence"));
  el.keepTabSingle.addEventListener("click", () => setViewSubTab("spread"));
  el.keepTabAll.addEventListener("click", () => setViewSubTab("sequence"));

  el.dropzone.addEventListener("click", () => el.fileInput.click());
  el.sidebarUploadBtn.addEventListener("click", () => el.fileInput.click());
  el.addMoreBtn.addEventListener("click", () => el.fileInput.click());
  el.fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length) {
      loadPdfFiles(e.target.files);
      e.target.value = "";
    }
  });

  ["dragenter", "dragover"].forEach((evt) => {
    window.addEventListener(evt, (e) => { e.preventDefault(); el.dropzone.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach((evt) => {
    window.addEventListener(evt, (e) => {
      e.preventDefault();
      if (evt === "drop" && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        el.dropzone.classList.remove("dragover");
        loadPdfFiles(e.dataTransfer.files);
      } else if (evt === "dragleave" && e.relatedTarget === null) {
        el.dropzone.classList.remove("dragover");
      }
    });
  });

  el.clearAllBtn.addEventListener("click", () => {
    state.files = [];
    state.activeFileIndex = -1;
    state.activePageSlot = 0;
    state.selectedTextId = null;
    state.activePfHighlights = [];
    renderFileList();
    updateUIState();
  });

  el.prevSpreadBtn.addEventListener("click", () => {
    const active = getActiveFile();
    if (!active || state.activePageSlot <= 0) return;
    state.activePageSlot--;
    state.selectedTextId = null;
    renderActiveSpreadCanvas();
  });

  el.nextSpreadBtn.addEventListener("click", () => {
    const active = getActiveFile();
    if (!active || state.activePageSlot >= active.workingPages.length - 1) return;
    state.activePageSlot++;
    state.selectedTextId = null;
    renderActiveSpreadCanvas();
  });

  el.zoomOutBtn.addEventListener("click", () => setSmoothZoom(state.zoomFactor / 1.2));
  el.zoomInBtn.addEventListener("click", () => setSmoothZoom(state.zoomFactor * 1.2));
  el.zoomFitBtn.addEventListener("click", () => setSmoothZoom(1.0));

  el.exportBtn.addEventListener("click", handleExportClick);

  el.downloadOfflineBtn.addEventListener("click", async () => {
    let htmlContent = BOOT_CLEAN_HTML;
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      try {
        const cleanUrl = window.location.href.split("#")[0].split("?")[0];
        const resp = await fetch(cleanUrl, { cache: "no-cache" });
        if (resp.ok) {
          const txt = await resp.text();
          if (txt.includes("ShibaPDF") && txt.length > 100000) htmlContent = txt;
        }
      } catch (_) {}
    }
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ShibaPDF.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (!getActiveFile() || !el.sequenceGrid.classList.contains("hidden")) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderActiveSpreadCanvas(), 120);
  });

  applyTheme();
  applyLanguage();
})();
