// Maximized Realistic 3D Catalog Flipbook Showcase Player (v2.0)
// Supports 3D Real-World Scenes (Studio Spotlight, Walnut Desk, Gallery Plinth) + 2D Cinema Max,
// Interactive Page-Edge Drag Flip, Camera Orbit, Auto-Play Presentation, Smart Spread Split & Paper Flip Audio
window.ShibaFlipbook = (function () {
  "use strict";

  let isOpen = false;
  let units = []; // Logical single pages built from loaded slots
  let leaves = []; // [{ frontUnitIdx, backUnitIdx }]
  let turnedCount = 0; // 0 = closed front cover, 1..leaves.length-1 = open spread, leaves.length = closed back cover
  let sceneMode = localStorage.getItem("shibapdf_fb_scene") || "studio3d"; // 'studio3d' | 'wood3d' | 'marble3d' | 'flatmax'
  let autoSplitSpreads = true;
  let spreadFirstBackFront = true;
  let soundOn = localStorage.getItem("shibapdf_fb_sound") !== "0";

  // 3D Camera Orbit & Zoom
  let camPitch = 25;
  let camYaw = -7;
  let camZoom = 1.0;

  // Live Flip Animation / Interactive Drag State
  let animFrame = null;
  let activeFlip = null; // { leafIdx, dir: 1|-1, p: 0..1, targetP: 0|1, dragging: bool, startX: number }
  let autoPlayTimer = null;
  let isPlaying = false;
  let playIntervalMs = 3200;

  // Rendered page bitmap cache (unitIdx -> dataUrl)
  let pageImgCache = new Map();
  let renderUnitFn = null;
  let getSlotsInfoFn = null;
  let tFn = (k) => k;
  let audioCtx = null;

  const SCENE_DEFAULTS = {
    studio3d: { pitch: 25, yaw: -7, zoom: 1.0 },
    wood3d: { pitch: 28, yaw: -9, zoom: 1.0 },
    marble3d: { pitch: 23, yaw: 6, zoom: 1.0 },
    flatmax: { pitch: 0, yaw: 0, zoom: 1.0 }
  };

  function playPaperRustle(durationSec) {
    if (!soundOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const dur = Math.max(0.14, Math.min(0.42, durationSec || 0.24));
      const sampleRate = audioCtx.sampleRate;
      const len = Math.floor(sampleRate * dur);
      const buf = audioCtx.createBuffer(1, len, sampleRate);
      const data = buf.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.950 * b2 + white * 0.048;
        const t = i / len;
        const env = Math.sin(t * Math.PI) * Math.pow(1 - t * 0.55, 1.4);
        data[i] = (b0 + b1 + b2 + white * 0.08) * env * 0.28;
      }

      const src = audioCtx.createBufferSource();
      src.buffer = buf;

      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1350, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(680, audioCtx.currentTime + dur);
      filter.Q.value = 0.85;

      const gain = audioCtx.createGain();
      gain.gain.value = 0.22;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      src.start();
    } catch (_) {}
  }

  function dom() {
    return {
      modal: document.getElementById("flipbookModal"),
      stage: document.getElementById("fbStage"),
      world: document.getElementById("fbWorld"),
      tableSurface: document.getElementById("fbTableSurface"),
      bookRig: document.getElementById("fbBookRig"),
      bookShadow: document.getElementById("fbBookShadow"),
      stackLeft: document.getElementById("fbStackLeft"),
      stackRight: document.getElementById("fbStackRight"),
      leftPage: document.getElementById("fbLeftPage"),
      leftImg: document.getElementById("fbLeftImg"),
      leftShade: document.getElementById("fbLeftShade"),
      leftNum: document.getElementById("fbLeftNum"),
      rightPage: document.getElementById("fbRightPage"),
      rightImg: document.getElementById("fbRightImg"),
      rightShade: document.getElementById("fbRightShade"),
      rightNum: document.getElementById("fbRightNum"),
      flipLeaf: document.getElementById("fbFlipLeaf"),
      flipFrontImg: document.getElementById("fbFlipFrontImg"),
      flipFrontLight: document.getElementById("fbFlipFrontLight"),
      flipFrontNum: document.getElementById("fbFlipFrontNum"),
      flipBackImg: document.getElementById("fbFlipBackImg"),
      flipBackLight: document.getElementById("fbFlipBackLight"),
      flipBackNum: document.getElementById("fbFlipBackNum"),
      spineCrease: document.getElementById("fbSpineCrease"),
      sceneBtns: Array.from(document.querySelectorAll(".fb-scene-btn")),
      splitBtn: document.getElementById("fbSplitToggleBtn"),
      resetCamBtn: document.getElementById("fbResetCamBtn"),
      soundBtn: document.getElementById("fbSoundBtn"),
      soundOnIcon: document.getElementById("fbSoundOnIcon"),
      soundOffIcon: document.getElementById("fbSoundOffIcon"),
      fullBtn: document.getElementById("fbFullscreenBtn"),
      closeBtn: document.getElementById("fbCloseBtn"),
      prevBtn: document.getElementById("fbPrevBtn"),
      nextBtn: document.getElementById("fbNextBtn"),
      playBtn: document.getElementById("fbPlayBtn"),
      playIcon: document.getElementById("fbPlayIcon"),
      pauseIcon: document.getElementById("fbPauseIcon"),
      playText: document.getElementById("fbPlayText"),
      speedSelect: document.getElementById("fbSpeedSelect"),
      slider: document.getElementById("fbSlider"),
      pageLabel: document.getElementById("fbPageLabel"),
      orbitHint: document.getElementById("fbOrbitHint")
    };
  }

  function rebuildBookStructure() {
    if (!getSlotsInfoFn || !window.ShibaImpose) return;
    const info = getSlotsInfoFn();
    if (!info || !info.slots || !info.slots.length) {
      units = [];
      leaves = [];
      return;
    }

    const built = window.ShibaImpose.buildLogicalUnits(info.slots, info.getSlotSizePt, {
      autoSplitSpreads,
      spreadFirstBackFront,
      spreadBleedMm: 0
    });
    units = built.units;

    const d = dom();
    if (d.splitBtn) {
      d.splitBtn.classList.toggle("hidden", !built.hasAnySpread);
      d.splitBtn.classList.toggle("active", autoSplitSpreads);
    }

    leaves = [];
    for (let i = 0; i < units.length; i += 2) {
      leaves.push({
        frontUnitIdx: i,
        backUnitIdx: i + 1 < units.length ? i + 1 : null
      });
    }
    if (turnedCount > leaves.length) turnedCount = 0;
  }

  function computePageDimensionsPx() {
    const u0 = units[0] || { wPt: 595, hPt: 842 };
    const aspect = Math.max(0.35, Math.min(2.6, u0.wPt / Math.max(1, u0.hPt)));
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const is3d = sceneMode !== "flatmax";

    // Maximize display area while keeping room for 3D perspective swing & ultra-compact HUD
    const maxSpreadW = vw * (is3d ? 0.84 : 0.92);
    const maxPageH = vh * (is3d ? 0.78 : 0.86);

    let pageH = maxPageH;
    let pageW = pageH * aspect;
    if (pageW * 2 > maxSpreadW) {
      pageW = maxSpreadW / 2;
      pageH = pageW / aspect;
    }
    return {
      pageW: Math.max(140, Math.round(pageW)),
      pageH: Math.max(180, Math.round(pageH))
    };
  }

  async function ensureUnitImage(unitIdx, targetPxW) {
    if (unitIdx === null || unitIdx === undefined || !units[unitIdx]) return "";
    if (pageImgCache.has(unitIdx)) return pageImgCache.get(unitIdx);
    if (!renderUnitFn) return "";

    const cv = await renderUnitFn(units[unitIdx], Math.max(900, Math.round(targetPxW * 2.1)));
    if (!cv) return "";
    const url = cv.toDataURL("image/jpeg", 0.92);
    pageImgCache.set(unitIdx, url);
    return url;
  }

  function preloadNearbyUnits(centerLeafIdx, pageW) {
    const indices = new Set();
    for (let l = Math.max(0, centerLeafIdx - 2); l <= Math.min(leaves.length - 1, centerLeafIdx + 2); l++) {
      const lf = leaves[l];
      if (lf.frontUnitIdx !== null) indices.add(lf.frontUnitIdx);
      if (lf.backUnitIdx !== null) indices.add(lf.backUnitIdx);
    }
    indices.forEach((uIdx) => {
      ensureUnitImage(uIdx, pageW);
    });
  }

  function setImgOrBlank(imgEl, numEl, unitIdx, pageW) {
    if (!imgEl) return;
    if (unitIdx === null || unitIdx === undefined || !units[unitIdx]) {
      imgEl.classList.add("hidden");
      imgEl.removeAttribute("src");
      if (numEl) numEl.textContent = "";
      return;
    }
    if (numEl) numEl.textContent = `${unitIdx + 1}`;
    const cached = pageImgCache.get(unitIdx);
    if (cached) {
      imgEl.src = cached;
      imgEl.classList.remove("hidden");
    } else {
      imgEl.classList.add("hidden");
      ensureUnitImage(unitIdx, pageW).then((url) => {
        if (url && imgEl.dataset.wantUnit === String(unitIdx)) {
          imgEl.src = url;
          imgEl.classList.remove("hidden");
        }
      });
    }
    imgEl.dataset.wantUnit = String(unitIdx);
  }

  function updateWorldTransform() {
    const d = dom();
    if (!d.world || !d.bookRig || !units.length) return;

    const { pageW, pageH } = computePageDimensionsPx();
    const spreadW = pageW * 2;
    d.bookRig.style.width = `${spreadW}px`;
    d.bookRig.style.height = `${pageH}px`;

    // Center closed cover (turnedCount === 0 shifts left by pageW/2; turnedCount === leaves.length shifts right by pageW/2)
    let effTurned = turnedCount;
    if (activeFlip) {
      effTurned = activeFlip.dir === 1 ? turnedCount + activeFlip.p : turnedCount - activeFlip.p;
    }
    let centerShiftX = 0;
    if (leaves.length >= 1) {
      if (effTurned < 1) {
        centerShiftX = -pageW * 0.5 * (1 - effTurned);
      } else if (effTurned > leaves.length - 1 && leaves[leaves.length - 1].backUnitIdx !== null) {
        const tailP = effTurned - (leaves.length - 1);
        centerShiftX = pageW * 0.5 * Math.max(0, Math.min(1, tailP));
      } else if (leaves.length === 1 && leaves[0].backUnitIdx === null && effTurned >= 1) {
        centerShiftX = pageW * 0.5;
      }
    }

    const is3d = sceneMode !== "flatmax";
    const pitch = is3d ? camPitch : 0;
    const yaw = is3d ? camYaw : 0;

    d.world.style.transform = `scale(${camZoom.toFixed(3)}) rotateX(${pitch.toFixed(2)}deg) rotateZ(${yaw.toFixed(2)}deg)`;
    d.bookRig.style.transform = `translate3d(${centerShiftX.toFixed(1)}px, 0px, ${is3d ? 10 : 0}px)`;

    if (d.tableSurface) {
      d.tableSurface.classList.toggle("hidden", !is3d);
    }

    // Dynamic 3D Paper-Stack Thickness on Left & Right Fore-Edges
    const leftLeaves = activeFlip
      ? (activeFlip.dir === 1 ? turnedCount : Math.max(0, turnedCount - 1))
      : turnedCount;
    const rightLeaves = activeFlip
      ? (activeFlip.dir === 1 ? Math.max(0, leaves.length - turnedCount - 1) : Math.max(0, leaves.length - turnedCount))
      : Math.max(0, leaves.length - turnedCount);

    const maxThickPx = Math.min(16, Math.max(4, leaves.length * 1.4));
    const leftThick = leftLeaves > 0 ? Math.max(2, (leftLeaves / Math.max(1, leaves.length)) * maxThickPx) : 0;
    const rightThick = rightLeaves > 0 ? Math.max(2, (rightLeaves / Math.max(1, leaves.length)) * maxThickPx) : 0;

    if (d.stackLeft) {
      d.stackLeft.style.display = leftLeaves > 0 ? "block" : "none";
      d.stackLeft.style.width = `${leftThick.toFixed(1)}px`;
      d.stackLeft.style.left = `${(-leftThick).toFixed(1)}px`;
    }
    if (d.stackRight) {
      d.stackRight.style.display = rightLeaves > 0 ? "block" : "none";
      d.stackRight.style.width = `${rightThick.toFixed(1)}px`;
      d.stackRight.style.right = `${(-rightThick).toFixed(1)}px`;
    }
    if (d.spineCrease) {
      const showSpine = leftLeaves > 0 && rightLeaves > 0 || Boolean(activeFlip);
      d.spineCrease.style.opacity = showSpine ? "1" : "0";
    }
    if (d.bookShadow) {
      const leftBound = leftLeaves > 0 || (activeFlip && activeFlip.p > 0.15) ? 0 : 50;
      const rightBound = rightLeaves > 0 || (activeFlip && activeFlip.p < 0.85) ? 100 : 50;
      d.bookShadow.style.left = `${leftBound}%`;
      d.bookShadow.style.width = `${Math.max(50, rightBound - leftBound)}%`;
    }
  }

  function renderBookState() {
    if (!isOpen) return;
    const d = dom();
    if (!d.modal || !units.length) return;

    d.modal.setAttribute("data-fb-scene", sceneMode);
    d.sceneBtns.forEach((b) => b.classList.toggle("active", b.dataset.scene === sceneMode));
    if (d.orbitHint) d.orbitHint.classList.toggle("hidden", sceneMode === "flatmax");
    if (d.soundOnIcon && d.soundOffIcon) {
      d.soundOnIcon.classList.toggle("hidden", !soundOn);
      d.soundOffIcon.classList.toggle("hidden", soundOn);
    }

    const { pageW } = computePageDimensionsPx();

    // Determine visible static left unit & static right unit
    let staticLeftLeafIdx = turnedCount - 1;
    let staticRightLeafIdx = turnedCount;

    if (activeFlip) {
      if (activeFlip.dir === 1) {
        // Turning leaf `turnedCount` from Right (0 deg) -> Left (-180 deg)
        staticLeftLeafIdx = turnedCount - 1;
        staticRightLeafIdx = turnedCount + 1;
      } else {
        // Turning leaf `turnedCount - 1` from Left (-180 deg) -> Right (0 deg)
        staticLeftLeafIdx = turnedCount - 2;
        staticRightLeafIdx = turnedCount;
      }
    }

    const hasLeftLeaf = staticLeftLeafIdx >= 0 && staticLeftLeafIdx < leaves.length;
    const hasRightLeaf = staticRightLeafIdx >= 0 && staticRightLeafIdx < leaves.length;

    d.leftPage.classList.toggle("empty-half", !hasLeftLeaf);
    d.rightPage.classList.toggle("empty-half", !hasRightLeaf);

    if (hasLeftLeaf) {
      setImgOrBlank(d.leftImg, d.leftNum, leaves[staticLeftLeafIdx].backUnitIdx, pageW);
    } else {
      setImgOrBlank(d.leftImg, d.leftNum, null, pageW);
    }

    if (hasRightLeaf) {
      setImgOrBlank(d.rightImg, d.rightNum, leaves[staticRightLeafIdx].frontUnitIdx, pageW);
    } else {
      setImgOrBlank(d.rightImg, d.rightNum, null, pageW);
    }

    // Render active 3D turning leaf + dynamic cylindrical curl lighting & cast shadows
    if (activeFlip && leaves[activeFlip.leafIdx]) {
      const lf = leaves[activeFlip.leafIdx];
      d.flipLeaf.classList.remove("hidden");
      setImgOrBlank(d.flipFrontImg, d.flipFrontNum, lf.frontUnitIdx, pageW);
      setImgOrBlank(d.flipBackImg, d.flipBackNum, lf.backUnitIdx, pageW);

      const p = activeFlip.dir === 1 ? activeFlip.p : 1 - activeFlip.p; // 0 = flat on right, 1 = flat on left
      const deg = -p * 180;
      const liftZ = Math.sin(p * Math.PI) * 3.5;
      d.flipLeaf.style.transform = `translateZ(${liftZ.toFixed(2)}px) rotateY(${deg.toFixed(2)}deg)`;

      // Dynamic curvature specular highlight & spine shadow on front & back faces
      const sinP = Math.sin(p * Math.PI);
      const sheenPos = Math.round(18 + p * 68);
      d.flipFrontLight.style.background = `linear-gradient(90deg, rgba(0,0,0,${(0.22 * sinP).toFixed(3)}) 0%, rgba(255,255,255,${(0.28 * sinP).toFixed(3)}) ${sheenPos}%, rgba(0,0,0,${(0.08 * sinP).toFixed(3)}) 100%)`;
      d.flipBackLight.style.background = `linear-gradient(270deg, rgba(0,0,0,${(0.22 * sinP).toFixed(3)}) 0%, rgba(255,255,255,${(0.26 * sinP).toFixed(3)}) ${100 - sheenPos}%, rgba(0,0,0,${(0.08 * sinP).toFixed(3)}) 100%)`;

      // Sweeping cast drop-shadow onto underlying right & left pages
      if (p < 0.52 && hasRightLeaf) {
        const reach = Math.round((0.52 - p) * 165);
        d.rightShade.style.opacity = String((sinP * 0.48).toFixed(3));
        d.rightShade.style.background = `linear-gradient(90deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.16) ${Math.max(12, reach * 0.55)}%, rgba(0,0,0,0) ${Math.max(22, reach)}%)`;
      } else {
        d.rightShade.style.opacity = "0";
      }

      if (p > 0.48 && hasLeftLeaf) {
        const reach = Math.round((p - 0.48) * 165);
        d.leftShade.style.opacity = String((sinP * 0.48).toFixed(3));
        d.leftShade.style.background = `linear-gradient(270deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.16) ${Math.max(12, reach * 0.55)}%, rgba(0,0,0,0) ${Math.max(22, reach)}%)`;
      } else {
        d.leftShade.style.opacity = "0";
      }
    } else {
      d.flipLeaf.classList.add("hidden");
      d.leftShade.style.opacity = "0";
      d.rightShade.style.opacity = "0";
    }

    updateWorldTransform();
    preloadNearbyUnits(turnedCount, pageW);

    // Update HUD Scrubber & Page Indicator
    if (d.slider) {
      d.slider.max = String(leaves.length);
      d.slider.value = String(turnedCount);
    }
    if (d.prevBtn) d.prevBtn.disabled = turnedCount <= 0 && !activeFlip;
    if (d.nextBtn) d.nextBtn.disabled = turnedCount >= leaves.length && !activeFlip;

    if (d.pageLabel) {
      const totalP = units.length;
      if (turnedCount === 0) {
        d.pageLabel.textContent = `P1 / ${totalP}`;
      } else if (turnedCount >= leaves.length) {
        const lastLf = leaves[leaves.length - 1];
        const backP = lastLf && lastLf.backUnitIdx !== null ? lastLf.backUnitIdx + 1 : totalP;
        d.pageLabel.textContent = `${backP <= totalP ? "P" + backP : "End"} / ${totalP}`;
      } else {
        const pL = leaves[turnedCount - 1].backUnitIdx !== null ? `P${leaves[turnedCount - 1].backUnitIdx + 1}` : "—";
        const pR = leaves[turnedCount].frontUnitIdx !== null ? `P${leaves[turnedCount].frontUnitIdx + 1}` : "—";
        d.pageLabel.textContent = `${pL} - ${pR} / ${totalP}`;
      }
    }
  }

  function stepFlipAnimation() {
    if (!activeFlip || activeFlip.dragging) return;
    const speed = 0.085;
    const diff = activeFlip.targetP - activeFlip.p;
    if (Math.abs(diff) < 0.008) {
      const completed = activeFlip.targetP === 1;
      const dir = activeFlip.dir;
      activeFlip = null;
      if (completed) {
        turnedCount = Math.max(0, Math.min(leaves.length, turnedCount + dir));
      }
      renderBookState();
      return;
    }
    // Smooth ease-out cubic step
    activeFlip.p += diff * 0.19 + Math.sign(diff) * speed * 0.22;
    activeFlip.p = Math.max(0, Math.min(1, activeFlip.p));
    renderBookState();
    animFrame = requestAnimationFrame(stepFlipAnimation);
  }

  function flipNext() {
    if (!leaves.length) return false;
    if (activeFlip && !activeFlip.dragging) {
      // Fast-forward active flip cleanly if user clicks rapidly
      cancelAnimationFrame(animFrame);
      if (activeFlip.targetP === 1) {
        turnedCount = Math.max(0, Math.min(leaves.length, turnedCount + activeFlip.dir));
      }
      activeFlip = null;
    }
    if (turnedCount >= leaves.length) return false;
    activeFlip = { leafIdx: turnedCount, dir: 1, p: 0.01, targetP: 1, dragging: false };
    playPaperRustle(0.24);
    cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(stepFlipAnimation);
    return true;
  }

  function flipPrev() {
    if (!leaves.length) return false;
    if (activeFlip && !activeFlip.dragging) {
      cancelAnimationFrame(animFrame);
      if (activeFlip.targetP === 1) {
        turnedCount = Math.max(0, Math.min(leaves.length, turnedCount + activeFlip.dir));
      }
      activeFlip = null;
    }
    if (turnedCount <= 0) return false;
    activeFlip = { leafIdx: turnedCount - 1, dir: -1, p: 0.01, targetP: 1, dragging: false };
    playPaperRustle(0.24);
    cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(stepFlipAnimation);
    return true;
  }

  function stopAutoPlay() {
    isPlaying = false;
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
    const d = dom();
    if (d.playBtn) d.playBtn.classList.remove("active");
    if (d.playIcon) d.playIcon.classList.remove("hidden");
    if (d.pauseIcon) d.pauseIcon.classList.add("hidden");
    if (d.playText) d.playText.textContent = tFn("fbAutoPlay");
  }

  function startAutoPlay() {
    stopAutoPlay();
    isPlaying = true;
    const d = dom();
    if (d.playBtn) d.playBtn.classList.add("active");
    if (d.playIcon) d.playIcon.classList.add("hidden");
    if (d.pauseIcon) d.pauseIcon.classList.remove("hidden");
    if (d.playText) d.playText.textContent = tFn("fbPausePlay");

    autoPlayTimer = setInterval(() => {
      if (!isOpen) {
        stopAutoPlay();
        return;
      }
      if (turnedCount >= leaves.length) {
        turnedCount = 0;
        renderBookState();
        playPaperRustle(0.2);
      } else {
        flipNext();
      }
    }, playIntervalMs);
  }

  function setScene(mode) {
    sceneMode = SCENE_DEFAULTS[mode] ? mode : "studio3d";
    localStorage.setItem("shibapdf_fb_scene", sceneMode);
    const preset = SCENE_DEFAULTS[sceneMode];
    camPitch = preset.pitch;
    camYaw = preset.yaw;
    camZoom = preset.zoom;
    renderBookState();
  }

  function open(initialSlotIdx, autoStartPlay) {
    const d = dom();
    if (!d.modal) return;
    pageImgCache.clear();
    rebuildBookStructure();
    if (!units.length) return;

    // Jump to the spread containing initialSlotIdx if provided
    turnedCount = 0;
    if (typeof initialSlotIdx === "number" && initialSlotIdx > 0) {
      const uIdx = units.findIndex((u) => u.slotIdx === initialSlotIdx);
      if (uIdx > 0) turnedCount = Math.min(leaves.length, Math.ceil(uIdx / 2));
    }

    const preset = SCENE_DEFAULTS[sceneMode] || SCENE_DEFAULTS.studio3d;
    camPitch = preset.pitch;
    camYaw = preset.yaw;
    camZoom = preset.zoom;

    isOpen = true;
    d.modal.classList.remove("hidden");
    renderBookState();
    if (autoStartPlay) startAutoPlay();
  }

  function close() {
    stopAutoPlay();
    cancelAnimationFrame(animFrame);
    activeFlip = null;
    isOpen = false;
    const d = dom();
    if (d.modal) d.modal.classList.add("hidden");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function init(opts) {
    renderUnitFn = opts.renderUnitHiRes;
    getSlotsInfoFn = opts.getSlotsInfo;
    if (opts.t) tFn = opts.t;

    const d = dom();
    if (!d.modal) return;

    d.closeBtn.addEventListener("click", close);
    d.prevBtn.addEventListener("click", () => { stopAutoPlay(); flipPrev(); });
    d.nextBtn.addEventListener("click", () => { stopAutoPlay(); flipNext(); });

    d.playBtn.addEventListener("click", () => {
      if (isPlaying) stopAutoPlay();
      else startAutoPlay();
    });

    if (d.speedSelect) {
      d.speedSelect.addEventListener("change", () => {
        playIntervalMs = Number(d.speedSelect.value) || 3200;
        if (isPlaying) startAutoPlay();
      });
    }

    d.slider.addEventListener("input", () => {
      stopAutoPlay();
      cancelAnimationFrame(animFrame);
      activeFlip = null;
      turnedCount = Math.max(0, Math.min(leaves.length, parseInt(d.slider.value, 10) || 0));
      renderBookState();
    });

    d.sceneBtns.forEach((btn) => {
      btn.addEventListener("click", () => setScene(btn.dataset.scene));
    });

    if (d.splitBtn) {
      d.splitBtn.addEventListener("click", () => {
        autoSplitSpreads = !autoSplitSpreads;
        pageImgCache.clear();
        turnedCount = 0;
        rebuildBookStructure();
        renderBookState();
      });
    }

    if (d.resetCamBtn) {
      d.resetCamBtn.addEventListener("click", () => {
        const preset = SCENE_DEFAULTS[sceneMode] || SCENE_DEFAULTS.studio3d;
        camPitch = preset.pitch;
        camYaw = preset.yaw;
        camZoom = 1.0;
        updateWorldTransform();
      });
    }

    if (d.soundBtn) {
      d.soundBtn.addEventListener("click", () => {
        soundOn = !soundOn;
        localStorage.setItem("shibapdf_fb_sound", soundOn ? "1" : "0");
        renderBookState();
      });
    }

    if (d.fullBtn) {
      d.fullBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          d.modal.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Interactive Drag-to-Flip on Left/Right Book Pages & Background 3D Camera Orbit!
    function bindPageInteractiveFlip(pageEl, dir) {
      pageEl.addEventListener("pointerdown", (ev) => {
        if (ev.button !== 0) return;
        if (dir === 1 && turnedCount >= leaves.length) return;
        if (dir === -1 && turnedCount <= 0) return;
        if (pageEl.classList.contains("empty-half")) return;

        ev.preventDefault();
        ev.stopPropagation();
        stopAutoPlay();
        cancelAnimationFrame(animFrame);

        const { pageW } = computePageDimensionsPx();
        const spanPx = Math.max(160, pageW * 1.75);
        const startX = ev.clientX;
        let movedPx = 0;

        activeFlip = {
          leafIdx: dir === 1 ? turnedCount : turnedCount - 1,
          dir,
          p: 0.005,
          targetP: 0,
          dragging: true,
          startX
        };
        renderBookState();

        function onMove(mv) {
          const dx = mv.clientX - startX;
          movedPx = Math.max(movedPx, Math.abs(dx));
          const rawP = dir === 1 ? -dx / spanPx : dx / spanPx;
          activeFlip.p = Math.max(0.002, Math.min(0.998, rawP));
          renderBookState();
        }

        function onUp() {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          if (!activeFlip) return;
          activeFlip.dragging = false;
          // Either quick click (< 7px drag) or dragged past 26% completes the turn!
          if (movedPx < 7 || activeFlip.p > 0.26) {
            activeFlip.targetP = 1;
            playPaperRustle(0.22);
          } else {
            activeFlip.targetP = 0;
          }
          cancelAnimationFrame(animFrame);
          animFrame = requestAnimationFrame(stepFlipAnimation);
        }

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }

    bindPageInteractiveFlip(d.rightPage, 1);
    bindPageInteractiveFlip(d.leftPage, -1);

    // Dragging on 3D Stage Background Orbits the 3D Camera Angle Smoothly!
    d.stage.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0 && ev.button !== 2) return;
      if (ev.target.closest("#fbBookRig")) return;
      if (sceneMode === "flatmax") return;

      ev.preventDefault();
      const sx = ev.clientX;
      const sy = ev.clientY;
      const p0 = camPitch;
      const y0 = camYaw;

      function onMove(mv) {
        const dx = mv.clientX - sx;
        const dy = mv.clientY - sy;
        camYaw = Math.max(-38, Math.min(38, y0 - dx * 0.16));
        camPitch = Math.max(5, Math.min(54, p0 - dy * 0.16));
        updateWorldTransform();
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });

    // Wheel: Ctrl+Wheel zooms camera; plain Wheel flips pages smoothly (with cooldown)
    let lastWheelFlip = 0;
    d.stage.addEventListener("wheel", (ev) => {
      if (!isOpen) return;
      ev.preventDefault();
      if (ev.ctrlKey || ev.metaKey) {
        const factor = ev.deltaY < 0 ? 1.07 : 0.935;
        camZoom = Math.max(0.62, Math.min(2.25, camZoom * factor));
        updateWorldTransform();
        return;
      }
      const now = Date.now();
      if (now - lastWheelFlip < 340) return;
      if (Math.abs(ev.deltaY) > 16 || Math.abs(ev.deltaX) > 16) {
        lastWheelFlip = now;
        stopAutoPlay();
        if (ev.deltaY > 0 || ev.deltaX > 0) flipNext();
        else flipPrev();
      }
    }, { passive: false });

    window.addEventListener("resize", () => {
      if (isOpen) renderBookState();
    });

    window.addEventListener("keydown", (ev) => {
      if (!isOpen) return;
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        close();
      } else if (ev.key === "ArrowRight" || ev.key === "PageDown") {
        ev.preventDefault();
        stopAutoPlay();
        flipNext();
      } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
        ev.preventDefault();
        stopAutoPlay();
        flipPrev();
      } else if (ev.key === " ") {
        ev.preventDefault();
        if (isPlaying) stopAutoPlay();
        else startAutoPlay();
      }
    }, true);
  }

  return {
    init,
    open,
    close,
    isOpen: () => isOpen,
    refreshLabels: () => {
      if (!isPlaying) {
        const d = dom();
        if (d.playText) d.playText.textContent = tFn("fbAutoPlay");
      }
    }
  };
})();
