// pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });

  console.log("📩 User message:", message);
  console.log("🔑 API key:", process.env.GEMINI_API_KEY ? "OK" : "MISSING");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: String(message) }] }]
      })
    });

    const data = await r.json();
    console.log("📤 Gemini response:", JSON.stringify(data));

    if (!r.ok) {
      return res.status(500).json({ error: data?.error?.message || "Gemini API error" });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Жауап табылмады.";
    res.status(200).json({ answer: reply });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
}
