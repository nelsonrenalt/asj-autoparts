/* ASJ Autoparts — katalog produk */
(function () {
  "use strict";

  const CFG = window.ASJ_CONFIG || {};
  const PAGE = 24;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Ikon kategori (stroke SVG 24x24)
  const IC = {
    rem: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v3M20.5 12h-3"/>',
    kopling: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4v5.5M12 14.5V20M4 12h5.5M14.5 12H20"/>',
    kaki: '<path d="M7 3v18M17 3v18"/><path d="M7 7c3 1 7 1 10 0M7 12c3 1 7 1 10 0M7 17c3 1 7 1 10 0"/>',
    body: '<path d="M4 7h11l2 3v7H4z"/><path d="M17 10h3v4h-3"/><circle cx="8" cy="17.5" r="1.5"/>',
    kelistrikan: '<path d="M13 3 5 13.5h6L10 21l8-11h-6l1-7Z"/>',
    lampu: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5Z"/>',
    belt: '<circle cx="7" cy="12" r="3.5"/><circle cx="17" cy="12" r="3.5"/><path d="M7 8.5h10M7 15.5h10"/>',
    bearing: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="6" r="1.2"/><circle cx="12" cy="18" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
    mesin: '<path d="M4 10h3l2-3h6v3h3l2 2v4h-2v2H9l-2-2H4z"/><path d="M10 7V5h4v2"/>',
    wiper: '<path d="M4 18 18 6"/><path d="M3 20h4M14 4.5 19.5 10"/>',
    oli: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
    radiator: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M12 5v14M16 5v14"/>',
    perawatan: '<path d="m14.5 4.5 5 5L9 20H4v-5L14.5 4.5Z"/><path d="m12.5 6.5 5 5"/>',
    lainnya: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  };
  const CATS = [
    ["rem", "Rem & Kampas"], ["kopling", "Kopling, Gardan & Transmisi"], ["kaki", "Kaki-kaki & Suspensi"],
    ["body", "Body, Spion & Aksesoris"], ["kelistrikan", "Kelistrikan & Pengapian"], ["lampu", "Lampu & Mika"],
    ["filter", "Filter Udara & Oli"], ["belt", "V-Belt, Selang & Pulley"], ["bearing", "Bearing / Laher & Seal"],
    ["mesin", "Mesin & Gasket"], ["wiper", "Wiper & Washer"], ["oli", "Oli, Grease & Cairan"],
    ["radiator", "Radiator & Pendingin"], ["perawatan", "Perawatan & Perkakas"], ["lainnya", "Lainnya"],
  ];
  const CAT_NAME = Object.fromEntries(CATS);

  // Sinonim istilah bengkel supaya pencarian lebih "memaafkan"
  const SYN = [
    ["laher", "bearing"], ["kampas", "brake pad", "brake shoe", "kanvas"], ["bohlam", "lampu", "dop"],
    ["seal", "sil"], ["shock", "shockbreaker", "sokbreker", "shok"], ["kopling", "clutch"],
    ["filter", "saringan"], ["fan belt", "v-belt", "tali kipas", "vbelt"], ["spion", "mirror"],
    ["kijang", "toyota"], ["colt", "mitsubishi"], ["granmax", "gran max"], ["delco", "delko"],
    ["karet", "rubber"], ["kruis", "cross joint", "kres"], ["handel", "handle"], ["sein", "riting", "reting"],
  ];
  const synMap = new Map();
  SYN.forEach((g) => g.forEach((w) => synMap.set(w, g)));

  // ---------- Util ----------
  const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const priceText = (p) => (p.min === p.max ? rupiah(p.min) : rupiah(p.min) + " – " + rupiah(p.max));
  const norm = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s.\-/]/g, " ").replace(/\s+/g, " ").trim();
  const marketUrl = (m) => {
    if (m === "shopee") return CFG.shopee;
    if (m === "tokopedia") return CFG.tokopedia || "https://www.tokopedia.com/search?st=shop&q=" + encodeURIComponent(CFG.storeName);
    if (m === "tiktok") return CFG.tiktok || "https://www.tiktok.com/search?q=" + encodeURIComponent(CFG.storeName);
    return "#";
  };
  const shopeeProduct = (id) => "https://shopee.co.id/product/" + CFG.shopeeShopId + "/" + id;
  const pageUrl = (p) => "produk/" + p.u + ".html";
  const productUrl = (p) => new URL(pageUrl(p), location.href.split(/[?#]/)[0]).href;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const svg = (paths, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  function stockInfo(s) {
    if (s <= 0) return { cls: "stock--out", text: "Stok habis, tanyakan dulu" };
    if (s <= 3) return { cls: "stock--low", text: "Sisa " + s };
    return { cls: "stock--ok", text: "Stok tersedia" };
  }
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-show"), 2600);
  }

  // ---------- Info toko statis ----------
  function initStatic() {
    $$("[data-market]").forEach((a) => (a.href = marketUrl(a.dataset.market)));
    $$("[data-hours]").forEach((e) => (e.textContent = CFG.hoursText));
    $("#year").textContent = new Date().getFullYear();

    // Status buka / tutup (WIB) — visibilitas status sistem
    function updateOpen() {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t).value;
      const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
      const h = +get("hour") % 24 + +get("minute") / 60;
      const open = CFG.openDays.includes(day) && h >= CFG.openHour && h < CFG.closeHour;
      const dot = $("#statusDot");
      dot.className = "status-dot " + (open ? "is-open" : "is-closed");
      let txt;
      if (open) txt = "Buka sekarang · tutup pukul " + String(CFG.closeHour).padStart(2, "0") + ".00 WIB";
      else {
        let nd = day, today = CFG.openDays.includes(day) && h < CFG.openHour;
        if (!today) { do { nd = (nd + 1) % 7; } while (!CFG.openDays.includes(nd)); }
        const names = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        txt = "Sedang tutup · buka " + (today ? "hari ini" : nd === (day + 1) % 7 ? "besok" : names[nd]) + " pukul " + String(CFG.openHour).padStart(2, "0") + ".00 WIB";
      }
      $("#openStatus").textContent = txt;
    }
    updateOpen();
    setInterval(updateOpen, 60000);

    // Menu mobile
    const nav = $("#mainNav"), tog = $("#navToggle");
    tog.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      tog.setAttribute("aria-expanded", open);
      tog.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    });
    nav.addEventListener("click", (e) => { if (e.target.tagName === "A") { nav.classList.remove("is-open"); tog.setAttribute("aria-expanded", "false"); } });

    // Animasi muncul saat di-scroll
    if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const io = new IntersectionObserver((ents) => ents.forEach((en) => {
        if (en.isIntersecting) { const t = en.target; t.classList.add("is-in"); io.unobserve(t); setTimeout(() => { t.style.transitionDelay = ""; t.classList.remove("reveal", "is-in"); }, 1200); }
      }), { rootMargin: "0px 0px -8% 0px" });
      window.__reveal = (root) => $$(".section__head, .steps li, .market-card, .faq details, .contact > *, .trust__item, .cat", root || document)
        .forEach((el, i) => { if (!el.classList.contains("reveal")) { el.classList.add("reveal"); el.style.transitionDelay = (i % 6) * 60 + "ms"; io.observe(el); } });
      window.__reveal();
    } else window.__reveal = () => {};

    // Tombol ke atas
    const top = $("#toTop");
    window.addEventListener("scroll", () => { top.hidden = window.scrollY < 900; }, { passive: true });
    top.addEventListener("click", () => window.scrollTo({ top: 0 }));
  }

  // ---------- Data & state ----------
  let DATA = [], IMG = "";
  const state = { q: "", cat: new Set(), make: new Set(), brand: new Set(), stock: false, sort: "relevan", shown: PAGE };
  let results = [];

  function prep(p) {
    p._cat = CAT_NAME[p.cat] || "Lainnya";
    p._hay = norm([p.name, p.brand, p.makes.join(" "), p._cat, p.var.map((v) => v.n).join(" ")].join(" "));
    p._name = norm(p.name);
    return p;
  }

  function tokens(q) {
    const t = norm(q);
    if (!t) return [];
    // gabungkan frasa sinonim 2 kata ("fan belt", "gran max")
    const out = [];
    const words = t.split(" ");
    for (let i = 0; i < words.length; i++) {
      const two = words[i] + " " + (words[i + 1] || "");
      if (synMap.has(two)) { out.push(synMap.get(two)); i++; }
      else out.push(synMap.get(words[i]) || [words[i]]);
    }
    return out;
  }

  function matchScore(p, toks) {
    let score = 0;
    for (const alts of toks) {
      let hit = 0;
      for (const a of alts) {
        if (p._name.includes(a)) { hit = Math.max(hit, p._name.startsWith(a) ? 4 : 3); }
        else if (p._hay.includes(a)) hit = Math.max(hit, 1);
      }
      if (!hit) return 0;
      score += hit;
    }
    return score;
  }

  function passes(p, skip) {
    if (skip !== "cat" && state.cat.size && !state.cat.has(p.cat)) return false;
    if (skip !== "make" && state.make.size && !p.makes.some((m) => state.make.has(m))) return false;
    if (skip !== "brand" && state.brand.size && !state.brand.has(p.brand || "Lainnya")) return false;
    if (skip !== "stock" && state.stock && p.stock <= 0) return false;
    return true;
  }

  function compute() {
    const toks = tokens(state.q);
    const base = [];
    for (const p of DATA) {
      const s = toks.length ? matchScore(p, toks) : 1;
      if (s) { p._s = s; base.push(p); }
    }
    results = base.filter((p) => passes(p));
    const by = {
      relevan: (a, b) => b._s - a._s || (a.stock <= 0) - (b.stock <= 0),
      murah: (a, b) => a.min - b.min,
      mahal: (a, b) => b.max - a.max,
      baru: (a, b) => (b.id > a.id ? 1 : -1),
      nama: (a, b) => a.name.localeCompare(b.name, "id"),
    }[state.sort];
    if (state.sort !== "relevan" || toks.length) results.sort(by);
    return base;
  }

  // ---------- Render filter ----------
  function facet(base, key, getVals) {
    const c = new Map();
    base.forEach((p) => { if (passes(p, key)) getVals(p).forEach((v) => c.set(v, (c.get(v) || 0) + 1)); });
    return c;
  }

  function renderFilterGroup(el, items, set, name) {
    el.innerHTML = items.map(([val, label, n]) => `
      <label class="fcheck"><input type="checkbox" name="${name}" value="${esc(val)}" ${set.has(val) ? "checked" : ""}>
      <span>${esc(label)}</span><small>${n}</small></label>`).join("");
  }

  function renderFilters(base) {
    const cc = facet(base, "cat", (p) => [p.cat]);
    renderFilterGroup($("#fCat"), CATS.filter(([k]) => cc.get(k) || state.cat.has(k)).map(([k, l]) => [k, l, cc.get(k) || 0]), state.cat, "cat");
    const mc = facet(base, "make", (p) => p.makes);
    renderFilterGroup($("#fMake"), [...mc.entries()].concat([...state.make].filter((m) => !mc.has(m)).map((m) => [m, 0])).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, k, n]), state.make, "make");
    const bc = facet(base, "brand", (p) => [p.brand || "Lainnya"]);
    renderFilterGroup($("#fBrand"), [...bc.entries()].sort((a, b) => (a[0] === "Lainnya") - (b[0] === "Lainnya") || b[1] - a[1]).map(([k, n]) => [k, k === "Lainnya" ? "Merk lain / tanpa merk" : k, n]), state.brand, "brand");
    $("#fStock").checked = state.stock;
  }

  function renderChips() {
    const chips = [];
    const x = svg('<path d="M6 6l12 12M18 6 6 18"/>');
    if (state.q) chips.push(`<button class="chip" data-rm="q" aria-label="Hapus pencarian ${esc(state.q)}">“${esc(state.q)}” ${x}</button>`);
    state.cat.forEach((v) => chips.push(`<button class="chip" data-rm="cat" data-v="${esc(v)}" aria-label="Hapus filter ${esc(CAT_NAME[v])}">${esc(CAT_NAME[v])} ${x}</button>`));
    state.make.forEach((v) => chips.push(`<button class="chip" data-rm="make" data-v="${esc(v)}" aria-label="Hapus filter ${esc(v)}">${esc(v)} ${x}</button>`));
    state.brand.forEach((v) => chips.push(`<button class="chip" data-rm="brand" data-v="${esc(v)}" aria-label="Hapus filter ${esc(v)}">Merk: ${esc(v)} ${x}</button>`));
    if (state.stock) chips.push(`<button class="chip" data-rm="stock" aria-label="Hapus filter stok">Ada stok ${x}</button>`);
    if (chips.length > 1) chips.push(`<button class="chip chip--clear" data-rm="all">Hapus semua</button>`);
    $("#activeChips").innerHTML = chips.join("");
    const n = state.cat.size + state.make.size + state.brand.size + (state.stock ? 1 : 0);
    const b = $("#filterBadge");
    b.hidden = !n;
    b.textContent = n;
  }

  // ---------- Render produk ----------
  function card(p) {
    const st = stockInfo(p.stock);
    const img = p.img[0]
      ? `<img src="${IMG + p.img[0]}_tn" alt="" loading="lazy" decoding="async" width="300" height="300" onerror="this.onerror=null;this.src='${IMG + p.img[0]}'">`
      : `<div class="noimg">${svg(IC.lainnya, "ico ico--xl")}</div>`;
    const flag = p.makes.length ? `<span class="card__flag">${esc(p.makes.slice(0, 2).join(" · "))}</span>` : "";
    return `<li><article class="card">
      <div class="card__media">${img}${flag}</div>
      <div class="card__body">
        <span class="card__brand">${esc(p.brand || "")}</span>
        <h3 class="card__title"><a href="${pageUrl(p)}" data-open="${p.id}">${esc(p.name)}</a></h3>
        <p class="card__price">${priceText(p)}</p>
        <div class="card__meta"><span class="stock ${st.cls}">${st.text}</span>${p.var.length > 1 ? `<span class="card__vars">${p.var.length} varian</span>` : ""}</div>
      </div></article></li>`;
  }

  function renderGrid(append) {
    const grid = $("#productGrid");
    const from = append ? grid.children.length : 0;
    const slice = results.slice(from, state.shown);
    if (append) grid.insertAdjacentHTML("beforeend", slice.map(card).join(""));
    else grid.innerHTML = slice.map(card).join("");
    grid.setAttribute("aria-busy", "false");
    const total = results.length;
    $("#resultCount").innerHTML = total
      ? `Menampilkan <b>${Math.min(state.shown, total).toLocaleString("id-ID")}</b> dari <b>${total.toLocaleString("id-ID")}</b> produk`
      : "0 produk";
    $("#emptyState").hidden = total > 0;
    $("#moreWrap").hidden = state.shown >= total;
    $("#moreInfo").textContent = `Masih ada ${(total - state.shown).toLocaleString("id-ID")} produk lagi`;
    $("#applyCount").textContent = total.toLocaleString("id-ID");
  }

  function update(opts = {}) {
    if (!opts.keepPage) state.shown = PAGE;
    const base = compute();
    renderFilters(base);
    renderChips();
    renderGrid(false);
    syncURL();
  }

  // ---------- URL (bisa dibagikan & tombol Back berfungsi) ----------
  function syncURL() {
    const u = new URLSearchParams();
    if (state.q) u.set("q", state.q);
    if (state.cat.size) u.set("kategori", [...state.cat].join(","));
    if (state.make.size) u.set("mobil", [...state.make].join(","));
    if (state.brand.size) u.set("merk", [...state.brand].join(","));
    if (state.stock) u.set("stok", "1");
    if (state.sort !== "relevan") u.set("urut", state.sort);
    const cur = new URLSearchParams(location.search);
    if (cur.get("p")) u.set("p", cur.get("p"));
    const s = u.toString();
    history.replaceState(history.state, "", s ? "?" + s : location.pathname + location.hash);
  }

  function readURL() {
    const u = new URLSearchParams(location.search);
    state.q = u.get("q") || "";
    state.cat = new Set((u.get("kategori") || "").split(",").filter(Boolean));
    state.make = new Set((u.get("mobil") || "").split(",").filter(Boolean));
    state.brand = new Set((u.get("merk") || "").split(",").filter(Boolean));
    state.stock = u.get("stok") === "1";
    state.sort = u.get("urut") || "relevan";
    $("#searchInput").value = state.q;
    $("#sortSelect").value = state.sort;
    return u.get("p");
  }

  const toCatalog = () => {
    const k = $("#katalog");
    k.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // ---------- Kategori & merk di beranda ----------
  function renderHome() {
    const cc = {}; const mc = {};
    DATA.forEach((p) => { cc[p.cat] = (cc[p.cat] || 0) + 1; p.makes.forEach((m) => (mc[m] = (mc[m] || 0) + 1)); });
    $("#catGrid").innerHTML = CATS.filter(([k]) => cc[k] && k !== "lainnya").map(([k, l]) => `
      <button class="cat" type="button" data-cat="${k}"><span class="cat__ico">${svg(IC[k])}</span><strong>${l}</strong><span class="cat__n">${cc[k]} produk</span></button>`).join("");
    $("#makeRow").innerHTML = Object.entries(mc).filter(([, n]) => n >= 5).sort((a, b) => b[1] - a[1]).map(([m, n]) => `
      <button class="make" type="button" data-make="${esc(m)}">${svg('<use href="#i-car"/>')} ${esc(m)} <small>${n}</small></button>`).join("");
    window.__reveal($("#kategori"));
    const count = Math.floor(DATA.length / 100) * 100;
    $$("[data-count]").forEach((e) => (e.textContent = count.toLocaleString("id-ID")));
    $$("[data-stat=cats]").forEach((e) => (e.textContent = CATS.filter(([k]) => cc[k] && k !== "lainnya").length));
    $("#updated").textContent = new Date(window.__updated).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    // contoh produk asli di hero
    const picks = DATA.filter((p) => p.img.length && p.stock > 0 && p.brand && p.brand !== "Original").slice(0, 60);
    const chosen = [];
    const seen = new Set();
    for (const p of picks) { if (!seen.has(p.cat)) { seen.add(p.cat); chosen.push(p); } if (chosen.length === 4) break; }
    $("#heroTiles").innerHTML = chosen.map((p) => `<a class="tile" href="${pageUrl(p)}" data-open="${p.id}"><span class="tile__img"><img src="${IMG + p.img[0]}_tn" alt="" width="300" height="300"></span><span class="tile__body"><span class="tile__name">${esc(p.name)}</span><span class="tile__price">${priceText(p)}</span></span></a>`).join("");
  }

  // ---------- Detail produk ----------
  const dlg = $("#productDialog");
  let cur = null, imgIdx = 0, varIdx = -1, lastFocus = null;

  function setImg(i) {
    if (!cur.img.length) { $("#pdImg").removeAttribute("src"); $("#pdImg").alt = "Foto belum tersedia"; return; }
    imgIdx = (i + cur.img.length) % cur.img.length;
    $("#pdImg").src = IMG + cur.img[imgIdx];
    $("#pdImg").alt = cur.name + " — foto " + (imgIdx + 1);
    $("#pdCounter").textContent = imgIdx + 1 + " / " + cur.img.length;
    $$("#pdThumbs button").forEach((b, j) => b.setAttribute("aria-current", j === imgIdx));
  }

  function setVar(i) {
    varIdx = i;
    const p = cur;
    const v = p.var[i];
    $$("#pdVars .var").forEach((b, j) => b.setAttribute("aria-checked", j === i));
    $("#pdPrice").textContent = v ? rupiah(v.p) : priceText(p);
    const st = stockInfo(v ? v.s : p.stock);
    $("#pdStock").innerHTML = `<span class="stock ${st.cls}">${st.text}</span>${v ? ` <span class="muted">· varian ${esc(v.n)}</span>` : ""}`;
  }

  function openProduct(id, push = true) {
    const p = DATA.find((x) => x.id === String(id));
    if (!p) return;
    cur = p;
    lastFocus = document.activeElement;
    $("#pdCrumbs").textContent = "Katalog › " + p._cat;
    $("#pdTitle").textContent = p.name;
    $("#pdTags").innerHTML = (p.brand ? `<span class="tag tag--brand">${esc(p.brand)}</span>` : "") + p.makes.map((m) => `<span class="tag">${esc(m)}</span>`).join("");
    $("#pdThumbs").innerHTML = p.img.map((h, j) => `<button type="button" role="listitem" aria-label="Lihat foto ${j + 1}"><img src="${IMG + h}_tn" alt="" loading="lazy"></button>`).join("");
    $$("#pdThumbs button").forEach((b, j) => b.addEventListener("click", () => setImg(j)));
    const multi = p.img.length > 1;
    $("#pdPrev").hidden = $("#pdNext").hidden = $("#pdCounter").hidden = $("#pdThumbs").hidden = !multi;
    setImg(0);
    $("#pdVarsWrap").hidden = !p.var.length;
    $("#pdVars").innerHTML = p.var.map((v, j) => `<button type="button" class="var" role="radio" aria-checked="false" data-out="${v.s <= 0 ? 1 : 0}" data-i="${j}">${esc(v.n || "Standar")}</button>`).join("");
    const firstIn = p.var.findIndex((v) => v.s > 0);
    setVar(p.var.length ? (p.var.length === 1 ? 0 : -1) : -1);
    if (p.var.length > 1) { $("#pdPrice").textContent = priceText(p); }
    $("#pdShopee").href = shopeeProduct(p.id);
    $("#pdDesc").textContent = p.desc || "Hubungi kami untuk detail produk.";
    if (push) history.pushState({ p: p.id }, "", "?" + withParam("p", p.id));
    document.title = p.name + " | ASJ Autoparts";
    if (!dlg.open) dlg.showModal();
    $("#pdClose").focus();
    void firstIn;
  }

  function withParam(k, v) {
    const u = new URLSearchParams(location.search);
    if (v == null) u.delete(k); else u.set(k, v);
    return u.toString();
  }

  function closeProduct(fromPop) {
    if (!dlg.open) return;
    dlg.close();
    document.title = "ASJ Autoparts Jember | Spare Part Mobil & Truk Lengkap";
    if (!fromPop) {
      if (history.state && history.state.p) history.back();
      else history.replaceState(null, "", "?" + withParam("p", null));
    }
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function initDialog() {
    $("#pdClose").addEventListener("click", () => closeProduct());
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeProduct(); });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeProduct(); });
    $("#pdPrev").addEventListener("click", () => setImg(imgIdx - 1));
    $("#pdNext").addEventListener("click", () => setImg(imgIdx + 1));
    dlg.addEventListener("keydown", (e) => {
      if (e.target.closest("input,select,textarea")) return;
      if (e.key === "ArrowLeft") setImg(imgIdx - 1);
      if (e.key === "ArrowRight") setImg(imgIdx + 1);
    });
    // geser foto di HP
    let sx = null;
    $(".pd__main").addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
    $(".pd__main").addEventListener("touchend", (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) setImg(imgIdx + (dx < 0 ? 1 : -1));
      sx = null;
    });
    $("#pdVars").addEventListener("click", (e) => { const b = e.target.closest(".var"); if (b) setVar(+b.dataset.i); });
    $("#pdShare").addEventListener("click", async () => {
      const url = productUrl(cur);
      if (navigator.share) { try { await navigator.share({ title: cur.name, text: cur.name + " — " + priceText(cur), url }); } catch (_) { /* dibatalkan */ } }
      else { try { await navigator.clipboard.writeText(url); toast("Link produk disalin"); } catch (_) { prompt("Salin link ini:", url); } }
    });
    window.addEventListener("popstate", () => {
      const id = new URLSearchParams(location.search).get("p");
      if (id) openProduct(id, false); else closeProduct(true);
    });
  }

  // ---------- Event katalog ----------
  function initCatalog() {
    const run = debounce(() => { state.q = $("#searchInput").value.trim(); update(); }, 220);
    $("#searchInput").addEventListener("input", run);
    $("#searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.q = $("#searchInput").value.trim();
      update();
      toCatalog();
      $("#searchInput").blur();
    });
    $("#sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; update(); });
    $("#filters").addEventListener("change", (e) => {
      const t = e.target;
      if (t.id === "fStock") state.stock = t.checked;
      else if (t.name) { const s = state[t.name]; t.checked ? s.add(t.value) : s.delete(t.value); }
      update();
    });
    const reset = () => { state.q = ""; $("#searchInput").value = ""; state.cat.clear(); state.make.clear(); state.brand.clear(); state.stock = false; update(); };
    $("#filtersReset").addEventListener("click", reset);
    $("#emptyReset").addEventListener("click", reset);
    $("#activeChips").addEventListener("click", (e) => {
      const c = e.target.closest(".chip"); if (!c) return;
      const k = c.dataset.rm;
      if (k === "all") return reset();
      if (k === "q") { state.q = ""; $("#searchInput").value = ""; }
      else if (k === "stock") state.stock = false;
      else state[k].delete(c.dataset.v);
      update();
    });
    $("#loadMore").addEventListener("click", () => {
      const before = $("#productGrid").children.length;
      state.shown += PAGE;
      renderGrid(true);
      const first = $("#productGrid").children[before];
      if (first) first.querySelector("a").focus({ preventScroll: true });
    });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-open]");
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      openProduct(a.dataset.open);
    });
    $("#catGrid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      state.cat = new Set([b.dataset.cat]); update(); toCatalog();
    });
    $("#makeRow").addEventListener("click", (e) => {
      const b = e.target.closest("[data-make]"); if (!b) return;
      state.make = new Set([b.dataset.make]); update(); toCatalog();
    });

    // Drawer filter (HP)
    const f = $("#filters"), bd = $("#filtersBackdrop");
    const openF = () => { f.classList.add("is-open"); bd.hidden = false; document.body.classList.add("no-scroll"); $("#filtersClose").focus(); };
    const closeF = () => { f.classList.remove("is-open"); bd.hidden = true; document.body.classList.remove("no-scroll"); $("#filtersOpen").focus(); };
    $("#filtersOpen").addEventListener("click", openF);
    $("#filtersClose").addEventListener("click", closeF);
    $("#filtersApply").addEventListener("click", () => { closeF(); toCatalog(); });
    bd.addEventListener("click", closeF);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && f.classList.contains("is-open")) closeF(); });

    // Tekan "/" untuk langsung mencari (shortcut pengguna mahir)
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !e.target.closest("input,textarea,select") && !dlg.open) { e.preventDefault(); $("#searchInput").focus(); }
    });
  }

  function skeleton() {
    $("#productGrid").innerHTML = Array.from({ length: 8 }, () => `<li><div class="card card--skel"><div class="card__media skel"></div><div class="card__body"><div class="line skel" style="width:40%"></div><div class="line skel"></div><div class="line skel" style="width:70%"></div><div class="line skel" style="width:50%;height:18px"></div></div></div></li>`).join("");
  }

  async function init() {
    initStatic();
    initDialog();
    initCatalog();
    skeleton();
    try {
      const res = await fetch("data/products.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      const json = await res.json();
      IMG = json.imgBase;
      window.__updated = json.updated;
      DATA = json.products.map(prep);
    } catch (err) {
      $("#productGrid").innerHTML = "";
      $("#resultCount").textContent = "";
      const em = $("#emptyState");
      em.hidden = false;
      em.querySelector("h3").textContent = "Katalog gagal dimuat";
      em.querySelector("p").textContent = "Periksa koneksi internet lalu muat ulang halaman. Anda juga bisa langsung melihat produk kami di Shopee.";
      $("#emptyReset").textContent = "Muat ulang";
      $("#emptyReset").onclick = () => location.reload();
      console.error(err);
      return;
    }
    renderHome();
    const pid = readURL();
    update();
    if (pid) openProduct(pid, false);
    if (location.search && !pid && (state.q || state.cat.size || state.make.size || state.brand.size)) toCatalog();
  }

  init();
})();
