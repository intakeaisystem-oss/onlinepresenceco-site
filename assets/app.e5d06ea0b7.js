(function () {
function fix(img) { var fb = img.getAttribute("data-fb"); img.removeAttribute("srcset"); if (fb) { img.src = fb; img.removeAttribute("data-fb"); } else img.style.display = "none"; }
[].forEach.call(document.querySelectorAll("img[data-fb]"), function (img) {
if (img.complete && img.naturalWidth === 0 && img.currentSrc) fix(img);
img.addEventListener("error", function () { if (img.hasAttribute("data-fb")) fix(img); });
});
})();
(function () {
var D = document, H = D.documentElement;
function $(s, r) { return (r || D).querySelector(s); }
function $$(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
var dds = $$("details[data-dd]");
dds.forEach(function (d) {
d.addEventListener("toggle", function () {
if (d.open) dds.forEach(function (o) { if (o !== d) o.open = false; });
if (d.classList.contains("mnav")) H.classList.toggle("menu-open", d.open);
});
});
D.addEventListener("click", function (e) { dds.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; }); });
D.addEventListener("keydown", function (e) { if (e.key === "Escape") dds.forEach(function (d) { if (d.open) { d.open = false; var s = $("summary", d); if (s) s.focus(); } }); });
$$("[data-mnav-close]").forEach(function (x) { x.addEventListener("click", function () { var d = x.closest("details"); if (d) d.open = false; }); });
$$(".mnav-panel a").forEach(function (a) { a.addEventListener("click", function () { var d = a.closest("details"); if (d) d.open = false; }); });
var LJ = null; try { LJ = JSON.parse(($("#g-langs") || {}).textContent || "null"); } catch (e) { LJ = null; }
$$("a[data-lang]").forEach(function (a) { a.addEventListener("click", function () { store("opc_lang", a.getAttribute("data-lang")); }); });
if (LJ && !store("opc_lang") && !sstore("opc_lang_dismiss")) {
var want = null, nl = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]);
for (var i = 0; i < nl.length && !want; i++) {
var b = String(nl[i] || "").toLowerCase();
if (/^zh-(tw|hk|mo)|^zh-hant/.test(b)) want = "zh-hant";
else if (/^zh/.test(b)) want = "zh";
else { var p = b.split("-")[0]; if (LJ.langs[p]) want = p; }
}
if (want && want !== LJ.cur && LJ.langs[want]) {
var bar = $("#g-suggest"), info = LJ.langs[want];
if (bar) {
$("[data-msg]", bar).textContent = info.msg;
var go = $("[data-go]", bar); go.textContent = info.go; go.href = info.url; go.setAttribute("lang", info.html);
var st = $("[data-stay]", bar); st.textContent = info.stay;
go.addEventListener("click", function () { store("opc_lang", want); });
st.addEventListener("click", function () { sstore("opc_lang_dismiss", "1"); bar.hidden = true; });
bar.hidden = false;
}
}
}
var xs = $$(".xr");
if ("IntersectionObserver" in window && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("xin"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
xs.forEach(function (x, i) { x.style.transitionDelay = (Math.min(i % 4, 3) * 60) + "ms"; io.observe(x); });
} else xs.forEach(function (x) { x.classList.add("xin"); });
setTimeout(function () { xs.forEach(function (x) { x.classList.add("xin"); }); }, 2500);
$$("[data-cycle]").forEach(function (ph) {
var im = $$("img", ph), k = 0; if (im.length < 2) return;
setInterval(function () { im[k].classList.remove("on"); k = (k + 1) % im.length; im[k].classList.add("on"); }, 3200);
});
var LOC = H.lang || "en";
function fmt(n, d) { try { return n.toLocaleString(LOC, { maximumFractionDigits: d, minimumFractionDigits: 0 }); } catch (e) { return String(Math.round(n * 10) / 10); } }
function fin(n) { return String(Math.round(n * 10) / 10); }
function num(v) { v = String(v || "").replace(/\s/g, "").replace(",", "."); var n = parseFloat(v); return isFinite(n) && n > 0 ? n : NaN; }
var TJ = null; try { TJ = JSON.parse(($("#g-tools") || {}).textContent || "null"); } catch (e) { TJ = null; }
var cf = $("[data-calc]");
if (cf && TJ) {
var out = $("[data-calc-out]");
var unit = function () { return ($("input[name=u]:checked", cf) || {}).value || "m"; };
$$("input[name=u]", cf).forEach(function (r) {
r.addEventListener("change", function () {
var im = unit() === "i";
$$("[data-ul]", cf).forEach(function (s) { s.textContent = im ? "in" : "cm"; });
$$("[data-uw]", cf).forEach(function (s) { s.textContent = im ? "lb" : "kg"; });
["l", "w", "h"].forEach(function (k) { var e = cf.elements[k], n = num(e.value); if (n) e.value = fin(im ? n / 2.54 : n * 2.54); });
var e2 = cf.elements.kg, n2 = num(e2.value); if (n2) e2.value = fin(im ? n2 * 2.20462 : n2 / 2.20462);
calc();
});
});
var calc = function () {
var im = unit() === "i", L = num(cf.elements.l.value), W = num(cf.elements.w.value), Hh = num(cf.elements.h.value), Wt = num(cf.elements.kg.value), N = Math.max(1, Math.round(num(cf.elements.n.value) || 1));
if (!(L && W && Hh && Wt)) { $$("dd", out).forEach(function (d) { d.textContent = "–"; }); return; }
var cm = im ? [L * 2.54, W * 2.54, Hh * 2.54] : [L, W, Hh], kg = im ? Wt / 2.20462 : Wt;
var cm3 = cm[0] * cm[1] * cm[2], m3 = cm3 / 1e6 * N, mode = cf.elements.mode.value;
var dimKg = mode === "sea" ? m3 * 1000 : cm3 / parseFloat(mode) * N, actKg = kg * N, bill = Math.max(dimKg, actKg);
var both = function (k) { return fmt(k, 1) + " kg · " + fmt(k * 2.20462, 1) + " lb"; };
var o = function (k, v) { var e = $("[data-o=" + k + "]", out); if (e) e.textContent = v; };
o("size", fmt(cm[0], 1) + " × " + fmt(cm[1], 1) + " × " + fmt(cm[2], 1) + " cm · " + fmt(cm[0] / 2.54, 1) + " × " + fmt(cm[1] / 2.54, 1) + " × " + fmt(cm[2] / 2.54, 1) + " in");
o("vol", fmt(m3, 3) + " m³ · " + fmt(m3 * 35.3147, 2) + " ft³");
o("act", both(actKg)); o("dim", both(dimKg)); o("bill", both(bill));
o("why", dimKg > actKg ? TJ.why_dim : TJ.why_real);
};
cf.addEventListener("submit", function (e) { e.preventDefault(); calc(); });
cf.addEventListener("input", calc); cf.addEventListener("change", calc);
calc();
}
var gf = $("[data-gap]");
if (gf && TJ) {
gf.addEventListener("submit", function (e) {
e.preventDefault();
var n = TJ.q.length, ans = [], miss = 0;
for (var i = 0; i < n; i++) { var c = $("input[name=q" + i + "]:checked", gf); if (!c) miss++; ans.push(c ? c.value === "1" : null); }
var err = $("[data-gap-err]"); err.hidden = !miss; if (miss) { err.scrollIntoView({ block: "center" }); return; }
var yes = ans.filter(Boolean).length, box = $("[data-gap-out]");
$("[data-score]", box).textContent = yes;
$("[data-band]", box).textContent = yes <= 5 ? TJ.low : yes <= 9 ? TJ.mid : TJ.high;
var fx = $("[data-fixes]", box); fx.innerHTML = "";
var gaps = []; ans.forEach(function (a, i) { if (!a) gaps.push(i); });
if (!gaps.length) { var li0 = D.createElement("li"); li0.textContent = TJ.none; fx.appendChild(li0); }
gaps.slice(0, 3).forEach(function (i) { var li = D.createElement("li"); li.textContent = TJ.q[i].fix; fx.appendChild(li); });
var lines = ["Gap check score: " + yes + "/" + n];
ans.forEach(function (a, i) { lines.push((a ? "YES" : "NO ") + " - " + TJ.q_en[i]); });
sstore("opc_gap", lines.join("\n"));
box.hidden = false; box.scrollIntoView({ behavior: "smooth", block: "start" });
});
}
var ff = $("[data-form]"), FJ = null; try { FJ = JSON.parse(($("#g-form") || {}).textContent || "null"); } catch (e) { FJ = null; }
if (ff && FJ) {
var q = new URLSearchParams(location.search), okBox = $("[data-ok]"), failBox = $("[data-fail]");
var gap = sstore("opc_gap");
if (gap && q.get("from") === "gap") { $("[data-gapfield]", ff).value = gap; var gn = $("[data-gapnote]", ff); gn.textContent = FJ.gapnote + " " + gap.split("\n")[0].replace("Gap check score: ", ""); gn.hidden = false; }
if (q.get("sent") === "1") { ff.hidden = true; okBox.hidden = false; }
var mailto = function () {
var fd = new FormData(ff), body = [];
["company", "name", "email", "country", "website", "whatsapp", "products", "message"].forEach(function (k) { var v = fd.get(k); if (v) body.push(k + ": " + v); });
var hw = fd.getAll("help_with"); if (hw.length) body.push("help_with: " + hw.join(", "));
var g = fd.get("gap_check_results"); if (g) body.push("\n" + g);
return "mailto:" + FJ.email + "?subject=" + encodeURIComponent("Gap check request - " + (fd.get("company") || "")) + "&body=" + encodeURIComponent(body.join("\n"));
};
ff.addEventListener("submit", function (e) {
e.preventDefault();
var err = $("[data-err]", ff), bad = null;
$$("[required]", ff).forEach(function (el) {
var v = el.type === "checkbox" ? el.checked : String(el.value || "").trim();
var ok = !!v && (el.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(el.value).trim()));
el.setAttribute("aria-invalid", ok ? "false" : "true"); if (!ok && !bad) bad = el;
});
if (bad) { err.textContent = bad.type === "email" && bad.value ? FJ.invalid_email : FJ.required; err.hidden = false; bad.focus(); return; }
err.hidden = true;
if (ff.elements._honey.value) { ff.hidden = true; okBox.hidden = false; return; }
var btn = $("[data-send]", ff), label = btn.textContent; btn.disabled = true; btn.textContent = FJ.sending;
var fd = new FormData(ff), data = {};
fd.forEach(function (v, k) { if (k === "_next") return; data[k] = data[k] ? data[k] + ", " + v : v; });
data._replyto = data.email;
data._subject = "Gap check request: " + (data.company || "") + " (" + (data.country || "") + ") [" + FJ.lang + "]";
var done = false, t = setTimeout(function () { if (!done) fail(); }, 30000);
function fail() { done = true; clearTimeout(t); btn.disabled = false; btn.textContent = label; $("[data-mailto]", failBox).href = mailto(); failBox.hidden = false; failBox.focus(); }
fetch("https://formsubmit.co/ajax/" + FJ.email, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
.then(function (r) { return r.json().catch(function () { return {}; }); })
.then(function (j) {
if (done) return; done = true; clearTimeout(t);
if (j && (j.success === true || j.success === "true")) { ff.hidden = true; failBox.hidden = true; okBox.hidden = false; okBox.focus(); sstore("opc_gap", null); }
else { done = false; fail(); }
})
.catch(function () { if (!done) fail(); });
});
}
})();
(function () {
var card = document.querySelector("[data-pcard]"); if (!card) return;
[].forEach.call(document.querySelectorAll("[data-pv]"), function (b) {
b.addEventListener("click", function () {
card.setAttribute("data-pcard", b.getAttribute("data-pv"));
[].forEach.call(document.querySelectorAll("[data-pv]"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
});
});
})();
(function () {
var D = document, W = window, RM = W.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
var bar = D.createElement("div"); bar.className = "g-progress"; D.body.appendChild(bar);
var h1 = D.querySelector("[data-words]");
if (h1 && !RM) {
var txt = h1.textContent, parts, cjk = /[぀-ヿ㐀-鿿가-힯]/.test(txt) && !/\s/.test(txt.trim());
if (W.Intl && Intl.Segmenter && cjk) { parts = [].map.call(Array.from(new Intl.Segmenter(D.documentElement.lang, { granularity: "word" }).segment(txt)), function (x) { return x.segment; }); }
else parts = txt.split(/(\s+)/);
h1.setAttribute("aria-label", txt); h1.textContent = "";
var i = 0;
parts.forEach(function (p) {
if (/^\s+$/.test(p)) { h1.appendChild(D.createTextNode(p)); return; }
var s = D.createElement("span"); s.className = "g-w"; s.setAttribute("aria-hidden", "true"); s.style.setProperty("--i", i++); s.textContent = p; h1.appendChild(s);
});
}
var vis = D.querySelector("[data-parallax]");
if (vis && !RM && W.matchMedia("(pointer:fine)").matches) {
var photo = vis.querySelector(".g-hero-photo"), fl = [].slice.call(vis.querySelectorAll("[data-depth]"));
vis.closest("section").addEventListener("pointermove", function (e) {
var r = vis.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
if (photo) { photo.style.setProperty("--px", (x * -10) + "px"); photo.style.setProperty("--py", (y * -10) + "px"); }
fl.forEach(function (f) { var d = +f.getAttribute("data-depth"); f.style.setProperty("--fx", (x * d) + "px"); f.style.setProperty("--fy", (y * d) + "px"); });
});
}
D.addEventListener("pointermove", function (e) {
var c = e.target.closest && e.target.closest(".g-spot"); if (!c) return;
var r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
});
var path = D.querySelector(".g-path"), pli = path ? [].slice.call(path.children) : [];
var steps = [].slice.call(D.querySelectorAll("[data-steps] li"));
var tick = false;
function onScroll() {
tick = false;
var st = W.scrollY, h = D.documentElement.scrollHeight - W.innerHeight;
bar.style.setProperty("--sp", h > 0 ? Math.min(1, st / h) : 0);
D.documentElement.classList.toggle("g-scrolled", st > 20);
if (path) {
var r = path.getBoundingClientRect(), vh = W.innerHeight, p = Math.max(0, Math.min(1, (vh * .85 - r.top) / (r.height + vh * .35)));
path.style.setProperty("--pp", p.toFixed(3));
pli.forEach(function (li, k) { li.classList.toggle("on", p >= (k + .5) / pli.length || RM); });
}
if (steps.length) {
var mid = W.innerHeight * .55, best = 0;
steps.forEach(function (li, k) { if (li.getBoundingClientRect().top < mid) best = k; });
steps.forEach(function (li, k) { li.classList.toggle("on", k <= best); });
}
}
W.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();
if (!RM && W.matchMedia("(pointer:fine)").matches) [].forEach.call(D.querySelectorAll("[data-magnet]"), function (b) {
b.addEventListener("pointermove", function (e) { var r = b.getBoundingClientRect(); b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * .15) + "px," + ((e.clientY - r.top - r.height / 2) * .25) + "px)"; });
b.addEventListener("pointerleave", function () { b.style.transform = ""; });
});
})();
