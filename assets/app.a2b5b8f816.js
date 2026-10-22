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
var CALL = '<a href="tel:+16307650559">(630) 765-0559</a>';
var FAIL = "Your request didn't send. Please try again, or call Nathan at " + CALL + ".";
var OFFLINE = "You look offline. Your answers are still here. Try again when you're back online, or call Nathan at " + CALL + ".";
var AJAX = MODE === "formsubmit" ? EP.replace(/formsubmit\.co\/(?!ajax\/)/, "formsubmit.co/ajax/") : EP;
[].forEach.call(document.querySelectorAll("form.lead"), function (f) {
if (f.response) f.response.value = "json";
f.page.value = location.pathname;
f.noValidate = true;
UK.forEach(function (k) { f[k].value = OP.utm[k] || ""; });
var st = f.querySelector(".status"), btn = f.querySelector("button[type=submit]"), lab = btn.textContent;
function show(el, msg) {
var er = document.getElementById((el.id || "") + "-e");
if (er) { er.textContent = msg; er.hidden = !msg; }
el.setAttribute("aria-invalid", msg ? "true" : "false");
}
function check(el) {
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
items.forEach(function (el) {
el.addEventListener(el.dataset.group || el.type === "checkbox" ? "change" : "input", function () { if (el.getAttribute("aria-invalid") === "true") check(el); });
});
f.addEventListener("focusin", function (e) {
var n = e.target && e.target.name;
if (!n || n.charAt(0) === "_" || n === "hp_note") return;
OP.form = f.dataset.formType; OP.field = n;
});
function fail(msg) {
delete f.dataset.busy; st.innerHTML = msg; st.hidden = false; btn.disabled = false; btn.textContent = lab; st.focus();
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
var ac = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ac) ac.abort(); fail(FAIL); }, 15000), done = false;
fetch(AJAX, { method: "POST", headers: { Accept: "application/json" }, body: new URLSearchParams(new FormData(f)), signal: ac ? ac.signal : undefined })
.then(function (r) { return r.json().then(function (d) { return r.ok && d && (d.ok === true || d.success === true || d.success === "true"); }, function () { return false; }); })
.then(function (ok) {
clearTimeout(tm); if (done) return; done = true;
if (!ok) throw 0;
OP.sent = 1; delete f.dataset.busy;
var t = f.parentNode.querySelector(".thanks"); f.hidden = true; t.hidden = false; t.querySelector("h3").focus();
})
.catch(function () { clearTimeout(tm); if (done && OP.sent) return; done = true; fail(navigator.onLine === false ? OFFLINE : FAIL); });
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
