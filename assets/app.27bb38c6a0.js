(function () {
var EP = "https://formsubmit.co/b2bd32dd5392f93db7249dfc282c8bf9", MODE = "formsubmit", READY = /^https:\/\//.test(EP);
var Q = new URLSearchParams(location.search);
var OP = window.OP = window.OP || { form: "", field: "", sent: 0 };
var UK = ["utm_source", "utm_medium", "utm_campaign"], U = null;
try { U = JSON.parse(sessionStorage.getItem("op_utm") || "null"); } catch (e) { U = null; }
if (!U && UK.some(function (k) { return Q.get(k); })) {
U = {}; UK.forEach(function (k) { U[k] = (Q.get(k) || "").replace(/[^\w.-]/g, "").slice(0, 60); });
try { sessionStorage.setItem("op_utm", JSON.stringify(U)); } catch (e) {}
}
OP.utm = U || {};
var SRC = null;
try { SRC = JSON.parse(sessionStorage.getItem("op_src") || "null"); } catch (e) { SRC = null; }
if (!SRC) {
var rh = ""; try { rh = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) { rh = ""; }
SRC = { lp: location.pathname.replace(/[^\w\-.\/]/g, "").slice(0, 120), ref: rh === location.hostname ? "" : rh.replace(/[^a-z0-9.\-]/gi, "").slice(0, 100) };
try { sessionStorage.setItem("op_src", JSON.stringify(SRC)); } catch (e) {}
}
OP.src = SRC;
OP.events = [];
var track = OP.track = function (name, props) {
props = props || {}; props.page = location.pathname; OP.events.push([name, props]);
try { if (window.plausible) window.plausible(name, { props: props }); else if (window.gtag) window.gtag("event", name, props); } catch (e) {}
};
document.addEventListener("click", function (e) {
var el = e.target.closest && e.target.closest("a,button"); if (!el) return;
var h = el.getAttribute("href") || "";
if (/^tel:/.test(h)) track("Call Click", { where: el.closest(".bookbar") ? "bar" : el.closest(".site-header,.callstrip") ? "header" : "page" });
else if (el.hasAttribute("data-book")) track("Book Open", { where: el.closest(".bookbar") ? "bar" : "header" });
else if (/\/audit\/?(#|$)/.test(h)) track("Audit Click", {});
});
var dds = [].slice.call(document.querySelectorAll("details[data-dd]"));
dds.forEach(function (d) {
d.addEventListener("toggle", function () {
if (d.open) dds.forEach(function (o) { if (o !== d) o.open = false; });
var sm = d.querySelector("summary"); if (sm.dataset.open) sm.setAttribute("aria-label", d.open ? sm.dataset.close : sm.dataset.open);
});
});
document.addEventListener("click", function (e) { dds.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; }); });
document.addEventListener("keydown", function (e) {
if (e.key === "Escape") dds.forEach(function (d) { if (d.open) { d.open = false; d.querySelector("summary").focus(); } });
});
[].forEach.call(document.querySelectorAll(".mnav-panel a"), function (a) {
a.addEventListener("click", function () { a.closest("details").open = false; });
});
var sheet = document.getElementById("book-sheet");
[].forEach.call(document.querySelectorAll("[data-book]"), function (b) {
b.addEventListener("click", function (e) {
if (!sheet || typeof sheet.showModal !== "function") return;
e.preventDefault(); sheet.showModal(); OP.form = "quick"; var n = sheet.querySelector("input[name=name]"); if (n) n.focus();
});
});
if (sheet) {
var busy = function () { return !!sheet.querySelector("form[data-busy]"); };
sheet.querySelector("[data-close]").addEventListener("click", function () { if (!busy()) sheet.close(); });
sheet.addEventListener("click", function (e) { if (e.target === sheet && !busy()) sheet.close(); });
sheet.addEventListener("cancel", function (e) { if (busy()) e.preventDefault(); });
}
var CALL = '<a href="tel:+16307650559">(630) 765-0559</a>';
var FAIL = "Your request didn't send. Please try again, or call Nathan at " + CALL + ".";
var OFFLINE = "You look offline. Your answers are still here. Try again when you're back online, or call Nathan at " + CALL + ".";
var AJAX = MODE === "formsubmit" ? EP.replace(/formsubmit\.co\/(?!ajax\/)/, "formsubmit.co/ajax/") : EP;
[].forEach.call(document.querySelectorAll("form.lead"), function (f) {
if (f.response) f.response.value = "json";
f.page.value = location.pathname;
f.noValidate = true;
UK.forEach(function (k) { f[k].value = OP.utm[k] || ""; });
if (f.landing_page) { f.landing_page.value = OP.src.lp || ""; f.referrer.value = OP.src.ref || ""; }
var st = f.querySelector(".status"), btn = f.querySelector("button[type=submit]"), lab = btn.textContent;
function show(el, msg) {
var er = document.getElementById((el.id || "") + "-e");
if (er) { er.textContent = msg; er.hidden = !msg; }
el.setAttribute("aria-invalid", msg ? "true" : "false");
}
function check(el) {
if (el.hidden) { show(el, ""); return true; }
if (el.dataset.group) { var g = !!f.querySelector('input[name="' + el.dataset.group + '"]:checked'); show(el, g ? "" : el.dataset.err); return g; }
var v = el.value.trim(), ok;
if (el.type === "checkbox") ok = el.checked;
else if (el.name === "phone") ok = v.replace(/\D/g, "").length >= 10;
else if (el.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
else if (el.name === "website") ok = /^(https?:\/\/)?[^\s\/.]+(\.[^\s\/.]+)+(\/\S*)?$/i.test(v);
else ok = !!v;
show(el, ok ? "" : el.dataset.err); return ok;
}
var items = [].slice.call(f.querySelectorAll("input.in,fieldset[data-group],input[type=checkbox][name=consent]"));
var bt = f.querySelector('fieldset[data-group="best_time"]'), dl = f.querySelector('fieldset[data-group="delivery"]');
if (bt && dl) {
var syncBT = function () {
var em = !!f.querySelector('input[name="delivery"][value^="Email"]:checked');
bt.hidden = em; if (em) [].forEach.call(bt.querySelectorAll("input"), function (i) { i.checked = false; });
};
dl.addEventListener("change", syncBT); syncBT();
}
items.forEach(function (el) {
el.addEventListener(el.dataset.group || el.type === "checkbox" ? "change" : "input", function () { if (el.getAttribute("aria-invalid") === "true") check(el); });
});
var startEv = function () { if (!f.dataset.started) { f.dataset.started = "1"; track("Form Start", { form: f.dataset.formType }); } };
f.addEventListener("input", startEv); f.addEventListener("change", startEv);
f.addEventListener("focusin", function (e) {
var n = e.target && e.target.name;
if (!n || n.charAt(0) === "_" || n === "hp_note") return;
OP.form = f.dataset.formType; OP.field = n;
});
function fail(msg) {
track("Form Error", { form: f.dataset.formType }); delete f.dataset.busy; st.innerHTML = msg; st.hidden = false; btn.disabled = false; btn.textContent = lab; st.focus();
}
f.addEventListener("submit", function (ev) {
ev.preventDefault();
if (f.dataset.busy) return;
var bad = null, n = 0;
items.forEach(function (el) { if (!check(el)) { n++; if (!bad) bad = el; } });
if (bad) { st.textContent = n > 1 ? "A few things need fixing before this can send. They're marked below." : ""; st.hidden = n < 2; (bad.dataset.group ? bad.querySelector("input") : bad).focus(); return; }
if (navigator.onLine === false) { fail(OFFLINE); return; }
if (!READY) { fail("Preview only: the form is not connected yet. On the live site your request goes straight to Nathan."); return; }
f.dataset.busy = "1"; btn.disabled = true; btn.textContent = "Sending\u2026"; st.hidden = true;
var FS = MODE === "formsubmit", WAIT = FS ? 60000 : 15000, H = { Accept: "application/json" }, body;
if (FS) {
var o = {}; new FormData(f).forEach(function (v, k) { o[k] = o[k] ? o[k] + ", " + v : v; });
body = JSON.stringify(o); H["Content-Type"] = "application/json";
} else body = new URLSearchParams(new FormData(f));
var slow = setTimeout(function () { if (f.dataset.busy) btn.textContent = "Still sending… please keep this page open"; }, 8000);
var ac = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { clearTimeout(slow); if (ac) ac.abort(); fail(FAIL); }, WAIT), done = false;
fetch(AJAX, { method: "POST", headers: H, body: body, signal: ac ? ac.signal : undefined })
.then(function (r) { return r.json().then(function (d) { return r.ok && d && (d.ok === true || d.success === true || d.success === "true"); }, function () { return false; }); })
.then(function (ok) {
clearTimeout(tm); clearTimeout(slow); if (done) return; done = true;
if (!ok) throw 0;
OP.sent = 1; delete f.dataset.busy;
track("Lead Sent", { form: f.dataset.formType });
var t = f.parentNode.querySelector(".thanks"); f.hidden = true; t.hidden = false; t.querySelector("h3").focus();
})
.catch(function () { clearTimeout(tm); clearTimeout(slow); if (done && OP.sent) return; done = true; fail(navigator.onLine === false ? OFFLINE : FAIL); });
});
});
})();
(function () {
var D = document, R = D.documentElement;
var MOTION = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
if (!MOTION || !("IntersectionObserver" in window)) { R.classList.remove("js"); R.classList.add("no-motion"); return; }
R.classList.add("js");
var io = new IntersectionObserver(function (es) {
es.forEach(function (e) {
if (!e.isIntersecting) return;
var el = e.target; el.classList.add("shown"); io.unobserve(el);
setTimeout(function () { el.classList.remove("rv"); }, 1200);
if (el.hasAttribute("data-count")) count(el);
if (el.classList.contains("punch")) ticks(el);
});
}, { rootMargin: "0px 0px -4% 0px", threshold: 0.05 });
[].forEach.call(D.querySelectorAll(".rv,[data-count],.punch"), function (el) { io.observe(el); });
function count(el) {
var to = parseInt(el.getAttribute("data-count"), 10), t0 = null, dur = 900;
if (isNaN(to)) return;
function step(t) {
if (!t0) t0 = t;
var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
el.textContent = Math.round(to * k);
if (k < 1) requestAnimationFrame(step); else el.textContent = to;
}
requestAnimationFrame(step);
}
function ticks(p) {
var rows = p.querySelectorAll("li");
[].forEach.call(rows, function (li, i) { setTimeout(function () { li.classList.add("done"); }, 350 + i * 420); });
setTimeout(function () { p.classList.add("signed"); }, 350 + rows.length * 420 + 200);
}
var sweeping = false;
addEventListener("scroll", function () {
if (sweeping) return; sweeping = true;
requestAnimationFrame(function () {
sweeping = false; var vh = innerHeight;
[].forEach.call(D.querySelectorAll(".rv:not(.shown)"), function (el) { if (el.getBoundingClientRect().top < vh * 0.96) { el.classList.add("shown"); io.unobserve(el); setTimeout(function () { el.classList.remove("rv"); }, 1200); } });
});
}, { passive: true });
D.addEventListener("focusin", function (e) { var r = e.target.closest && e.target.closest(".rv,.punch"); if (r) { r.classList.add("shown"); r.classList.remove("rv"); } });
var prog = D.querySelector("[data-progress]");
if (prog) {
var ticking = false;
function upd() {
ticking = false;
var r = prog.getBoundingClientRect(), vh = innerHeight;
var k = (vh * 0.75 - r.top) / Math.max(1, r.height); k = Math.max(0, Math.min(1, k));
prog.style.setProperty("--p", k.toFixed(3));
}
addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
upd();
}
var hb = D.querySelector(".hero-bg");
if (hb) {
var hp = false;
function par() { hp = false; var y = Math.min(600, scrollY); hb.style.transform = "translate3d(0," + (y * 0.25) + "px,0)"; }
addEventListener("scroll", function () { if (!hp) { hp = true; requestAnimationFrame(par); } }, { passive: true });
}
})();
(function () {
try {
var D = document;
var MOTION = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
var WEEKS = 50;
var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
[].forEach.call(D.querySelectorAll("[data-calc]"), function (box) {
var names = ["slipped", "close", "job"], rng = {}, num = {}, val = {};
for (var i = 0; i < names.length; i++) {
var n = names[i];
rng[n] = box.querySelector('input[type=range][name="' + n + '"]');
if (!rng[n]) return;
num[n] = box.querySelector('input[data-pair="' + rng[n].id + '"]');
val[n] = +rng[n].value;
}
var outs = {}; [].forEach.call(box.querySelectorAll("[data-out]"), function (el) { outs[el.getAttribute("data-out")] = el; });
var sr = box.querySelector("[data-sr]"), lab = box.querySelector("[data-label]");
var mine = function () { if (lab) lab.textContent = "With your numbers, those customers add up to"; };
var shown = {}, raf = {}, srT;
function tween(key, to) {
var el = outs[key]; if (!el) return;
var from = shown[key] == null ? to : shown[key]; shown[key] = to;
if (!MOTION || from === to) { el.textContent = money(to); return; }
cancelAnimationFrame(raf[key]); var t0 = null, dur = 450;
raf[key] = requestAnimationFrame(function step(t) {
if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
el.textContent = money(from + (to - from) * k);
if (k < 1) raf[key] = requestAnimationFrame(step); else el.textContent = money(to);
});
}
function calc() {
var each = val.close / 10 * val.job, year = val.slipped * each * WEEKS;
tween("year", year); tween("month", year / 12); tween("each", each);
if (outs.math) outs.math.textContent = val.slipped + (val.slipped === 1 ? " customer" : " customers") + " a week × " + val.close + " in 10 hire you × " + money(val.job) + " a job × " + WEEKS + " working weeks";
if (sr) { clearTimeout(srT); srT = setTimeout(function () { sr.textContent = money(year) + " a year, " + money(year / 12) + " a month."; }, 700); }
}
names.forEach(function (n) {
var r = rng[n], b = num[n];
r.addEventListener("input", function () { mine(); val[n] = +r.value; if (b) b.value = r.value; calc(); });
if (!b) return;
b.addEventListener("input", function () {
mine(); var v = parseFloat(b.value); if (isNaN(v)) return;
val[n] = clamp(v, +r.min, +r.max); r.value = val[n]; calc();
});
b.addEventListener("blur", function () {
var v = parseFloat(b.value); if (isNaN(v)) v = val[n];
val[n] = clamp(Math.round(v), +b.min, +b.max); b.value = val[n]; r.value = val[n]; calc();
});
});
var outBox = box.querySelector(".calc-out");
if (MOTION && outBox && "IntersectionObserver" in window) {
["year", "month", "each"].forEach(function (k) { shown[k] = 0; if (outs[k]) outs[k].textContent = money(0); });
var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); calc(); } }, { threshold: 0.3 });
io.observe(outBox);
} else calc();
});
[].forEach.call(D.querySelectorAll("[data-check]"), function (box) {
var n = box.querySelector("[data-check-n]"), msg = box.querySelector("[data-check-msg]");
if (!n || !msg) return;
var boxes = box.querySelectorAll("input[type=checkbox]");
function upd() {
var k = 0; [].forEach.call(boxes, function (b) { if (b.checked) k++; });
n.textContent = k;
msg.textContent = k === 0 ? box.getAttribute("data-r0") : k === 1 ? box.getAttribute("data-r1") : k + " " + box.getAttribute("data-rn");
}
[].forEach.call(boxes, function (b) { b.addEventListener("change", upd); });
upd();
});
} catch (e) {  }
})();
