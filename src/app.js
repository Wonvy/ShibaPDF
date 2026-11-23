(function () {
  "use strict";

  const MM_TO_PT = 72.0 / 25.4;

  // Offline inline Blob Worker for PDF.js
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
      appTitle: "ShibaPDF · 跨页拆单页",
      fileQueueTitle: "已导入文件",
      addMoreFiles: "＋ 添加文件",
      clearAll: "清空全部",
      tabSpread: "裁切线",
      tabSequence: "单页预览",
      tabSequenceKeep: "全部页面",
      modeSplit: "拆分为单页",
      modeKeepK100: "不拆页 · 仅转单黑",
      darkMode: "深色",
      lightMode: "浅色",
      exportBtn: "导出单页 PDF",
      exportKeepBtn: "导出印前 PDF (K100)",
      exportBatchBtn: "导出 {n} 个文件",
      exportingBtn: "正在导出...",
      bleedShort: "出血",
      preset0: "无 0",
      customSidesBtn: "四边独立",
      customBleedTitle: "上下左右独立出血 (mm)",
      sideTop: "上",
      sideBottom: "下",
      sideLeft: "左",
      sideRight: "右",
      moveFirstShort: "首张左页（封底）移至末页",
      pureBlackShort: "印刷单色黑 K100",
      moreRulesBtn: "更多选项",
      onlyLandscapeLabel: "仅拆分横向跨页（保留竖版单页）",
      bleedModeTitle: "出血处理方式",
      actionTrim: "裁除出血，输出净尺寸单页",
      actionKeep: "保留原外侧出血，仅对半切开",
      dirTitle: "阅读拆分顺序",
      dirLTR: "先左页、后右页（常规画册）",
      dirRTL: "先右页、后左页（古籍 / 日漫）",
      emptyHeading: "将跨页 PDF 拆分为单页",
      emptySub: "支持自定义四周出血裁切、封面封底顺序自动归位，以及实时裁切线预览",
      chooseBtn: "选择 PDF 文件",
      dropHint: "或直接将单个、多个 PDF 拖入页面任意位置",
      localFootnote: "文件仅在本地浏览器处理，不会上传服务器 · 100% 保留矢量与 CMYK 印刷色彩",
      frontCover: "封面",
      backCover: "封底",
      singleKept: "保持单页",
      pagesUnit: "页",
      fitZoom: "适应",
      hintHasBleed: "已识别 {w}×{h}mm（含四周 {b}mm 出血）",
      hintNoBleed: "原稿 {w}×{h}mm 疑似不含出血，建议左侧出血选「无 0」",
      hintKeepMode: "原尺寸直出（不拆页、不裁边）· 自动转单色黑 K100 并保留全部透明度",
      keepBadge: "P{p} · 原尺寸 {w}×{h}mm · 单色黑 K100",
      outSuffix: "(单页)",
      outKeepSuffix: "_K100",
      errLoadPdf: "读取 PDF 失败：",
      errExportPdf: "导出 PDF 失败："
    },
    en: {
      appTitle: "ShibaPDF · Spread Splitter",
      fileQueueTitle: "Loaded Files",
      addMoreFiles: "+ Add Files",
      clearAll: "Clear All",
      tabSpread: "Cut Guides",
      tabSequence: "Pages",
      tabSequenceKeep: "All Pages",
      modeSplit: "Split Spreads",
      modeKeepK100: "Keep Pages · Fix K100",
      darkMode: "Dark",
      lightMode: "Light",
      exportBtn: "Export PDF",
      exportKeepBtn: "Export K100 PDF",
      exportBatchBtn: "Export {n} PDFs",
      exportingBtn: "Exporting...",
      bleedShort: "Bleed",
      preset0: "None 0",
      customSidesBtn: "4 Sides",
      customBleedTitle: "Custom 4-Side Bleed (mm)",
      sideTop: "Top",
      sideBottom: "Bottom",
      sideLeft: "Left",
      sideRight: "Right",
      moveFirstShort: "Move 1st left half (Back Cover) to end",
      pureBlackShort: "Pure K100 Black",
      moreRulesBtn: "Options",
      onlyLandscapeLabel: "Split landscape spreads only",
      bleedModeTitle: "Bleed Handling",
      actionTrim: "Trim bleed to net size",
      actionKeep: "Keep outer bleed & write TrimBox",
      dirTitle: "Reading Order",
      dirLTR: "Left → Right (Standard)",
      dirRTL: "Right → Left (RTL / Manga)",
      emptyHeading: "Split Spread PDF into Single Pages",
      emptySub: "Custom bleed trimming, automatic Front/Back cover ordering, and live cut-line preview",
      chooseBtn: "Choose PDF Files",
      dropHint: "or drag & drop one or multiple PDFs anywhere on this page",
      localFootnote: "Processed 100% locally in your browser · Preserves vectors & CMYK print colors",
      frontCover: "Front Cover",
      backCover: "Back Cover",
      singleKept: "Single",
      pagesUnit: "p",
      fitZoom: "Fit",
      hintHasBleed: "Detected {w}×{h}mm ({b}mm bleed)",
      hintNoBleed: "{w}×{h}mm looks like net size (no bleed) — consider selecting \"None 0\"",
      hintKeepMode: "Keep original page size & count · Convert to Pure K100 Black with live transparency",
      keepBadge: "P{p} · Original {w}×{h}mm · Pure K100",
      outSuffix: "_single",
      outKeepSuffix: "_K100",
      errLoadPdf: "Failed to read PDF: ",
      errExportPdf: "Failed to export PDF: "
    }
  };

  const KNOWN_SPREAD_SIZES = [
    { w: 420, h: 285 },
    { w: 420, h: 297 },
    { w: 297, h: 210 },
    { w: 594, h: 420 },
    { w: 370, h: 260 },
    { w: 570, h: 210 }
  ];

  const state = {
    lang: localStorage.getItem("pdf_split_lang") || "zh",
    theme: localStorage.getItem("pdf_split_theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
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
    headerFileSection: document.getElementById("headerFileSection"),
    fileTriggerBtn: document.getElementById("fileTriggerBtn"),
    activeFileName: document.getElementById("activeFileName"),
    filePopover: document.getElementById("filePopover"),
    fileList: document.getElementById("fileList"),
    addMoreBtn: document.getElementById("addMoreBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    dimSummaryInline: document.getElementById("dimSummaryInline"),
    viewSwitcher: document.getElementById("viewSwitcher"),
    tabSpreadBtn: document.getElementById("tabSpreadBtn"),
    tabSeqBtn: document.getElementById("tabSeqBtn"),
    langBtn: document.getElementById("langBtn"),
    langLabel: document.getElementById("langLabel"),
    themeBtn: document.getElementById("themeBtn"),
    iconMoon: document.getElementById("iconMoon"),
    iconSun: document.getElementById("iconSun"),
    themeLabel: document.getElementById("themeLabel"),
    exportBtn: document.getElementById("exportBtn"),
    exportBtnText: document.getElementById("exportBtnText"),
    toolbarRibbon: document.getElementById("toolbarRibbon"),
    presetChips: Array.from(document.querySelectorAll(".preset-chip")),
    bleedUniformInput: document.getElementById("bleedUniformInput"),
    quadTriggerBtn: document.getElementById("quadTriggerBtn"),
    quadPopover: document.getElementById("quadPopover"),
    bleedTopInput: document.getElementById("bleedTopInput"),
    bleedBottomInput: document.getElementById("bleedBottomInput"),
    bleedLeftInput: document.getElementById("bleedLeftInput"),
    bleedRightInput: document.getElementById("bleedRightInput"),
    moveFirstCheck: document.getElementById("moveFirstCheck"),
    pureBlackCheck: document.getElementById("pureBlackCheck"),
    rulesTriggerBtn: document.getElementById("rulesTriggerBtn"),
    rulesPopover: document.getElementById("rulesPopover"),
    onlyLandscapeCheck: document.getElementById("onlyLandscapeCheck"),
    bleedModeOpts: Array.from(document.querySelectorAll(".bleed-mode-opt")),
    dirOpts: Array.from(document.querySelectorAll(".dir-opt")),
    smartHint: document.getElementById("smartHint"),
    stageViewport: document.getElementById("stageViewport"),
    fileInput: document.getElementById("fileInput"),
    emptyStage: document.getElementById("emptyStage"),
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
    el.themeLabel.textContent = isDark ? t("lightMode") : t("darkMode");
    localStorage.setItem("pdf_split_theme", state.theme);
  }

  function applyLanguage() {
    el.html.setAttribute("lang", state.lang === "zh" ? "zh-CN" : "en");
    el.langLabel.textContent = state.lang === "zh" ? "EN" : "中文";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key === "darkMode") {
        node.textContent = state.theme === "dark" ? t("lightMode") : t("darkMode");
      } else {
        node.textContent = t(key);
      }
    });
    updateZoomReadout();
    localStorage.setItem("pdf_split_lang", state.lang);
    renderFileList();
    updateUIState();
    if (state.viewTab === "sequence") renderSequenceView();
  }

  function closeAllPopovers() {
    [el.filePopover, el.quadPopover, el.rulesPopover].forEach((p) => p.classList.add("hidden"));
  }

  function bindPopoverToggle(trigger, panel) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = panel.classList.contains("hidden");
      closeAllPopovers();
      if (willOpen) panel.classList.remove("hidden");
    });
    panel.addEventListener("click", (e) => e.stopPropagation());
  }

  bindPopoverToggle(el.fileTriggerBtn, el.filePopover);
  bindPopoverToggle(el.quadTriggerBtn, el.quadPopover);
  bindPopoverToggle(el.rulesTriggerBtn, el.rulesPopover);
  document.addEventListener("click", closeAllPopovers);

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
    el.quadTriggerBtn.classList.toggle("active", !isUniform);
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
    if (state.viewTab === "sequence") renderSequenceView();
  }

  function getActiveFile() {
    if (state.activeFileIndex < 0 || state.activeFileIndex >= state.files.length) return null;
    return state.files[state.activeFileIndex];
  }

  function computeSplitPlan(fileEntry) {
    if (!fileEntry || !fileEntry.pageInfos.length) return [];
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
        items.push({
          srcIdx,
          side: "single",
          mainNorm,
          trimNorm,
          outWMm: mainNorm.uw * wMm,
          outHMm: mainNorm.vh * hMm,
          role: "single"
        });
        return;
      }

      const leftTrimNorm = { u: uL, v: vT, uw: Math.max(0.02, 0.5 - uL), vh: Math.max(0.02, 1 - vT - vB) };
      const rightTrimNorm = { u: 0.5, v: vT, uw: Math.max(0.02, 0.5 - uR), vh: Math.max(0.02, 1 - vT - vB) };

      const leftMainNorm = trimMode ? leftTrimNorm : { u: 0, v: 0, uw: 0.5, vh: 1 };
      const rightMainNorm = trimMode ? rightTrimNorm : { u: 0.5, v: 0, uw: 0.5, vh: 1 };

      const leftItem = { srcIdx, side: "left", mainNorm: leftMainNorm, trimNorm: leftTrimNorm, outWMm: leftMainNorm.uw * wMm, outHMm: leftMainNorm.vh * hMm, role: "normal" };
      const rightItem = { srcIdx, side: "right", mainNorm: rightMainNorm, trimNorm: rightTrimNorm, outWMm: rightMainNorm.uw * wMm, outHMm: rightMainNorm.vh * hMm, role: "normal" };

      if (state.readingDir === "rtl") {
        items.push(rightItem, leftItem);
      } else {
        items.push(leftItem, rightItem);
      }
    });

    if (state.moveFirstToLast && items.length >= 2) {
      const firstMoved = items.shift();
      firstMoved.role = "backCover";
      items[0].role = "frontCover";
      items.push(firstMoved);
    }

    items.forEach((it, idx) => {
      it.finalPageNum = idx + 1;
    });

    return items;
  }

  function detectSmartHint(fileEntry) {
    if (!fileEntry || !fileEntry.pageInfos.length) {
      el.smartHint.textContent = "";
      el.smartHint.classList.remove("warn");
      return;
    }
    const p0 = fileEntry.pageInfos[0];
    const w = p0.wMm;
    const h = p0.hMm;
    const tol = 0.9;

    for (const spec of KNOWN_SPREAD_SIZES) {
      if (Math.abs(w - spec.w) <= tol && Math.abs(h - spec.h) <= tol) {
        el.smartHint.textContent = t("hintNoBleed", { w: w.toFixed(0), h: h.toFixed(0) });
        el.smartHint.classList.add("warn");
        return;
      }
      for (const bCand of [3, 5]) {
        if (Math.abs(w - (spec.w + 2 * bCand)) <= tol && Math.abs(h - (spec.h + 2 * bCand)) <= tol) {
          el.smartHint.textContent = t("hintHasBleed", { w: w.toFixed(0), h: h.toFixed(0), b: bCand });
          el.smartHint.classList.remove("warn");
          return;
        }
      }
    }
    el.smartHint.textContent = "";
    el.smartHint.classList.remove("warn");
  }

  function updateZoomReadout() {
    el.zoomLabel.textContent = Math.abs(state.zoomFactor - 1.0) < 0.01
      ? t("fitZoom")
      : `${Math.round(state.zoomFactor * 100)}%`;
  }

  function updateUIState() {
    const active = getActiveFile();
    const hasFiles = Boolean(active);

    el.headerFileSection.classList.toggle("hidden", !hasFiles);
    el.viewSwitcher.classList.toggle("hidden", !hasFiles);
    el.exportBtn.classList.toggle("hidden", !hasFiles);
    el.toolbarRibbon.classList.toggle("hidden", !hasFiles);
    el.stageViewport.classList.toggle("is-empty", !hasFiles);
    el.emptyStage.classList.toggle("hidden", hasFiles);

    if (!hasFiles) {
      el.spreadViewContainer.classList.add("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.bottomPager.classList.add("hidden");
      return;
    }

    const labelSuffix = state.files.length > 1 ? ` (+${state.files.length - 1})` : "";
    el.activeFileName.textContent = active.name + labelSuffix;
    el.exportBtnText.textContent = state.files.length > 1
      ? t("exportBatchBtn", { n: state.files.length })
      : t("exportBtn");

    detectSmartHint(active);

    const plan = computeSplitPlan(active);
    const curSpread = active.pageInfos[state.activeSpreadIndex] || active.pageInfos[0];
    const sampleOut = plan.find((x) => x.srcIdx === state.activeSpreadIndex) || plan[0];

    if (sampleOut) {
      el.dimSummaryInline.textContent = `${curSpread.wMm.toFixed(0)}×${curSpread.hMm.toFixed(0)} (${active.pageInfos.length}${t("pagesUnit")}) → ${sampleOut.outWMm.toFixed(0)}×${sampleOut.outHMm.toFixed(0)}mm (${plan.length}${t("pagesUnit")})`;
    }

    el.pageIndicator.textContent = `${state.activeSpreadIndex + 1} / ${active.pageInfos.length}`;
    el.prevSpreadBtn.disabled = state.activeSpreadIndex <= 0;
    el.nextSpreadBtn.disabled = state.activeSpreadIndex >= active.pageInfos.length - 1;

    if (state.viewTab === "spread") {
      el.spreadViewContainer.classList.remove("hidden");
      el.sequenceGrid.classList.add("hidden");
      el.bottomPager.classList.remove("hidden");
      updateCutOverlayGeometry(active, plan);
    } else {
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

    const b = state.bleed;
    const uL = Math.min(0.48, Math.max(0, b.left / info.wMm));
    const uR = Math.min(0.48, Math.max(0, b.right / info.wMm));
    const vT = Math.min(0.48, Math.max(0, b.top / info.hMm));
    const vB = Math.min(0.48, Math.max(0, b.bottom / info.hMm));

    const pxL = uL * cssW;
    const pxR = uR * cssW;
    const pxT = vT * cssH;
    const pxB = vB * cssH;

    Object.assign(el.shadeTop.style, { left: "0px", top: "0px", width: `${cssW}px`, height: `${pxT}px` });
    Object.assign(el.shadeBottom.style, { left: "0px", bottom: "0px", width: `${cssW}px`, height: `${pxB}px` });
    Object.assign(el.shadeLeft.style, { left: "0px", top: `${pxT}px`, width: `${pxL}px`, height: `${Math.max(0, cssH - pxT - pxB)}px` });
    Object.assign(el.shadeRight.style, { right: "0px", top: `${pxT}px`, width: `${pxR}px`, height: `${Math.max(0, cssH - pxT - pxB)}px` });

    Object.assign(el.trimRect.style, {
      left: `${pxL}px`,
      top: `${pxT}px`,
      width: `${Math.max(0, cssW - pxL - pxR)}px`,
      height: `${Math.max(0, cssH - pxT - pxB)}px`
    });

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
    if (!active || !active.pdfJsDoc) return;

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
      row.className = "popover-option" + (idx === state.activeFileIndex ? " selected" : "");

      const nameSpan = document.createElement("span");
      nameSpan.style.overflow = "hidden";
      nameSpan.style.textOverflow = "ellipsis";
      nameSpan.style.whiteSpace = "nowrap";
      nameSpan.textContent = f.name;

      const delBtn = document.createElement("button");
      delBtn.className = "ghost-btn";
      delBtn.style.height = "22px";
      delBtn.style.padding = "0 6px";
      delBtn.type = "button";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state.files.splice(idx, 1);
        if (state.activeFileIndex >= state.files.length) {
          state.activeFileIndex = state.files.length - 1;
        }
        state.activeSpreadIndex = 0;
        renderFileList();
        updateUIState();
        if (getActiveFile()) {
          state.viewTab === "spread" ? renderActiveSpreadCanvas() : renderSequenceView();
        } else {
          closeAllPopovers();
        }
      });

      row.appendChild(nameSpan);
      row.appendChild(delBtn);
      row.addEventListener("click", () => {
        state.activeFileIndex = idx;
        state.activeSpreadIndex = 0;
        closeAllPopovers();
        renderFileList();
        updateUIState();
        state.viewTab === "spread" ? renderActiveSpreadCanvas() : renderSequenceView();
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
        const pageInfos = [];
        for (let p = 1; p <= pdfJsDoc.numPages; p++) {
          const pg = await pdfJsDoc.getPage(p);
          const vp = pg.getViewport({ scale: 1 });
          pageInfos.push({
            wPt: vp.width,
            hPt: vp.height,
            wMm: vp.width / MM_TO_PT,
            hMm: vp.height / MM_TO_PT,
            rot: pg.rotate || 0
          });
        }
        state.files.push({
          id: `${Date.now()}_${Math.random()}`,
          name: file.name,
          size: file.size,
          rawBytes,
          pdfJsDoc,
          pageInfos,
          spreadCache: new Map()
        });
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
    if (getActiveFile()) {
      state.viewTab === "spread" ? renderActiveSpreadCanvas() : renderSequenceView();
    }
  }

  function normVisualToPdfRect(rawCrop, rotDeg, norm) {
    const x0 = rawCrop.x;
    const y0 = rawCrop.y;
    const rw = rawCrop.width;
    const rh = rawCrop.height;
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

  // Lexical PDF Content Stream Color Rewriter:
  // Converts DeviceGray (g/G), neutral RGB black/grays (rg/RG), and 4-color rich black (k/K)
  // into pure single-channel CMYK Black (0 0 0 K k/K), while leaving all strings, images,
  // colored vectors, and transparency (ExtGState / SMask / ca) 100% untouched!
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
    for (let i = 0; i < str.length; i++) {
      out[i] = str.charCodeAt(i) & 0xff;
    }
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

  function fmtCmykVal(v) {
    const clamped = Math.min(1, Math.max(0, v));
    return Number(clamped.toFixed(4)).toString();
  }

  function rewritePdfContentStreamToK100(latin1, prependInitK100) {
    const len = latin1.length;
    let pos = 0;
    const outStack = [];
    let bracketDepth = 0;
    let trailingWs = "";

    while (pos < len) {
      const wsStart = pos;
      while (pos < len) {
        const c = latin1.charCodeAt(pos);
        if (isPdfWsCode(c)) {
          pos++;
        } else if (c === 37 /* '%' comment */) {
          while (pos < len && latin1.charCodeAt(pos) !== 10 && latin1.charCodeAt(pos) !== 13) {
            pos++;
          }
        } else {
          break;
        }
      }
      const wsBefore = latin1.slice(wsStart, pos);
      if (pos >= len) {
        trailingWs = wsBefore;
        break;
      }

      const ch = latin1[pos];
      let tok = null;

      if (ch === "(") {
        const start = pos++;
        let depth = 1;
        while (pos < len && depth > 0) {
          const cur = latin1[pos];
          if (cur === "\\") {
            pos += 2;
          } else {
            if (cur === "(") depth++;
            else if (cur === ")") depth--;
            pos++;
          }
        }
        tok = { type: "str", raw: latin1.slice(start, pos), wsBefore };
      } else if (ch === "<") {
        if (latin1[pos + 1] === "<") {
          tok = { type: "dictOpen", raw: "<<", wsBefore };
          pos += 2;
        } else {
          const start = pos++;
          while (pos < len && latin1[pos] !== ">") pos++;
          if (pos < len) pos++;
          tok = { type: "hex", raw: latin1.slice(start, pos), wsBefore };
        }
      } else if (ch === ">") {
        if (latin1[pos + 1] === ">") {
          tok = { type: "dictClose", raw: ">>", wsBefore };
          pos += 2;
        } else {
          tok = { type: "other", raw: ">", wsBefore };
          pos++;
        }
      } else if (ch === "[") {
        tok = { type: "arrOpen", raw: "[", wsBefore };
        pos++;
      } else if (ch === "]") {
        tok = { type: "arrClose", raw: "]", wsBefore };
        pos++;
      } else if (ch === "{" || ch === "}" || ch === ")") {
        tok = { type: "other", raw: ch, wsBefore };
        pos++;
      } else if (ch === "/") {
        const start = pos++;
        while (pos < len && !isPdfWsCode(latin1.charCodeAt(pos)) && !isPdfDelimChar(latin1[pos])) {
          pos++;
        }
        tok = { type: "name", raw: latin1.slice(start, pos), wsBefore };
      } else {
        const start = pos;
        while (pos < len && !isPdfWsCode(latin1.charCodeAt(pos)) && !isPdfDelimChar(latin1[pos])) {
          pos++;
        }
        const word = latin1.slice(start, pos);

        // Preserve Inline Images (BI ... ID <bytes> EI) completely untouched
        if (word === "BI") {
          while (pos < len) {
            if (
              latin1[pos] === "I" &&
              latin1[pos + 1] === "D" &&
              pos > start &&
              (isPdfWsCode(latin1.charCodeAt(pos - 1)) || isPdfDelimChar(latin1[pos - 1])) &&
              (pos + 2 >= len || isPdfWsCode(latin1.charCodeAt(pos + 2)))
            ) {
              pos += 3; // skip 'ID' + 1 whitespace byte
              break;
            }
            pos++;
          }
          while (pos < len) {
            if (
              latin1[pos] === "E" &&
              latin1[pos + 1] === "I" &&
              isPdfWsCode(latin1.charCodeAt(pos - 1)) &&
              (pos + 2 >= len || isPdfWsCode(latin1.charCodeAt(pos + 2)) || isPdfDelimChar(latin1[pos + 2]))
            ) {
              pos += 2;
              break;
            }
            pos++;
          }
          tok = { type: "inlineImg", raw: latin1.slice(start, pos), wsBefore };
        } else if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(word)) {
          tok = { type: "num", raw: word, wsBefore };
        } else {
          tok = { type: "op", raw: word, wsBefore };
        }
      }

      if (tok.type === "arrOpen" || tok.type === "dictOpen") bracketDepth++;
      else if (tok.type === "arrClose" || tok.type === "dictClose") bracketDepth = Math.max(0, bracketDepth - 1);

      if (bracketDepth === 0 && tok.type === "op") {
        // 1. DeviceGray (g / G) -> pure CMYK K
        if ((tok.raw === "g" || tok.raw === "G") && outStack.length >= 1 && outStack[outStack.length - 1].type === "num") {
          const t1 = outStack[outStack.length - 1];
          const v = parseFloat(t1.raw);
          if (v >= 0 && v <= 1) {
            outStack.pop();
            const kOp = tok.raw === "g" ? "k" : "K";
            outStack.push({ type: "rewritten", wsBefore: t1.wsBefore, raw: `0 0 0 ${fmtCmykVal(1 - v)} ${kOp}` });
            continue;
          }
        }
        // 2. Neutral RGB Black / Gray (rg / RG where R≈G≈B) -> pure CMYK K
        if (
          (tok.raw === "rg" || tok.raw === "RG") &&
          outStack.length >= 3 &&
          outStack[outStack.length - 1].type === "num" &&
          outStack[outStack.length - 2].type === "num" &&
          outStack[outStack.length - 3].type === "num"
        ) {
          const tR = outStack[outStack.length - 3];
          const tG = outStack[outStack.length - 2];
          const tB = outStack[outStack.length - 1];
          const r = parseFloat(tR.raw);
          const g = parseFloat(tG.raw);
          const b = parseFloat(tB.raw);
          if (r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1 && (Math.max(r, g, b) - Math.min(r, g, b) <= 0.02)) {
            outStack.pop();
            outStack.pop();
            outStack.pop();
            const kOp = tok.raw === "rg" ? "k" : "K";
            outStack.push({ type: "rewritten", wsBefore: tR.wsBefore, raw: `0 0 0 ${fmtCmykVal(1 - (r + g + b) / 3)} ${kOp}` });
            continue;
          }
        }
        // 3. Existing 4-color rich black (k / K) -> pure 100% K
        if (
          (tok.raw === "k" || tok.raw === "K") &&
          outStack.length >= 4 &&
          outStack[outStack.length - 1].type === "num" &&
          outStack[outStack.length - 2].type === "num" &&
          outStack[outStack.length - 3].type === "num" &&
          outStack[outStack.length - 4].type === "num"
        ) {
          const tC = outStack[outStack.length - 4];
          const tM = outStack[outStack.length - 3];
          const tY = outStack[outStack.length - 2];
          const tK = outStack[outStack.length - 1];
          const c = parseFloat(tC.raw), m = parseFloat(tM.raw), y = parseFloat(tY.raw), k = parseFloat(tK.raw);
          if (c >= 0.45 && m >= 0.40 && y >= 0.40 && k >= 0.80) {
            outStack.pop();
            outStack.pop();
            outStack.pop();
            outStack.pop();
            outStack.push({ type: "rewritten", wsBefore: tC.wsBefore, raw: `0 0 0 1 ${tok.raw}` });
            continue;
          }
        }
      }

      outStack.push(tok);
    }

    const prefix = prependInitK100 ? "0 0 0 1 k 0 0 0 1 K\n" : "";
    let body = "";
    for (let i = 0; i < outStack.length; i++) {
      body += outStack[i].wsBefore + outStack[i].raw;
    }
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
      const origStr = uint8ToLatin1(decodedBytes);
      const rewrittenStr = rewritePdfContentStreamToK100(origStr, prependInitK100);
      const newBytes = latin1ToUint8(rewrittenStr);
      const flated = pdfDoc.context.flateStream(newBytes);

      for (const [k, v] of rawStream.dict.entries()) {
        const ks = k.toString();
        if (ks !== "/Filter" && ks !== "/DecodeParms" && ks !== "/Length") {
          flated.dict.set(k, v);
        }
      }
      pdfDoc.context.assign(streamRef, flated);
    } catch (err) {
      console.warn("Skip stream K100 rewrite:", err);
    }
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
              fixTransparencyGroupToCmyk(xObj.dict, pdfDoc);
              convertStreamRefToK100(pdfDoc, valRef, visitedStreams, false);
              const subRes = xObj.dict.lookup(PDFLib.PDFName.of("Resources"));
              processResources(subRes);
            }
          }
        }
      }
    }

    pdfDoc.getPages().forEach((page) => {
      // 1. Switch page Transparency Blending ColorSpace from /DeviceRGB to /DeviceCMYK (PDF/X-4 standard!)
      fixTransparencyGroupToCmyk(page.node, pdfDoc);

      // 2. Rewrite page content streams so all black/gray text & vectors use 0 0 0 K k
      const contentsEntry = page.node.get(PDFLib.PDFName.of("Contents"));
      if (contentsEntry instanceof PDFLib.PDFRef) {
        convertStreamRefToK100(pdfDoc, contentsEntry, visitedStreams, true);
      } else {
        const arr = page.node.lookup(PDFLib.PDFName.of("Contents"));
        if (arr && arr instanceof PDFLib.PDFArray) {
          for (let i = 0; i < arr.size(); i++) {
            const itemRef = arr.get(i);
            convertStreamRefToK100(pdfDoc, itemRef, visitedStreams, i === 0);
          }
        }
      }

      // 3. Process nested Form XObjects if any
      const res = page.node.lookup(PDFLib.PDFName.of("Resources"));
      processResources(res);
    });
  }

  async function exportSinglePdfEntry(fileEntry) {
    const plan = computeSplitPlan(fileEntry);
    const srcDoc = await PDFLib.PDFDocument.load(fileEntry.rawBytes, { ignoreEncryption: true });

    if (state.pureBlackK100) {
      applyPureBlackK100ToDoc(srcDoc);
    }

    const outDoc = await PDFLib.PDFDocument.create();

    const srcIndices = plan.map((item) => item.srcIdx);
    const copiedPages = await outDoc.copyPages(srcDoc, srcIndices);

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
      for (const entry of state.files) {
        await exportSinglePdfEntry(entry);
      }
    } catch (err) {
      alert(t("errExportPdf") + (err && err.message ? err.message : String(err)));
    } finally {
      el.exportBtn.disabled = false;
      el.exportBtnText.textContent = prevText;
      updateUIState();
    }
  }

  // Events
  el.themeBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
  });

  el.langBtn.addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    applyLanguage();
  });

  el.dropzone.addEventListener("click", () => el.fileInput.click());
  el.addMoreBtn.addEventListener("click", () => {
    closeAllPopovers();
    el.fileInput.click();
  });

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
    closeAllPopovers();
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
      if (state.viewTab === "sequence") renderSequenceView();
    });
  });

  el.moveFirstCheck.addEventListener("change", () => {
    state.moveFirstToLast = el.moveFirstCheck.checked;
    updateUIState();
    if (state.viewTab === "sequence") renderSequenceView();
  });

  el.pureBlackCheck.addEventListener("change", () => {
    state.pureBlackK100 = el.pureBlackCheck.checked;
  });

  el.onlyLandscapeCheck.addEventListener("change", () => {
    state.onlyLandscape = el.onlyLandscapeCheck.checked;
    updateUIState();
    if (state.viewTab === "sequence") renderSequenceView();
  });

  el.bleedModeOpts.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.bleedAction = btn.getAttribute("data-value");
      el.bleedModeOpts.forEach((b) => {
        const sel = b === btn;
        b.classList.toggle("selected", sel);
        b.lastElementChild.textContent = sel ? "✓" : "";
      });
      closeAllPopovers();
      updateUIState();
      if (state.viewTab === "sequence") renderSequenceView();
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
      closeAllPopovers();
      updateUIState();
      if (state.viewTab === "sequence") renderSequenceView();
    });
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

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (state.viewTab !== "spread" || !getActiveFile()) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderActiveSpreadCanvas(), 120);
  });

  applyTheme();
  applyLanguage();
})();
