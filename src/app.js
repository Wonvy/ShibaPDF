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
      toolboxLabel: "功能工具箱",
      modeSplit: "跨页拆单页",
      modeSplitSub: "双页切单页 · 裁出血与封底归位",
      modeKeepK100: "印前转单黑",
      modeKeepSub: "保持原跨页尺寸 · 修复四色黑",
      modePreflight: "印刷规范检查",
      modePreflightSub: "8 项 DPI / 字体 / 出血开机体检",
      modeEditText: "编辑页面文字",
      modeEditTextSub: "直接在画布修改或添加 PDF 文字",
      soonBadge: "规划中",
      secFiles: "当前文档",
      addBtn: "添加",
      clearAll: "清空",
      addPdfBtn: "导入 PDF 文件",
      downloadOfflineBtn: "下载单文件离线版 (.html)",
      bleedShort: "出血",
      preset0: "无 0",
      customSidesBtn: "四边独立",
      secBleed: "四边独立出血 (mm)",
      sideTop: "上",
      sideBottom: "下",
      sideLeft: "左",
      sideRight: "右",
      moveFirstShort: "封底移至末页",
      moreRulesBtn: "更多",
      onlyLandscapeShort: "仅对半拆分横向跨页",
      bleedModeTitle: "出血处理",
      actionTrimShort: "裁除四周出血（净尺寸）",
      actionKeepShort: "保留原外侧出血",
      dirTitle: "阅读顺序",
      dirLtrShort: "左 → 右（常规画册）",
      dirRtlShort: "右 → 左（古籍/日漫）",
      pureBlackShort: "单色黑 K100",
      exportBtn: "导出单页 PDF",
      exportKeepBtn: "导出印前 PDF (K100)",
      exportBatchBtn: "导出 {n} 个文件",
      exportingBtn: "处理中...",
      tabSpread: "裁切线",
      tabSequence: "页面总览",
      preflightReportTitle: "印前规范检测报告",
      emptyHeading: "PDF 跨页拆分与印前工具箱",
      emptySub: "左侧选择所需工具，拖入 PDF 即可完成跨页拆单页、四色黑转单黑 K100 或开机规范预检",
      chooseBtn: "选择 PDF 文件",
      dropHint: "或直接将单个、多个 PDF 拖入窗口任意位置",
      localFootnote: "100% 本地浏览器运行 · 不上传服务器 · 无损保留矢量、渐变与半透明阴影",
      editTextHeading: "编辑页面文字（模块预留）",
      editTextDesc: "该大按钮入口已为你预留就绪，后续可在此直接点选画布文字进行内容修改、字号调整与单黑上色。",
      frontCover: "封面",
      backCover: "封底",
      singleKept: "保持单页",
      pagesUnit: "页",
      fitZoom: "适应",
      hintHasBleed: "含 {b}mm 出血",
      hintNoBleed: "疑似无出血原稿",
      keepBadge: "P{p} · 原尺寸 {w}×{h}mm · 单色黑 K100",
      outSuffix: "(单页)",
      outKeepSuffix: "_K100",
      errLoadPdf: "读取 PDF 失败：",
      errExportPdf: "导出 PDF 失败：",
      pfPassCount: "{n} 通过",
      pfWarnCount: "{n} 留意",
      pfErrCount: "{n} 风险",
      pfMetaLine: "共 {p} 页 · 首张尺寸 {w}×{h} mm · 文件大小 {mb} MB",
      pfFixK100Btn: "一键导出 K100 修复版",
      pfBlackTitle: "黑色文字与四色黑检测",
      pfBlackOk: "透明混合空间为 CMYK，黑/灰文字与线条均为纯单黑通道，无四色黑套印重影风险。",
      pfBlackWarn: "检测到透明混合空间为 DeviceRGB 或含非单黑文字指令（共 {n} 页受影响），直接上机印刷易产生四色黑重影。开启「单色黑 K100」导出即可无损修复。",
      pfBleedTitle: "页面尺寸一致性与出血位检测",
      pfBleedMixed: "文档内存在多种不同页面尺寸混排，送印前请确认拼版规格一致。",
      pfBleedHas: "全书尺寸统一（{w}×{h} mm），吻合标准净尺寸 + 四周 {b}mm 出血位。",
      pfBleedNone: "全书尺寸统一（{w}×{h} mm），疑似未预留 3mm 出血的净尺寸稿件，裁切边缘可能有露白风险。",
      pfBleedCustom: "全书尺寸统一（{w}×{h} mm），非常规幅面，请结合裁切线确认四周已预留 3mm 出血。",
      pfFontTitle: "字体嵌入完整性检测",
      pfFontOk: "共检测到 {n} 款字体，已 100% 嵌入文件内部（或已转曲），印刷厂打开无缺字乱码风险。",
      pfFontNoFonts: "未检测到外部活动字体（文字已全部转曲或纯图版面），无缺字风险。",
      pfFontErr: "发现 {n} 款字体未嵌入文件！印刷厂电脑若无该字体将导致变体或乱码。",
      pfDpiTitle: "图片有效印刷分辨率检测 (300 DPI 标准)",
      pfDpiNoImg: "全书为纯矢量与文字版面（不含位图图片），任意放大印刷均清晰锐利。",
      pfDpiOk: "共扫描 {n} 处位图渲染，最低有效分辨率 {min} DPI（最高 {max} DPI），符合高清印刷要求。",
      pfDpiWarn: "共扫描 {n} 处位图，最低有效分辨率 {min} DPI（位于第 {pages} 页），略低于 300 DPI 最佳画册标准。",
      pfDpiErr: "发现低分辨率图片！最低仅 {min} DPI（位于第 {pages} 页），实印可能出现模糊或锯齿马赛克。",
      pfColorTitle: "色彩空间审计 (CMYK / RGB)",
      pfColorOk: "图像与矢量元素均采用 CMYK 或灰阶印刷色彩空间。",
      pfColorWarn: "检测到 {rgbImg} 张 RGB 图片与 {rgbVec} 个页面含 RGB 矢量色（PPT/Office 导出常见）。数码快印可直接印，传统胶印注意色差。",
      pfTransTitle: "半透明、软蒙版与矢量渐变检测",
      pfTransOk: "包含 {smask} 处透明软蒙版与 {grad} 处矢量渐变，均保持原生高清未压平状态。",
      pfTransNone: "未检测到复杂透明软蒙版叠加，印前 RIP 解释极速安全。",
      pfBookletTitle: "装订页数模数检验 (骑马钉 4P 倍数)",
      pfBookletOk: "折算单页总数为 {p} 页（4 的整数倍），符合骑马钉画册装订模数。",
      pfBookletLeaflet: "折算单页数为 {p} 页（单张或折页规格）。",
      pfBookletWarn: "折算单页总数为 {p} 页（非 4 的倍数）。骑马钉需增减至 {prev} 页或 {next} 页；胶装则不受影响。",
      pfSecTitle: "文档加密与 RIP 印刷权限",
      pfSecOk: "文件未设权限密码锁，印前拼版与 RIP 分色系统可正常读取。",
      pfSecWarn: "文件带有加密标记，部分老旧印前拼版软件可能拒绝导入。"
    },
    en: {
      toolboxLabel: "PDF Toolbox",
      modeSplit: "Split Spreads",
      modeSplitSub: "Slice spreads · Trim bleed & covers",
      modeKeepK100: "Pure K100 Fix",
      modeKeepSub: "Keep spread size · Fix 4-color black",
      modePreflight: "Preflight Check",
      modePreflightSub: "8-point DPI, font & bleed audit",
      modeEditText: "Edit PDF Text",
      modeEditTextSub: "Modify or add text directly on page",
      soonBadge: "Soon",
      secFiles: "Active Files",
      addBtn: "Add",
      clearAll: "Clear",
      addPdfBtn: "Import PDF Files",
      downloadOfflineBtn: "Download Offline App (.html)",
      bleedShort: "Bleed",
      preset0: "None 0",
      customSidesBtn: "4 Sides",
      secBleed: "Custom 4-Side Bleed (mm)",
      sideTop: "Top",
      sideBottom: "Bottom",
      sideLeft: "Left",
      sideRight: "Right",
      moveFirstShort: "Move Back Cover to end",
      moreRulesBtn: "More",
      onlyLandscapeShort: "Split landscape spreads only",
      bleedModeTitle: "Bleed Handling",
      actionTrimShort: "Trim bleed to net size",
      actionKeepShort: "Keep outer bleed",
      dirTitle: "Reading Order",
      dirLtrShort: "Left → Right (Standard)",
      dirRtlShort: "Right → Left (RTL / Manga)",
      pureBlackShort: "Pure K100",
      exportBtn: "Export Single PDF",
      exportKeepBtn: "Export K100 PDF",
      exportBatchBtn: "Export {n} PDFs",
      exportingBtn: "Processing...",
      tabSpread: "Cut Guides",
      tabSequence: "All Pages",
      preflightReportTitle: "Prepress Preflight Report",
      emptyHeading: "PDF Spread & Prepress Toolbox",
      emptySub: "Pick a tool on the left and drop your PDF for lossless spread splitting, Pure K100 fix, or print preflight",
      chooseBtn: "Choose PDF Files",
      dropHint: "or drag & drop one or multiple PDFs anywhere in this window",
      localFootnote: "100% Client-Side in Browser · Zero Uploads · Preserves Vectors, Gradients & Transparency",
      editTextHeading: "Edit PDF Text (Reserved Module)",
      editTextDesc: "This large tool slot is ready for upcoming interactive on-canvas text editing, font sizing, and K100 styling.",
      frontCover: "Front Cover",
      backCover: "Back Cover",
      singleKept: "Single",
      pagesUnit: "p",
      fitZoom: "Fit",
      hintHasBleed: "{b}mm bleed detected",
      hintNoBleed: "Net size (no bleed)",
      keepBadge: "P{p} · Original {w}×{h}mm · Pure K100",
      outSuffix: "_single",
      outKeepSuffix: "_K100",
      errLoadPdf: "Failed to read PDF: ",
      errExportPdf: "Failed to export PDF: ",
      pfPassCount: "{n} Passed",
      pfWarnCount: "{n} Warnings",
      pfErrCount: "{n} Errors",
      pfMetaLine: "{p} Pages · First Page {w}×{h} mm · {mb} MB",
      pfFixK100Btn: "Export K100 Fixed PDF",
      pfBlackTitle: "Black Text & 4-Color Rich Black",
      pfBlackOk: "Transparency blending uses CMYK and black/gray text uses pure single-channel K.",
      pfBlackWarn: "Detected DeviceRGB transparency blending or non-K100 black text ({n} pages affected), causing 4-color rich black blur on press. Export with \"Pure K100\" enabled to fix losslessly.",
      pfBleedTitle: "Page Size Uniformity & Bleed Margin",
      pfBleedMixed: "Mixed page dimensions detected across the document. Verify imposition specs before printing.",
      pfBleedHas: "Uniform page size ({w}×{h} mm) matching standard trim size + {b}mm bleed on all sides.",
      pfBleedNone: "Uniform page size ({w}×{h} mm) matching net trim size WITHOUT 3mm bleed — edge clipping may expose white borders.",
      pfBleedCustom: "Uniform custom size ({w}×{h} mm). Verify 3mm bleed margin using Cut Guides.",
      pfFontTitle: "Font Embedding Integrity",
      pfFontOk: "All {n} font(s) are 100% embedded (or outlined) — zero missing glyph risk on press.",
      pfFontNoFonts: "No live external fonts detected (all text outlined or vector/raster) — safe for press.",
      pfFontErr: "{n} font(s) are NOT embedded! Text may substitute or corrupt on the print shop RIP.",
      pfDpiTitle: "Effective Image Print Resolution (300 DPI Target)",
      pfDpiNoImg: "Pure vector & typography layout (0 raster images) — resolution-independent sharpness.",
      pfDpiOk: "Scanned {n} placed image(s): min {min} DPI (max {max} DPI) — meets high-resolution print standards.",
      pfDpiWarn: "Scanned {n} placed image(s): lowest is {min} DPI (Page {pages}), slightly below optimal 300 DPI.",
      pfDpiErr: "Low-resolution image(s) detected! Lowest is {min} DPI (Page {pages}) — may print blurry or pixelated.",
      pfColorTitle: "Color Space Audit (CMYK / RGB)",
      pfColorOk: "All images and vector elements use CMYK or Grayscale print color spaces.",
      pfColorWarn: "Contains {rgbImg} RGB image(s) and {rgbVec} page(s) with RGB vectors. Digital presses convert automatically; offset presses may shift hues.",
      pfTransTitle: "Live Transparency, Soft Masks & Gradients",
      pfTransOk: "Detected {smask} soft-mask transparency group(s) and {grad} vector shading gradient(s), all preserved unflattened.",
      pfTransNone: "No complex soft-mask transparency stacks detected — fast RIP rendering.",
      pfBookletTitle: "Saddle-Stitch Signature Multiple (4P Rule)",
      pfBookletOk: "Total single-page count is {p}p (multiple of 4) — ready for saddle-stitch booklet binding.",
      pfBookletLeaflet: "Total single-page count is {p}p (single sheet / leaflet).",
      pfBookletWarn: "Total single-page count is {p}p (not a multiple of 4). Saddle-stitch booklets require {prev}p or {next}p; perfect binding is unaffected.",
      pfSecTitle: "Encryption & RIP Permissions",
      pfSecOk: "Unrestricted PDF — compatible with all prepress imposition and RIP workflows.",
      pfSecWarn: "Encryption dictionary present — some older prepress RIPs may reject restricted files."
    }
  };

  const KNOWN_NET_SIZES = [
    { w: 420, h: 285 },
    { w: 420, h: 297 },
    { w: 297, h: 210 },
    { w: 594, h: 420 },
    { w: 370, h: 260 },
    { w: 570, h: 210 },
    { w: 210, h: 285 },
    { w: 210, h: 297 },
    { w: 148.5, h: 210 }
  ];

  const state = {
    lang: localStorage.getItem("shibapdf_lang") || "zh",
    theme: localStorage.getItem("shibapdf_theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    workMode: "split", // 'split' | 'keep' | 'preflight' | 'editText'
    bleed: { top: 3, bottom: 3, left: 3, right: 3 },
    bleedAction: "trim",
    moveFirstToLast: true,
    pureBlackK100: true,
    onlyLandscape: true,
    readingDir: "ltr",
    viewTab: "spread",
    zoomFactor: 1.0,
    files: [],
    activeFileIndex: -1,
    activeSpreadIndex: 0,
    renderToken: 0
  };

  const el = {
    html: document.documentElement,
    langBtn: document.getElementById("langBtn"),
    langLabel: document.getElementById("langLabel"),
    themeBtn: document.getElementById("themeBtn"),
    iconMoon: document.getElementById("iconMoon"),
    iconSun: document.getElementById("iconSun"),
    navSplitBtn: document.getElementById("navSplitBtn"),
    navKeepBtn: document.getElementById("navKeepBtn"),
    navPreflightBtn: document.getElementById("navPreflightBtn"),
    navEditTextBtn: document.getElementById("navEditTextBtn"),
    navPreflightBadge: document.getElementById("navPreflightBadge"),
    fileInput: document.getElementById("fileInput"),
    railFilesBox: document.getElementById("railFilesBox"),
    addMoreBtn: document.getElementById("addMoreBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    fileList: document.getElementById("fileList"),
    sidebarUploadBtn: document.getElementById("sidebarUploadBtn"),
    downloadOfflineBtn: document.getElementById("downloadOfflineBtn"),
    contextBar: document.getElementById("contextBar"),
    previewSubTabs: document.getElementById("previewSubTabs"),
    tabSpreadBtn: document.getElementById("tabSpreadBtn"),
    tabSeqBtn: document.getElementById("tabSeqBtn"),
    ctxSplitControls: document.getElementById("ctxSplitControls"),
    presetChips: Array.from(document.querySelectorAll(".preset-chip")),
    bleedUniformInput: document.getElementById("bleedUniformInput"),
    quadPopBtn: document.getElementById("quadPopBtn"),
    quadPopover: document.getElementById("quadPopover"),
    bleedTopInput: document.getElementById("bleedTopInput"),
    bleedBottomInput: document.getElementById("bleedBottomInput"),
    bleedLeftInput: document.getElementById("bleedLeftInput"),
    bleedRightInput: document.getElementById("bleedRightInput"),
    moveFirstCheck: document.getElementById("moveFirstCheck"),
    morePopBtn: document.getElementById("morePopBtn"),
    morePopover: document.getElementById("morePopover"),
    onlyLandscapeCheck: document.getElementById("onlyLandscapeCheck"),
    bleedOpts: Array.from(document.querySelectorAll(".bleed-opt")),
    dirOpts: Array.from(document.querySelectorAll(".dir-opt")),
    ctxK100Wrap: document.getElementById("ctxK100Wrap"),
    pureBlackCheck: document.getElementById("pureBlackCheck"),
    preflightStageTitle: document.getElementById("preflightStageTitle"),
    smartHint: document.getElementById("smartHint"),
    dimSummaryText: document.getElementById("dimSummaryText"),
    exportBtn: document.getElementById("exportBtn"),
    exportBtnText: document.getElementById("exportBtnText"),
    stageViewport: document.getElementById("stageViewport"),
    emptyStage: document.getElementById("emptyStage"),
    editTextPlaceholder: document.getElementById("editTextPlaceholder"),
    dropzone: document.getElementById("dropzone"),
    spreadViewContainer: document.getElementById("spreadViewContainer"),
    spreadCanvas: document.getElementById("spreadCanvas"),
    shadeTop: document.getElementById("shadeTop"),
    shadeBottom: document.getElementById("shadeBottom"),
    shadeLeft: document.getElementById("shadeLeft"),
    shadeRight: document.getElementById("shadeRight"),
    trimRect: document.getElementById("trimRect"),
    centerLine: document.getElementById("centerLine"),
    leftBadge: document.getElementById("leftBadge"),
    rightBadge: document.getElementById("rightBadge"),
    sequenceGrid: document.getElementById("sequenceGrid"),
    preflightReportView: document.getElementById("preflightReportView"),
    pfDocTitle: document.getElementById("pfDocTitle"),
    pfDocMeta: document.getElementById("pfDocMeta"),
    pfScorePills: document.getElementById("pfScorePills"),
    pfItemsList: document.getElementById("pfItemsList"),
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
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.replace(`{${k}}`, vars[k]);
      });
    }
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
    if (state.workMode === "preflight") renderPreflightReport();
    else if (state.viewTab === "sequence" && state.workMode !== "editText") renderSequenceView();
  }

  function closePopovers() {
    el.quadPopover.classList.add("hidden");
    el.morePopover.classList.add("hidden");
  }

  function bindPopover(btn, panel) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = panel.classList.contains("hidden");
      closePopovers();
      if (willOpen) panel.classList.remove("hidden");
    });
    panel.addEventListener("click", (e) => e.stopPropagation());
  }

  bindPopover(el.quadPopBtn, el.quadPopover);
  bindPopover(el.morePopBtn, el.morePopover);
  document.addEventListener("click", closePopovers);

  function parseNonNeg(val) {
    const n = parseFloat(val);
    return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 100) / 100, 100) : 0;
  }

  function syncPresetHighlight() {
    const b = state.bleed;
    const isUniform = b.top === b.bottom && b.top === b.left && b.top === b.right;
    el.presetChips.forEach((chip) => {
      const v = parseFloat(chip.getAttribute("data-bleed"));
      chip.classList.toggle("active", isUniform && Math.abs(b.top - v) < 0.001);
    });
  }

  function setUniformBleed(val) {
    const v = parseNonNeg(val);
    state.bleed = { top: v, bottom: v, left: v, right: v };
    el.bleedUniformInput.value = String(v);
    el.bleedTopInput.value = String(v);
    el.bleedBottomInput.value = String(v);
    el.bleedLeftInput.value = String(v);
    el.bleedRightInput.value = String(v);
    syncPresetHighlight();
    updateUIState();
    if (state.viewTab === "sequence" && (state.workMode === "split" || state.workMode === "keep")) renderSequenceView();
  }

  function getActiveFile() {
    if (state.activeFileIndex < 0 || state.activeFileIndex >= state.files.length) return null;
    return state.files[state.activeFileIndex];
  }

  // =========================================================================
  // PDF Lexical Utilities & 8-Point Prepress Preflight Analyzer
  // =========================================================================
  function uint8ToLatin1(u8) {
    const CHUNK = 0x8000;
    const parts = [];
    for (let i = 0; i < u8.length; i += CHUNK) {
      parts.push(String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK)));
    }
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
      if (pos >= len) {
        trailingWs = wsBefore;
        break;
      }

      const ch = latin1[pos];
      if (ch === "(") {
        const start = pos++;
        let depth = 1;
        while (pos < len && depth > 0) {
          const cur = latin1[pos];
          if (cur === "\\") pos += 2;
          else {
            if (cur === "(") depth++;
            else if (cur === ")") depth--;
            pos++;
          }
        }
        tokens.push({ type: "str", raw: latin1.slice(start, pos), wsBefore });
      } else if (ch === "<") {
        if (latin1[pos + 1] === "<") {
          tokens.push({ type: "dictOpen", raw: "<<", wsBefore });
          pos += 2;
        } else {
          const start = pos++;
          while (pos < len && latin1[pos] !== ">") pos++;
          if (pos < len) pos++;
          tokens.push({ type: "hex", raw: latin1.slice(start, pos), wsBefore });
        }
      } else if (ch === ">") {
        if (latin1[pos + 1] === ">") {
          tokens.push({ type: "dictClose", raw: ">>", wsBefore });
          pos += 2;
        } else {
          tokens.push({ type: "other", raw: ">", wsBefore });
          pos++;
        }
      } else if (ch === "[") {
        tokens.push({ type: "arrOpen", raw: "[", wsBefore });
        pos++;
      } else if (ch === "]") {
        tokens.push({ type: "arrClose", raw: "]", wsBefore });
        pos++;
      } else if (ch === "{" || ch === "}" || ch === ")") {
        tokens.push({ type: "other", raw: ch, wsBefore });
        pos++;
      } else if (ch === "/") {
        const start = pos++;
        while (pos < len && !isPdfWsCode(latin1.charCodeAt(pos)) && !isPdfDelimChar(latin1[pos])) pos++;
        tokens.push({ type: "name", raw: latin1.slice(start, pos), wsBefore });
      } else {
        const start = pos;
        while (pos < len && !isPdfWsCode(latin1.charCodeAt(pos)) && !isPdfDelimChar(latin1[pos])) pos++;
        const word = latin1.slice(start, pos);

        if (word === "BI") {
          while (pos < len) {
            if (
              latin1[pos] === "I" && latin1[pos + 1] === "D" && pos > start &&
              (isPdfWsCode(latin1.charCodeAt(pos - 1)) || isPdfDelimChar(latin1[pos - 1])) &&
              (pos + 2 >= len || isPdfWsCode(latin1.charCodeAt(pos + 2)))
            ) {
              pos += 3;
              break;
            }
            pos++;
          }
          while (pos < len) {
            if (
              latin1[pos] === "E" && latin1[pos + 1] === "I" &&
              isPdfWsCode(latin1.charCodeAt(pos - 1)) &&
              (pos + 2 >= len || isPdfWsCode(latin1.charCodeAt(pos + 2)) || isPdfDelimChar(latin1[pos + 2]))
            ) {
              pos += 2;
              break;
            }
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

  async function runPrepressPreflight(rawBytes, pageInfos) {
    const doc = await PDFLib.PDFDocument.load(rawBytes, { ignoreEncryption: true });
    const pages = doc.getPages();

    let nonK100Pages = 0;
    let rgbImageCount = 0;
    let cmykImageCount = 0;
    let rgbVectorPages = 0;
    let smaskCount = 0;
    let gradientCount = 0;

    const allFonts = new Map();
    const placedDpis = [];
    const seenImgRefs = new Set();

    pages.forEach((page, pIdx) => {
      const pageNum = pIdx + 1;
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
            if (desc.get(PDFLib.PDFName.of("FontFile")) || desc.get(PDFLib.PDFName.of("FontFile2")) || desc.get(PDFLib.PDFName.of("FontFile3"))) {
              embedded = true;
            }
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
            pageImages.set(kName.toString(), { pxW, pxH });

            const refKey = xRef.toString();
            if (!seenImgRefs.has(refKey)) {
              seenImgRefs.add(refKey);
              const csEntry = xObj.dict.lookup(PDFLib.PDFName.of("ColorSpace"));
              const csStr = csEntry ? csEntry.toString() : "";
              if (csStr.includes("DeviceRGB") || csStr.includes("/N 3")) rgbImageCount++;
              else if (csStr.includes("DeviceCMYK") || csStr.includes("/N 4")) cmykImageCount++;
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
              const wIn = Math.hypot(ctm[0], ctm[1]) / 72.0;
              const hIn = Math.hypot(ctm[2], ctm[3]) / 72.0;
              if (wIn > 0.05 && hIn > 0.05) {
                const effDpi = Math.round(Math.min(imInfo.pxW / wIn, imInfo.pxH / hIn));
                if (effDpi > 10 && effDpi < 20000) placedDpis.push({ pageNum, dpi: effDpi });
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
        if (pageHasNonK100) nonK100Pages++;
        if (pageHasRgbVec) rgbVectorPages++;
      }
    });

    const p0 = pageInfos[0];
    const uniformSize = pageInfos.every((p) => Math.abs(p.wMm - p0.wMm) <= 1.0 && Math.abs(p.hMm - p0.hMm) <= 1.0);
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
    pageInfos.forEach((p) => { singleEquivPages += p.wMm > p.hMm ? 2 : 1; });

    return {
      isEncrypted: doc.isEncrypted,
      nonK100Pages,
      uniformSize,
      firstWMm: p0 ? p0.wMm : 0,
      firstHMm: p0 ? p0.hMm : 0,
      matchedBleed,
      fonts: Array.from(allFonts.entries()),
      placedDpis,
      rgbImageCount,
      cmykImageCount,
      rgbVectorPages,
      smaskCount,
      gradientCount,
      singleEquivPages
    };
  }

  function buildPreflightReportItems(pf) {
    const items = [];

    if (pf.nonK100Pages > 0) {
      items.push({ status: "warn", title: t("pfBlackTitle"), desc: t("pfBlackWarn", { n: pf.nonK100Pages }), fixAction: "exportK100" });
    } else {
      items.push({ status: "ok", title: t("pfBlackTitle"), desc: t("pfBlackOk") });
    }

    if (!pf.uniformSize) items.push({ status: "warn", title: t("pfBleedTitle"), desc: t("pfBleedMixed") });
    else if (pf.matchedBleed === 0) items.push({ status: "warn", title: t("pfBleedTitle"), desc: t("pfBleedNone", { w: pf.firstWMm.toFixed(1), h: pf.firstHMm.toFixed(1) }) });
    else if (pf.matchedBleed > 0) items.push({ status: "ok", title: t("pfBleedTitle"), desc: t("pfBleedHas", { w: pf.firstWMm.toFixed(1), h: pf.firstHMm.toFixed(1), b: pf.matchedBleed }) });
    else items.push({ status: "ok", title: t("pfBleedTitle"), desc: t("pfBleedCustom", { w: pf.firstWMm.toFixed(1), h: pf.firstHMm.toFixed(1) }) });

    const unembedded = pf.fonts.filter(([, emb]) => !emb).map(([name]) => name);
    const allFontNames = pf.fonts.map(([name]) => name).slice(0, 8);
    if (unembedded.length > 0) items.push({ status: "err", title: t("pfFontTitle"), desc: t("pfFontErr", { n: unembedded.length }), tags: unembedded });
    else if (pf.fonts.length === 0) items.push({ status: "ok", title: t("pfFontTitle"), desc: t("pfFontNoFonts") });
    else items.push({ status: "ok", title: t("pfFontTitle"), desc: t("pfFontOk", { n: pf.fonts.length }), tags: allFontNames });

    if (pf.placedDpis.length === 0) {
      items.push({ status: "ok", title: t("pfDpiTitle"), desc: t("pfDpiNoImg") });
    } else {
      const dpis = pf.placedDpis.map((x) => x.dpi);
      const minDpi = Math.min(...dpis);
      const maxDpi = Math.max(...dpis);
      if (minDpi < 150) {
        const badPages = Array.from(new Set(pf.placedDpis.filter((x) => x.dpi < 150).map((x) => x.pageNum))).join(", ");
        items.push({ status: "err", title: t("pfDpiTitle"), desc: t("pfDpiErr", { min: minDpi, pages: badPages }) });
      } else if (minDpi < 250) {
        const lowPages = Array.from(new Set(pf.placedDpis.filter((x) => x.dpi < 250).map((x) => x.pageNum))).join(", ");
        items.push({ status: "warn", title: t("pfDpiTitle"), desc: t("pfDpiWarn", { n: pf.placedDpis.length, min: minDpi, pages: lowPages }) });
      } else {
        items.push({ status: "ok", title: t("pfDpiTitle"), desc: t("pfDpiOk", { n: pf.placedDpis.length, min: minDpi, max: maxDpi }) });
      }
    }

    if (pf.rgbImageCount > 0 || pf.rgbVectorPages > 0) {
      items.push({ status: "warn", title: t("pfColorTitle"), desc: t("pfColorWarn", { rgbImg: pf.rgbImageCount, rgbVec: pf.rgbVectorPages }) });
    } else {
      items.push({ status: "ok", title: t("pfColorTitle"), desc: t("pfColorOk") });
    }

    if (pf.smaskCount > 0 || pf.gradientCount > 0) {
      items.push({ status: "ok", title: t("pfTransTitle"), desc: t("pfTransOk", { smask: pf.smaskCount, grad: pf.gradientCount }) });
    } else {
      items.push({ status: "ok", title: t("pfTransTitle"), desc: t("pfTransNone") });
    }

    const sp = pf.singleEquivPages;
    if (sp <= 2) items.push({ status: "ok", title: t("pfBookletTitle"), desc: t("pfBookletLeaflet", { p: sp }) });
    else if (sp % 4 === 0) items.push({ status: "ok", title: t("pfBookletTitle"), desc: t("pfBookletOk", { p: sp }) });
    else items.push({ status: "warn", title: t("pfBookletTitle"), desc: t("pfBookletWarn", { p: sp, prev: Math.floor(sp / 4) * 4, next: Math.ceil(sp / 4) * 4 }) });

    items.push({ status: pf.isEncrypted ? "warn" : "ok", title: t("pfSecTitle"), desc: pf.isEncrypted ? t("pfSecWarn") : t("pfSecOk") });

    return items;
  }

  function renderPreflightBadge(active) {
    if (!active || !active.preflight) {
      el.navPreflightBadge.classList.add("hidden");
      return;
    }
    const items = buildPreflightReportItems(active.preflight);
    const errCount = items.filter((i) => i.status === "err").length;
    const warnCount = items.filter((i) => i.status === "warn").length;
    const issueTotal = errCount + warnCount;

    el.navPreflightBadge.classList.remove("hidden", "ok", "warn", "err");
    if (issueTotal === 0) {
      el.navPreflightBadge.textContent = "✓";
      el.navPreflightBadge.classList.add("ok");
    } else {
      el.navPreflightBadge.textContent = String(issueTotal);
      el.navPreflightBadge.classList.add(errCount > 0 ? "err" : "warn");
    }
  }

  function renderPreflightReport() {
    const active = getActiveFile();
    if (!active || !active.preflight) return;

    const pf = active.preflight;
    const items = buildPreflightReportItems(pf);
    const okCount = items.filter((i) => i.status === "ok").length;
    const warnCount = items.filter((i) => i.status === "warn").length;
    const errCount = items.filter((i) => i.status === "err").length;

    el.pfDocTitle.textContent = active.name;
    el.pfDocMeta.textContent = t("pfMetaLine", {
      p: active.pageInfos.length,
      w: pf.firstWMm.toFixed(1),
      h: pf.firstHMm.toFixed(1),
      mb: (active.size / (1024 * 1024)).toFixed(2)
    });

    el.pfScorePills.innerHTML = "";
    const addPill = (cls, txt) => {
      const span = document.createElement("span");
      span.className = `pf-stat-badge ${cls}`;
      span.textContent = txt;
      el.pfScorePills.appendChild(span);
    };
    addPill("ok", t("pfPassCount", { n: okCount }));
    if (warnCount > 0) addPill("warn", t("pfWarnCount", { n: warnCount }));
    if (errCount > 0) addPill("err", t("pfErrCount", { n: errCount }));

    el.pfItemsList.innerHTML = "";
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "pf-item";

      const left = document.createElement("div");
      left.className = "pf-item-left";

      const iconWrap = document.createElement("span");
      iconWrap.className = `pf-status-icon ${item.status}`;
      iconWrap.innerHTML = item.status === "ok" ? (ICONS["check-circle-2"] || "✓") : item.status === "err" ? (ICONS["x-circle"] || "✕") : (ICONS["alert-triangle"] || "!");

      const body = document.createElement("div");
      body.className = "pf-item-body";
      const h4 = document.createElement("h4");
      h4.textContent = item.title;
      const p = document.createElement("p");
      p.textContent = item.desc;
      body.appendChild(h4);
      body.appendChild(p);

      if (item.tags && item.tags.length) {
        const tagBox = document.createElement("div");
        tagBox.className = "pf-detail-tags";
        item.tags.forEach((tg) => {
          const s = document.createElement("span");
          s.className = "pf-detail-tag";
          s.textContent = tg;
          tagBox.appendChild(s);
        });
        body.appendChild(tagBox);
      }

      left.appendChild(iconWrap);
      left.appendChild(body);
      row.appendChild(left);

      if (item.fixAction === "exportK100") {
        const fixBtn = document.createElement("button");
        fixBtn.className = "pf-fix-btn";
        fixBtn.type = "button";
        fixBtn.innerHTML = `${ICONS["wrench"] || ""}<span>${t("pfFixK100Btn")}</span>`;
        fixBtn.addEventListener("click", () => {
          state.workMode = "keep";
          state.pureBlackK100 = true;
          el.pureBlackCheck.checked = true;
          updateUIState();
          handleExportClick();
        });
        row.appendChild(fixBtn);
      }

      el.pfItemsList.appendChild(row);
    });
  }

  // =========================================================================
  // Split Geometry & Export
  // =========================================================================
  function computeSplitPlan(fileEntry) {
    if (!fileEntry || !fileEntry.pageInfos.length) return [];

    if (state.workMode === "keep") {
      return fileEntry.pageInfos.map((info, srcIdx) => ({
        srcIdx,
        side: "keep",
        mainNorm: { u: 0, v: 0, uw: 1, vh: 1 },
        trimNorm: { u: 0, v: 0, uw: 1, vh: 1 },
        outWMm: info.wMm,
        outHMm: info.hMm,
        role: "keep",
        finalPageNum: srcIdx + 1
      }));
    }

    const b = state.bleed;
    const trimMode = state.bleedAction === "trim";
    const items = [];

    fileEntry.pageInfos.forEach((info, srcIdx) => {
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
        items.push({ srcIdx, side: "single", mainNorm, trimNorm, outWMm: mainNorm.uw * wMm, outHMm: mainNorm.vh * hMm, role: "single" });
        return;
      }

      const leftTrimNorm = { u: uL, v: vT, uw: Math.max(0.02, 0.5 - uL), vh: Math.max(0.02, 1 - vT - vB) };
      const rightTrimNorm = { u: 0.5, v: vT, uw: Math.max(0.02, 0.5 - uR), vh: Math.max(0.02, 1 - vT - vB) };
      const leftMainNorm = trimMode ? leftTrimNorm : { u: 0, v: 0, uw: 0.5, vh: 1 };
      const rightMainNorm = trimMode ? rightTrimNorm : { u: 0.5, v: 0, uw: 0.5, vh: 1 };

      const leftItem = { srcIdx, side: "left", mainNorm: leftMainNorm, trimNorm: leftTrimNorm, outWMm: leftMainNorm.uw * wMm, outHMm: leftMainNorm.vh * hMm, role: "normal" };
      const rightItem = { srcIdx, side: "right", mainNorm: rightMainNorm, trimNorm: rightTrimNorm, outWMm: rightMainNorm.uw * wMm, outHMm: rightMainNorm.vh * hMm, role: "normal" };

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

  function detectSmartHint(fileEntry) {
    if (!fileEntry || !fileEntry.pageInfos.length || state.workMode !== "split") {
      el.smartHint.classList.add("hidden");
      return;
    }
    const p0 = fileEntry.pageInfos[0];
    const w = p0.wMm, h = p0.hMm, tol = 0.9;
    for (const spec of KNOWN_NET_SIZES) {
      if (Math.abs(w - spec.w) <= tol && Math.abs(h - spec.h) <= tol) {
        el.smartHint.textContent = t("hintNoBleed");
        el.smartHint.style.color = "var(--err)";
        el.smartHint.classList.remove("hidden");
        return;
      }
      for (const bCand of [3, 5]) {
        if (Math.abs(w - (spec.w + 2 * bCand)) <= tol && Math.abs(h - (spec.h + 2 * bCand)) <= tol) {
          el.smartHint.textContent = t("hintHasBleed", { b: bCand });
          el.smartHint.style.color = "";
          el.smartHint.classList.remove("hidden");
          return;
        }
      }
    }
    el.smartHint.classList.add("hidden");
  }

  function updateZoomReadout() {
    el.zoomLabel.textContent = Math.abs(state.zoomFactor - 1.0) < 0.01 ? t("fitZoom") : `${Math.round(state.zoomFactor * 100)}%`;
  }

  function updateUIState() {
    const active = getActiveFile();
    const hasFiles = Boolean(active);

    // Highlight active big button on left rail
    el.navSplitBtn.classList.toggle("active", state.workMode === "split");
    el.navKeepBtn.classList.toggle("active", state.workMode === "keep");
    el.navPreflightBtn.classList.toggle("active", state.workMode === "preflight");
    el.navEditTextBtn.classList.toggle("active", state.workMode === "editText");

    el.railFilesBox.classList.toggle("hidden", state.files.length === 0);
    el.sidebarUploadBtn.classList.toggle("hidden", state.files.length > 0);
    renderPreflightBadge(active);

    // Edit Text reserved module view
    if (state.workMode === "editText") {
      el.contextBar.classList.add("hidden");
      el.emptyStage.classList.add("hidden");
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.preflightReportView.classList.add("hidden");
      el.bottomPager.classList.add("hidden");
      el.stageViewport.classList.remove("align-top");
      el.editTextPlaceholder.classList.remove("hidden");
      return;
    }

    el.editTextPlaceholder.classList.add("hidden");

    if (!hasFiles) {
      el.contextBar.classList.add("hidden");
      el.emptyStage.classList.remove("hidden");
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.preflightReportView.classList.add("hidden");
      el.bottomPager.classList.add("hidden");
      el.stageViewport.classList.remove("align-top");
      return;
    }

    el.emptyStage.classList.add("hidden");
    el.contextBar.classList.remove("hidden");
    el.exportBtn.disabled = false;

    const isSplit = state.workMode === "split";
    const isKeep = state.workMode === "keep";
    const isPreflight = state.workMode === "preflight";

    el.previewSubTabs.classList.toggle("hidden", isPreflight);
    el.ctxSplitControls.classList.toggle("hidden", !isSplit);
    el.ctxK100Wrap.classList.toggle("hidden", isPreflight);
    el.preflightStageTitle.classList.toggle("hidden", !isPreflight);

    el.exportBtnText.textContent = state.files.length > 1
      ? t("exportBatchBtn", { n: state.files.length })
      : (isKeep || isPreflight ? t("exportKeepBtn") : t("exportBtn"));

    detectSmartHint(active);

    const plan = computeSplitPlan(active);
    const curSpread = active.pageInfos[state.activeSpreadIndex] || active.pageInfos[0];
    const sampleOut = plan.find((x) => x.srcIdx === state.activeSpreadIndex) || plan[0];

    if (sampleOut) {
      el.dimSummaryText.textContent = isKeep || isPreflight
        ? `${curSpread.wMm.toFixed(0)}×${curSpread.hMm.toFixed(0)}mm · ${active.pageInfos.length}${t("pagesUnit")}`
        : `${curSpread.wMm.toFixed(0)}×${curSpread.hMm.toFixed(0)} → ${sampleOut.outWMm.toFixed(0)}×${sampleOut.outHMm.toFixed(0)}mm (${plan.length}${t("pagesUnit")})`;
    }

    if (isPreflight) {
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.bottomPager.classList.add("hidden");
      el.preflightReportView.classList.remove("hidden");
      el.stageViewport.classList.add("align-top");
      renderPreflightReport();
      return;
    }

    el.preflightReportView.classList.add("hidden");
    el.pageIndicator.textContent = `${state.activeSpreadIndex + 1} / ${active.pageInfos.length}`;
    el.prevSpreadBtn.disabled = state.activeSpreadIndex <= 0;
    el.nextSpreadBtn.disabled = state.activeSpreadIndex >= active.pageInfos.length - 1;

    if (state.viewTab === "spread") {
      el.stageViewport.classList.remove("align-top");
      el.spreadViewContainer.classList.remove("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.bottomPager.classList.remove("hidden");
      updateCutOverlayGeometry(active, plan);
    } else {
      el.stageViewport.classList.add("align-top");
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.remove("hidden");
      el.bottomPager.classList.add("hidden");
    }
  }

  function updateCutOverlayGeometry(active, plan) {
    const info = active.pageInfos[state.activeSpreadIndex];
    if (!info) return;

    const cssW = parseFloat(el.spreadCanvas.style.width) || el.spreadCanvas.width;
    const cssH = parseFloat(el.spreadCanvas.style.height) || el.spreadCanvas.height;
    if (!cssW || !cssH) return;

    if (state.workMode === "keep") {
      [el.shadeTop, el.shadeBottom, el.shadeLeft, el.shadeRight, el.trimRect, el.centerLine, el.rightBadge].forEach((n) => n.classList.add("hidden"));
      el.leftBadge.classList.remove("hidden");
      el.leftBadge.style.left = `${cssW / 2}px`;
      el.leftBadge.textContent = t("keepBadge", { p: state.activeSpreadIndex + 1, w: info.wMm.toFixed(0), h: info.hMm.toFixed(0) });
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

      const leftPlan = plan.find((p) => p.srcIdx === state.activeSpreadIndex && p.side === "left");
      const rightPlan = plan.find((p) => p.srcIdx === state.activeSpreadIndex && p.side === "right");

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
      const singlePlan = plan.find((p) => p.srcIdx === state.activeSpreadIndex);
      if (singlePlan) {
        el.leftBadge.classList.remove("hidden");
        el.leftBadge.style.left = `${cssW / 2}px`;
        el.leftBadge.textContent = `P${singlePlan.finalPageNum} · ${t("singleKept")}  ${singlePlan.outWMm.toFixed(0)}×${singlePlan.outHMm.toFixed(0)}`;
      }
    }
  }

  async function renderActiveSpreadCanvas() {
    const active = getActiveFile();
    if (!active || !active.pdfJsDoc || state.workMode === "preflight" || state.workMode === "editText") return;

    const myToken = ++state.renderToken;
    const page = await active.pdfJsDoc.getPage(state.activeSpreadIndex + 1);
    if (myToken !== state.renderToken) return;

    const baseVp = page.getViewport({ scale: 1 });
    const availW = Math.max(320, el.stageViewport.clientWidth - 96);
    const availH = Math.max(260, el.stageViewport.clientHeight - 120);
    const fitScale = Math.min(availW / baseVp.width, availH / baseVp.height, 1.6);
    const cssScale = fitScale * state.zoomFactor;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const renderVp = page.getViewport({ scale: cssScale * dpr });
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

  async function getCachedSpreadBitmapCanvas(active, srcIdx) {
    if (active.spreadCache.has(srcIdx)) return active.spreadCache.get(srcIdx);
    const page = await active.pdfJsDoc.getPage(srcIdx + 1);
    const vp1 = page.getViewport({ scale: 1 });
    const targetScale = Math.min(920 / Math.max(vp1.width, 1), 1.45);
    const vp = page.getViewport({ scale: targetScale });

    const off = document.createElement("canvas");
    off.width = Math.round(vp.width);
    off.height = Math.round(vp.height);
    const ctx = off.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, off.width, off.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    active.spreadCache.set(srcIdx, off);
    return off;
  }

  async function renderSequenceView() {
    const active = getActiveFile();
    if (!active || !active.pdfJsDoc || state.workMode === "preflight" || state.workMode === "editText") return;

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

      const srcCanvas = await getCachedSpreadBitmapCanvas(active, item.srcIdx);
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
        state.activeSpreadIndex = 0;
        renderFileList();
        updateUIState();
        if (getActiveFile() && (state.workMode === "split" || state.workMode === "keep")) {
          state.viewTab === "spread" ? renderActiveSpreadCanvas() : renderSequenceView();
        }
      });

      row.appendChild(left);
      row.appendChild(delBtn);
      row.addEventListener("click", () => {
        if (state.activeFileIndex === idx) return;
        state.activeFileIndex = idx;
        state.activeSpreadIndex = 0;
        renderFileList();
        updateUIState();
        if (state.workMode === "split" || state.workMode === "keep") {
          state.viewTab === "spread" ? renderActiveSpreadCanvas() : renderSequenceView();
        }
      });

      el.fileList.appendChild(row);
    });
  }

  async function loadPdfFiles(fileListObj) {
    const incoming = Array.from(fileListObj).filter((f) => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf");
    if (!incoming.length) return;

    if (state.workMode === "editText") state.workMode = "split";

    for (const file of incoming) {
      try {
        const buf = await file.arrayBuffer();
        const rawBytes = new Uint8Array(buf);
        const pdfJsDoc = await pdfjsLib.getDocument({ data: rawBytes.slice() }).promise;
        const pageInfos = [];
        for (let p = 1; p <= pdfJsDoc.numPages; p++) {
          const pg = await pdfJsDoc.getPage(p);
          const vp = pg.getViewport({ scale: 1 });
          pageInfos.push({ wPt: vp.width, hPt: vp.height, wMm: vp.width / MM_TO_PT, hMm: vp.height / MM_TO_PT, rot: pg.rotate || 0 });
        }
        const preflight = await runPrepressPreflight(rawBytes, pageInfos);
        state.files.push({ id: `${Date.now()}_${Math.random()}`, name: file.name, size: file.size, rawBytes, pdfJsDoc, pageInfos, preflight, spreadCache: new Map() });
      } catch (err) {
        alert(t("errLoadPdf") + (err && err.message ? err.message : String(err)));
      }
    }

    state.activeFileIndex = state.files.length - 1;
    state.activeSpreadIndex = 0;
    state.zoomFactor = 1.0;
    updateZoomReadout();
    renderFileList();
    updateUIState();
    if (getActiveFile() && (state.workMode === "split" || state.workMode === "keep")) {
      state.viewTab === "spread" ? renderActiveSpreadCanvas() : renderSequenceView();
    }
  }

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
        if (
          (tok.raw === "rg" || tok.raw === "RG") &&
          outStack.length >= 3 &&
          outStack[outStack.length - 1].type === "num" &&
          outStack[outStack.length - 2].type === "num" &&
          outStack[outStack.length - 3].type === "num"
        ) {
          const tR = outStack[outStack.length - 3], tG = outStack[outStack.length - 2], tB = outStack[outStack.length - 1];
          const r = parseFloat(tR.raw), g = parseFloat(tG.raw), b = parseFloat(tB.raw);
          if (r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1 && (Math.max(r, g, b) - Math.min(r, g, b) <= 0.02)) {
            outStack.pop(); outStack.pop(); outStack.pop();
            outStack.push({ type: "rewritten", wsBefore: tR.wsBefore, raw: `0 0 0 ${fmtCmykVal(1 - (r + g + b) / 3)} ${tok.raw === "rg" ? "k" : "K"}` });
            continue;
          }
        }
        if (
          (tok.raw === "k" || tok.raw === "K") &&
          outStack.length >= 4 &&
          outStack[outStack.length - 1].type === "num" &&
          outStack[outStack.length - 2].type === "num" &&
          outStack[outStack.length - 3].type === "num" &&
          outStack[outStack.length - 4].type === "num"
        ) {
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

  function normVisualToPdfRect(rawCrop, rotDeg, norm) {
    const x0 = rawCrop.x, y0 = rawCrop.y, rw = rawCrop.width, rh = rawCrop.height;
    const rot = ((rotDeg % 360) + 360) % 360;
    if (rot === 90) return { x: x0 + norm.v * rw, y: y0 + norm.u * rh, w: norm.vh * rw, h: norm.uw * rh };
    if (rot === 180) return { x: x0 + (1 - norm.u - norm.uw) * rw, y: y0 + norm.v * rh, w: norm.uw * rw, h: norm.vh * rh };
    if (rot === 270) return { x: x0 + (1 - norm.v - norm.vh) * rw, y: y0 + (1 - norm.u - norm.uw) * rh, w: norm.vh * rw, h: norm.uw * rh };
    return { x: x0 + norm.u * rw, y: y0 + (1 - norm.v - norm.vh) * rh, w: norm.uw * rw, h: norm.vh * rh };
  }

  function buildOutputFilename(origName, keepPages) {
    const dot = origName.lastIndexOf(".");
    const stem = dot > 0 ? origName.slice(0, dot) : origName;
    const ext = dot > 0 ? origName.slice(dot) : ".pdf";

    if (keepPages) return stem + t("outKeepSuffix") + ext;

    const rules = [
      [/\(对页\)/, "(单页)"],
      [/（对页）/, "（单页）"],
      [/\(跨页\)/, "(单页)"],
      [/（跨页）/, "（单页）"],
      [/对页/, "单页"],
      [/跨页/, "单页"],
      [/spreads?/i, "single"]
    ];
    for (const [pat, rep] of rules) {
      if (pat.test(stem)) return stem.replace(pat, rep) + ext;
    }
    return stem + t("outSuffix") + ext;
  }

  async function exportSinglePdfEntry(fileEntry) {
    const keepPages = state.workMode === "keep" || state.workMode === "preflight";
    const srcDoc = await PDFLib.PDFDocument.load(fileEntry.rawBytes, { ignoreEncryption: true });
    if (state.pureBlackK100 || keepPages) applyPureBlackK100ToDoc(srcDoc);

    let outBytes;
    if (keepPages) {
      outBytes = await srcDoc.save();
    } else {
      const plan = computeSplitPlan(fileEntry);
      const outDoc = await PDFLib.PDFDocument.create();
      const copiedPages = await outDoc.copyPages(srcDoc, plan.map((item) => item.srcIdx));

      copiedPages.forEach((pdfPage, idx) => {
        const item = plan[idx];
        const srcPage = srcDoc.getPage(item.srcIdx);
        const rawCrop = srcPage.getCropBox();
        const rotDeg = srcPage.getRotation().angle || 0;

        const mainBox = normVisualToPdfRect(rawCrop, rotDeg, item.mainNorm);
        const trimBox = normVisualToPdfRect(rawCrop, rotDeg, item.trimNorm);

        pdfPage.setMediaBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
        pdfPage.setCropBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
        pdfPage.setBleedBox(mainBox.x, mainBox.y, mainBox.w, mainBox.h);
        pdfPage.setTrimBox(trimBox.x, trimBox.y, trimBox.w, trimBox.h);
        pdfPage.setArtBox(trimBox.x, trimBox.y, trimBox.w, trimBox.h);
        outDoc.addPage(pdfPage);
      });
      outBytes = await outDoc.save();
    }

    const blob = new Blob([outBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildOutputFilename(fileEntry.name, keepPages);
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

  // Events
  function switchWorkMode(mode) {
    if (state.workMode === mode) return;
    state.workMode = mode;
    closePopovers();
    if (mode === "keep") {
      state.pureBlackK100 = true;
      el.pureBlackCheck.checked = true;
    }
    updateUIState();
    if (getActiveFile() && (mode === "split" || mode === "keep")) {
      state.viewTab === "spread" ? renderActiveSpreadCanvas() : renderSequenceView();
    }
  }

  el.navSplitBtn.addEventListener("click", () => switchWorkMode("split"));
  el.navKeepBtn.addEventListener("click", () => switchWorkMode("keep"));
  el.navPreflightBtn.addEventListener("click", () => switchWorkMode("preflight"));
  el.navEditTextBtn.addEventListener("click", () => switchWorkMode("editText"));

  el.themeBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
  });

  el.langBtn.addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    applyLanguage();
  });

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
    window.addEventListener(evt, (e) => {
      e.preventDefault();
      el.dropzone.classList.add("dragover");
    });
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
    state.activeSpreadIndex = 0;
    renderFileList();
    updateUIState();
  });

  el.presetChips.forEach((chip) => {
    chip.addEventListener("click", () => setUniformBleed(chip.getAttribute("data-bleed")));
  });

  el.bleedUniformInput.addEventListener("input", () => setUniformBleed(el.bleedUniformInput.value));

  [
    ["top", el.bleedTopInput],
    ["bottom", el.bleedBottomInput],
    ["left", el.bleedLeftInput],
    ["right", el.bleedRightInput]
  ].forEach(([side, inputEl]) => {
    inputEl.addEventListener("input", () => {
      state.bleed[side] = parseNonNeg(inputEl.value);
      syncPresetHighlight();
      updateUIState();
      if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
    });
  });

  el.bleedOpts.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.bleedAction = btn.getAttribute("data-value");
      el.bleedOpts.forEach((b) => {
        const sel = b === btn;
        b.classList.toggle("selected", sel);
        b.lastElementChild.textContent = sel ? "✓" : "";
      });
      closePopovers();
      updateUIState();
      if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
    });
  });

  el.dirOpts.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.readingDir = btn.getAttribute("data-value");
      el.dirOpts.forEach((b) => {
        const sel = b === btn;
        b.classList.toggle("selected", sel);
        b.lastElementChild.textContent = sel ? "✓" : "";
      });
      closePopovers();
      updateUIState();
      if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
    });
  });

  el.moveFirstCheck.addEventListener("change", () => {
    state.moveFirstToLast = el.moveFirstCheck.checked;
    updateUIState();
    if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
  });

  el.onlyLandscapeCheck.addEventListener("change", () => {
    state.onlyLandscape = el.onlyLandscapeCheck.checked;
    updateUIState();
    if (state.viewTab === "sequence" && state.workMode === "split") renderSequenceView();
  });

  el.pureBlackCheck.addEventListener("change", () => {
    state.pureBlackK100 = el.pureBlackCheck.checked;
  });

  el.tabSpreadBtn.addEventListener("click", () => {
    if (state.viewTab === "spread") return;
    state.viewTab = "spread";
    el.tabSpreadBtn.classList.add("active");
    el.tabSeqBtn.classList.remove("active");
    updateUIState();
    renderActiveSpreadCanvas();
  });

  el.tabSeqBtn.addEventListener("click", () => {
    if (state.viewTab === "sequence") return;
    state.viewTab = "sequence";
    el.tabSeqBtn.classList.add("active");
    el.tabSpreadBtn.classList.remove("active");
    updateUIState();
    renderSequenceView();
  });

  el.prevSpreadBtn.addEventListener("click", () => {
    const active = getActiveFile();
    if (!active || state.activeSpreadIndex <= 0) return;
    state.activeSpreadIndex--;
    renderActiveSpreadCanvas();
  });

  el.nextSpreadBtn.addEventListener("click", () => {
    const active = getActiveFile();
    if (!active || state.activeSpreadIndex >= active.pageInfos.length - 1) return;
    state.activeSpreadIndex++;
    renderActiveSpreadCanvas();
  });

  el.zoomOutBtn.addEventListener("click", () => {
    state.zoomFactor = Math.max(0.5, Math.round((state.zoomFactor - 0.2) * 10) / 10);
    updateZoomReadout();
    renderActiveSpreadCanvas();
  });

  el.zoomInBtn.addEventListener("click", () => {
    state.zoomFactor = Math.min(2.6, Math.round((state.zoomFactor + 0.2) * 10) / 10);
    updateZoomReadout();
    renderActiveSpreadCanvas();
  });

  el.zoomFitBtn.addEventListener("click", () => {
    state.zoomFactor = 1.0;
    updateZoomReadout();
    renderActiveSpreadCanvas();
  });

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
    if (state.viewTab !== "spread" || (state.workMode !== "split" && state.workMode !== "keep") || !getActiveFile()) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderActiveSpreadCanvas(), 120);
  });

  applyTheme();
  applyLanguage();
})();
