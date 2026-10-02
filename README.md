# USHER: Statutory & Medical Film Compliance Gatekeeper

> **Sanity Challenge 2026 Submission — Path One: Ship an Agent That Queries Real Content**  
> An executive compliance gatekeeper evaluating films and television series against clinical vulnerabilities (photosensitive epilepsy, acoustic shock, PTSD) and statutory CBFC classifications. Grounded strictly in structured records from the **Sanity Content Lake**.

---

## Overview

USHER solves the high-stakes problem of cinematic compliance:
- **Zero Hallucination Policy**: If a movie is uncertified in Sanity, USHER strictly refuses to speculate or generate probabilistic medical advice.
- **Relational Integrity**: Queries typed graph documents connecting Movies, CBFC Statutory Ratings, Clinical Triggers (with exact millisecond timestamps and decibel surges), and Governing Accessibility Rules.
- **Dual-Theme Design**: Sleek Space Black & Metallic Slate (default) and Warm Coffee & Mocha Beige.
- **Audited Catalog**: 42 certified titles across 8 genres with official high-resolution artwork.

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   USHER Web Interface                  │
│       Next.js App Router · Dual Theme · Poster Catalog │
└───────────────────────────┬────────────────────────────┘
                            │ /api/chat
                            ▼
┌────────────────────────────────────────────────────────┐
│                Compliance Gateway API                  │
│      Gemini 3.5 Flash Lite + Multi-Key Failover Loop   │
│             + Deterministic Fallback Engine            │
└───────────────────────────┬────────────────────────────┘
                            │ search_knowledge_base
                            ▼
┌────────────────────────────────────────────────────────┐
│              Sanity Content Lake Query                 │
│      Live GROQ Query / Sanity Context MCP Endpoint     │
└───────────────────────────┬────────────────────────────┘
                            │ Structured Graph
                            ▼
┌────────────────────────────────────────────────────────┐
│               Sanity Knowledge Base                    │
│  [Movie] ──> [CBFC Statutory Rating]                   │
│     │                                                  │
│     ├───> [Trigger Warnings] (Mild, Severe, Critical)  │
│     └───> [Accessibility Rules] (ITU-R, CBFC, WHO)     │
└────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
usher/
├── studio/             # Sanity Studio schemas & seeding script
│   ├── schemas/        # movie, triggerWarning, accessibilityRule, cbfcRating
│   ├── seed.mjs        # Master seeder (42 titles, 13 triggers, 7 rules, 5 ratings)
│   └── sanity.config.ts
└── web/                # Next.js web application
    ├── src/app/        # page.tsx, globals.css, layout.tsx, api/chat/route.ts
    ├── src/lib/        # mcp-client.ts (GROQ Knowledge Lake & MCP interface)
    ├── .env.example    # Production environment variables template
    └── package.json
```

---

## Production Deployment (Vercel)

USHER is optimized for single-click deployment on **Vercel**:

### 1. Root Directory Setting in Vercel
When importing your GitHub repository into Vercel:
* Set **Root Directory** to `web` (since the Next.js app is inside the `web/` folder).
* Framework Preset: **Next.js**.

### 2. Required Environment Variables
Add the following in **Vercel Project Settings → Environment Variables**:

| Variable | Description | Example / Source |
| :--- | :--- | :--- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API Key(s). Supports comma-separated keys for automatic failover. | `AIzaSy...` or `key1,key2` |
| `SANITY_PROJECT_ID` | Sanity Project ID | `ntxlr356` |
| `SANITY_DATASET` | Sanity Dataset | `production` |
| `SANITY_ORGANIZATION_TOKEN` | Read token with Content Lake access | `skJ2LArYUVufd3...` |
| `SANITY_CONTEXT_MCP_URL` | Sanity Context MCP Remote Endpoint | `https://mcp.sanity.io` |

### 3. Deploy
Click **Deploy**. Vercel will install dependencies, build the Next.js application, and deploy to a live `.vercel.app` domain.

---

## Local Development

### 1. Install & Run Web
```bash
cd web
npm install
npm run dev
```
Open **`http://localhost:3000`**.

### 2. Re-seed Database (Optional)
```bash
cd studio
npm install
node seed.mjs
```

---

## Statutory & Clinical Grounding Standards

- **ITU-R BT.1702-2**: Guidance for the reduction of photosensitive epileptic seizures caused by television.
- **CBFC Guidelines 2023**: Indian Cinematograph Act 1952 statutory rating directives.
- **WHO Auditory Safety Standards**: High-decibel sound threshold (>85 dB sustained, >115 dB impulse blast).
