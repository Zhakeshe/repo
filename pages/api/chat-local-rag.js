// Simple RAG-like API using local places.json (no embeddings / no vector DB).
// POST { message: "..." } --> returns { answer, contexts: [...] }
// Place a public/places.json file in your project root (or public/) with your places data.

import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "No message provided" });
    }

    // Load local places dataset (expecting public/places.json)
    const p = path.join(process.cwd(), "public", "places.json");
    let places = [];
    try {
      const raw = await fs.readFile(p, "utf8");
      places = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to read places.json:", e.message);
      // fallback empty
      places = [];
    }

    // Simple keyword scoring: count matches of query words in name/desc/tags
    const q = message.toLowerCase();
    const tokens = q.split(/\W+/).filter(Boolean);
    function scorePlace(place) {
      let s = 0;
      const name = String(place.name || "").toLowerCase();
      const desc = String(place.desc || "").toLowerCase();
      const tags = (place.tags || []).join(" ").toLowerCase();
      for (const t of tokens) {
        if (!t) continue;
        if (name.includes(t)) s += 3;
        if (desc.includes(t)) s += 2;
        if (tags.includes(t)) s += 2;
        // numeric matches (e.g., century)
        if (String(place.century || "").includes(t)) s += 1;
      }
      // small boost for category exact match if query mentions it
      const cat = String(place.cat || "").toLowerCase();
      if (tokens.includes(cat)) s += 4;
      return s;
    }

    const scored = places.map(p => ({ place: p, score: scorePlace(p) }));
    scored.sort((a, b) => b.score - a.score);

    // choose top K with positive score, otherwise fallback to nearest few
    const topK = 4;
    let chosen = scored.filter(s => s.score > 0).slice(0, topK);
    if (chosen.length === 0) {
      chosen = scored.slice(0, Math.min(topK, scored.length));
    }

    // Build context parts (trim lengths)
    const contexts = chosen.map((c, i) => {
      const pl = c.place;
      return {
        id: pl.id ?? `idx-${i}`,
        score: c.score,
        meta: { name: pl.name, cat: pl.cat, century: pl.century, source: pl.source || null },
        text: `${pl.name}\n${pl.desc || ""}\nКатегория: ${pl.cat || "—"} • Ғасыр: ${pl.century || "—"}`
      };
    });

    // Compose system + user content with contexts
    const systemIntro = `Сен Маңғыстау картасының көмекші ботысың. Төмендегі контексттерге сүйене отырып нақты әрі қысқа жауап бер. Қай дереккөз пайдаланылғанын көрсет. Егер сенімді болмасаң "мүмкін" деп белгіле.`;
    const contextText = contexts.map((c, i) => `#${i+1} • ${c.meta.name}\n${c.text}`).join("\n\n---\n\n");
    const userContent = `Пайдаланушы сұрағы:\n${message}\n\nКонтексттер:\n${contextText}`;

    // Call Gemini API (generateContent) — use env GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in server environment" });
    }
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        { role: "system", parts: [{ text: systemIntro }] },
        { role: "user", parts: [{ text: userContent }] }
      ],
      temperature: 0.2,
      maxOutputTokens: 512
    };

    // Timeout
    const controller = new AbortController();
    const TIMEOUT_MS = 25000;
    const to = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(to);

    let data;
    try {
      data = await r.json();
    } catch (e) {
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: "Invalid response from Gemini", details: txt });
    }

    if (!r.ok) {
      const remoteErr = data?.error?.message || JSON.stringify(data).slice(0, 500);
      return res.status(502).json({ error: "Gemini API error", details: remoteErr });
    }

    // Extract reply robustly
    let reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.text ||
      (typeof data === "string" ? data : null);
    if (!reply) reply = "⚠️ Жауап табылмады.";

    reply = String(reply).trim();

    // Return answer + contexts used
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      answer: reply,
      contexts: contexts.map(c => ({ id: c.id, score: c.score, meta: c.meta }))
    });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Upstream request timed out" });
    }
    console.error("chat-local-rag error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}