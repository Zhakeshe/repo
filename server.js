const express = require('express');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public')); // index.html + places.json inside public/

// simple limiter
const limiter = rateLimit({ windowMs: 60*1000, max: 60 });
app.use('/api/', limiter);

// basic chat proxy (optionally to OpenAI)
app.post('/api/chat', async (req, res) => {
  const msg = (req.body.message || '').toString().trim();
  if (!msg) return res.status(400).json({ error: 'Empty message' });

  // Very simple local Q/A: if user asks about places, try to answer from places.json
  try {
    const places = require('./public/places.json');
    const q = msg.toLowerCase();
    // example: ask "мешіттер қанша?"
    if (q.includes('мешіт')) {
      const n = places.filter(p => p.cat === 'мешіт').length;
      return res.json({ answer: `Мешіттер саны: ${n}` });
    }

    // If OPENAI_API_KEY is set, proxy to OpenAI (pseudo-code, requires OPENAI_API_KEY env)
    if (process.env.OPENAI_API_KEY) {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `You are assistant for Mangystau map. User: ${msg}` }],
          max_tokens: 300
        })
      });
      const data = await openaiRes.json();
      const answer = data?.choices?.[0]?.message?.content || 'Жауап табылмады';
      return res.json({ answer });
    }

    // fallback generic reply
    return res.json({ answer: "Өкінішке орай, AI кілті қосылмаған. Қарапайым сұрақтарға сервер жауап берді: " + msg });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log('Server listening on', port));