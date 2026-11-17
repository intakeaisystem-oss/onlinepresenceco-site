/* Online Presence Co. - attribution, consent and measurement. No dependencies.
 * 2026-11-16, revised after independent review.
 *
 * 1. Attribution  Reads UTMs and ad click IDs from the address bar. Keeps three small records in this
 *                 browser's localStorage, each for 90 days:
 *                   opc_ft  first touch (source, medium, campaign, landing page)
 *                   opc_lt  latest touch (UTMs or the referring site)
 *                   opc_ck  the last PAID click (click IDs + its UTMs). A later visit through an unpaid
 *                           search result or another site never erases it.
 *                 window.opcAttr() hands them to every lead form. Field names match the backend
 *                 (Apex.gs APEX_ATTR_RULES).
 * 2. Consent      Global Privacy Control, Do Not Track or "No thanks" = no ad or analytics tags, no
 *                 click ID stored or sent, ad_consent=0 on the lead. The choice is also held in memory,
 *                 so it holds even when the browser blocks storage. If storage is blocked and no
 *                 choice was made, nothing is assumed: no tags. The backend applies the same rule and
 *                 treats a missing flag as "no".
 * 3. Tags         Google tag (GA4 + Google Ads) and Meta Pixel load only when their ID is set in
 *                 /js/opc-config.js and consent allows it.
 * 4. Events       window.opcTrack(name, params): cta_click, call_tap, form_start, form_step,
 *                 generate_lead, book_view. One event_id per page view is shared by the Meta Pixel
 *                 and the server-side event so Meta counts the pair once.
 * 5. Beacon       One cookieless first-party page event to our own backend when the page is left
 *                 (path, referrer host, UTMs, scroll, seconds, form start/submit). No IP, no
 *                 cookie, no free text. Skipped when GPC / DNT is on or the visitor said no.
 */
(function () {
  "use strict";
  var W = window, D = document, C = W.OPC_CONFIG || {};
  var UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var CLICK = ["gclid", "gbraid", "wbraid", "fbclid"];
  var FT_KEY = "opc_ft", LT_KEY = "opc_lt", CK_KEY = "opc_ck", CONSENT_KEY = "opc_consent", VISIT_KEY = "opc_visit";
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
  function fresh(rec) { return rec && rec.t && Date.now() - rec.t <= NINETY_DAYS ? rec : null; }
  var storageOk = (function () { try { localStorage.setItem("opc_t", "1"); localStorage.removeItem("opc_t"); return true; } catch (e) { return false; } })();

  /* ---------- consent ---------- */
  var signalOff = W.navigator.globalPrivacyControl === true || W.navigator.doNotTrack === "1" || W.doNotTrack === "1";
  var mem = null;                                                // this page's choice, kept even if storage refuses it
  function choice() { return mem || ls(CONSENT_KEY); }          // "yes" | "no" | null
  function granted() {
    var c = choice();
    if (signalOff || c === "no") return false;
    if (c === "yes") return true;
    if (!storageOk) return false;                                // cannot remember a "no", so do not assume a "yes"
    return C.consent !== "optin";
  }
  var anyTag = !!(C.ga4 || C.googleAds || C.metaPixel);

  /* ---------- attribution ---------- */
  var q = new URLSearchParams(W.location.search);
  var now = Date.now();
  var here = pathOk(W.location.pathname);
  var refHost = host(D.referrer);
  if (refHost === W.location.hostname) refHost = "";
  /* A search engine's results page, not every host that has "google" in it (calendar.google.com, mail.google.com). */
  var SEARCH = /^(www\.)?(google|bing|duckduckgo|ecosia)\.[a-z]{2,3}(\.[a-z]{2})?$|^search\.(yahoo|brave)\.com$/;

  var urlUtm = {}, urlClick = {}, hasUtm = false, hasClick = false;
  UTM.forEach(function (k) { var v = q.get(k); if (v) { urlUtm[k] = k === "utm_term" ? term(v) : slug(v, k === "utm_source" || k === "utm_medium" ? 60 : 100); hasUtm = hasUtm || !!urlUtm[k]; } });
  CLICK.forEach(function (k) { var v = idOk(q.get(k)); if (v) { urlClick[k] = v; hasClick = true; } });

  var touch = null;
  if (hasUtm || hasClick) { touch = {}; UTM.forEach(function (k) { if (urlUtm[k]) touch[k] = urlUtm[k]; }); }
  else if (refHost && !ss(LT_KEY + "_s")) touch = { utm_source: slug(refHost.replace(/^www\./, ""), 60), utm_medium: SEARCH.test(refHost) ? "organic" : "referral" };
  if (touch) {
    touch.landing = here; touch.t = now; touch.ref = refHost;
    ls(LT_KEY, JSON.stringify(touch));
    if (!fresh(json(ls(FT_KEY)))) ls(FT_KEY, JSON.stringify({ s: touch.utm_source || "", m: touch.utm_medium || "", c: touch.utm_campaign || "", l: here, t: now }));
  }
  /* The paid click: its IDs and the UTMs that came with it. Written only with consent, and only by a real
     ad click, so an unpaid return visit cannot overwrite it. In opt-in mode it waits in memory for "OK". */
  var pendingClick = null;
  function saveClick(rec) { ls(CK_KEY, JSON.stringify(rec)); }
  if (hasClick) {
    var rec = { t: now, landing: here };
    CLICK.forEach(function (k) { if (urlClick[k]) rec[k] = urlClick[k]; });
    UTM.forEach(function (k) { if (urlUtm[k]) rec[k] = urlUtm[k]; });
    if (granted()) saveClick(rec); else if (!signalOff && choice() !== "no") pendingClick = rec;
  }
  ss(LT_KEY + "_s", "1");
  if (!ss("opc_land")) ss("opc_land", here);

  var EVENT_ID = "ev-" + now.toString(36) + "-" + rid(10);
  var PAGE_ID = rid(16);
  var VISIT_ID = ss(VISIT_KEY) || rid(16); ss(VISIT_KEY, VISIT_ID);

  /** Everything a lead form should post alongside its own fields. Empty values are left out. */
  W.opcAttr = function () {
    var ok = granted(), out = {};
    var lt = fresh(json(ls(LT_KEY))) || {}, f = fresh(json(ls(FT_KEY))) || {};
    var ck = ok ? (fresh(json(ls(CK_KEY))) || pendingClick) : null;   // pendingClick: consent given but storage refused the write
    var base = ck || lt;                                         // a paid click within 90 days outranks a later unpaid visit
    UTM.forEach(function (k) { if (base[k]) out[k] = base[k]; });
    if (ck) {
      CLICK.forEach(function (k) { if (ck[k]) out[k] = ck[k]; });
      if (ck.fbclid) out.fbc = "fb.1." + ck.t + "." + ck.fbclid;
    }
    if (ok) {
      var fbp = cookie("_fbp"), fbc = cookie("_fbc");
      if (/^fb\.\d\.\d{10,13}\.\d{5,20}$/.test(fbp)) out.fbp = fbp;
      if (/^fb\.\d\.\d{10,13}\.[A-Za-z0-9_\-]{10,300}$/.test(fbc)) out.fbc = fbc;
      out.ua = String(W.navigator.userAgent || "").slice(0, 300);
    }
    out.landing = base.landing || ss("opc_land") || here;
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
      if (name === "book_view" && C.googleAds && C.googleAdsBookLabel) W.gtag("event", "conversion", { send_to: C.googleAds + "/" + C.googleAdsBookLabel, transaction_id: p.id || EVENT_ID + "-b" });
    }
    if (fbLoaded) {
      if (name === "generate_lead") W.fbq("track", "Lead", { content_name: clean.form || "" }, { eventID: EVENT_ID });
      else if (name === "book_view") W.fbq("trackCustom", "BookingPageView", {}, { eventID: (p.id || EVENT_ID) + "-b" });   // a page view, not a booking
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
  var sent = false, t0 = now;
  /* The backend's weekly digest counts form starts by kind (audit | call). The kind is known for sure only
     at submit, so for a started-but-unsent form read it the way the form itself decides: website given = audit. */
  function formKind() {
    if (/^(audit|call)$/.test(state.form)) return state.form;
    if (!state.started) return "";
    var f = D.querySelector("[data-lp-form],[data-form]"), w = f && f.elements && f.elements.website;
    return w && String(w.value || "").trim() ? "audit" : "call";
  }
  function beacon() {
    if (sent || !C.beacon || !C.leadEndpoint || signalOff || choice() === "no" || !W.navigator.sendBeacon) return;
    sent = true;                                                  // one event per page view, whichever leave signal comes first
    var lt = fresh(json(ls(LT_KEY))) || {}, b = new URLSearchParams();
    b.set("kind", "event"); b.set("v", "1"); b.set("page_id", PAGE_ID); b.set("visit_id", VISIT_ID);
    b.set("page", here.slice(0, 200));
    if (refHost) b.set("ref", refHost);
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) { if (lt[k]) b.set(k, slug(lt[k], 60)); });
    b.set("scroll", String(state.maxScroll));
    b.set("secs", String(Math.min(3600, Math.round((Date.now() - t0) / 1000))));
    b.set("form", formKind());
    b.set("started", String(state.started)); b.set("submitted", String(state.submitted)); b.set("call_tap", String(state.callTap));
    if (FORM_FIELDS.indexOf(state.lastField) !== -1) b.set("last_field", state.lastField);
    try { W.navigator.sendBeacon(C.leadEndpoint, b); } catch (e) {}
  }
  D.addEventListener("visibilitychange", function () { if (D.visibilityState === "hidden") beacon(); });
  W.addEventListener("pagehide", beacon);

  /* ---------- "No thanks": stop, forget the click, and remove the measurement cookies we can reach ---------- */
  function dropCookies() {
    var names = D.cookie.split(";").map(function (c) { return c.split("=")[0].trim(); })
      .filter(function (n) { return /^(_ga|_gid|_gat|_gcl|_fbp|_fbc)/.test(n); });
    var h = W.location.hostname, parts = h.split("."), domains = ["", h, "." + h];
    if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
    names.forEach(function (n) { domains.forEach(function (d) { D.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : ""); }); });
  }
  function sayNo() {
    mem = "no"; ls(CONSENT_KEY, "no");
    pendingClick = null; ls(CK_KEY, null);
    if (gtagLoaded) W.gtag("consent", "update", consentPayload(false));
    if (fbLoaded && W.fbq) W.fbq("consent", "revoke");
    dropCookies();
  }
  function sayYes() {
    mem = "yes"; ls(CONSENT_KEY, "yes");
    if (pendingClick) { saveClick(pendingClick); if (storageOk) pendingClick = null; }
    loadTags();
  }

  /* ---------- notice (only when a third-party tag is configured) ---------- */
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
    no.addEventListener("click", function () { sayNo(); bar.remove(); });
    ok.addEventListener("click", function () { sayYes(); bar.remove(); });
    bar.appendChild(txt); bar.appendChild(no); bar.appendChild(ok);
    D.body.insertBefore(bar, D.body.firstChild);
  }

  /** The privacy page's "Change my cookie choice". Says so when there is nothing to change. */
  W.opcConsentReset = function () {
    var out = D.querySelector("[data-consent-status]");
    function say(t) { if (out) out.textContent = " " + t; }
    if (signalOff) return say("Your browser is sending a privacy signal, so nothing is loaded for you and there is nothing to change.");
    if (!anyTag) return say("No ad or analytics tags are switched on right now, so there is nothing to change.");
    mem = null; ls(CONSENT_KEY, null);
    W.location.reload();
  };

  /* A booking-page view counts once: on the thank-you page only right after a lead from this tab,
     on the booking page once per tab. Reloading, or opening the thank-you page directly, counts nothing. */
  function bookView() {
    if (!D.body || !D.body.hasAttribute("data-book")) return;
    var lead = json(ss("opc_lead")), isThanks = D.body.getAttribute("data-lp") === "thanks";
    if (isThanks && !(lead && lead.e)) return;
    if (ss("opc_bv")) return;
    ss("opc_bv", "1");
    W.opcTrack("book_view", { page: here, id: lead && lead.e ? lead.e : EVENT_ID });
  }

  loadTags();
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", function () { notice(); bookView(); });
  else { notice(); bookView(); }
})();
