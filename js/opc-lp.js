/* Online Presence Co. - landing-page form (2026-11-16). Two short steps, one request to the lead backend.
 * Field names follow the backend contract in Code.gs (path=audit|call) plus the attribution fields
 * from window.opcAttr() (opc-track.js). A website given = an "audit" lead (email needed to send it);
 * no website = a "call" lead. On success the visitor goes to /lp/thanks/ where they can pick a call time. */
(function () {
  "use strict";
  var D = document, W = window, C = W.OPC_CONFIG || {};
  var form = D.querySelector("[data-lp-form]");
  if (!form) return;
  var one = form.querySelector("[data-step='1']"), two = form.querySelector("[data-step='2']");
  var bars = form.querySelectorAll(".steps i"), note = form.querySelector(".stepnote");
  var err = form.querySelector("[data-err]"), fail = form.querySelector("[data-fail]");
  var send = form.querySelector("[data-send]"), sendLabel = send.textContent;
  var sticky = D.querySelector(".sticky");
  var MSG = {
    business: "Please enter your business name.",
    business_type: "Please tell us what kind of work you do.",
    website: "That website address doesn't look right. Leave it blank if you don't have one.",
    name: "Please enter your name.",
    phone: "Please enter a 10-digit U.S. phone number.",
    email: "Please enter a valid email address.",
    email_needed: "Please add an email so we can send your audit.",
    consent: "Please tick the box so we're allowed to reply.",
    link_business: "Please type your business name here, and put any web address in the website box.",
    link_type: "Please describe your work in a few words, without a web address.",
    link_name: "Please type your name, without a web address."
  };
  function hasLink(s) { return /(https?:\/\/|www\.|<a\s|\[url)/i.test(s); }   // same rule as the backend
  function v(n) { var el = form.elements[n]; return el ? String(el.value || "").trim() : ""; }
  function digits(s) { var d = String(s || "").replace(/\D/g, ""); return d.length === 11 && d.charAt(0) === "1" ? d.slice(1) : d; }
  function emailOk(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
  function siteOk(s) { return /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(s); }
  function show(msg, el) {
    err.textContent = msg; err.hidden = !msg;
    Array.prototype.forEach.call(form.elements, function (x) { if (x.removeAttribute) { x.removeAttribute("aria-invalid"); x.removeAttribute("aria-describedby"); } });
    if (el) { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", "lp-err"); el.focus(); }
  }
  function checkOne() {
    if (!v("business")) return show(MSG.business, form.elements.business), false;
    if (hasLink(v("business"))) return show(MSG.link_business, form.elements.business), false;
    if (v("website") && !siteOk(v("website"))) return show(MSG.website, form.elements.website), false;
    if (!v("business_type")) return show(MSG.business_type, form.elements.business_type), false;
    if (hasLink(v("business_type"))) return show(MSG.link_type, form.elements.business_type), false;
    return show(""), true;
  }
  function checkTwo() {
    if (!v("name")) return show(MSG.name, form.elements.name), false;
    if (hasLink(v("name"))) return show(MSG.link_name, form.elements.name), false;
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits(v("phone")))) return show(MSG.phone, form.elements.phone), false;   // same U.S. number rule as the backend
    if (v("email") && !emailOk(v("email"))) return show(MSG.email, form.elements.email), false;
    if (v("website") && !v("email")) return show(MSG.email_needed, form.elements.email), false;
    if (!form.elements.consent.checked) return show(MSG.consent, form.elements.consent), false;
    return show(""), true;
  }
  function go(n) {
    one.hidden = n !== 1; two.hidden = n !== 2;
    bars[1].className = n === 2 ? "on" : "";
    note.textContent = n === 1 ? "Step 1 of 2: your business" : "Step 2 of 2: where to send it";
    var emailLabel = form.querySelector("[data-email-opt]");
    if (emailLabel) emailLabel.textContent = v("website") ? "(needed to send your audit)" : "(optional)";
    if (form.elements.email) { if (v("website")) form.elements.email.setAttribute("aria-required", "true"); else form.elements.email.removeAttribute("aria-required"); }
    (n === 1 ? form.elements.business : form.elements.name).focus();
    if (n === 2 && W.opcTrack) W.opcTrack("form_step", { form: "lp", step: 2 });
  }
  form.querySelector("[data-next]").addEventListener("click", function () { if (checkOne()) go(2); });
  form.querySelector("[data-back]").addEventListener("click", function () { show(""); go(1); });
  one.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (checkOne()) go(2); } });

  function post(body) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout")); }, 20000);
      fetch(C.leadEndpoint, { method: "POST", body: body })
        .then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(t); resolve(j); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!one.hidden) { if (checkOne()) go(2); return; }
    if (!checkOne()) { go(1); checkOne(); return; }
    if (!checkTwo()) return;
    fail.hidden = true;
    var hasSite = !!v("website");
    var path = hasSite ? "audit" : "call";
    var b = new URLSearchParams();
    b.set("path", path);
    b.set("business", v("business")); b.set("business_type", v("business_type"));
    if (hasSite) b.set("website", v("website"));
    b.set("name", v("name")); b.set("phone", v("phone"));
    if (v("email")) b.set("email", v("email"));
    b.set("best_time", v("best_time") || "Any time");
    b.set("consent", "yes"); b.set("consent_version", form.getAttribute("data-consent-version") || "lp-2026-11-16");
    b.set("services", form.getAttribute("data-services") || "not-sure");
    b.set("hp_note", v("hp_note"));
    b.set("page", W.location.pathname); b.set("response", "json");
    var a = W.opcAttr ? W.opcAttr() : {};
    Object.keys(a).forEach(function (k) { if (a[k] && !b.has(k)) b.set(k, a[k]); });
    if (!b.has("utm_source")) b.set("utm_source", "direct");
    send.disabled = true; send.textContent = "Sending…";
    var tries = 0;
    function attempt() {
      tries++;
      post(b).then(function (j) {
        if (j && j.ok) {
          /* Count a conversion only for a lead the backend actually stored (it returns an id). A repeat of the
             same request, or a post caught by the spam trap, gets the thank-you page but no second conversion. */
          var stored = !!j.id;
          if (stored && W.opcTrack) W.opcTrack("generate_lead", { form: path, lp: (D.body.getAttribute("data-lp") || ""), email: v("email"), phone: "+1" + digits(v("phone")) });
          try { sessionStorage.removeItem("opc_bv"); sessionStorage.setItem("opc_lead", JSON.stringify({ p: path, n: v("name").split(" ")[0].slice(0, 30), e: stored ? (a.event_id || "") : "" })); } catch (x) {}
          setTimeout(function () { W.location.href = "/lp/thanks/?p=" + path; }, 450);   // lets the tags finish first
          return;
        }
        send.disabled = false; send.textContent = sendLabel;
        var codes = (j && j.errors) || [];
        if (codes.indexOf("bad-phone-us-10-digits") !== -1) return show(MSG.phone, form.elements.phone);
        if (codes.indexOf("bad-email") !== -1 || codes.indexOf("missing-email") !== -1) return show(v("email") ? MSG.email : MSG.email_needed, form.elements.email);
        if (codes.indexOf("bad-website") !== -1 || codes.indexOf("missing-website") !== -1) { go(1); return show(MSG.website, form.elements.website); }
        /* The backend refuses a web address typed into a name box (its link-spam rule). Say so plainly. */
        if (codes.indexOf("spam-link-in-business") !== -1) { go(1); return show(MSG.link_business, form.elements.business); }
        if (codes.indexOf("spam-link-in-business-type") !== -1) { go(1); return show(MSG.link_type, form.elements.business_type); }
        if (codes.indexOf("spam-link-in-name") !== -1) return show(MSG.link_name, form.elements.name);
        if (codes.indexOf("missing-business-type") !== -1) { go(1); return show(MSG.business_type, form.elements.business_type); }
        fail.hidden = false; fail.focus();
      }, function () {
        if (tries < 2) return setTimeout(attempt, 1200);
        send.disabled = false; send.textContent = sendLabel;
        fail.hidden = false; fail.focus();
      });
    }
    attempt();
  });

  /* Coming back with the browser's Back button can restore this page exactly as it was left, with the button
     still saying "Sending". Put it back so the form can be used again. */
  W.addEventListener("pageshow", function (e) { if (e.persisted) { send.disabled = false; send.textContent = sendLabel; } });

  /* hide the sticky bar while the form is on screen */
  if (sticky && "IntersectionObserver" in W) {
    new IntersectionObserver(function (en) { sticky.hidden = en[0].isIntersecting; }, { threshold: 0.15 }).observe(form);
  }
})();
