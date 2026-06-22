# AirPulse — Vercel & GitHub-Ready Secure Deployment

This directory contains the **Vercel-ready production version** of **AirPulse**. 

It is engineered using **Vercel Serverless Functions** (under the `api/` folder) to securely route WAQI API calls server-side. This ensures your private API keys **never leak to the browser network requests** and are **never committed to public GitHub repositories**.

---

## 🌟 Security Architecture: How the API Key is Hidden

For client-only applications, any key queried in JavaScript is readable in the browser's Network tab. To prevent this, AirPulse routes all sensitive calls through serverless proxies:

```
[Browser Client] 
     │
     ▼ (Queries /api/waqi without showing the token key)
[Vercel Serverless Function (Node.js)] 
     │
     ▼ (Appends secure server-side process.env.WAQI_TOKEN key)
[WAQI Official Servers]
```

1. **`.gitignore` Integration**: Local environment configuration files (`.env`, `.env.local`) are ignored by Git.
2. **Server-Side Appends**: The serverless proxies in `/api/waqi.js` and `/api/test-token.js` fetch the data, intercepting keys securely on Vercel's backend hosting environment.

---

## 🚀 Easy Vercel Deploy Guide

### Option 1: Vercel Dashboard (Recommended)

1. Create a new repository on your GitHub account and push the contents of this `airpulse-vercel` folder.
2. Navigate to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New"** -> **"Project"**.
3. Import your GitHub repository.
4. Expand the **Environment Variables** panel in Vercel settings and add:
   * **Key**: `WAQI_TOKEN`
   * **Value**: `8351afd9c57845fd2ada91885f218c3c84856d50afa1fd8f7a0b4551d17d23f0`
5. Click **Deploy**. Vercel will automatically detect `vercel.json` routing rules and compile your serverless endpoints!

### Option 2: Vercel CLI (Local Testing & Quick Deploy)

1. Open your terminal in this `airpulse-vercel` folder and make sure you have the Vercel CLI installed:
   ```bash
   npm i -g vercel
   ```
2. Set up your local environments file `.env`:
   ```bash
   copy .env.example .env
   ```
3. Run Vercel locally to test the serverless routing:
   ```bash
   vercel dev
   ```
   This will host your site on `http://localhost:3000` and locally simulate Vercel's Node.js API serverless runtime!
4. When satisfied, push it directly to production:
   ```bash
   vercel --prod
   ```

---

## 📂 Folder Structures

```
airpulse-vercel/
├── api/
│   ├── waqi.js         # Secure server-side node fetch proxy
│   └── test-token.js   # Secure token connection checker
├── js/
│   ├── app.js          # Client coordinator calling local serverless proxies
│   ├── api.js          # API client mapping serverless /api routes
│   ├── map.js          # Dark Leaflet.js layout builder
│   └── charts.js       # Visual Chart.js forecaster
├── index.html          # Semantic HTML layout
├── styles.css          # Premium HSL CSS design system
├── vercel.json         # Routing mappings configurations
├── .gitignore          # Keeps secrets and configs off GitHub
├── .env.example        # Environment variable instruction templates
└── README.md           # Deployment documentation
```
