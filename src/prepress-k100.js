// Prepress Pure K100 Stream Rewriter & 8-Point Preflight Inspector
window.ShibaPrepress = (function () {
  "use strict";

  const MM_TO_PT = 72.0 / 25.4;
  const KNOWN_NET_SIZES = [
    { w: 420, h: 285 }, { w: 420, h: 297 }, { w: 297, h: 210 },
    { w: 594, h: 420 }, { w: 370, h: 260 }, { w: 570, h: 210 },
    { w: 210, h: 285 }, { w: 210, h: 297 }, { w: 148.5, h: 210 }
  ];

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
    return {
      u: Math.max(0, (minX - rawCrop.x) / rawCrop.width),
      uw: Math.max(0.02, (maxX - minX) / rawCrop.width),
      v: Math.max(0, 1 - (maxY - rawCrop.y) / rawCrop.height),
      vh: Math.max(0.02, (maxY - minY) / rawCrop.height)
    };
  }

  function classifyPdfFontStyle(fontName, styleObj) {
    const raw = `${fontName || ""} ${(styleObj && styleObj.fontFamily) || ""}`;
    const bold = /bold|heavy|black|demi|semibold|extrabold|-b\b|w[6789]/i.test(raw);
    const italic = /italic|oblique/i.test(raw);
    let fontKey = "sans";
    if (/mono|consolas|courier|menlo|code/i.test(raw)) {
      fontKey = "mono";
    } else if (/kai|kaiti|stkaiti|fzkai/i.test(raw)) {
      fontKey = "kai";
    } else if (/song|simsun|stsong|fangsong|mincho|ming|times|georgia|garamond|serif/i.test(raw) && !/sans/i.test(raw)) {
      fontKey = "serif";
    }
    return { bold, italic, fontKey };
  }

  function getCssFontStack(fontKey) {
    if (fontKey === "serif") return '"Songti SC", "STSong", "Noto Serif CJK SC", "SimSun", Georgia, "Times New Roman", serif';
    if (fontKey === "kai") return '"Kaiti SC", "STKaiti", "KaiTi", serif';
    if (fontKey === "fangsong") return '"FangSong", "STFangsong", "FangSong_GB2312", "Songti SC", serif';
    if (fontKey === "round") return '"YouYuan", "STYuanti-SC-Regular", "Microsoft YaHei UI", "PingFang SC", sans-serif';
    if (fontKey === "helvetica") return 'Arial, "Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", sans-serif';
    if (fontKey === "times") return '"Times New Roman", Times, Georgia, "Songti SC", "SimSun", serif';
    if (fontKey === "mono") return '"JetBrains Mono", Consolas, "SFMono-Regular", Menlo, "Courier New", monospace';
    return '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif';
  }

  async function extractPageTextSpans(pdfJsDoc, pageOneBased) {
    const pg = await pdfJsDoc.getPage(pageOneBased);
    const vp = pg.getViewport({ scale: 1 });
    const tc = await pg.getTextContent();
    const styles = tc.styles || {};
    const spans = [];

    tc.items.forEach((item, idx) => {
      if (!item.str || !item.str.trim()) return;
      const st = styles[item.fontName] || {};
      const tx = pdfjsLib.Util.transform(vp.transform, item.transform);
      const fontH = Math.max(7, Math.hypot(tx[2], tx[3]));
      const ascent = (typeof st.ascent === "number" && st.ascent > 0.45 && st.ascent < 1.15) ? st.ascent : 0.84;
      const descent = (typeof st.descent === "number" && Math.abs(st.descent) < 0.5) ? Math.abs(st.descent) : Math.max(0.14, 1 - ascent);
      const left = tx[4];
      const baselineY = tx[5];
      const top = baselineY - fontH * ascent;
      const boxH = fontH * (ascent + descent);
      const w = Math.max(fontH * 0.55, item.width || fontH * item.str.length * 0.58);

      const u = Math.min(0.985, Math.max(0, left / vp.width));
      const v = Math.min(0.985, Math.max(0, top / vp.height));
      const fMeta = classifyPdfFontStyle(item.fontName, st);

      spans.push({
        id: `orig_${pageOneBased}_${idx}`,
        str: item.str,
        u,
        v,
        uw: Math.min(1 - u, Math.max(0.01, w / vp.width)),
        vh: Math.min(1 - v, Math.max(0.012, boxH / vp.height)),
        fontPt: Math.round(fontH * 10) / 10,
        ascent: Math.round(ascent * 1000) / 1000,
        bold: fMeta.bold,
        italic: fMeta.italic,
        fontKey: fMeta.fontKey
      });
    });
    return spans;
  }

  async function extractPdfMetadataSummary(rawBytes, doc, pdfJsDoc) {
    let pdfVersion = "1.4+";
    let isLinearized = false;
    try {
      const headLen = Math.min(rawBytes.length, 1024);
      let headStr = "";
      for (let i = 0; i < headLen; i++) headStr += String.fromCharCode(rawBytes[i]);
      const mVer = headStr.match(/%PDF-(\d+\.\d+)/);
      if (mVer) pdfVersion = mVer[1];
      if (/\/Linearized\b/.test(headStr)) isLinearized = true;
    } catch (_) {}

    function formatPdfDate(val) {
      if (!val) return "";
      if (val instanceof Date && !isNaN(val.getTime())) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}`;
      }
      const s = String(val).trim();
      const m = s.match(/^(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?/);
      if (m && m[1]) {
        const yr = m[1];
        const mo = m[2] || "01";
        const dy = m[3] || "01";
        const hr = m[4] || "00";
        const mn = m[5] || "00";
        return `${yr}-${mo}-${dy} ${hr}:${mn}`;
      }
      return s;
    }

    let info = {};
    try {
      if (pdfJsDoc && typeof pdfJsDoc.getMetadata === "function") {
        const md = await pdfJsDoc.getMetadata();
        if (md && md.info) info = md.info;
      }
    } catch (_) {}

    const pickStr = (jsVal, libGetter) => {
      if (jsVal && String(jsVal).trim()) return String(jsVal).trim();
      try {
        const v = libGetter();
        if (v && String(v).trim()) return String(v).trim();
      } catch (_) {}
      return "";
    };

    return {
      pdfVersion,
      isLinearized,
      title: pickStr(info.Title, () => doc.getTitle()),
      author: pickStr(info.Author, () => doc.getAuthor()),
      subject: pickStr(info.Subject, () => doc.getSubject()),
      keywords: pickStr(info.Keywords, () => doc.getKeywords()),
      creator: pickStr(info.Creator, () => doc.getCreator()),
      producer: pickStr(info.Producer, () => doc.getProducer()),
      creationDate: formatPdfDate(info.CreationDate || (() => { try { return doc.getCreationDate(); } catch (_) { return ""; } })()),
      modDate: formatPdfDate(info.ModDate || (() => { try { return doc.getModificationDate(); } catch (_) { return ""; } })())
    };
  }

  function decodePdfFontBaseName(rawStr) {
    let s = String(rawStr || "").replace(/^\//, "").trim();
    let isSubset = false;
    if (/^[A-Z]{6}\+/.test(s)) {
      isSubset = true;
      s = s.slice(7);
    }
    if (/#[0-9A-Fa-f]{2}/.test(s) && typeof TextDecoder !== "undefined") {
      try {
        const bytes = [];
        for (let i = 0; i < s.length; i++) {
          if (s[i] === "#" && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
            bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
            i += 2;
          } else {
            bytes.push(s.charCodeAt(i) & 0xff);
          }
        }
        const u8 = new Uint8Array(bytes);
        try {
          s = new TextDecoder("utf-8", { fatal: true }).decode(u8);
        } catch (_) {
          s = new TextDecoder("gbk").decode(u8);
        }
      } catch (_) {}
    }
    return { cleanName: s || "UnnamedFont", isSubset };
  }

  async function runPrepressPreflight(rawBytes, pdfJsDoc, origPages) {
    const doc = await PDFLib.PDFDocument.load(rawBytes, { ignoreEncryption: true });
    const pages = doc.getPages();
    const metaInfo = await extractPdfMetadataSummary(rawBytes, doc, pdfJsDoc);

    const nonK100PageIndices = new Set();
    const nonK100Locs = [];
    const lowDpiLocs = [];
    const rgbImgLocs = [];

    let rgbImageCount = 0;
    let rgbVectorPages = 0;
    let smaskCount = 0;
    let gradientCount = 0;
    let hasTrimBox = false;
    let hasBleedBox = false;

    const allFonts = new Map();
    const fontDetailsMap = new Map();
    const placedDpis = [];
    const seenImgRefs = new Set();

    function scanResFonts(resDict, pageNumOneBased, visitedFormRefs) {
      if (!resDict || !(resDict instanceof PDFLib.PDFDict)) return;
      const fontDict = resDict.lookup(PDFLib.PDFName.of("Font"));
      if (fontDict && fontDict instanceof PDFLib.PDFDict) {
        for (const [, fRef] of fontDict.entries()) {
          const fObj = doc.context.lookup(fRef);
          if (!fObj || !(fObj instanceof PDFLib.PDFDict)) continue;

          const rawBase = (fObj.get(PDFLib.PDFName.of("BaseFont")) || "").toString();
          const { cleanName, isSubset } = decodePdfFontBaseName(rawBase);
          const subTypeRaw = (fObj.get(PDFLib.PDFName.of("Subtype")) || "").toString().replace(/^\//, "") || "Font";
          let cidSubType = "";

          const encObj = fObj.get(PDFLib.PDFName.of("Encoding"));
          let encoding = "Built-in";
          if (encObj) {
            const es = encObj.toString();
            if (es.startsWith("/")) encoding = es.slice(1);
            else {
              const encDict = fObj.lookup(PDFLib.PDFName.of("Encoding"));
              if (encDict && encDict instanceof PDFLib.PDFDict) {
                const baseEnc = encDict.get(PDFLib.PDFName.of("BaseEncoding"));
                encoding = baseEnc ? baseEnc.toString().replace(/^\//, "") : "Custom";
              } else {
                encoding = "Custom";
              }
            }
          }

          let embedded = subTypeRaw === "Type3";
          let streamFormat = subTypeRaw === "Type3" ? "Type3" : "";

          let desc = fObj.lookup(PDFLib.PDFName.of("FontDescriptor"));
          if (!desc) {
            const descArr = fObj.lookup(PDFLib.PDFName.of("DescendantFonts"));
            if (descArr && descArr instanceof PDFLib.PDFArray && descArr.size() > 0) {
              const cidFont = doc.context.lookup(descArr.get(0));
              if (cidFont && cidFont instanceof PDFLib.PDFDict) {
                cidSubType = (cidFont.get(PDFLib.PDFName.of("Subtype")) || "").toString().replace(/^\//, "");
                desc = cidFont.lookup(PDFLib.PDFName.of("FontDescriptor"));
              }
            }
          }
          if (desc && desc instanceof PDFLib.PDFDict) {
            if (desc.get(PDFLib.PDFName.of("FontFile"))) {
              embedded = true;
              streamFormat = "Type1";
            } else if (desc.get(PDFLib.PDFName.of("FontFile2"))) {
              embedded = true;
              streamFormat = "TrueType";
            } else if (desc.get(PDFLib.PDFName.of("FontFile3"))) {
              embedded = true;
              streamFormat = "OpenType / CFF";
            }
          }

          const dispType = cidSubType ? `${subTypeRaw} (${cidSubType})` : subTypeRaw;
          if (!allFonts.has(cleanName) || !embedded) allFonts.set(cleanName, embedded);

          const detailKey = `${cleanName}__${dispType}__${embedded ? "1" : "0"}`;
          if (!fontDetailsMap.has(detailKey)) {
            fontDetailsMap.set(detailKey, {
              name: cleanName,
              embedded,
              isSubset,
              fontType: dispType,
              encoding,
              streamFormat,
              pages: new Set([pageNumOneBased])
            });
          } else {
            const existing = fontDetailsMap.get(detailKey);
            if (isSubset) existing.isSubset = true;
            existing.pages.add(pageNumOneBased);
          }
        }
      }

      const xObjD = resDict.lookup(PDFLib.PDFName.of("XObject"));
      if (xObjD && xObjD instanceof PDFLib.PDFDict) {
        for (const [, xRef] of xObjD.entries()) {
          if (!(xRef instanceof PDFLib.PDFRef)) continue;
          const rk = xRef.toString();
          if (visitedFormRefs.has(rk)) continue;
          visitedFormRefs.add(rk);
          const xo = doc.context.lookup(xRef);
          if (xo && xo instanceof PDFLib.PDFRawStream) {
            const sub = (xo.dict.get(PDFLib.PDFName.of("Subtype")) || "").toString();
            if (sub === "/Form") {
              scanResFonts(xo.dict.lookup(PDFLib.PDFName.of("Resources")), pageNumOneBased, visitedFormRefs);
            }
          }
        }
      }
    }

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const page = pages[pIdx];
      if (page.node.get(PDFLib.PDFName.of("TrimBox"))) hasTrimBox = true;
      if (page.node.get(PDFLib.PDFName.of("BleedBox"))) hasBleedBox = true;
      const rawCrop = page.getCropBox();
      const res = page.node.lookup(PDFLib.PDFName.of("Resources"));
      let hasRgbGroup = false;
      const grp = page.node.lookup(PDFLib.PDFName.of("Group"));
      if (grp && grp instanceof PDFLib.PDFDict) {
        const cs = grp.get(PDFLib.PDFName.of("CS"));
        if (cs && cs.toString() === "/DeviceRGB") hasRgbGroup = true;
      }

      scanResFonts(res, pIdx + 1, new Set());

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
      const pageForms = new Map();
      const xObjDict = res && res instanceof PDFLib.PDFDict ? res.lookup(PDFLib.PDFName.of("XObject")) : null;
      if (xObjDict && xObjDict instanceof PDFLib.PDFDict) {
        for (const [kName, xRef] of xObjDict.entries()) {
          const xObj = doc.context.lookup(xRef);
          if (!xObj || !(xObj instanceof PDFLib.PDFRawStream)) continue;
          const sub = (xObj.dict.get(PDFLib.PDFName.of("Subtype")) || "").toString();
          if (sub === "/Image") {
            // Skip helper soft-mask grayscale images unless drawn directly
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
          } else if (sub === "/Form") {
            pageForms.set(kName.toString(), xObj);
          }
        }
      }

      const pageImgSpans = [];
      const xObjUseCounts = new Map();

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

      function scanStreamForOps(streamLatin1, initCtm, localImagesMap, localFormsMap, insideForm, depth) {
        if (!streamLatin1 || depth > 4) return;
        const { tokens } = tokenizePdfContentStream(streamLatin1);
        let ctm = initCtm.slice();
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
            const rawName = tokens[i - 1].raw;
            const imInfo = localImagesMap.get(rawName);
            if (imInfo && imInfo.pxW > 8 && imInfo.pxH > 8) {
              const box = pdfBoxToVisualNorm(rawCrop, ctm);
              const wIn = Math.hypot(ctm[0], ctm[1]) / 72.0;
              const hIn = Math.hypot(ctm[2], ctm[3]) / 72.0;
              if (wIn > 0.05 && hIn > 0.05) {
                const effDpi = Math.round(Math.min(imInfo.pxW / wIn, imInfo.pxH / hIn));
                if (effDpi > 10 && effDpi < 20000) {
                  placedDpis.push({ pageIdx: pIdx, dpi: effDpi });
                  if (effDpi < 250) lowDpiLocs.push({ pageIdx: pIdx, ...box, dpi: effDpi, kind: "lowDpi" });
                }
              }
              if (imInfo.isRgb) rgbImgLocs.push({ pageIdx: pIdx, ...box, kind: "rgbImg" });

              if (imInfo.pxW >= 16 && imInfo.pxH >= 16 && box.uw >= 0.02 && box.vh >= 0.02) {
                const cleanKey = rawName.replace(/^\//, "");
                if (!insideForm) xObjUseCounts.set(cleanKey, (xObjUseCounts.get(cleanKey) || 0) + 1);
                pageImgSpans.push({
                  id: `img_${pIdx + 1}_${pageImgSpans.length}`,
                  xObjKey: cleanKey,
                  inForm: insideForm,
                  flipX: ctm[0] < 0,
                  flipY: ctm[3] < 0,
                  u: box.u,
                  v: box.v,
                  uw: box.uw,
                  vh: box.vh,
                  pxW: imInfo.pxW,
                  pxH: imInfo.pxH
                });
              }
            } else if (localFormsMap && localFormsMap.has(rawName)) {
              const fmStream = localFormsMap.get(rawName);
              try {
                let fmCtm = ctm.slice();
                const matArr = fmStream.dict.lookup(PDFLib.PDFName.of("Matrix"));
                if (matArr && matArr instanceof PDFLib.PDFArray && matArr.size() === 6) {
                  const m6 = [];
                  for (let k = 0; k < 6; k++) m6.push(matArr.lookup(k).asNumber());
                  fmCtm = multiplyCtm(m6, fmCtm);
                }
                const fmRes = fmStream.dict.lookup(PDFLib.PDFName.of("Resources"));
                const fmImgs = new Map();
                const fmSubForms = new Map();
                const fmXObj = fmRes && fmRes instanceof PDFLib.PDFDict ? fmRes.lookup(PDFLib.PDFName.of("XObject")) : null;
                if (fmXObj && fmXObj instanceof PDFLib.PDFDict) {
                  for (const [fk, fRef] of fmXObj.entries()) {
                    const fo = doc.context.lookup(fRef);
                    if (!fo || !(fo instanceof PDFLib.PDFRawStream)) continue;
                    const fSub = (fo.dict.get(PDFLib.PDFName.of("Subtype")) || "").toString();
                    if (fSub === "/Image") {
                      const fw = fo.dict.lookup(PDFLib.PDFName.of("Width"));
                      const fh = fo.dict.lookup(PDFLib.PDFName.of("Height"));
                      const csE = fo.dict.lookup(PDFLib.PDFName.of("ColorSpace"));
                      const csS = csE ? csE.toString() : "";
                      fmImgs.set(fk.toString(), {
                        pxW: fw && typeof fw.asNumber === "function" ? fw.asNumber() : 0,
                        pxH: fh && typeof fh.asNumber === "function" ? fh.asNumber() : 0,
                        isRgb: csS.includes("DeviceRGB") || csS.includes("/N 3")
                      });
                    } else if (fSub === "/Form") {
                      fmSubForms.set(fk.toString(), fo);
                    }
                  }
                }
                const fmDecoded = uint8ToLatin1(PDFLib.decodePDFRawStream(fmStream).decode());
                scanStreamForOps(fmDecoded, fmCtm, fmImgs, fmSubForms, true, depth + 1);
              } catch (_) {}
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

      scanStreamForOps(combinedStr, [1, 0, 0, 1, 0, 0], pageImages, pageForms, false, 0);
      pageImgSpans.forEach((sp) => {
        sp.sharedOnPage = (xObjUseCounts.get(sp.xObjKey) || 0) > 1;
      });
      if (origPages[pIdx]) {
        origPages[pIdx].imageSpans = pageImgSpans;
      }
    }

    for (const pIdx of nonK100PageIndices) {
      const spans = origPages[pIdx].textSpans || [];
      const pg = await pdfJsDoc.getPage(pIdx + 1);
      const vp = pg.getViewport({ scale: 0.42 });
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
          if (matchedOnPage >= 18) break;
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

    const fontDetails = Array.from(fontDetailsMap.values())
      .map((f) => ({
        name: f.name,
        embedded: f.embedded,
        isSubset: f.isSubset,
        fontType: f.fontType,
        encoding: f.encoding,
        streamFormat: f.streamFormat,
        pages: Array.from(f.pages).sort((a, b) => a - b)
      }))
      .sort((a, b) => {
        if (a.embedded !== b.embedded) return a.embedded ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

    return {
      isEncrypted: doc.isEncrypted,
      metaInfo,
      fontDetails,
      totalImages: seenImgRefs.size,
      hasTrimBox,
      hasBleedBox,
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

  return {
    KNOWN_NET_SIZES,
    getCssFontStack,
    extractPageTextSpans,
    runPrepressPreflight,
    applyPureBlackK100ToDoc
  };
})();
