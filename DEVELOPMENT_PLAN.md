# Cricket Management Development Plan

## Phase 1 — Foundation — Implemented

- Next.js App Router + TypeScript
- MySQL database
- Prisma ORM schema
- Route → controller → service → Prisma architecture
- Zod API validation
- Docker Compose database setup

## Phase 2 — League structure — Implemented

- Tournament/season profiles
- Franchise ownership/contact profiles
- Team profiles with primary, secondary and accent colors
- Team theme, slogan, logo, city and home ground
- Tournament-team assignment
- Editable points table and NRR

## Phase 3 — Squad management — Implemented

- Player image
- Name and display name
- Jersey number
- DOB and nationality
- Player role
- Batting and bowling styles
- Captain / wicketkeeper / overseas / active flags
- Contact data and bio
- Team filtering and player search

## Phase 4 — Match operations — Implemented

- Match scheduling
- League/playoff/final/friendly stages
- Match status
- Venue and overs
- Winner/result text
- Player of the match
- Toss winner and BAT/BOWL decision
- Innings runs, wickets, balls, extras and target

## Phase 5 — Player match performance — Implemented

- Runs and balls faced
- 4s and 6s
- Wickets
- Balls bowled and runs conceded
- Maidens
- Catches
- Stumpings
- Run-outs
- Dismissal text
- Match score-entry workspace

## Phase 6 — Media — Implemented

- Drag-and-drop file uploads
- Images / logos / video / PDF / other documents
- Media metadata in MySQL
- Reusable asset URLs
- Player, team, franchise and tournament upload fields
- Local persistent-disk driver for development

## Phase 7 — NPL demo — Implemented

- Eight NPL 2025 team names
- Franchise reference data
- Representative squad records
- Team themes/colors for demo UI
- Standings
- Completed sample matches
- Live demo match
- Toss/innings/player statistics

## Phase 8 — Advanced UI — Implemented

- Responsive admin console
- Sidebar navigation
- Light/dark themes stored in localStorage
- Dashboard KPI cards
- League table
- Match scoreboard cards
- Player cards
- Team branding cards
- CRUD modals
- Responsive mobile layout

## Recommended production hardening — Next

- Authentication and role-based access (Super Admin, Scorer, Franchise Manager, Viewer)
- Audit log for score/stat edits
- S3/R2/Cloudinary media driver for serverless deployment
- Ball-by-ball `Delivery` model and live commentary
- WebSocket/SSE live score broadcasting
- Automated integration/E2E tests
- Database backups and observability
- Public fan-facing match center separate from admin console
