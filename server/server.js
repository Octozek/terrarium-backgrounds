// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const app = express();

// --- CORS (dev + optional production domain via CORS_ORIGIN) ---
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.CORS_ORIGIN || "", // e.g. https://octozekprops.com
    ].filter(Boolean),
  })
);

app.use(express.json({ limit: "10mb" }));

// --- Resend setup ---
const resendKey = process.env.RESEND_API_KEY || "";
const resend = resendKey ? new Resend(resendKey) : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "orders@octozekprops.com";
const TO_EMAIL   = process.env.TO_EMAIL   || "orders@octozekprops.com";

// Health check
app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Octozek Props server is running" });
});

// Quick test endpoint to verify email sending without the form
app.get("/test-email", async (_req, res) => {
  if (!resend) {
    return res.json({ ok: false, error: "No RESEND_API_KEY configured" });
  }
  try {
    const result = await resend.emails.send({
      from: `Octozek Props <${FROM_EMAIL}>`,   // display name + verified domain
      to: [TO_EMAIL],
      subject: "Test — Octozek Props server",
      html: "<p>This is a test email from your server.</p>",
    });
    console.log("[/test-email] Resend response:", result);
    return res.json({ ok: true, sent: !result?.error, result });
  } catch (e) {
    console.error("[/test-email] Error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// Simple request logger
app.use((req, _res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.headers.origin || "no-origin"}`
  );
  next();
});

app.post("/order", async (req, res) => {
  try {
    const body = req.body || {};
    console.log("🔔 /order payload:", JSON.stringify(body, null, 2));

    // --- Basic validation ---
    if (!body?.contact?.email || !body?.contact?.name) {
      return res.status(400).json({ ok: false, error: "Missing name or email." });
    }

    const {
      width = {},
      height = {},
      options = {},
      prices = {},
      contact = {},
      inspo = [],
    } = body;

    // --- Build summary HTML ---
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.4">
        <h2>New Terrarium Background Order</h2>

        <h3>Customer</h3>
        <p>
          <strong>Name:</strong> ${contact.name}<br/>
          <strong>Email:</strong> ${contact.email}<br/>
          <strong>Address:</strong> ${contact.addr || ""}${contact.addr ? "," : ""} ${contact.city || ""}${contact.city ? "," : ""} ${contact.state || ""} ${contact.zip || ""}
        </p>

        <h3>Size</h3>
        <p>
          <strong>Width:</strong> ${width.ft ?? ""} ft ${width.in ?? ""} in<br/>
          <strong>Height:</strong> ${height.ft ?? ""} ft ${height.in ?? ""} in
        </p>

        <h3>Options</h3>
        <p><strong>Thickness:</strong> ${options.thicknessInches ?? 4}"</p>

        <h3>Pricing</h3>
        <p>
          Material: ${prices.material ?? ""}<br/>
          Shipping: ${prices.shipping ?? ""}<br/>
          Options: ${prices.options ?? ""}<br/>
          <strong>Total: ${prices.total ?? ""}</strong>
        </p>

        <h3>Notes</h3>
        <p>${contact?.notes ? String(contact.notes).replace(/\n/g, "<br/>") : "(none)"}</p>

        <h3>Inspiration</h3>
        ${
          inspo.length
            ? inspo.map(u => `<div style="margin:4px 0;"><a href="${u}" target="_blank" rel="noreferrer">${u}</a></div>`).join("")
            : "<p>(none)</p>"
        }
      </div>
    `;

    // --- Send via Resend (if configured) ---
    let sent = false;
    let resendError = null;
    let messageId = null;

    if (resend) {
      try {
        console.log("[/order] Attempting send via Resend", {
          to: TO_EMAIL,
          from: FROM_EMAIL,
          reply_to: contact.email,
        });

        const result = await resend.emails.send({
          from: `Octozek Props <${FROM_EMAIL}>`,   // IMPORTANT
          to: [TO_EMAIL],
          subject: "New Order Request — Octozek Props",
          html,
          replyTo: contact.email,                 // so your reply goes to customer
        });

        if (result?.error) {
          resendError = result.error;
          console.error("[/order] Resend error:", result.error);
        } else {
          sent = true;
          messageId = result?.id || null;
          console.log("[/order] Resend accepted:", messageId);
        }
      } catch (err) {
        resendError = String(err);
        console.error("[/order] Resend threw:", err);
      }
    } else {
      console.log("[/order] Email not sent (no RESEND_API_KEY).");
    }

    return res.json({ ok: true, sent, messageId, resendError });
  } catch (err) {
    console.error("[/order] Server error:", err);
    return res.status(500).json({ ok: false, error: "Server error", detail: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
