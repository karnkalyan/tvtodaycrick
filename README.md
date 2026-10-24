# NPL-TVToday

A Next.js + MySQL + Prisma cricket workspace branded **NPL-TVToday**, with current web-sourced Nepal Premier League 2026 Season 3 fixtures, franchise profiles, squad registrations, logos and player photos.

> The default seed fetches published 2026 records. Source timestamps and refresh failures are visible; unavailable scores and unannounced participants are never simulated. See [SEASON3.md](SEASON3.md) for sources and refresh behavior.

## What is included

- Responsive sidebar with grouped Lucide icons, persistent desktop collapse, mobile drawer and keyboard navigation.
- Clean admin dashboard with persistent **light / dark mode**.
- Full-page add/edit/delete flows for franchises, teams, players, matches and tournaments.
- Separate tournament registration/standings pages and media upload/delete pages.
- Database-backed Season 3 fixtures and squads, with web refresh controls and source links.
- Tournament and season management.
- Editable points table: played, won, lost, tied, no result, points and NRR.
- Franchise profiles: owner/company, contacts, address, website, description and logo.
- Team profiles: franchise relation, primary/secondary/accent colors, theme, slogan, city, ground and logo.
- Player profiles: photo, jersey number, role, nationality, batting/bowling styles, captain, wicketkeeper, overseas and active flags.
- Fixture and result management: stage, date/time, venue, match status, winner, result text and player of the match.
- Toss entry: toss-winning team and BAT/BOWL decision.
- Innings entry: runs, wickets, balls, extras, target and innings status.
- Player performance entry: runs, balls faced, fours, sixes, wickets, balls bowled, runs conceded, maidens, catches, stumpings, run-outs and dismissal.
- Media library with drag-and-drop upload and reusable file URLs.
- Layered backend structure: **Route Handler → Controller → Service → Prisma → MySQL**.
- Zod validation for request bodies.
- Docker Compose MySQL setup.
- Transactional, repeatable 2026 web importer; historical software demo available separately.

## Teams

The current source includes:

- Biratnagar Kings
- Chitwan Rhinos
- Janakpur Bolts
- Karnali Yaks
- Kathmandu Gorkhas
- Lumbini Lions
- Pokhara Avengers
- Sudurpaschim Royals

Registrations follow the published 2026 squad pages and explicit signing announcements, rather than a fixed list of selected players.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- MySQL 8
- Prisma ORM 6
- Zod 4
- Native CSS design system (no UI framework required)

## Quick start

### 1. Environment

```bash
cp .env.example .env
```

Default development database URL:

```env
DATABASE_URL="mysql://root:@localhost:3306/cricket_management"
NEXT_PUBLIC_APP_NAME="NPL-TVToday"
UPLOAD_MAX_MB="20"
```

### 2. Start MySQL

```bash
docker compose up -d
```

### 3. Install packages

```bash
npm install
```

### 4. Generate Prisma client

```bash
npm run prisma:generate
```

### 5. Create the database schema

```bash
npm run prisma:migrate -- --name init
```

### 6. Import current NPL 2026 data

```bash
npm run db:seed
```

### 7. Start the application

```bash
npm run dev
```

Open `http://localhost:3000`.

## Main screens

| URL | Purpose |
| --- | --- |
| `/` | Current season summary, sourced fixtures and franchises |
| `/schedule` | Published fixtures, available scores and CSV export |
| `/squads` | Current squad registrations, photos and source links |
| `/tournaments` | Tournament details and editable standings |
| `/franchises` | Franchise CRUD and logo uploads |
| `/teams` | Team CRUD, colors/themes and logo uploads |
| `/players` | Player CRUD, images and cricket profile data |
| `/matches` | Fixtures, status and results |
| `/score-entry` | Toss, innings and player performance entry |
| `/media` | Upload and manage media assets |

## API structure

### Tournament

- `GET /api/tournaments`
- `POST /api/tournaments`
- `GET /api/tournaments/:id`
- `PATCH /api/tournaments/:id`
- `DELETE /api/tournaments/:id`
- `POST /api/standings`
- `DELETE /api/standings?tournamentId=1&teamId=1`

### Franchise / team / player

- `GET|POST /api/franchises`
- `GET|PATCH|DELETE /api/franchises/:id`
- `GET|POST /api/teams`
- `GET|PATCH|DELETE /api/teams/:id`
- `GET|POST /api/players`
- `GET|PATCH|DELETE /api/players/:id`
- `GET /api/players?teamId=1&q=Karan`

### Match operations

- `GET|POST /api/matches`
- `GET|PATCH|DELETE /api/matches/:id`
- `POST /api/toss`
- `POST /api/innings`
- `POST /api/stats`

### Media / dashboard

- `GET|POST /api/media`
- `DELETE /api/media/:id`
- `GET /api/dashboard`

## Backend layout

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   ├── tournaments/
│   │   ├── franchises/
│   │   ├── teams/
│   │   ├── players/
│   │   ├── matches/
│   │   ├── score-entry/
│   │   └── media/
│   └── api/
│       ├── dashboard/
│       ├── tournaments/
│       ├── standings/
│       ├── franchises/
│       ├── teams/
│       ├── players/
│       ├── matches/
│       ├── toss/
│       ├── innings/
│       ├── stats/
│       └── media/
├── components/
├── controllers/
├── services/
├── validators/
├── lib/
└── types/
prisma/
├── schema.prisma
└── seed.ts
public/
└── uploads/
```

## Media uploads

The development implementation stores uploaded files under:

```text
public/uploads/YYYY/MM/
```

and stores metadata/URL records in `MediaAsset`. It accepts images, videos, PDFs, documents and other files up to `UPLOAD_MAX_MB`.

This is appropriate for local development or a Node server with persistent disk. **Serverless filesystems such as Vercel are ephemeral**, so for production deployments replace the file-writing portion of `src/services/media.service.ts` with S3, Cloudflare R2, Cloudinary or another persistent object-storage provider. The rest of the application can continue storing the returned URL in the same fields and `MediaAsset` model.

## Prisma models

The schema contains:

- `Tournament`
- `TournamentTeam`
- `Franchise`
- `Team`
- `Player`
- `Match`
- `Toss`
- `MatchInnings`
- `PlayerMatchStat`
- `MediaAsset`

## Seed behavior

`npm run db:seed` and `npm run db:sync` fetch and validate published 2026 Season 3 records before a transactional import. Current views use the source snapshot and active registrations. See [SEASON3.md](SEASON3.md).

The separate `npm run db:seed:demo` workflow is only for software demonstrations. Its historical demo scores are excluded from current-season views.

## Production Deployment (Live URL: https://cricket.tvtoday.com.np)

### Docker Compose Architecture
This application is designed for live broadcast production. It connects to the existing running MySQL container (`almari-mysql` on `almari-network`) without spinning up duplicate database instances.

- **Production Domain**: `https://cricket.tvtoday.com.np`
- **Broadcast Output Feed**: `https://cricket.tvtoday.com.np/broadcast/output`
- **Director Controller**: `https://cricket.tvtoday.com.np/broadcast`
- **WebSocket Feed**: `wss://cricket.tvtoday.com.np/ws`

### Quick Start with Docker
```bash
# 1. Build and start the container in background
docker compose up -d --build

# 2. View container logs
docker compose logs -f cricket-app
```

### Production Database & Seeding Strategy
- **Seed Data**: Automatically seeds all 8 franchises, teams, ~160 squad rosters with high-res photos, and 32 scheduled fixtures.
- **Match Details Scores**: Set to `false` (`SEED_MATCH_SCORES="false"`). Matches start clean (`SCHEDULED`, 0/0 in 0.0 overs) ready for real director scoring and live auto-sync.
- **Live Sync Priority**: Automatically prioritized from `nplt20league` (the official HQ provider).
- **Asset Preservation**: Changing sources preserves verified high-res logos, team colors, slogans, and player photos without overwriting.

### Nginx Reverse Proxy Setup
See [deploy/cricket.tvtoday.com.np.conf](deploy/cricket.tvtoday.com.np.conf) for the ready-to-use virtual host configuration supporting SSL and WebSockets.

---

## Reference context

- Cricket Association of Nepal (CAN), Nepal Premier League tournament page: `https://cricketnepal.org.np/event/nepal-premier-league/`
- Official HQ Source: [NPL T20 League](https://nplt20league.com)
- Current fixtures, squads and image URLs: [Cricnepal 2026](https://www.cricnepal.com/tournament/nepal-premier-league-2026-207). Source limitations are described in [SEASON3.md](SEASON3.md).
