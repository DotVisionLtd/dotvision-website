// Contact form handler (Vercel Node function). No dependencies.
// Env vars (set in Vercel at launch):
//   RESEND_API_KEY   - Resend API key (sending domain dotvision.io verified)
//   CONTACT_TO       - recipient, e.g. info@dotvision.io
//   CONTACT_FROM     - sender, e.g. "Dot Vision website <web@dotvision.io>"
//   TURNSTILE_SECRET - Cloudflare Turnstile secret key (required in production; without it the form refuses to send)
// Nothing is stored: the message is emailed and then discarded.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // best-effort, per instance

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

function clientIp(req) {
  const xf = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim();
  return xf || (req.socket && req.socket.remoteAddress) || "unknown";
}

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 20000) throw new Error("too_large");
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { error: "method" }); }

  const origin = req.headers.origin || "";
  const host = req.headers.host || "";
  if (origin && !origin.endsWith("://" + host)) return json(res, 403, { error: "origin" });

  let body;
  try { body = await readBody(req); } catch (e) { return json(res, 400, { error: "invalid" }); }

  // Honeypot and timing: bots fill hidden fields and submit instantly. Pretend success.
  if (clean(body.website, 200)) return json(res, 200, { ok: true });
  const t = Number(body.t);
  if (!t || Date.now() - t < 3000) return json(res, 200, { ok: true });

  const ip = clientIp(req);
  if (limited(ip)) return json(res, 429, { error: "rate_limited" });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const company = clean(body.company, 160);
  const message = clean(body.message, 4000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || message.length < 10) return json(res, 400, { error: "invalid" });
  if (/[\r\n]/.test(name + email + company)) return json(res, 400, { error: "invalid" });

  const secret = process.env.TURNSTILE_SECRET;
  // Fail closed in production: without the Turnstile secret the form does not send at all.
  if (!secret && process.env.VERCEL_ENV === "production") return json(res, 503, { error: "not_configured" });
  if (secret) {
    const token = clean(body["cf-turnstile-response"], 4096);
    if (!token) return json(res, 400, { error: "captcha" });
    try {
      const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      }).then((r) => r.json());
      if (!v.success) return json(res, 400, { error: "captcha" });
    } catch (e) { return json(res, 502, { error: "captcha" }); }
  }

  const key = process.env.RESEND_API_KEY, to = process.env.CONTACT_TO, from = process.env.CONTACT_FROM;
  if (!key || !to || !from) return json(res, 503, { error: "not_configured" });

  const text = [
    "New message from dotvision.io",
    "",
    "Name: " + name,
    "Email: " + email,
    "Company: " + (company || "-"),
    "",
    message,
  ].join("\n");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: "Website enquiry: " + name + (company ? " (" + company + ")" : ""), text }),
    });
    if (!r.ok) return json(res, 502, { error: "send" });
  } catch (e) { return json(res, 502, { error: "send" }); }

  return json(res, 200, { ok: true });
};
