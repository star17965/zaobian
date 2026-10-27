(function () {
  "use strict";

  const DATA = window.APP_DATA;
  const RECIPES = DATA ? DATA.recipes : [];
  const META = DATA ? DATA.meta : { categories: [], featured: [] };
  const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));
  const FAV_KEY = "zaobian.favs.v1";

  const view = document.getElementById("view");
  const tabbar = document.getElementById("tabbar");
  const modal = document.getElementById("modal");
  const toastEl = document.getElementById("toast");
  const splash = document.getElementById("splash");

  const state = {
    query: "",
    category: "全部",
    favs: new Set(),
    scale: Object.create(null),
    checked: Object.create(null),
    cookStep: 0,
    timer: null,
    modalOpen: false,
    routeKey: "",
    currentRecipe: null,
  };

  try {
    const saved = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    if (Array.isArray(saved)) state.favs = new Set(saved);
  } catch (error) {
    /* file:// storage can be unavailable; keep an in-memory set */
  }

  const ICONS = {
    home: '<path d="M4 11.5 12 5l8 6.5V20h-5v-6H9v6H4z"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    bookmark: '<path d="M6.5 4.5h11v15l-5.5-3.7-5.5 3.7z"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3.2-6 7-6s7 2 7 6"/>',
    search: '<circle cx="11" cy="11" r="6.6"/><path d="m16 16 4.3 4.3"/>',
    arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    clock: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.5V12l3 1.8"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    flame: '<path d="M12 3.5c.5 3.2-2.2 4.6-2.2 7.2 0 1.1.7 2 1.7 2.4-.2-2 .9-3.3 2.1-4.2.4 1.6 2.2 2.8 2.2 5.1 0 2.6-1.9 4.5-4.5 4.5S7 16.6 7 14c0-4.5 5-5.2 5-10.5Z"/>',
    share: '<circle cx="18" cy="5" r="2.3"/><circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="19" r="2.3"/><path d="m8.1 10.9 7.8-4.5M8.1 13.1l7.8 4.5"/>',
    info: '<circle cx="12" cy="12" r="8.2"/><path d="M12 11v5M12 8.2v.2"/>',
    minus: '<path d="M6 12h12"/>',
  };

  function icon(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function route() {
    const raw = location.hash.replace(/^#\/?/, "") || "home";
    const parts = raw.split("/");
    return { name: parts[0] || "home", id: parts[1] || "" };
  }

  function routeKey(r) {
    return r.name + "/" + (r.id || "");
  }

  function isTab(r) {
    return ["home", "explore", "favorites", "mine"].indexOf(r.name) >= 0;
  }

  function navigate(path, options) {
    const next = "#/" + path.replace(/^#\/?/, "");
    if (location.hash === next) {
      render();
      return;
    }
    if (options && options.replace) {
      history.replaceState(null, "", next);
      render();
    } else {
      location.hash = next;
    }
  }

  function fmtNum(value) {
    const n = Number(value);
    if (!isFinite(n)) return String(value);
    return n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
  }

  function fmtWeight(value) {
    if (!value) return "";
    return value >= 1000 ? fmtNum(value / 1000) + "kg" : fmtNum(value) + "g";
  }

  function todayLabel() {
    const d = new Date();
    const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    return (d.getMonth() + 1) + " 月 " + d.getDate() + " 日 · 星期" + week;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return "夜深了";
    if (h < 11) return "早上好";
    if (h < 14) return "中午好";
    if (h < 18) return "下午好";
    return "晚上好";
  }

  function isFav(id) {
    return state.favs.has(id);
  }

  function saveFavs() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(state.favs)));
    } catch (error) {
      /* ignore */
    }
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 1800);
  }

  function nativeCall(name) {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge[name] === "function") {
        return window.AndroidBridge[name].apply(window.AndroidBridge, Array.prototype.slice.call(arguments, 1));
      }
    } catch (error) {
      /* browser preview */
    }
  }

  function keepScreen(on) {
    nativeCall("keepScreenOn", !!on);
  }

  function placeholder(r) {
    return '<div class="ph">' + esc((r.cat || "菜")[0]) + "</div>";
  }

  function subject(r) {
    return "主料：" + (r.main || "原报告未列配料") + "。";
  }

  function featuredIndex(id) {
    return META.featured ? META.featured.indexOf(id) : -1;
  }

  function tagline(r) {
    const lines = {
      "小炒黄牛肉": "大火快炒，锅气足",
      "手枪大鸡腿": "蒸 5 分钟，炸 2 分半",
      "农家小炒肉（鸡蛋干版本）": "肥瘦相间，最下饭",
      "宫保鸡丁": "酸甜微辣，花生脆",
      "葱油拌面": "一勺葱油，拌开就香",
      "糖醋排骨": "酸甜收汁，骨头都香",
      "小米南瓜粥": "小火慢煮，早上暖胃",
    };
    return lines[r.title] || (r.cat + " · " + r.steps.length + " 步");
  }

  function filteredRecipes() {
    const q = state.query.trim().toLowerCase();
    const cat = state.category;
    let list = RECIPES.filter(function (r) {
      if (cat !== "全部" && r.cat !== cat) return false;
      if (q && r.search.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    list = list.slice().sort(function (a, b) {
      const ai = featuredIndex(a.id);
      const bi = featuredIndex(b.id);
      const ar = (ai >= 0 ? 100 - ai : 0) + (a.img ? 10 : 0) + (a.hasSteps ? 3 : 0) + (a.hasNut ? 1 : 0);
      const br = (bi >= 0 ? 100 - bi : 0) + (b.img ? 10 : 0) + (b.hasSteps ? 3 : 0) + (b.hasNut ? 1 : 0);
      return br - ar;
    });
    return list;
  }

  /* ---------- home ---------- */
  function renderHome() {
    const hero = BY_ID.get(META.featured[0]) || RECIPES.find(function (r) { return r.img; }) || RECIPES[0];
    const picks = [];
    (META.featured || []).slice(1).forEach(function (id) {
      const r = BY_ID.get(id);
      if (r && r.id !== hero.id) picks.push(r);
    });
    ["小米南瓜粥", "麻婆豆腐", "老鸡汤"].forEach(function (title) {
      const r = RECIPES.find(function (x) { return x.title === title; });
      if (r && picks.length < 6 && !picks.some(function (x) { return x.id === r.id; }) && r.id !== hero.id) picks.push(r);
    });
    const cats = (META.homeCategories || []).map(function (name) {
      return (META.categories || []).find(function (c) { return c.name === name; });
    }).filter(Boolean);

    return (
      '<section class="page home">' +
        '<header class="home-head">' +
          '<div class="brand"><div class="brand-seal">灶</div><div><div class="brand-word">灶边</div><div class="brand-sub">ZAO BIAN · HOME COOKING</div></div></div>' +
          '<div class="head-actions">' +
            '<button class="icon-btn" data-search-open aria-label="搜索">' + icon("search") + "</button>" +
            '<button class="avatar" data-nav="mine" aria-label="我的">禾</button>' +
          "</div>" +
        "</header>" +
        '<div class="home-intro">' +
          '<div class="home-date">' + esc(todayLabel()) + " · " + esc(greeting()) + "</div>" +
          "<h1>今天，<br><em>想吃什么？</em></h1>" +
          "<p>" + META.total + " 条后厨配方，按家里的火候重写。</p>" +
          '<button class="search-pill" data-search-open>' + icon("search") + '<span>搜菜名、食材、供应商</span><span class="kbd">SEARCH</span></button>' +
        "</div>" +
        '<article class="hero-card" data-recipe="' + hero.id + '">' +
          (hero.img ? '<img src="' + esc(hero.img) + '" alt="' + esc(hero.title) + '" fetchpriority="high">' : '<div class="hero-ph">' + esc(hero.cat[0]) + "</div>") +
          '<div class="hero-top"><span class="hero-badge">本周编辑推荐</span>' +
            '<button class="hero-fav ' + (isFav(hero.id) ? "on" : "") + '" data-fav="' + hero.id + '" aria-label="收藏">' + icon("bookmark") + "</button>" +
          "</div>" +
          '<div class="hero-copy"><div class="over">EDITOR\'S PICK / 01</div><h3>' + esc(hero.title) + "</h3>" +
            '<div class="hero-meta"><span>' + esc(tagline(hero)) + "</span><i></i><span>" + hero.steps.length + " 步</span>" + (hero.weight ? "<i></i><span>可减量</span>" : "") + "</div>" +
          "</div>" +
          '<div class="hero-go">' + icon("arrow") + "</div>" +
        "</article>" +
        '<div class="cat-scroll">' +
          cats.map(function (c) {
            return '<button class="cat-item" data-cat="' + esc(c.name) + '"><div class="cat-circle">' + esc(c.icon) + "<b>" + c.count + "</b></div><span>" + esc(c.name) + "</span></button>";
          }).join("") +
        "</div>" +
        '<div class="section-head"><h2>今晚下饭</h2><button data-nav="explore">全部菜谱 ' + icon("arrow") + "</button></div>" +
        '<div class="recipe-grid">' + picks.slice(0, 6).map(recipeCard).join("") + "</div>" +
        '<div class="data-strip"><span><b>' + META.total + "</b> 条档案 · <b>" + META.withImage + "</b> 张配图 · <b>" + META.withNutrition + "</b> 份营养</span><button data-nav=\"mine\">数据说明 →</button></div>" +
      "</section>"
    );
  }

  function recipeCard(r) {
    return (
      '<article class="recipe-card" data-recipe="' + r.id + '">' +
        '<div class="recipe-thumb">' +
          (r.img ? '<img src="' + esc(r.img) + '" alt="' + esc(r.title) + '" loading="lazy">' : placeholder(r)) +
          '<button class="card-fav ' + (isFav(r.id) ? "on" : "") + '" data-fav="' + r.id + '" aria-label="收藏">' + icon("bookmark") + "</button>" +
        "</div>" +
        "<h4>" + esc(r.title) + "</h4>" +
        '<div class="card-meta"><span>' + esc(r.cat) + "</span><i></i><span>" + (r.hasSteps ? r.steps.length + " 步" : "原料") + "</span>" + (r.hasNut ? '<i></i><span>营养</span>' : "") + "</div>" +
      "</article>"
    );
  }

  /* ---------- explore ---------- */
  function renderExplore() {
    const list = filteredRecipes();
    const chips = [{ name: "全部", count: RECIPES.length }].concat(META.categories || []);
    return (
      '<section class="page explore">' +
        '<header class="page-head"><h1>菜谱库</h1><span class="count">' + META.total + " ENTRIES / " + META.categories.length + " CATEGORIES</span></header>" +
        '<div class="explore-tools">' +
          '<div class="search-box">' + icon("search") +
            '<input id="searchInput" type="search" autocomplete="off" placeholder="搜菜名、食材、供应商" value="' + esc(state.query) + '">' +
            '<button class="clear-btn ' + (state.query ? "show" : "") + '" data-search-clear aria-label="清空">' + icon("close") + "</button>" +
          "</div>" +
          '<div class="filter-row">' + chips.map(function (c) {
            return '<button class="chip ' + (state.category === c.name ? "on" : "") + '" data-cat="' + esc(c.name) + '">' + esc(c.name) + "</button>";
          }).join("") + "</div>" +
        "</div>" +
        '<div class="result-meta" id="resultMeta">' + resultMeta(list) + "</div>" +
        '<div class="recipe-list" id="recipeList">' + list.map(recipeRow).join("") + "</div>" +
      "</section>"
    );
  }

  function resultMeta(list) {
    const q = state.query.trim();
    let left = "找到 <b>" + list.length + "</b> 条";
    if (state.category !== "全部") left += " · " + esc(state.category);
    if (q) left += " · “" + esc(q) + "”";
    return "<span>" + left + "</span><span>按推荐排序</span>";
  }

  function recipeRow(r) {
    return (
      '<article class="list-row" data-recipe="' + r.id + '">' +
        '<div class="list-thumb">' + (r.img ? '<img src="' + esc(r.img) + '" alt="' + esc(r.title) + '" loading="lazy">' : placeholder(r)) + "</div>" +
        '<div class="list-copy"><h4>' + esc(r.title) + "</h4>" +
          '<div class="list-sub"><span class="badge">' + esc(r.cat) + "</span><span>" + (r.hasSteps ? r.steps.length + " 步" : "原料档案") + "</span><span>·</span><span>" + r.ings.length + " 种配料</span></div>" +
          '<div class="list-sub">' +
            (r.hasNut ? '<span class="badge warm">营养</span>' : '<span class="badge muted">营养未收录</span>') +
            (r.srcCount ? '<span class="badge">来源 ' + r.srcCount + "</span>" : "") +
          "</div>" +
        "</div>" +
        '<button class="list-fav ' + (isFav(r.id) ? "on" : "") + '" data-fav="' + r.id + '" aria-label="收藏">' + icon("bookmark") + "</button>" +
      "</article>"
    );
  }

  function refreshExplore() {
    const list = filteredRecipes();
    const listEl = document.getElementById("recipeList");
    const metaEl = document.getElementById("resultMeta");
    const input = document.getElementById("searchInput");
    const clear = document.querySelector("[data-search-clear]");
    if (listEl) listEl.innerHTML = list.length ? list.map(recipeRow).join("") : emptyHtml("没有找到这道菜", "换个食材名，或者去菜谱库看看全部 340 条。");
    if (metaEl) metaEl.innerHTML = resultMeta(list);
    if (clear) clear.classList.toggle("show", !!state.query);
    if (input && input.value !== state.query) input.value = state.query;
    document.querySelectorAll(".filter-row .chip").forEach(function (chip) {
      chip.classList.toggle("on", chip.getAttribute("data-cat") === state.category);
    });
  }

  function emptyHtml(title, text) {
    return '<div class="empty"><div class="seal">灶</div><h3>' + esc(title) + "</h3><p>" + esc(text) + '</p><button data-nav="explore">去菜谱库看看 →</button></div>';
  }

  /* ---------- detail ---------- */
  function getScale(r) {
    if (typeof state.scale[r.id] === "number") return state.scale[r.id];
    return r.bulk ? 0.5 : 1;
  }

  function scaleText(text, factor) {
    if (!factor || factor === 1) return text;
    return text.replace(/(\d+(?:\.\d+)?)\s*(kg|g|ml|L)(?![A-Za-z])/gi, function (match, num, unit) {
      return fmtNum(parseFloat(num) * factor) + unit;
    });
  }

  function timerSeconds(text) {
    let m = text.match(/(\d+)\s*分\s*(\d+)\s*秒/);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    m = text.match(/(\d+)\s*分钟/);
    if (m) return parseInt(m[1], 10) * 60;
    m = text.match(/(\d+)\s*分(?!钟)/);
    if (m) return parseInt(m[1], 10) * 60;
    m = text.match(/(\d+)\s*秒/);
    if (m) return parseInt(m[1], 10);
    return 0;
  }

  function formatClock(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function checkedSet(id) {
    if (!state.checked[id]) state.checked[id] = new Set();
    return state.checked[id];
  }

  function renderDetail(r) {
    const f = getScale(r);
    const checked = checkedSet(r.id);
    const sources = [];
    r.ings.forEach(function (i) {
      if (i.src) {
        i.src.split(" · ").forEach(function (s) {
          if (s && sources.indexOf(s) < 0) sources.push(s);
        });
      }
    });
    return (
      '<section class="page detail">' +
        '<div class="dhero">' +
          (r.img ? '<img src="' + esc(r.img) + '" alt="' + esc(r.title) + '">' : '<div class="ph">' + esc(r.cat[0]) + "</div>") +
          '<div class="dtop"><button class="round-btn" data-back aria-label="返回">' + icon("back") + "</button>" +
            '<button class="round-btn" data-share aria-label="分享">' + icon("share") + "</button></div>" +
        "</div>" +
        '<div class="dbody">' +
          '<div class="eyebrow">' + esc(r.cat) + " / " + (r.hasSteps ? "门店配方" : "原料档案") + "</div>" +
          "<h1>" + esc(r.title) + "</h1>" +
          '<p class="dsub">' + esc(subject(r)) + "</p>" +
          '<div class="meta-chips"><span class="hot">' + (r.hasSteps ? r.steps.length + " 步" : "无步骤") + "</span><span>" + r.ings.length + " 种配料</span>" +
            (r.weight ? "<span>可减量</span>" : "") + (r.hasNut ? "<span>营养已收录</span>" : "<span>营养未收录</span>") + "</div>" +
          scaleCard(r, f) +
          `<div class="dblock"><div class="dblock-head"><h2>备料</h2><span>${checked.size} / ${r.ings.length} 已备</span></div><div class="ing-list">` +
            (r.ings.length ? r.ings.map(function (i, index) {
              return '<button class="ing-row ' + (checked.has(index) ? "checked" : "") + '" data-check="' + index + '">' +
                '<span class="ing-check">' + icon("check") + "</span>" +
                '<span class="ing-copy"><span class="ing-name">' + esc(i.n) + "</span>" + (i.src ? '<span class="ing-src">' + esc(i.src) + "</span>" : "") + "</span>" +
              "</button>";
            }).join("") : '<div class="empty" style="padding:24px 0"><p>原报告未列配料。</p></div>') +
          "</div></div>" +
          '<div class="dblock"><div class="dblock-head"><h2>步骤</h2><span>' + (r.hasSteps ? r.steps.length + " STEPS" : "NO STEPS") + "</span></div>" +
            (r.hasSteps ? '<div class="step-list">' + r.steps.map(function (step, index) {
              const sec = timerSeconds(step);
              return `<div class="step-card"><div class="step-no">${String(index + 1).padStart(2, "0")}</div><div class="step-copy"><p class="step-text">${esc(scaleText(step, f))}</p>` +
                (sec ? '<button class="timer-chip" data-timer-step="' + index + '">' + icon("clock") + "计时 " + formatClock(sec) + "</button>" : "") +
              "</div></div>";
            }).join("") + "</div>" : '<div class="empty" style="padding:24px 0"><p>这是一条原料档案，没有烹饪步骤。可以把它当作配料参考。</p></div>') +
          "</div>" +
          archiveCard(r, sources) +
          '<p class="source-note">配方与营养整理自《老乡鸡菜品溯源报告 2.0》。份量为门店批量，换算只调整重量 / 容量，不改变温度与时间。</p>' +
        "</div>" +
        '<div class="dcta"><button class="fav-btn ' + (isFav(r.id) ? "on" : "") + '" data-fav="' + r.id + '" aria-label="收藏">' + icon("bookmark") + "</button>" +
          (r.hasSteps ? '<button class="start-btn" data-start-cook>' + icon("play") + "开始做菜 · " + r.steps.length + " 步</button>" : '<button class="start-btn" disabled>原料档案 · 无步骤</button>') +
        "</div>" +
      "</section>"
    );
  }

  function scaleCard(r, f) {
    if (!r.weight) return "";
    return (
      '<div class="scale-card"><div class="scale-top"><div class="scale-copy"><b>份量换算</b><span>原方约 ' + esc(fmtWeight(r.weight)) + " · 当前 " + (f === 1 ? "原方" : f === 0.5 ? "半份" : "1/3 份") + "</span></div>" +
        '<div class="seg">' +
          '<button data-scale-value="1" class="' + (f === 1 ? "on" : "") + '">原方</button>' +
          '<button data-scale-value="0.5" class="' + (f === 0.5 ? "on" : "") + '">半份</button>' +
          '<button data-scale-value="0.33" class="' + (f === 0.33 ? "on" : "") + '">1/3</button>' +
        "</div></div>" +
        '<div class="scale-hint">' + icon("info") + "只换算 g / ml；温度、时长保持原方</div>" +
      "</div>"
    );
  }

  function archiveCard(r, sources) {
    const items = [];
    if (r.cal != null) items.push({ value: fmtNum(r.cal), unit: "Kcal", label: "热量" });
    ["蛋白质", "脂肪", "碳水化合物"].forEach(function (key) {
      const match = String(r.nut[key] || "").match(/([\d.]+)/);
      if (match) items.push({ value: match[1], unit: "g", label: key });
    });
    return (
      '<div class="archive">' +
        '<div class="archive-head"><b>这份配方的档案</b><span>REPORT 2.0 / TRACEABLE</span></div>' +
        (items.length ? '<div class="nut-grid">' + items.slice(0, 4).map(function (item) {
          return '<div class="nut-item"><b>' + esc(item.value) + "<small>" + item.unit + "</small></b><span>" + esc(item.label) + " / 100g</span></div>";
        }).join("") + "</div>" : '<div class="archive-missing"><b>原报告未收录营养数据。</b> 我们不把缺失当作 0；这一栏保持空白，等有来源的数据再补。</div>') +
        '<div class="archive-source"><b>配料来源 / ' + (sources.length ? sources.length + " 条线索" : "未标注") + "</b>" +
          "<p>" + (sources.length ? esc(sources.slice(0, 5).join(" / ")) : "原报告没有标注供应商；配料表仍按原文保留。") + "</p>" +
        "</div>" +
        '<p class="archive-note">营养按每 100g 计；来源为原报告中的供应商 / 中央厨房信息，未做二次核实。</p>' +
      "</div>"
    );
  }

  /* ---------- cooking ---------- */
  function renderCook(r) {
    if (!r.steps.length) {
      return '<section class="page"><div class="empty" style="padding-top:100px"><div class="seal">灶</div><h3>这条没有步骤</h3><p>它是原料档案，回到详情看看配料来源。</p><button data-recipe="' + r.id + '">回到详情 →</button></div></section>';
    }
    const index = Math.max(0, Math.min(state.cookStep, r.steps.length - 1));
    const step = r.steps[index];
    const sec = timerSeconds(step);
    const f = getScale(r);
    return (
      '<section class="page cook-page">' +
        '<header class="cook-head"><button class="cook-close" data-back aria-label="退出">' + icon("close") + "</button>" +
          '<div class="cook-count"><b>' + String(index + 1).padStart(2, "0") + "</b> / " + String(r.steps.length).padStart(2, "0") + "</div>" +
          '<div style="width:36px"></div>' +
        "</header>" +
        '<div class="cook-progress"><i style="width:' + Math.round(((index + 1) / r.steps.length) * 100) + '%"></i></div>' +
        '<div class="cook-body">' +
          '<div class="cook-eyebrow">' + esc(r.title) + " / STEP " + String(index + 1).padStart(2, "0") + "</div>" +
          '<div class="cook-stepno">' + String(index + 1).padStart(2, "0") + "</div>" +
          '<p class="cook-text">' + esc(scaleText(step, f)) + "</p>" +
          (sec ? '<div class="cook-timer"><button data-timer-step="' + index + '">' + icon("clock") + "计时 " + formatClock(sec) + "</button><span class=\"hint\">到点震动提醒</span></div>" : "") +
          '<details class="cook-ref"><summary><span>看配料 · ' + r.ings.length + " 种</span><span>" + icon("down") + "</span></summary><p>" + esc(r.ings.map(function (i) { return i.n; }).join(" / ")) + "</p></details>" +
        "</div>" +
        '<div class="cook-foot">' +
          '<button class="prev" data-prev-step ' + (index === 0 ? "disabled" : "") + ">上一步</button>" +
          '<button class="next" data-next-step>' + (index === r.steps.length - 1 ? "完成，开饭" : "下一步") + icon("arrow") + "</button>" +
        "</div>" +
      "</section>"
    );
  }

  function renderDone(r) {
    const colors = ["#b7442d", "#c89b5a", "#173d30", "#e8b4a0", "#f0d9b5"];
    let confetti = "";
    for (let i = 0; i < 14; i++) {
      confetti += '<i class="confetti" style="left:' + (6 + i * 6.6) + "%;background:" + colors[i % colors.length] + ";animation-delay:" + (i * 0.13).toFixed(2) + "s;transform:rotate(" + (i * 37) + "deg)\"></i>";
    }
    return (
      '<section class="page done-page">' + confetti +
        '<div class="done-seal">灶</div>' +
        "<h1>开饭了。</h1>" +
        "<p>「" + esc(r.title) + "」做好了。趁热吃，锅气不等人。</p>" +
        '<div class="done-actions"><button class="solid" data-recipe="' + r.id + '">回到菜谱</button><button class="ghost" data-nav="home">再去逛逛</button></div>' +
      "</section>"
    );
  }

  /* ---------- favorites / mine ---------- */
  function renderFavorites() {
    const list = Array.from(state.favs).map(function (id) { return BY_ID.get(id); }).filter(Boolean);
    return (
      '<section class="page">' +
        '<header class="page-head"><h1>收藏</h1><span class="count">' + list.length + " SAVED RECIPES</span></header>" +
        (list.length ? '<div class="recipe-list" style="padding-top:12px">' + list.map(recipeRow).join("") + "</div>" :
          '<div class="empty" style="padding-top:80px"><div class="seal">灶</div><h3>还没有收藏</h3><p>看到想做的菜，点一下右上角的书签。<br>下次饿了，直接从这里开始。</p><button data-nav="explore">去菜谱库看看 →</button></div>') +
      "</section>"
    );
  }

  function renderMine() {
    return (
      '<section class="page">' +
        '<header class="page-head"><h1>我的</h1><span class="count">ZAO BIAN / v' + esc(META.version) + "</span></header>" +
        '<div class="mine-profile"><div class="mine-avatar">禾</div><div class="mine-copy"><b>今晚也要好好吃饭</b><span>已收藏 ' + state.favs.size + " 道 · 数据离线可用</span></div></div>" +
        '<div class="mine-stats">' +
          '<div class="mine-stat"><b>' + META.total + "</b><span>条档案</span></div>" +
          '<div class="mine-stat"><b>' + META.withImage + "</b><span>张配图</span></div>" +
          '<div class="mine-stat"><b>' + META.withNutrition + "</b><span>份营养</span></div>" +
          '<div class="mine-stat"><b>' + META.withSuppliers + "</b><span>条来源</span></div>" +
        "</div>" +
        '<div class="mine-block"><h3>关于这份菜谱库</h3><div class="mine-card">' +
          "<p>配方来自开源项目 <b>CookLikeHOC</b>，原始资料是《老乡鸡菜品溯源报告 2.0》。" + META.total + " 条内容里，有 " + META.withSteps + " 条带步骤、" + META.withNutrition + " 条带营养表。</p>" +
          "<p>所以这个 App 不假装完整：没有图就显示分类印章，没有营养就写“未收录”，没有步骤的配料单独标注。缺失本身也是信息。</p>" +
        "</div></div>" +
        '<div class="mine-block"><h3>份量说明</h3><div class="mine-card"><p>约一半配方是门店批量（≥500g）。详情页的“半份 / 1/3”只换算 g 和 ml，<b>不会改温度与时间</b>，避免把 180℃ 改成 90℃。</p></div></div>' +
        '<div class="mine-block"><div class="mine-card" style="padding:0 13px">' +
          '<div class="mine-row"><span>收藏</span><span>' + state.favs.size + " 道</span></div>" +
          '<div class="mine-row"><span>数据版本</span><span>v' + esc(META.version) + " · 离线</span></div>" +
          '<div class="mine-row"><span>清空收藏</span><button data-clear-fav>清空</button></div>' +
        "</div></div>" +
        '<div class="mine-foot">COOKLIKEHOC · 灶边 / MADE FOR HOME KITCHENS</div>' +
      "</section>"
    );
  }

  /* ---------- render ---------- */
  function render(options) {
    if (!DATA) {
      view.innerHTML = '<div class="empty" style="padding-top:100px"><h3>数据没有加载</h3><p>请重新打开应用。</p></div>';
      return;
    }
    const r = route();
    const key = routeKey(r);
    if (state.routeKey && key !== state.routeKey && state.timer) closeModal(true);
    state.routeKey = key;
    state.currentRecipe = r.id ? BY_ID.get(r.id) : null;
    let html = "";
    if (r.name === "home") html = renderHome();
    else if (r.name === "explore") html = renderExplore();
    else if (r.name === "favorites") html = renderFavorites();
    else if (r.name === "mine") html = renderMine();
    else if (r.name === "recipe" && BY_ID.get(r.id)) html = renderDetail(BY_ID.get(r.id));
    else if (r.name === "cook" && BY_ID.get(r.id)) html = renderCook(BY_ID.get(r.id));
    else if (r.name === "done" && BY_ID.get(r.id)) html = renderDone(BY_ID.get(r.id));
    else {
      history.replaceState(null, "", "#/home");
      html = renderHome();
    }
    view.innerHTML = html;
    document.body.classList.toggle("no-tabs", !isTab(r));
    updateTabs(r);
    if (r.name === "cook") keepScreen(true);
    else if (!state.timer) keepScreen(false);
    if (!options || !options.keepScroll) window.scrollTo(0, 0);
    document.title = r.name === "recipe" && BY_ID.get(r.id) ? BY_ID.get(r.id).title + " · 灶边" : "灶边 · 好好吃饭";
  }

  function updateTabs(r) {
    if (!tabbar) return;
    tabbar.querySelectorAll(".tab").forEach(function (tab) {
      tab.classList.toggle("on", tab.getAttribute("data-nav") === r.name);
    });
  }

  function focusSearch() {
    setTimeout(function () {
      const input = document.getElementById("searchInput");
      if (input) {
        input.focus();
        const len = input.value.length;
        try { input.setSelectionRange(len, len); } catch (error) { /* ignore */ }
      }
    }, 80);
  }

  /* ---------- actions ---------- */
  function toggleFav(id) {
    if (!id) return;
    if (state.favs.has(id)) {
      state.favs.delete(id);
      toast("已取消收藏");
    } else {
      state.favs.add(id);
      toast("已收藏");
    }
    saveFavs();
    document.querySelectorAll('[data-fav="' + id + '"]').forEach(function (button) {
      button.classList.toggle("on", state.favs.has(id));
    });
    const r = route();
    if (r.name === "favorites") render();
    const mineCount = document.querySelector(".mine-copy span");
    if (mineCount) mineCount.textContent = "已收藏 " + state.favs.size + " 道 · 数据离线可用";
  }

  function openTimer(seconds, label) {
    closeModal(true);
    state.timer = { total: seconds, remaining: seconds, paused: false, label: label || "计时", interval: null };
    state.modalOpen = true;
    renderTimerModal();
    keepScreen(true);
    nativeCall("vibrate");
    state.timer.interval = setInterval(tickTimer, 1000);
  }

  function tickTimer() {
    if (!state.timer) return;
    if (state.timer.paused) return;
    state.timer.remaining -= 1;
    if (state.timer.remaining <= 0) {
      state.timer.remaining = 0;
      clearInterval(state.timer.interval);
      state.timer.interval = null;
      nativeCall("vibrate");
      nativeCall("vibrate");
      renderTimerModal(true);
      return;
    }
    const time = modal.querySelector(".timer-time");
    if (time) time.textContent = formatClock(state.timer.remaining);
  }

  function renderTimerModal(finished) {
    if (!state.timer) return;
    const t = state.timer;
    modal.innerHTML =
      '<div class="modal-backdrop" data-modal-close></div>' +
      '<div class="modal-card"><div class="modal-head"><b>' + esc(t.label) + '</b><button class="modal-close" data-modal-close aria-label="关闭">' + icon("close") + "</button></div>" +
        '<div class="timer-display"><div class="timer-time">' + formatClock(t.remaining) + '</div><div class="label">' + (finished ? "时间到，去看看锅" : t.paused ? "已暂停" : "正在计时 · 到点震动") + "</div></div>" +
        '<div class="timer-actions">' +
          (finished ? '<button class="ghost" data-timer-restart>再来一次</button><button class="solid" data-modal-close>知道了</button>' :
            '<button class="ghost" data-timer-toggle>' + (t.paused ? "继续" : "暂停") + '</button><button class="solid" data-modal-close>收起</button>') +
        "</div>" +
      "</div>";
  }

  function closeModal(silent) {
    if (state.timer && state.timer.interval) clearInterval(state.timer.interval);
    state.timer = null;
    state.modalOpen = false;
    if (modal) modal.innerHTML = "";
    const r = route();
    keepScreen(r.name === "cook");
    if (!silent) {
      const button = document.querySelector("[data-timer-toggle]");
      if (button) button.textContent = "暂停";
    }
  }

  function shareRecipe(r) {
    const text = r.title + " · 灶边菜谱｜" + r.cat + "，" + (r.hasSteps ? r.steps.length + " 步" : "原料档案") + "。";
    if (window.AndroidBridge && typeof window.AndroidBridge.share === "function") {
      nativeCall("share", text);
      return;
    }
    if (navigator.share) {
      navigator.share({ title: r.title, text: text }).catch(function () { /* cancelled */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("分享文案已复制"); }).catch(function () { toast(text); });
      return;
    }
    toast(text);
  }

  function startCook(r) {
    state.cookStep = 0;
    state.checked[r.id] = state.checked[r.id] || new Set();
    navigate("cook/" + r.id);
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (event) {
    const target = event.target;
    if (!target || !target.closest) return;
    const modalClose = target.closest("[data-modal-close]");
    if (modalClose) {
      closeModal();
      return;
    }
    const timerToggle = target.closest("[data-timer-toggle]");
    if (timerToggle && state.timer) {
      state.timer.paused = !state.timer.paused;
      timerToggle.textContent = state.timer.paused ? "继续" : "暂停";
      renderTimerModal();
      return;
    }
    const timerRestart = target.closest("[data-timer-restart]");
    if (timerRestart && state.timer) {
      const total = state.timer.total;
      const label = state.timer.label;
      openTimer(total, label);
      return;
    }
    const fav = target.closest("[data-fav]");
    if (fav) {
      event.preventDefault();
      event.stopPropagation();
      toggleFav(fav.getAttribute("data-fav"));
      return;
    }
    const back = target.closest("[data-back]");
    if (back) {
      appBack();
      return;
    }
    const share = target.closest("[data-share]");
    if (share && state.currentRecipe) {
      shareRecipe(state.currentRecipe);
      return;
    }
    const searchOpen = target.closest("[data-search-open]");
    if (searchOpen) {
      state.query = "";
      state.category = "全部";
      if (route().name === "explore") {
        render();
        focusSearch();
      } else {
        navigate("explore");
        focusSearch();
      }
      return;
    }
    const searchClear = target.closest("[data-search-clear]");
    if (searchClear) {
      state.query = "";
      refreshExplore();
      const input = document.getElementById("searchInput");
      if (input) input.focus();
      return;
    }
    const nav = target.closest("[data-nav]");
    if (nav) {
      const name = nav.getAttribute("data-nav");
      if (name === "explore") {
        state.category = state.category || "全部";
      }
      navigate(name);
      return;
    }
    const cat = target.closest("[data-cat]");
    if (cat) {
      state.category = cat.getAttribute("data-cat");
      state.query = "";
      if (route().name === "explore") refreshExplore();
      else navigate("explore");
      return;
    }
    const recipe = target.closest("[data-recipe]");
    if (recipe) {
      navigate("recipe/" + recipe.getAttribute("data-recipe"));
      return;
    }
    const scale = target.closest("[data-scale-value]");
    if (scale && state.currentRecipe) {
      const value = parseFloat(scale.getAttribute("data-scale-value"));
      state.scale[state.currentRecipe.id] = value;
      const y = window.scrollY;
      render({ keepScroll: true });
      window.scrollTo(0, y);
      return;
    }
    const check = target.closest("[data-check]");
    if (check && state.currentRecipe) {
      const index = parseInt(check.getAttribute("data-check"), 10);
      const set = checkedSet(state.currentRecipe.id);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      check.classList.toggle("checked", set.has(index));
      const head = document.querySelector(".dblock-head span");
      if (head) head.textContent = set.size + " / " + state.currentRecipe.ings.length + " 已备";
      return;
    }
    const timerStep = target.closest("[data-timer-step]");
    if (timerStep && state.currentRecipe) {
      const index = parseInt(timerStep.getAttribute("data-timer-step"), 10);
      const step = state.currentRecipe.steps[index];
      const seconds = timerSeconds(step || "");
      if (seconds) openTimer(seconds, "第 " + (index + 1) + " 步 · " + formatClock(seconds));
      return;
    }
    const start = target.closest("[data-start-cook]");
    if (start && state.currentRecipe) {
      startCook(state.currentRecipe);
      return;
    }
    const prev = target.closest("[data-prev-step]");
    if (prev && state.currentRecipe) {
      state.cookStep = Math.max(0, state.cookStep - 1);
      render({ keepScroll: true });
      window.scrollTo(0, 0);
      return;
    }
    const next = target.closest("[data-next-step]");
    if (next && state.currentRecipe) {
      if (state.cookStep >= state.currentRecipe.steps.length - 1) {
        keepScreen(false);
        navigate("done/" + state.currentRecipe.id, { replace: true });
      } else {
        state.cookStep += 1;
        render({ keepScroll: true });
        window.scrollTo(0, 0);
      }
      return;
    }
    const clearFav = target.closest("[data-clear-fav]");
    if (clearFav) {
      if (state.favs.size && window.confirm("清空全部收藏？")) {
        state.favs.clear();
        saveFavs();
        render();
        toast("收藏已清空");
      }
      return;
    }
    if (target.closest("[data-restart-cook]") && state.currentRecipe) {
      startCook(state.currentRecipe);
    }
  });

  document.addEventListener("input", function (event) {
    if (event.target && event.target.id === "searchInput") {
      state.query = event.target.value;
      refreshExplore();
    }
  });

  document.addEventListener("submit", function (event) { event.preventDefault(); });

  window.addEventListener("hashchange", function () { render(); });

  window.appBack = function () {
    if (state.modalOpen) {
      closeModal();
      return true;
    }
    const r = route();
    if (r.name === "cook" || r.name === "done") {
      keepScreen(false);
      if (history.length > 1) history.back();
      else navigate("recipe/" + r.id, { replace: true });
      return true;
    }
    if (r.name === "recipe") {
      if (history.length > 1) history.back();
      else navigate("home", { replace: true });
      return true;
    }
    if (r.name === "explore" && (state.query || state.category !== "全部")) {
      state.query = "";
      state.category = "全部";
      render();
      return true;
    }
    if (r.name !== "home") {
      navigate("home");
      return true;
    }
    return false;
  };

  function init() {
    if (!location.hash) history.replaceState(null, "", "#/home");
    render();
    setTimeout(function () { if (splash) splash.classList.add("hide"); }, 260);
    setTimeout(function () { if (splash && splash.parentNode) splash.parentNode.removeChild(splash); }, 760);
    window.addEventListener("error", function (event) {
      if (window.console && console.error) console.error(event.message);
    });
  }

  init();
})();