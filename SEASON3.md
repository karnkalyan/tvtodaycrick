# NPL-TVToday — High-Resolution Sourced Data & Dual-Provider Architecture

`npm run db:seed`, `npm run db:sync` and `npm run db:sync:all` fetch authentic, published records and high-definition assets directly from **nplt20league.com** and **cricnepal.com**.

## Dual Data Sources

1. **`nplt20league.com` (Default & Recommended)**
   - Official-grade high-resolution player photos (WebP / PNG) and transparent team crests.
   - Comprehensive franchise metadata: verified owners, head coaches, star captains, home venues, and social media handles.
   - Complete player profiles: Date of birth, age, birthplace, nationality, batting style, bowling style, playing role, marquee status, auction prices, and overseas status.
   - 2026 fixtures (League & Playoffs) and 2025 historical completed matches with scores, overs, run targets, winners, and margins.
   - Live scores endpoint (`/api/v1/live/npl`) with real-time ball-by-ball, overs, and innings progress.

2. **`cricnepal.com` (Tournament Archive Source)**
   - Tournament match schedules and news announcements.
   - When selected as the data provider, all player photos and team logos are **automatically upgraded and enriched** using the local high-resolution asset engine scraped from `nplt20league.com`.

## High-Definition Local Asset Engine

All image assets are scraped and downloaded into the local `public` folder:
- **Team Logos**: `public/images/teams/{team-slug}/logo.png`
- **Player Photos**: `public/images/teams/{team-slug}/players/{player-slug}.webp`

Benefits:
- Eliminates hotlink breakage, CORS errors, and slow remote image delivery.
- Served directly by Next.js via `/images/teams/...` for instant, crisp rendering.
- Re-downloading is cached unless explicitly refreshed.

## Real-Time Live Auto-Sync in Navbar

- The navigation bar includes an **interactive Auto-Sync switch** with a glowing green live status indicator.
- When enabled, it polls live scores and match progress in the background every 25 seconds.
- Score and status updates automatically reflect in the UI and broadcast graphics via WebSocket (`ws://localhost:3001`).
- The navbar also features an instant **Provider Selector** (`nplt20league (HQ)` vs `cricnepal`).

## Database Seeding & CLI Commands

- `npm run db:seed` or `npm run db:sync`: Synchronizes the active 2026 season with all 129 players, 8 franchises, and 32 fixtures.
- `npm run db:sync:all`: Synchronizes all 3 NPL seasons (2024, 2025, and 2026) with 156 total matches and historical results.
- `npm run test:npl`: Runs the automated test suite verifying parser robustness, asset caching, role mapping, and provider switching.
