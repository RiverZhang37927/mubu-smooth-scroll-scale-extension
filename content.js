// ==Mubu Patch (MAIN world) v1.2 ==
// 1) 全局字体：由扩展弹窗选择，经 <html data-mubu-font-family> 传入主世界
//    - DOM 文本/UI：注入 CSS font-family
//    - 思维导图画布文字：patch CanvasRenderingContext2D.prototype.font
// 2) 思维导图：滚轮平移 + Ctrl/⌘+滚轮缩放 平滑化（累加 + 缓动）
(() => {
  if (window.__mubuPatch) return;
  window.__mubuPatch = true;

  var ROOT_ATTR = 'data-mubu-font-family';
  var DEFAULT_FONT = 'Noto Serif SC';
  var STYLE_ID = 'mubu-font-override';

  var fontFamily = DEFAULT_FONT;
  var styleEl = null;
  var mo = null;

  function readAttr() {
    try {
      var root = document.documentElement;
      if (!root) return null;
      return root.getAttribute(ROOT_ATTR);
    } catch (e) { return null; }
  }

  // 属性缺失 => 用默认字体；属性为空字符串 => 不修改字体
  function resolveFont() {
    var v = readAttr();
    return (v === null || v === undefined) ? DEFAULT_FONT : String(v);
  }

  function quoteFamily(name) {
    return '"' + String(name).replace(/["\\]/g, '\\$&') + '"';
  }

  function fontStack(name) {
    if (!name) return '';
    var list = [name, 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'SimSun'];
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var k = String(list[i]).toLowerCase();
      if (seen[k]) continue;
      seen[k] = 1;
      out.push(quoteFamily(list[i]));
    }
    out.push('serif');
    return out.join(', ');
  }

  function applyCss() {
    try {
      var stack = fontStack(fontFamily);
      if (!stack) {
        if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        styleEl = null;
        return;
      }
      var host = document.head || document.documentElement;
      if (!host) return;
      var css = 'html, body, * { font-family: ' + stack + ' !important; }';
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
      }
      if (styleEl.textContent !== css) styleEl.textContent = css;
      if (styleEl.parentNode !== host) host.appendChild(styleEl);
    } catch (e) {}
  }

  // ---------- 思维导图画布文字字体 ----------
  function patchCanvasFont() {
    try {
      var proto = CanvasRenderingContext2D.prototype;
      var desc = Object.getOwnPropertyDescriptor(proto, 'font');
      if (!desc || !desc.set) return;
      Object.defineProperty(proto, 'font', {
        configurable: true,
        enumerable: desc.enumerable,
        get: desc.get,
        set: function (value) {
          try {
            if (fontFamily && typeof value === 'string' && value) {
              value = value.replace(
                /(\d+(?:\.\d+)?(?:px|pt|em|rem|%|vh|vw))(?:\s*\/\s*[^ ]+)?\s+.*$/,
                function (m, size) { return size + ' ' + quoteFamily(fontFamily) + ', serif'; }
              );
            }
          } catch (e) {}
          desc.set.call(this, value);
        }
      });
    } catch (e) {}
  }

  function watchFont() {
    try {
      if (mo || !document.documentElement) return;
      mo = new MutationObserver(function () {
        var next = resolveFont();
        if (next === fontFamily) return;
        fontFamily = next;
        applyCss();
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: [ROOT_ATTR] });
    } catch (e) {}
  }

  // 启动：字体
  fontFamily = resolveFont();
  patchCanvasFont();
  applyCss();
  if (document.documentElement) watchFont();
  else document.addEventListener('DOMContentLoaded', function () {
    fontFamily = resolveFont();
    applyCss();
    watchFont();
  });

  // ---------- 思维导图 平滑平移 + 平滑缩放 ----------
  var mmTgtX = 0, mmTgtY = 0, mmCurX = 0, mmCurY = 0, mmRaf = 0, mmLastX = 0, mmLastY = 0;
  var zTgt = 0, zCur = 0, zRaf = 0, zLastX = 0, zLastY = 0;
  var EASE = 0.18;
  function getMindEl() { return document.querySelector('.minder-container'); }
  function overMind(x, y) {
    var mm = getMindEl();
    if (!mm) return false;
    if (document.elementsFromPoint) {
      try { return document.elementsFromPoint(x, y).some(function (el) { return mm.contains(el); }); } catch (e) { return false; }
    }
    return false;
  }
  function getScaleDelta(ev) {
    if (ev.deltaMode === 1) return 15 * ev.deltaY;
    if (ev.deltaY < 20 && ev.deltaY > -20) return ev.deltaY;
    return Math.max(Math.min(ev.deltaY, 20), -20);
  }
  function panStep() {
    var mm = getMindEl();
    if (!mm) { mmRaf = 0; return; }
    var dx = mmTgtX - mmCurX, dy = mmTgtY - mmCurY;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { mmCurX = mmTgtX; mmCurY = mmTgtY; mmRaf = 0; return; }
    var sx = dx * EASE, sy = dy * EASE;
    mmCurX += sx; mmCurY += sy;
    var ev = new WheelEvent('wheel', { deltaX: sx, deltaY: sy, bubbles: true, cancelable: true, clientX: mmLastX, clientY: mmLastY });
    ev.__mubuSynthetic = true;
    mm.dispatchEvent(ev);
    mmRaf = requestAnimationFrame(panStep);
  }
  function zoomStep() {
    var mm = getMindEl();
    if (!mm) { zRaf = 0; return; }
    var d = zTgt - zCur;
    if (Math.abs(d) < 0.05) { zCur = zTgt; zRaf = 0; return; }
    var dz = d * EASE;
    zCur += dz;
    var dpr = window.devicePixelRatio || 1;
    var ev = new WheelEvent('wheel', { deltaX: 0, deltaY: dz, ctrlKey: true, bubbles: true, cancelable: true, clientX: zLastX * dpr, clientY: zLastY * dpr });
    ev.__mubuSynthetic = true;
    mm.dispatchEvent(ev);
    zRaf = requestAnimationFrame(zoomStep);
  }
  document.addEventListener('wheel', function (e) {
    if (e.__mubuSynthetic) return;
    if (!overMind(e.clientX, e.clientY)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      zLastX = e.clientX; zLastY = e.clientY;
      zTgt += getScaleDelta(e);
      if (!zRaf) zRaf = requestAnimationFrame(zoomStep);
    } else if (!e.altKey) {
      mmLastX = e.clientX; mmLastY = e.clientY;
      if (e.shiftKey) mmTgtX += e.deltaY;
      else { mmTgtX += e.deltaX; mmTgtY += e.deltaY; }
      if (!mmRaf) mmRaf = requestAnimationFrame(panStep);
    }
  }, { passive: false, capture: true });
})();
