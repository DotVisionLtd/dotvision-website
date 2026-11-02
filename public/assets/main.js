(function () {
  "use strict";
  var meta = function (n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? m.content.trim() : ""; };
  var GA_ID = meta("dv-ga");
  var TS_KEY = meta("dv-turnstile");
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Mobile menu */
  var btn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* Consent + Google Analytics 4 (basic Consent Mode: GA loads only after "Allow") */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded || !/^G-[A-Z0-9]+$/.test(GA_ID)) return;
    gaLoaded = true;
    gtag("consent", "update", { analytics_storage: "granted" });
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
  }
  var banner = document.getElementById("consent");
  var choice = store.get("dv-consent");
  if (choice === "granted") loadGA();
  else if (!choice && banner) banner.classList.add("show");
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-consent]");
    if (b) {
      var v = b.getAttribute("data-consent");
      store.set("dv-consent", v);
      banner.classList.remove("show");
      if (v === "granted") loadGA();
      else if (gaLoaded) { gtag("consent", "update", { analytics_storage: "denied" }); }
    }
    if (e.target.closest("[data-consent-open]") && banner) { banner.classList.add("show"); }
  });


  /* Basics check (runs in the browser only; nothing is stored or sent) */
  var cf = document.getElementById("check-form");
  if (cf) {
    var fixes = [
      ["why now", "Start with your one-sentence “why now”. Every post, deck and DM gets easier once a stranger understands it in one read."],
      ["storefront", "Fix your storefront. Your X profile and website are where people decide in seconds whether to keep reading."],
      ["community home", "Pick one home for your community and point everything there before adding more channels."],
      ["direct outreach", "Start direct outreach. Posting alone rarely brings the first users; conversations do."],
      ["tracking", "Set up basic tracking, so you know which channel brings users and what they do first."]
    ];
    var res = document.getElementById("check-result"), hint = document.getElementById("check-hint");
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      var score = 0, missing = [], unanswered = 0;
      for (var i = 1; i <= 5; i++) {
        var v = cf.querySelector('input[name="q' + i + '"]:checked');
        if (!v) { unanswered++; continue; }
        if (v.value === "1") score++; else missing.push(i - 1);
      }
      if (unanswered) { hint.textContent = "Answer all five questions to see your result (" + unanswered + " left)."; res.hidden = true; return; }
      hint.textContent = "";
      document.getElementById("check-score").textContent = score + " of 5";
      document.getElementById("check-fix").textContent = missing.length
        ? "Do this first. " + fixes[missing[0]][1]
        : "Your basics are in place. The next step is a go-to-market sprint on one segment and one channel.";
      res.hidden = false; res.focus();
      var msg = document.getElementById("f-message");
      var names = missing.map(function (m) { return fixes[m][0]; });
      document.getElementById("check-cta").onclick = function () {
        if (msg && !msg.value.trim()) msg.value = "Basics check: " + score + " of 5" + (names.length ? " (missing: " + names.join(", ") + ")" : "") + ". We'd like you to run the full check.";
      };
    });
  }

  /* Contact form */
  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = document.getElementById("form-status");
  var tField = document.getElementById("f-t");
  tField.value = String(Date.now());

  if (TS_KEY) {
    window.onTurnstileLoad = function () {
      window.turnstile.render("#turnstile", { sitekey: TS_KEY, theme: "dark", appearance: "interaction-only" });
    };
    var ts = document.createElement("script");
    ts.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
    ts.async = true; ts.defer = true;
    document.head.appendChild(ts);
  }

  function say(msg, kind) { status.textContent = msg; status.className = "form-status " + (kind || ""); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var name = (fd.get("name") || "").trim(), email = (fd.get("email") || "").trim(), message = (fd.get("message") || "").trim();
    if (!name) return say("Please add your name.", "err"), form.elements.name.focus();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return say("Please add a valid email address so we can reply.", "err"), form.elements.email.focus();
    if (message.length < 10) return say("Please tell us a little more about what you need (at least 10 characters).", "err"), form.elements.message.focus();
    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true; say("Sending…");
    var body = {};
    fd.forEach(function (v, k) { body[k] = v; });
    fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok) { form.reset(); tField.value = String(Date.now()); say("Message sent. We'll reply to " + email + ".", "ok"); if (window.turnstile) window.turnstile.reset(); return; }
        var code = res.j && res.j.error;
        if (code === "not_configured") say("The form isn't connected yet. Please email info@dotvision.io.", "err");
        else if (code === "rate_limited") say("Too many messages in a short time. Please try again in a few minutes or email info@dotvision.io.", "err");
        else if (code === "captcha") say("The spam check didn't pass. Please try again.", "err");
        else say("The message couldn't be sent. Please try again or email info@dotvision.io.", "err");
        if (window.turnstile) window.turnstile.reset();
      })
      .catch(function () { say("No connection. Please try again or email info@dotvision.io.", "err"); })
      .then(function () { submit.disabled = false; });
  });
})();
