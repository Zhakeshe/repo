export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history, model, maxOutputTokens, temperature } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "No message provided" });
    }

    // Basic request limits
    const MAX_LEN = 6000;
    if (message.length > MAX_LEN) {
      return res.status(400).json({ error: `Message too long (max ${MAX_LEN} chars)` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // Model selection (default to your current model)
    const modelName = model || "gemini-1.5-flash"; // change if needed
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey}`;

    // Build contents: include optional system prompt via history or system role
    const contents = [];
    if (Array.isArray(history)) {
      // accept history as [{role:'system'|'user'|'assistant', text:'...'}, ...]
      history.forEach(h => {
        if (h && h.role && h.text) {
          contents.push({ role: h.role, parts: [{ text: String(h.text) }] });
        }
      });
    }
    // finally push current user message
    contents.push({ role: "user", parts: [{ text: String(message) }] });

    // Request payload (tune params as desired)
    const payload = {
      // some GL APIs accept model in path + request body may include "temperature" etc.
      // You can add other generation options if supported by the model/version.
      // We follow the payload shape you used but include a couple tuning params if supported.
      contents,
      // Optional generation params (may be ignored by some endpoints)
      temperature: typeof temperature === "number" ? temperature : 0.2,
      maxOutputTokens: typeof maxOutputTokens === "number" ? maxOutputTokens : 512
    };

    // Timeout handling
    const controller = new AbortController();
    const TIMEOUT_MS = 30000; // 30s
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    let data;
    try {
      data = await r.json();
    } catch (e) {
      // non-JSON reply
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: "Invalid response from Gemini API", details: txt });
    }

    if (!r.ok) {
      // bubble useful error message if present
      const remoteError = data?.error?.message || data?.error || JSON.stringify(data).slice(0, 200);
      return res.status(502).json({ error: "Gemini API error", details: remoteError });
    }

    // Robust extraction of text from known response shapes
    let reply = null;
    // try common paths:
    if (Array.isArray(data?.candidates) && data.candidates.length > 0) {
      // candidate -> content -> parts -> [ { text } ]
      const c = data.candidates[0];
      reply = c?.content?.parts?.[0]?.text || c?.content?.[0]?.text || c?.content?.text;
    }
    // fallback newer shapes
    if (!reply) {
      reply = data?.output?.[0]?.content?.[0]?.text || data?.result?.outputs?.[0]?.content?.parts?.[0]?.text;
    }
    // ultimate fallback: stringify a small portion
    if (!reply) {
      reply = (typeof data === "string" && data) || JSON.stringify(data).slice(0, 1000) || "⚠️ Жауап табылмады.";
    }

    // Optionally trim and normalize
    reply = String(reply).trim();

    // Return structured response. In production avoid returning raw model payload.
    const responsePayload = { answer: reply };
    if (process.env.NODE_ENV !== "production") {
      // include minimal debug info in non-prod only
      responsePayload._debug = { model: modelName, raw: data?.candidates ? { candidates: data.candidates.length } : undefined };
    }

    // security: don't cache sensitive replies
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(responsePayload);
  } catch (err) {
    // handle abort separately
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Upstream request timed out" });
    }
    console.error("Chat API error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}