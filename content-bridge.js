// ==Mubu 设置桥接（隔离世界）==
// 读取扩展存储里的字体选择，写入 <html data-mubu-font-family>，
// 主世界脚本监听该属性并实际应用（CSS + 画布字体）。
(() => {
  var ROOT_ATTR = 'data-mubu-font-family';
  var DEFAULT_FONT = 'Noto Serif SC';
  var LS_KEY = '__mubu_font_family';

  function setFont(v) {
    var val = (v === null || v === undefined) ? DEFAULT_FONT : String(v);
    try { if (document.documentElement) document.documentElement.setAttribute(ROOT_ATTR, val); } catch (e) {}
    try { localStorage.setItem(LS_KEY, val); } catch (e) {}
  }

  function readCache() {
    try { return localStorage.getItem(LS_KEY); } catch (e) { return null; }
  }

  // 先用本地缓存，返回用户可立即生效
  var cached = readCache();
  if (cached !== null) setFont(cached);
  else setFont(DEFAULT_FONT);

  // 再读扩展存储（权威值）
  try {
    chrome.storage.sync.get({ fontFamily: DEFAULT_FONT }, function (v) {
      if (chrome.runtime && chrome.runtime.lastError) return;
      setFont(v && v.fontFamily !== undefined ? v.fontFamily : DEFAULT_FONT);
    });
  } catch (e) {}

  // 弹窗里改字体时实时同步到已打开的页面
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'sync') return;
      if (!changes || !changes.fontFamily) return;
      var nv = changes.fontFamily.newValue;
      setFont(nv === null || nv === undefined ? DEFAULT_FONT : nv);
    });
  } catch (e) {}
})();
