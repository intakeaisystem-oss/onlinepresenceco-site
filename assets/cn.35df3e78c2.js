(function () {
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
// 1. Sample site tabs (buyer's view)
$$("[data-mock]").forEach(function (mock) {
var tabs = $$("[data-tab]", mock);
if (!tabs.length) return;
function show(k, focus) {
tabs.forEach(function (b) {
var on = b.getAttribute("data-tab") === k;
b.setAttribute("aria-selected", on ? "true" : "false");
b.tabIndex = on ? 0 : -1;
if (on && focus) b.focus();
});
$$("[data-pane]", mock).forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== k; });
$$("[data-note]", mock).forEach(function (p) { p.hidden = p.getAttribute("data-note") !== k; });
}
show(tabs[0].getAttribute("data-tab"));
tabs.forEach(function (b, i) {
b.addEventListener("click", function () { show(b.getAttribute("data-tab")); });
b.addEventListener("keydown", function (e) {
var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
if (n === null) return;
e.preventDefault();
show(tabs[(n + tabs.length) % tabs.length].getAttribute("data-tab"), true);
});
});
});
// 2. Two-time-zone clock (Beijing / Crystal Lake). Uses the browser's own time zone data, so DST is handled.
var clocks = $$("[data-clock]");
if (clocks.length && window.Intl && Intl.DateTimeFormat) {
var lang = document.documentElement.lang || "en";
function parts(tz, d) {
var f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
var o = {};
f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
if (o.hour === "24") o.hour = "00";
return o;
}
function offsetMin(tz, d) {
var p = parts(tz, d);
return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(d.getTime() / 60000) * 60000) / 60000;
}
function tick() {
var now = new Date();
clocks.forEach(function (c) {
$$("[data-tz]", c).forEach(function (one) {
var tz = one.getAttribute("data-tz"), p = parts(tz, now);
var h = +p.hour, m = +p.minute;
$("[data-time]", one).textContent = p.hour + ":" + p.minute;
try {
$("[data-date]", one).textContent = new Intl.DateTimeFormat(lang, { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(now);
} catch (e) {}
$("[data-h]", one).setAttribute("transform", "rotate(" + ((h % 12) * 30 + m * 0.5) + " 50 50)");
$("[data-m]", one).setAttribute("transform", "rotate(" + (m * 6) + " 50 50)");
});
var diff = Math.round((offsetMin("Asia/Shanghai", now) - offsetMin("America/Chicago", now)) / 60);
var el = $("[data-diff]", c);
if (el && diff > 0 && diff < 24) el.textContent = String(diff);
});
}
tick();
setInterval(tick, 20000);
}
// 3. Website self-check (answers stay in the browser)
$$("[data-check]").forEach(function (box) {
var bands = [];
try { bands = JSON.parse(box.getAttribute("data-bands")) || []; } catch (e) {}
var items = $$(".cn-check-q li", box), total = items.length;
function update() {
var yes = 0, answered = 0, tips = [];
items.forEach(function (li) {
var c = $("input:checked", li);
if (!c) return;
answered++;
if (c.value === "1") yes++; else tips.push(li.getAttribute("data-tip"));
});
if (!answered) return;
$("[data-score]", box).textContent = yes;
$("[data-meter]", box).style.width = Math.round((yes / total) * 100) + "%";
var b = yes / total < 0.45 ? 0 : yes / total < 0.8 ? 1 : 2;
if (bands[b]) $("[data-band]", box).textContent = bands[b];
var list = $("[data-tiplist]", box);
list.innerHTML = "";
tips.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; list.appendChild(li); });
$("[data-tips]", box).hidden = !tips.length;
}
box.addEventListener("change", update);
});
// 4. Glossary search
var q = $("[data-gl-search]");
if (q) {
var rows = $$("[data-gl] .cn-gl-i");
q.addEventListener("input", function () {
var v = q.value.trim().toLowerCase();
rows.forEach(function (r) { r.hidden = v && r.textContent.toLowerCase().indexOf(v) < 0; });
});
}
// 5. Contact form -> FormSubmit AJAX (JSON only; URL-encoded posts arrive empty). Waits up to 60 s, says so after 8 s.
$$("[data-cn-form]").forEach(function (form) {
var box = form.parentNode, sent = $("[data-sent]", box), fail = $("[data-ffail]", box);
var btn = $("[data-send]", form), status = $("[data-fstatus]", form), errBox = $("[data-ferr]", form);
var label = btn.textContent;
if (location.hash === "#sent" && sent) { form.hidden = true; sent.hidden = false; }
function invalid(el, msg) {
el.setAttribute("aria-invalid", "true");
errBox.textContent = msg; errBox.hidden = false; el.focus();
return true;
}
form.addEventListener("input", function (e) { e.target.removeAttribute("aria-invalid"); errBox.hidden = true; });
form.addEventListener("change", function (e) { e.target.removeAttribute("aria-invalid"); });
form.addEventListener("submit", function (e) {
if (!window.fetch || !window.JSON) return;
e.preventDefault();
if (form.getAttribute("data-busy")) return;
if ($("[name=_honey]", form).value) return;
var req = $$("input[required][type=text],input[required][type=email]", form);
for (var i = 0; i < req.length; i++) if (!req[i].value.trim()) return invalid(req[i], form.getAttribute("data-req"));
var em = $("[name=email]", form);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) return invalid(em, form.getAttribute("data-bad-email"));
var c = $("[name=consent]", form);
if (!c.checked) return invalid(c, form.getAttribute("data-need-consent"));
var data = {};
$$("input,textarea", form).forEach(function (el) {
if (!el.name || el.name === "_next" || el.name === "_honey") return;
if ((el.type === "radio" || el.type === "checkbox") && !el.checked) return;
data[el.name] = el.value.trim();
});
data.page = location.href;
form.setAttribute("data-busy", "1");
btn.disabled = true; btn.textContent = form.getAttribute("data-sending"); status.textContent = "";
fail.hidden = true;
var slow = setTimeout(function () { status.textContent = form.getAttribute("data-still"); }, 8000);
var ctl = window.AbortController ? new AbortController() : null;
var stop = setTimeout(function () { if (ctl) ctl.abort(); }, 60000);
fetch(form.getAttribute("data-ajax"), {
method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined
}).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
.then(function (res) {
if (!res.ok || String(res.j.success) !== "true") throw new Error(res.j.message || "send failed");
form.hidden = true; sent.hidden = false; sent.focus();
})
.catch(function () {
form.removeAttribute("data-busy");
btn.disabled = false; btn.textContent = label; status.textContent = ""; fail.hidden = false; fail.focus();
})
.then(function () { clearTimeout(slow); clearTimeout(stop); });
});
});
// 6. Phone: cycle the sample supplier screens (paused for reduced motion)
if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
$$("[data-cycle]").forEach(function (ph) {
var imgs = $$("img", ph), i = 0, steps = 0, held = false;
if (imgs.length < 2) return;
var host = ph.parentNode;
["mouseenter", "focusin"].forEach(function (ev) { host.addEventListener(ev, function () { held = true; }); });
["mouseleave", "focusout"].forEach(function (ev) { host.addEventListener(ev, function () { held = false; }); });
var timer = setInterval(function () {
if (document.hidden || held) return;
imgs[i].classList.remove("on"); i = (i + 1) % imgs.length; imgs[i].classList.add("on");
if (++steps >= imgs.length) clearInterval(timer);   // one full cycle, then rest on the first screen (WCAG 2.2.2)
}, 3200);
});
}
})();
