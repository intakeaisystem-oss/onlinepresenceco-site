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
tabs.forEach(function (b, i) {
b.addEventListener("click", function () { show(b.getAttribute("data-tab")); });
b.addEventListener("keydown", function (e) {
var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
if (!d) return;
e.preventDefault();
show(tabs[(i + d + tabs.length) % tabs.length].getAttribute("data-tab"), true);
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
})();
