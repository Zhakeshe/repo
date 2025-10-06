```markdown
# Mangystau Map — Deploy to Vercel

1. Install deps:
   npm install

2. Local dev:
   cp .env.local.example .env.local
   # fill GEMINI_API_KEY in .env.local
   npm run dev
   Open http://localhost:3000

3. GitHub:
   git init
   git add .
   git commit -m "Initial"
   # create repo on GitHub and push
   git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
   git push -u origin main

4. Vercel:
   - Sign in to vercel.com
   - Import project from GitHub (select repository)
   - In Project Settings → Environment Variables add GEMINI_API_KEY for Production & Preview
   - Deploy

5. Test:
   curl -X POST https://your-project.vercel.app/api/chat -H "Content-Type: application/json" -d '{"message":"Сәлем"}'
```