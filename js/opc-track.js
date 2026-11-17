/* Online Presence Co. - attribution, consent and measurement. No dependencies. 2026-11-16.
 *
 * 1. Attribution  Reads UTMs and ad click IDs from the address bar, keeps the first touch (90 days)
 *                 and the latest touch in this browser, and hands them to every lead form through
 *                 window.opcAttr(). Field names match the backend (Apex.gs APEX_ATTR_RULES).
 * 2. Consent      Global Privacy Control, Do Not Track or "No thanks" = no ad or analytics tags,
 *                 no click IDs stored or sent, ad_consent=0 on the lead. Google Consent Mode v2
 *                 signals are set before any Google tag loads.
 * 3. Tags         Google tag (GA4 + Google Ads) and Meta Pixel load only when their ID is set in
 *                 /js/opc-config.js and consent allows it.
 * 4. Events       window.opcTrack(name, params): cta_click, call_tap, form_start, form_step,
 *                 generate_lead, book_view. One event_id per page view is shared by the Meta Pixel
 *                 and the server-side event so Meta counts the pair once.
 * 5. Beacon       One cookieless first-party page event to our own backend when the page is left
 *                 (path, referrer host, UTMs, scroll, seconds, form start/submit). No IP, no
 *                 cookie, no free text. Skipped when GPC / DNT is on.
 */
(function () {
  "use strict";
  var W = window, D = document, C = W.OPC_CONFIG || {};
  var UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var CLICK = ["gclid", "gbraid", "wbraid", "fbclid"];
  var FT_KEY = "opc_ft", LT_KEY = "opc_lt", CONSENT_KEY = "opc_consent", VISIT_KEY = "opc_visit";
  var NINETY_DAYS = 90 * 24 * 3600 * 1000;

  /* ---------- small helpers (storage can throw in private mode) ---------- */
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} return null; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} return null; }
  function json(s) { try { return JSON.parse(s) || null; } catch (e) { return null; } }
  function rid(n) { var a = "abcdefghijklmnopqrstuvwxyz0123456789", o = ""; for (var i = 0; i < n; i++) o += a.charAt(Math.floor(Math.random() * a.length)); return o; }
  function slug(v, max) { return String(v || "").trim().replace(/[^A-Za-z0-9._\-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max || 60); }
  function term(v) { return String(v || "").trim().replace(/[^A-Za-z0-9._\- +]+/g, " ").replace(/\s+/g, " ").slice(0, 100); }
  function idOk(v) { return /^[A-Za-z0-9_\-]{10,300}$/.test(v || "") ? v : ""; }
  function pathOk(p) { p = String(p || "/").split(/[?#]/)[0]; return /^\/[A-Za-z0-9\/_\-.]{0,150}$/.test(p) ? p : "/"; }
  function host(u) { try { return new URL(u).hostname.toLowerCase().replace(/[^a-z0-9.\-]/g, "").slice(0, 100); } catch (e) { return ""; } }
  function cookie(n) { var m = D.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }

  /* ---------- consent ---------- */
  var signalOff = W.navigator.globalPrivacyControl === true || W.navigator.doNotTrack === "1" || W.doNotTrack === "1";
  function choice() { return ls(CONSENT_KEY); }                 // "yes" | "no" | null
  function granted() {
    if (signalOff || choice() === "no") return false;
    return C.consent === "optin" ? choice() === "yes" : true;
  }
  var anyTag = !!(C.ga4 || C.googleAds || C.metaPixel);

  /* ---------- attribution ---------- */
  var q = new URLSearchParams(W.location.search);
  var now = Date.now();
  var here = pathOk(W.location.pathname);
  var refHost = host(D.referrer);
  if (refHost === W.location.hostname) refHost = "";
  var SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave)\./;

  function readUrl() {
    var t = {}, has = false;
    UTM.forEach(function (k) { var v = q.get(k); if (v) { t[k] = k === "utm_term" ? term(v) : slug(v, k === "utm_source" || k === "utm_medium" ? 60 : 100); has = has || !!t[k]; } });
    CLICK.forEach(function (k) { var v = idOk(q.get(k)); if (v) { t[k] = v; has = true; } });
    return has ? t : null;
  }

  var touch = readUrl();
  if (!touch && refHost && !ss(LT_KEY + "_s")) {
    touch = { utm_source: slug(refHost.replace(/^www\./, ""), 60), utm_medium: SEARCH.test(refHost) ? "organic" : "referral" };
  }
  if (touch) {
    touch.landing = here; touch.t = now; touch.ref = refHost;
    if (!granted()) CLICK.forEach(function (k) { delete touch[k]; });      // no click IDs without consent
    ls(LT_KEY, JSON.stringify(touch));
    var ft = json(ls(FT_KEY));
    if (!ft || !ft.t || now - ft.t > NINETY_DAYS) ls(FT_KEY, JSON.stringify({ s: touch.utm_source || "", m: touch.utm_medium || "", c: touch.utm_campaign || "", l: here, t: now }));
  }
  ss(LT_KEY + "_s", "1");
  if (!ss("opc_land")) ss("opc_land", here);

  var EVENT_ID = "ev-" + now.toString(36) + "-" + rid(10);
  var PAGE_ID = rid(16);
  var VISIT_ID = ss(VISIT_KEY) || rid(16); ss(VISIT_KEY, VISIT_ID);

  /** Everything a lead form should post alongside its own fields. Empty values are left out. */
  W.opcAttr = function () {
    var lt = json(ls(LT_KEY)) || {}, f = json(ls(FT_KEY)) || {}, ok = granted(), out = {};
    if (lt.t && now - lt.t > NINETY_DAYS) lt = {};
    UTM.forEach(function (k) { if (lt[k]) out[k] = lt[k]; });
    if (ok) {
      CLICK.forEach(function (k) { if (lt[k]) out[k] = lt[k]; });
      var fbp = cookie("_fbp"), fbc = cookie("_fbc");
      if (/^fb\.\d\.\d{10,13}\.\d{5,20}$/.test(fbp)) out.fbp = fbp;
      if (/^fb\.\d\.\d{10,13}\.[A-Za-z0-9_\-]{10,300}$/.test(fbc)) out.fbc = fbc;
      else if (lt.fbclid) out.fbc = "fb.1." + (lt.t || now) + "." + lt.fbclid;
      out.ua = String(W.navigator.userAgent || "").slice(0, 300);
    }
    out.landing = lt.landing || ss("opc_land") || here;
    if (lt.ref) out.referrer = lt.ref;
    if (f.s) out.first_source = f.s;
    if (f.m) out.first_medium = f.m;
    if (f.c) out.first_campaign = f.c;
    if (f.l) out.first_landing = f.l;
    if (f.t) out.first_seen = new Date(f.t).toISOString();
    var lp = D.body && D.body.getAttribute("data-lp");
    if (lp) out.lp_variant = slug(lp.toLowerCase(), 40);
    out.event_id = EVENT_ID;
    out.ad_consent = ok ? "1" : "0";
    return out;
  };

  /* ---------- tags ---------- */
  var gtagLoaded = false, fbLoaded = false;
  function gtag() { (W.dataLayer = W.dataLayer || []).push(arguments); }
  function consentPayload(on) {
    var v = on ? "granted" : "denied";
    return { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v };
  }
  function loadScript(src) { var s = D.createElement("script"); s.async = true; s.src = src; D.head.appendChild(s); }

  function loadTags() {
    if (!granted()) return;
    if ((C.ga4 || C.googleAds) && !gtagLoaded) {
      gtagLoaded = true;
      W.gtag = W.gtag || gtag;
      W.gtag("consent", "default", consentPayload(true));
      /* We advertise in the U.S. only. A stray visitor from the EEA, UK or Switzerland gets "denied":
         Google's consent policy applies there, and a region-specific default wins over the general one. */
      var eu = consentPayload(false);
      eu.region = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH"];
      W.gtag("consent", "default", eu);
      W.gtag("js", new Date());
      if (C.ga4) W.gtag("config", C.ga4);
      if (C.googleAds) W.gtag("config", C.googleAds, { allow_enhanced_conversions: true });
      loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.ga4 || C.googleAds));
    }
    if (C.metaPixel && !fbLoaded) {
      fbLoaded = true;
      /* Meta's standard loader, unmodified in behaviour. */
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(W, D, "script", "https://connect.facebook.net/en_US/fbevents.js");
      W.fbq("init", String(C.metaPixel));
      W.fbq("track", "PageView", {}, { eventID: EVENT_ID + "-pv" });
    }
  }

  /* ---------- events ---------- */
  var state = { form: "", started: 0, submitted: 0, callTap: 0, lastField: "", maxScroll: 0 };

  /** opcTrack("generate_lead", {form:"audit", email:"..", phone:".."}) */
  W.opcTrack = function (name, params) {
    var p = params || {};
    if (name === "form_start") { state.started = 1; state.form = p.form || state.form; }
    if (name === "form_field") { state.lastField = p.field || state.lastField; return; }
    if (name === "generate_lead") { state.submitted = 1; state.form = p.form || state.form; }
    if (name === "call_tap") state.callTap = 1;
    if (!granted()) return;
    var clean = {};
    Object.keys(p).forEach(function (k) { if (k !== "email" && k !== "phone") clean[k] = p[k]; });   // never put contact details in event params
    if (gtagLoaded) {
      if (name === "generate_lead" && C.googleAds && (p.email || p.phone)) {
        var ud = {}; if (p.email) ud.email = p.email; if (p.phone) ud.phone_number = p.phone;        // gtag hashes these for enhanced conversions
        W.gtag("set", "user_data", ud);
      }
      W.gtag("event", name, clean);
      if (name === "generate_lead" && C.googleAds && C.googleAdsLeadLabel) W.gtag("event", "conversion", { send_to: C.googleAds + "/" + C.googleAdsLeadLabel, transaction_id: EVENT_ID });
      if (name === "book_view" && C.googleAds && C.googleAdsBookLabel) W.gtag("event", "conversion", { send_to: C.googleAds + "/" + C.googleAdsBookLabel, transaction_id: EVENT_ID + "-b" });
    }
    if (fbLoaded) {
      if (name === "generate_lead") W.fbq("track", "Lead", { content_name: clean.form || "" }, { eventID: EVENT_ID });
      else if (name === "book_view") W.fbq("track", "Schedule", {}, { eventID: EVENT_ID + "-b" });
      else if (name === "call_tap") W.fbq("track", "Contact", {}, { eventID: EVENT_ID + "-c" });
      else if (name === "form_start") W.fbq("trackCustom", "FormStart", { form: clean.form || "" });
    }
  };

  D.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a,button") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^tel:/.test(href)) W.opcTrack("call_tap", { page: here });
    else if (a.hasAttribute("data-cta")) W.opcTrack("cta_click", { cta: slug(a.getAttribute("data-cta"), 40), page: here });
  }, true);

  D.addEventListener("focusin", function (e) {
    var el = e.target, f = el && el.form;
    if (!f || !el.name || el.type === "hidden") return;
    if (!state.started) W.opcTrack("form_start", { form: f.getAttribute("data-form-name") || "contact", page: here });
    W.opcTrack("form_field", { field: slug(el.name, 30) });
  });

  W.addEventListener("scroll", function () {
    var h = D.documentElement, max = h.scrollHeight - W.innerHeight;
    if (max > 0) state.maxScroll = Math.max(state.maxScroll, Math.min(100, Math.round((W.scrollY / max) * 100)));
  }, { passive: true });

  /* ---------- first-party beacon (backend contract: Code.gs EVENT_RULES) ---------- */
  var FORM_FIELDS = ["path", "name", "business", "business_type", "website", "phone", "email", "best_time", "consent", "services", "hear_about"];
  var sent = 0, t0 = now;
  function beacon() {
    if (!C.beacon || !C.leadEndpoint || signalOff || choice() === "no" || sent >= 2 || !W.navigator.sendBeacon) return;
    sent++;
    var lt = json(ls(LT_KEY)) || {}, b = new URLSearchParams();
    b.set("kind", "event"); b.set("v", "1"); b.set("page_id", PAGE_ID); b.set("visit_id", VISIT_ID);
    b.set("page", here.slice(0, 200));
    if (refHost) b.set("ref", refHost);
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) { if (lt[k]) b.set(k, slug(lt[k], 60)); });
    b.set("scroll", String(state.maxScroll));
    b.set("secs", String(Math.min(3600, Math.round((Date.now() - t0) / 1000))));
    var form = /^(audit|call)$/.test(state.form) ? state.form : "";
    b.set("form", form);
    b.set("started", String(state.started)); b.set("submitted", String(state.submitted)); b.set("call_tap", String(state.callTap));
    if (FORM_FIELDS.indexOf(state.lastField) !== -1) b.set("last_field", state.lastField);
    try { W.navigator.sendBeacon(C.leadEndpoint, b); } catch (e) {}
  }
  D.addEventListener("visibilitychange", function () { if (D.visibilityState === "hidden") beacon(); });
  W.addEventListener("pagehide", beacon);

  /* ---------- notice bar (only when a third-party tag is configured) ---------- */
  function notice() {
    if (!anyTag || signalOff || choice()) return;
    var bar = D.createElement("div");
    bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Cookies");
    /* A slim strip in the page flow at the very top. It never covers the form or the call button. */
    bar.style.cssText = "background:#f5f7fa;color:#3d4148;border-bottom:1px solid #e6e8ec;padding:7px 14px;font:13px/1.4 'Albert Sans',Arial,sans-serif;display:flex;gap:6px 12px;align-items:center;justify-content:center;flex-wrap:wrap";
    var txt = D.createElement("span");
    txt.appendChild(D.createTextNode("We use cookies to see which of our ads bring people here. "));
    var a = D.createElement("a"); a.href = "/privacy/"; a.textContent = "Privacy notice"; a.style.cssText = "color:#3d4148;text-decoration:underline";
    txt.appendChild(a);
    function btn(label, primary) {
      var b = D.createElement("button"); b.type = "button"; b.textContent = label;
      b.style.cssText = "cursor:pointer;border-radius:7px;padding:4px 12px;font:inherit;font-weight:600;border:1px solid #113359;" + (primary ? "background:#113359;color:#fff" : "background:#fff;color:#113359");
      return b;
    }
    var no = btn("No thanks", false), ok = btn("OK", true);
    no.addEventListener("click", function () {
      ls(CONSENT_KEY, "no");
      if (gtagLoaded) W.gtag("consent", "update", consentPayload(false));
      if (fbLoaded && W.fbq) W.fbq("consent", "revoke");
      var lt = json(ls(LT_KEY)); if (lt) { CLICK.forEach(function (k) { delete lt[k]; }); ls(LT_KEY, JSON.stringify(lt)); }
      bar.remove();
    });
    ok.addEventListener("click", function () { ls(CONSENT_KEY, "yes"); bar.remove(); loadTags(); });
    bar.appendChild(txt); bar.appendChild(no); bar.appendChild(ok);
    D.body.insertBefore(bar, D.body.firstChild);
  }

  /** Lets the privacy page offer "change my choice". */
  W.opcConsentReset = function () { ls(CONSENT_KEY, null); W.location.reload(); };

  loadTags();
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", notice); else notice();
  if (D.body && D.body.hasAttribute("data-book")) W.opcTrack("book_view", { page: here });
  else D.addEventListener("DOMContentLoaded", function () { if (D.body.hasAttribute("data-book")) W.opcTrack("book_view", { page: here }); });
})();
