// ==Mubu Smooth Scroll==
// 平滑滚动/平移/缩放补丁 —— 适用于 mubu.com 域名下任意网页。
//  1) CSS scroll-behavior:smooth —— 编程式滚动(目录/定位/锚点)平滑化
//  2) 大纲/普通页面 —— 滚轮「累加 + 缓动」平滑滚动(scrollTop 逐帧插值)
//  3) 思维导图 —— 滚轮平移「累加 + 缓动」：拦截原始 wheel，把缓动增量以合成 wheel
//     重派发回 .minder-container 复用其原生平移逻辑；
//     Ctrl+滚轮缩放同样「累加 + 缓动」平滑化，且缩放中心跟随光标
//     （合成事件的 offsetX/offsetY 会被按 1/devicePixelRatio 缩放，
//       故重派发时把 clientX/clientY 乘回 devicePixelRatio 以保持中心精确）。
//     不依赖站点打包哈希，也不访问 PIXI 内部，幕布更新后依然有效。
(() => {
  if (window.__mubuSmoothScroll) return;
  window.__mubuSmoothScroll = true;

  // ---------- 1) CSS ----------
  const CSS = `*, html, body { scroll-behavior: smooth !important; }`;
  function addStyle() {
    try {
      const st = document.createElement('style');
      st.setAttribute('data-mubu-smooth-scroll', '');
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    } catch (e) {}
  }
  if (document.head || document.documentElement) addStyle();
  else document.addEventListener('DOMContentLoaded', addStyle, { once: true });

  // ---------- 2) 大纲 / 普通页面 平滑滚动 ----------
  function isScrollable(el) {
    if (!el || el === document.documentElement || el === document.body) return false;
    try {
      const cs = getComputedStyle(el);
      if (!/(auto|scroll|overlay)/.test(cs.overflowY)) return false;
      return el.scrollHeight > el.clientHeight + 1;
    } catch (e) { return false; }
  }
  function findScrollable(x, y, target) {
    if (document.elementsFromPoint) {
      for (const el of document.elementsFromPoint(x, y)) if (isScrollable(el)) return el;
    }
    let el = target;
    while (el && el !== document.documentElement) { if (isScrollable(el)) return el; el = el.parentElement; }
    const se = document.scrollingElement || document.documentElement;
    if (se && se.scrollHeight > se.clientHeight + 1) return se;
    return null;
  }
  const scrollState = new WeakMap();
  function animateScroll(el) {
    const s = scrollState.get(el);
    if (!s) return;
    s.current += (s.target - s.current) * 0.18;
    if (Math.abs(s.target - s.current) < 0.5) { s.current = s.target; s.raf = 0; el.scrollTop = s.current; return; }
    el.scrollTop = s.current;
    s.raf = requestAnimationFrame(() => animateScroll(el));
  }

  // ---------- 3) 思维导图 平滑平移 + 平滑缩放 ----------
  let mmTgtX = 0, mmTgtY = 0, mmCurX = 0, mmCurY = 0, mmRaf = 0, mmLastX = 0, mmLastY = 0;
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
  // 复刻幕布 getScaleDelta：把 wheel deltaY 归一化为缩放增量(±20 截断)
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

  // ---------- 统一 wheel 处理 ----------
  document.addEventListener('wheel', (e) => {
    if (e.__mubuSynthetic) return;

    if (overMind(e.clientX, e.clientY)) {
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
      return;
    }

    // 非思维导图区域：保留浏览器缩放等手势
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // 大纲 / 普通页面
    const el = findScrollable(e.clientX, e.clientY, e.target);
    if (!el) return;
    e.preventDefault();
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 16;
    else if (e.deltaMode === 2) delta *= el.clientHeight;
    if (!delta) return;
    let s = scrollState.get(el);
    if (!s) { s = { current: el.scrollTop, target: el.scrollTop, raf: 0 }; scrollState.set(el, s); }
    s.target += delta;
    s.target = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, s.target));
    if (!s.raf) s.raf = requestAnimationFrame(() => animateScroll(el));
  }, { passive: false, capture: true });
})();
