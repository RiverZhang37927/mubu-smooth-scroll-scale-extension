(() => {
  var DEFAULT_FONT = 'Noto Serif SC';
  var QUICK = ['Noto Serif SC', 'Source Han Serif SC', '思源宋体', '宋体', 'SimSun', '楷体', 'KaiTi', '微软雅黑', 'Microsoft YaHei', 'Times New Roman', 'Georgia', 'Segoe UI'];

  var $ = function (id) { return document.getElementById(id); };
  var statusEl = $('status');
  var allFonts = [];
  var currentValue = DEFAULT_FONT;

  function setStatus(msg) { statusEl.textContent = msg || ''; }

  function getFontList() {
    return new Promise(function (resolve) {
      var done = false;
      function finish(list) {
        if (done) return;
        done = true;
        resolve(Array.isArray(list) ? list : []);
      }
      try {
        var ret = chrome.fontSettings.getFontList(finish);
        if (ret && typeof ret.then === 'function') ret.then(finish).catch(function () { finish([]); });
      } catch (e) { finish([]); }
      setTimeout(function () { finish([]); }, 3000);
    });
  }

  function normalizeFonts(list) {
    var map = new Map();
    list.forEach(function (f) {
      var name = String((f && (f.displayName || f.fontId)) || '').trim();
      if (!name) return;
      var key = name.toLowerCase();
      if (!map.has(key)) map.set(key, name);
    });
    return Array.from(map.values()).sort(function (a, b) { return a.localeCompare(b, 'zh-CN'); });
  }

  function renderList() {
    var q = ($('search').value || '').trim().toLowerCase();
    var sel = $('fontList');
    var list = allFonts.filter(function (n) { return !q || n.toLowerCase().indexOf(q) !== -1; });
    sel.innerHTML = '';

    var none = document.createElement('option');
    none.value = '';
    none.textContent = '（不修改字体 / 幕布默认）';
    sel.appendChild(none);

    if (currentValue && list.indexOf(currentValue) === -1) list = [currentValue].concat(list);

    list.forEach(function (n) {
      var o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      sel.appendChild(o);
    });
    sel.value = currentValue === undefined || currentValue === null ? '' : currentValue;
  }

  function renderChips() {
    var box = $('chips');
    box.innerHTML = '';
    var lower = allFonts.map(function (n) { return n.toLowerCase(); });
    var shown = 0;
    QUICK.forEach(function (name) {
      if (lower.indexOf(name.toLowerCase()) === -1) return;
      shown++;
      var b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.textContent = name;
      b.addEventListener('click', function () {
        $('custom').value = name;
        currentValue = name;
        renderList();
        saveAndApply();
      });
      box.appendChild(b);
    });
    if (!shown) {
      var tip = document.createElement('span');
      tip.className = 'none-tip';
      tip.textContent = allFonts.length ? '（常用字体未安装，请从上方列表选择）' : '（未读取到字体列表）';
      box.appendChild(tip);
    }
  }

  function save(value) {
    return new Promise(function (resolve) {
      try {
        chrome.storage.sync.set({ fontFamily: value }, function () {
          if (chrome.runtime && chrome.runtime.lastError) { resolve(false); return; }
          resolve(true);
        });
      } catch (e) { resolve(false); }
    });
  }

  function saveAndApply() {
    var value = ($('custom').value || '').trim();
    return save(value).then(function (ok) {
      if (!ok) {
        setStatus('保存失败：请检查扩展的“存储”权限');
        return false;
      }
      currentValue = value;
      renderList();
      setStatus('已保存：' + (value ? value : '不修改字体') + '（打开中的幕布页面会自动更新）');
      return true;
    });
  }

  function reloadTab() {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs && tabs[0];
        if (!tab || tab.id === undefined || tab.id === null) { setStatus('未找到当前标签页'); return; }
        chrome.tabs.reload(tab.id, {}, function () {
          if (chrome.runtime && chrome.runtime.lastError) { setStatus('刷新失败'); return; }
          setStatus('已刷新当前页面');
        });
      });
    } catch (e) { setStatus('刷新失败'); }
  }

  // 初始化
  $('search').addEventListener('input', renderList);
  $('fontList').addEventListener('change', function () {
    $('custom').value = $('fontList').value;
    currentValue = $('fontList').value;
  });
  $('apply').addEventListener('click', saveAndApply);
  $('reload').addEventListener('click', reloadTab);

  try {
    chrome.storage.sync.get({ fontFamily: DEFAULT_FONT }, function (v) {
      if (chrome.runtime && chrome.runtime.lastError) return;
      currentValue = v && v.fontFamily !== undefined && v.fontFamily !== null ? String(v.fontFamily) : DEFAULT_FONT;
      $('custom').value = currentValue;
      renderList();
    });
  } catch (e) {}

  getFontList().then(function (list) {
    allFonts = normalizeFonts(list);
    renderList();
    renderChips();
    if (allFonts.length) setStatus('已读取 ' + allFonts.length + ' 个已安装字体');
    else setStatus('未读取到字体列表，请手动输入字体名称');
  });
})();
