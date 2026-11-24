// Resizable Left/Right Splitters, Organize Hover Loupe, Right Preview Pane, Mobile Drawer & Touch Pinch-Zoom
window.ShibaUX = (function () {
  "use strict";

  let loupeTimer = null;
  let loupeToken = 0;

  function hideHoverLoupe() {
    clearTimeout(loupeTimer);
    loupeToken++;
    const pop = document.getElementById("hoverLoupePopover");
    if (pop) pop.classList.add("hidden");
  }

  function scheduleHoverLoupe(cardEl, slotIdx, labelStr, getPreviewCanvasFn) {
    if (window.innerWidth <= 900) return;
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;

    clearTimeout(loupeTimer);
    const myTok = ++loupeToken;

    loupeTimer = setTimeout(async () => {
      const pop = document.getElementById("hoverLoupePopover");
      const cv = document.getElementById("hoverLoupeCanvas");
      const lbl = document.getElementById("hoverLoupeLabel");
      if (!pop || !cv || !cardEl.isConnected) return;

      const srcCv = await getPreviewCanvasFn(slotIdx);
      if (myTok !== loupeToken || !cardEl.isConnected) return;

      const maxW = 340;
      const maxH = 440;
      const sc = Math.min(maxW / Math.max(1, srcCv.width), maxH / Math.max(1, srcCv.height), 1);
      cv.width = Math.max(1, Math.round(srcCv.width * sc));
      cv.height = Math.max(1, Math.round(srcCv.height * sc));
      cv.getContext("2d").drawImage(srcCv, 0, 0, cv.width, cv.height);
      if (lbl) lbl.textContent = labelStr;

      pop.classList.remove("hidden");

      const rect = cardEl.getBoundingClientRect();
      const popW = cv.width + 20;
      const popH = cv.height + 40;
      // Place smartly to the right of card if space allows, otherwise to the left
      let left = rect.right + 14;
      if (left + popW > window.innerWidth - 16) {
        left = Math.max(12, rect.left - popW - 14);
      }
      const top = Math.max(14, Math.min(window.innerHeight - popH - 14, rect.top - 10));
      pop.style.left = `${Math.round(left)}px`;
      pop.style.top = `${Math.round(top)}px`;
    }, 180);
  }

  async function renderOrgPreviewPane(slotIdx, titleStr, metaStr, getPreviewCanvasFn) {
    const drawer = document.getElementById("orgPreviewDrawer");
    const cv = document.getElementById("orgPreviewCanvas");
    const ttl = document.getElementById("orgPreviewTitle");
    const meta = document.getElementById("orgPreviewMeta");
    if (!drawer || drawer.classList.contains("hidden") || !cv) return;

    if (ttl) ttl.textContent = titleStr;
    if (meta) meta.textContent = metaStr;

    const srcCv = await getPreviewCanvasFn(slotIdx);
    if (!srcCv) return;
    cv.width = srcCv.width;
    cv.height = srcCv.height;
    cv.getContext("2d").drawImage(srcCv, 0, 0);
  }

  function initColumnSplitters(onLayoutResize) {
    const workbench = document.querySelector(".workbench");
    const leftSplitter = document.getElementById("leftSplitter");
    const rightSplitter = document.getElementById("rightSplitter");
    if (!workbench) return;

    const savedRail = parseInt(localStorage.getItem("shibapdf_rail_w") || "272", 10);
    const savedRight = parseInt(localStorage.getItem("shibapdf_right_w") || "352", 10);
    if (savedRail >= 200 && savedRail <= 460) workbench.style.setProperty("--rail-w", `${savedRail}px`);
    if (savedRight >= 240 && savedRight <= 580) workbench.style.setProperty("--right-w", `${savedRight}px`);

    if (leftSplitter) {
      leftSplitter.addEventListener("dblclick", () => {
        workbench.style.setProperty("--rail-w", "272px");
        localStorage.setItem("shibapdf_rail_w", "272");
        if (onLayoutResize) onLayoutResize();
      });

      leftSplitter.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        leftSplitter.classList.add("dragging");
        document.body.classList.add("is-resizing-col");

        function onMove(mv) {
          const w = Math.max(200, Math.min(460, Math.round(mv.clientX)));
          workbench.style.setProperty("--rail-w", `${w}px`);
        }
        function onUp(up) {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          leftSplitter.classList.remove("dragging");
          document.body.classList.remove("is-resizing-col");
          const finalW = Math.max(200, Math.min(460, Math.round(up.clientX)));
          localStorage.setItem("shibapdf_rail_w", String(finalW));
          if (onLayoutResize) onLayoutResize();
        }
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }

    if (rightSplitter) {
      rightSplitter.addEventListener("dblclick", () => {
        workbench.style.setProperty("--right-w", "352px");
        localStorage.setItem("shibapdf_right_w", "352");
        if (onLayoutResize) onLayoutResize();
      });

      rightSplitter.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        rightSplitter.classList.add("dragging");
        document.body.classList.add("is-resizing-col");

        function onMove(mv) {
          const w = Math.max(240, Math.min(580, Math.round(window.innerWidth - mv.clientX)));
          workbench.style.setProperty("--right-w", `${w}px`);
        }
        function onUp(up) {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          rightSplitter.classList.remove("dragging");
          document.body.classList.remove("is-resizing-col");
          const finalW = Math.max(240, Math.min(580, Math.round(window.innerWidth - up.clientX)));
          localStorage.setItem("shibapdf_right_w", String(finalW));
          if (onLayoutResize) onLayoutResize();
        }
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }
  }

  function initMobileAndTouchUX(onPinchZoomFn, onOpenFileFn) {
    const leftRail = document.getElementById("leftRail");
    const backdrop = document.getElementById("mobileBackdrop");
    const menuBtn = document.getElementById("mobileMenuBtn");
    const quickOpenBtn = document.getElementById("mobileQuickOpenBtn");
    const stageVp = document.getElementById("stageViewport");

    function closeMobileRail() {
      if (leftRail) leftRail.classList.remove("mobile-open");
      if (backdrop) backdrop.classList.add("hidden");
    }

    function openMobileRail() {
      if (leftRail) leftRail.classList.add("mobile-open");
      if (backdrop) backdrop.classList.remove("hidden");
    }

    if (menuBtn) menuBtn.addEventListener("click", openMobileRail);
    if (backdrop) backdrop.addEventListener("click", closeMobileRail);
    if (quickOpenBtn && onOpenFileFn) quickOpenBtn.addEventListener("click", onOpenFileFn);

    // Auto-close mobile drawer whenever user selects a leaf tool on mobile
    document.querySelectorAll(".rail-sub-btn, #navPreflightBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.innerWidth <= 900) closeMobileRail();
      });
    });

    // Universal Two-Finger Touch Pinch-to-Zoom on Stage Viewport
    if (stageVp && onPinchZoomFn) {
      let lastDist = 0;
      stageVp.addEventListener(
        "touchstart",
        (ev) => {
          hideHoverLoupe();
          if (ev.touches.length === 2) {
            const dx = ev.touches[0].clientX - ev.touches[1].clientX;
            const dy = ev.touches[0].clientY - ev.touches[1].clientY;
            lastDist = Math.hypot(dx, dy);
          }
        },
        { passive: true }
      );

      stageVp.addEventListener(
        "touchmove",
        (ev) => {
          if (ev.touches.length === 2 && lastDist > 12) {
            ev.preventDefault();
            const dx = ev.touches[0].clientX - ev.touches[1].clientX;
            const dy = ev.touches[0].clientY - ev.touches[1].clientY;
            const curDist = Math.hypot(dx, dy);
            const ratio = curDist / lastDist;
            if (Math.abs(ratio - 1) > 0.015) {
              const midX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
              const midY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
              onPinchZoomFn(ratio, midX, midY);
              lastDist = curDist;
            }
          }
        },
        { passive: false }
      );

      stageVp.addEventListener("touchend", () => {
        lastDist = 0;
      });
    }

    window.addEventListener("scroll", hideHoverLoupe, true);
    window.addEventListener("wheel", hideHoverLoupe, { passive: true });
    window.addEventListener("pointerdown", hideHoverLoupe, { passive: true });
  }

  return {
    hideHoverLoupe,
    scheduleHoverLoupe,
    renderOrgPreviewPane,
    initColumnSplitters,
    initMobileAndTouchUX
  };
})();
