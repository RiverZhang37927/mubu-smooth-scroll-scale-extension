// ==Mubu Mind Map Smooth Pan & Zoom==
// 仅针对思维导图（.minder-container）：滚轮平移 + Ctrl/⌘+滚轮缩放 平滑化（累加 + 缓动）。
// 不修改大纲/普通页面，也不注入任何 CSS。
// 实现：拦截思维导图区域内的 wheel，把缓动后的增量以合成 wheel 重派发回 .minder-container，
//       复用其原生平移/缩放逻辑；不依赖站点打包哈希，也不访问 PIXI 内部。
(() => {
  if (window.__mubuSmoothScroll) return;
  window.__mubuSmoothScroll = true;

  // 平移状态
  let mmTgtX = 0, mmTgtY = 0, mmCurX = 0, mmCurY = 0, mmRaf = 0, mmLastX = 0, mmLastY = 0;
  // 缩放状态
  let zTgt = 0, zCur = 0, zRaf = 0, zLastX = 0, zLastY = 0;
  const EASE = 0.18;
  const getMindEl = () => document.querySelector('.minder-container');

  function overMind(x, y) {
    const mm = getMindEl();
    if (!mm) return false;
    if (document.elementsFromPoint) {
      try { return document.elementsFromPoint(x, y).some((el) => mm.contains(el)); } catch (e) { return false; }
    }
    return false;
  }

  // 复刻幕布 getScaleDelta：wheel deltaY → 缩放增量(±20 截断)
  function getScaleDelta(ev) {
    if (ev.deltaMode === 1) return 15 * ev.deltaY;
    if (ev.deltaY < 20 && ev.deltaY > -20) return ev.deltaY;
    return Math.max(Math.min(ev.deltaY, 20), -20);
  }

  function panStep() {
    const mm = getMindEl();
    if (!mm) { mmRaf = 0; return; }
    const dx = mmTgtX - mmCurX, dy = mmTgtY - mmCurY;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { mmCurX = mmTgtX; mmCurY = mmTgtY; mmRaf = 0; return; }
    const sx = dx * EASE, sy = dy * EASE;
    mmCurX += sx; mmCurY += sy;
    const ev = new WheelEvent('wheel', { deltaX: sx, deltaY: sy, bubbles: true, cancelable: true, clientX: mmLastX, clientY: mmLastY });
    ev.__mubuSynthetic = true;
    mm.dispatchEvent(ev);
    mmRaf = requestAnimationFrame(panStep);
  }

  function zoomStep() {
    const mm = getMindEl();
    if (!mm) { zRaf = 0; return; }
    const d = zTgt - zCur;
    if (Math.abs(d) < 0.05) { zCur = zTgt; zRaf = 0; return; }
    const dz = d * EASE;
    zCur += dz;
    const dpr = window.devicePixelRatio || 1;
    const ev = new WheelEvent('wheel', { deltaX: 0, deltaY: dz, ctrlKey: true, bubbles: true, cancelable: true, clientX: zLastX * dpr, clientY: zLastY * dpr });
    ev.__mubuSynthetic = true;
    mm.dispatchEvent(ev);
    zRaf = requestAnimationFrame(zoomStep);
  }

  document.addEventListener('wheel', (e) => {
    if (e.__mubuSynthetic) return;
    if (!overMind(e.clientX, e.clientY)) return; // 非思维导图区域：完全不干预
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // 平滑缩放
      zLastX = e.clientX; zLastY = e.clientY;
      zTgt += getScaleDelta(e);
      if (!zRaf) zRaf = requestAnimationFrame(zoomStep);
    } else if (!e.altKey) {
      // 平滑平移
      mmLastX = e.clientX; mmLastY = e.clientY;
      if (e.shiftKey) mmTgtX += e.deltaY;
      else { mmTgtX += e.deltaX; mmTgtY += e.deltaY; }
      if (!mmRaf) mmRaf = requestAnimationFrame(panStep);
    }
  }, { passive: false, capture: true });
})();
