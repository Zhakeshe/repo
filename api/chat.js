// pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: String(message) }] }]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: data?.error?.message || "Gemini API error" });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Жауап табылмады.";

    res.status(200).json({ answer: reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  console.log("📩 User message:", message);
  console.log("🔑 API key:", process.env.GEMINI_API_KEY ? "OK" : "MISSING");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message }] }],
        }),
      }
    );

    const data = await response.json();
    console.log("📤 Gemini response:", JSON.stringify(data));

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ Жауап шықпады.";

    res.status(200).json({ answer: reply });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
}



