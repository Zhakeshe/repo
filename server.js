const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.json());

// HTML бетті көрсету
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Чат API
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message жоқ" });

    const apiKey = process.env.GOOGLE_API_KEY; // .env файлына салып қоясың
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: message }] }]
      })
    });

    const data = await r.json();

    let answer = "Жауап табылмады.";
    const parts = data?.candidates?.[0]?.content?.parts;
    if (parts?.length) {
      answer = parts.map(p => p.text || "").join("\n");
    }

    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(3000, () => console.log("🚀 Сервер ашылды: http://localhost:3000"));
