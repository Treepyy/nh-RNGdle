# 🤨🎲 nhentai RNGdle - Project Progress

## 📖 Project Overview
RNGdle is a daily browser-based "gacha" mini-game. It acts as a gamified data-visualization tool where players "roll" a random 6-digit gallery ID via the nHentai v2 API. The fetched metadata (tags, favorites, ID length) is evaluated against a static local dictionary to generate an inverse-rarity score. 

The game enforces a Wordle-style 24-hour lockout and allows players to copy their daily results to the clipboard using formatted emojis.

---

## 🛠️ Tech Stack
*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (with custom procedural animation keyframes)
*   **Data Fetching:** Server-side API Proxying (`fetch`)
*   **State Management:** React Hooks (`useState`, `useEffect`)
*   **Persistence:** Browser `localStorage`

---

## 🗂️ Project Structure

```
rngdle/
├── app/
│   ├── api/roll/
│   │   └── route.ts       # Backend proxy to bypass CORS, handles Cloudflare & 404s
│   ├── layout.tsx         # Root Next.js layout
│   └── page.tsx           # Main UI, State Machine, Animations, and Game Logic
├── lib/
│   └── tags.ts            # Local dictionary of tags, counts, and scoring algorithms
├── tailwind.config.ts     # Includes custom 'fade-in-up' animations
└── PROGRESS.md            # This file
```

---

## 🧮 Core Mechanics & Scoring Logic

The game uses a tier-based system calculated through the following variables:

1.  **Tag Rarity (Base Score):** Calculated inversely. `(100,000 / Tag Count) * 20`. 
2.  **Digit Bonus:** Rewards players for rolling historically older, fewer-digit codes.
    *   1-Digit Relic: +200,000
    *   2-Digit Antique: +50,000
    *   3-Digit Classic: +10,000
    *   4-Digit Vintage: +2,500
    *   5-Digit Standard: +500
3.  **Favorites Bonus:** +1 point for every favorite the gallery has on the site.

### 🏆 Rarity Tiers & Emojis
*   ⬛ **DELETED** (404 Not Found)
*   🟥 **ZERO TAGS** (Valid gallery, 0 tags)
*   🟫 **TRASH** (Valid gallery, but ALL tags have >50,000 count (COMMON tags))
*   ⬜ **COMMON** (< 1,000 pts)
*   🟩 **UNCOMMON** (1,000+ pts)
*   🟦 **RARE** (5,000+ pts)
*   🟪 **EPIC** (20,000+ pts)
*   🟧 **LEGENDARY** (50,000+ pts)
*   🟥 **MYTHIC** (100,000+ pts)

---

## ✅ Features Completed

- [x] **Backend API Route:** Safely fetches random IDs (1–500,000) and extracts tags/favorites.
- [x] **Error Handling:** Recognizes 404s (Deleted Galleries) and passes them safely to the client for the `DELETED` state. Avoids crashing on Cloudflare Captcha walls.
- [x] **State Machine:** Fluid transitions between `idle`, `fetching`, `digits`, `tags`, and `done` phases.
- [x] **Procedural Animations:** 
  - Sequential slot-machine spinning for the 6-digit reveal.
  - Staggered pop-in animations for tag reveals (lowest to highest score).
- [x] **Scoring Engine:** Implemented base tag scoring, ID-length bonuses, and favorite bonuses.
- [x] **Edge Cases Handled:** Unregistered tags default to a common 100k count. Zero-tag rolls evaluate correctly while keeping secondary bonuses.
- [x] **Daily Lockout:** Implemented `localStorage` hydration to lock players to one roll per day, complete with a live midnight countdown timer.
- [x] **Social Share:** Web Clipboard API integration formats a Wordle-style copyable string containing dynamic tag emojis, bonus data, and total score.

---

## 🚀 Next Steps / Backlog
*   [ ] Add Plausible Analytics or Vercel Web Analytics to track traffic/daily active users.
*   [ ] Host on a custom domain (e.g., `nhrngdle.com`) to bypass social media spam filters and ad-network `.vercel.app` restrictions.
*   [ ] Evaluate passive monetization paths (JuicyAds, Affiliate VPN links, Direct Sponsorships).