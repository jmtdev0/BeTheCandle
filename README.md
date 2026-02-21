# Be The Candle

An immersive, interactive web experience built around the **Community Pot** — a weekly USDC distribution system on Polygon where participants join and receive equal shares through a transparent on-chain payout.

## Features

- **Community Pot** — Weekly pool where participants join with a Polygon wallet address and split the pot equally at payout time.
- **3D Visualization** — Interactive orbs rendered with Three.js represent each participant in real time.
- **Day/Night Cycle** — Background gradients shift throughout the day (dawn, day, sunset, night) based on Madrid timezone.
- **Music & Video Backgrounds** — Ambient music player with synced video backgrounds streamed from Cloudflare R2.
- **Immersive Mode** — Toggle to hide all UI and enjoy the visual/audio experience.
- **Donations** — Standalone page to display and share a donation address.
- **Real-Time Updates** — WebSocket integration for live participant and pot status changes.
- **On-Chain Payouts** — Automated USDC distribution on Polygon with Twitter payout announcements.

## Tech Stack

| Layer | Technologies |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| 3D Graphics | Three.js, React Three Fiber, Drei, Post-Processing (Bloom) |
| Styling | Tailwind CSS 3, Framer Motion |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Blockchain | Polygon (USDC), viem |
| Storage | Cloudflare R2 (video + music), AWS S3 SDK |
| APIs | Twitter API v2, Google reCAPTCHA v2 |
| Testing | Playwright (E2E) |
| Hosting | Netlify |

## Project Structure

```
src/
├── app/                        # Next.js App Router pages & API routes
│   ├── api/                    # REST endpoints (community-pot, music, videos, auth)
│   ├── community-pot/          # Main feature: pot page, guide, history
│   ├── donate/                 # Donation display page
│   └── auth/                   # OAuth callback
├── components/
│   ├── common/                 # Shared UI (MusicPlayer, Sidebar, CookieBanner, etc.)
│   └── community-pot/          # Pot-specific (3D orbs, video backgrounds, stats)
├── contexts/                   # React contexts (music state, cookies, transitions)
├── hooks/                      # Custom hooks (useCommunityPot, useDayNightCycle, etc.)
├── lib/                        # Utilities (Supabase clients, DB pool, R2, colors)
├── types/                      # TypeScript type definitions
└── data/                       # Static data (music metadata)

scripts/                        # CLI tools for payouts and emergency transfers
supabase/                       # Database config, seed SQL, and RPC functions
tests/                          # Playwright E2E tests
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Supabase project
- A Polygon RPC endpoint

### Installation

```bash
git clone https://github.com/jmtdev0/BeTheCandle.git
cd BeTheCandle
npm install
```

### Environment Variables

Create a `.env` file at the project root with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Polygon / Web3
COMMUNITY_POT_RPC_URL=
COMMUNITY_POT_PAYOUT_PRIVATE_KEY=
COMMUNITY_POT_USDC_CONTRACT=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359

# Community Pot Config
COMMUNITY_POT_DEFAULT_AMOUNT_USDC=10.00
COMMUNITY_POT_DEFAULT_MAX_PARTICIPANTS=10
COMMUNITY_POT_DEFAULT_IS_TESTNET=true

# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# Cloudflare R2 (Video + Music Storage)
R2_ACCESS_KEY_ID=
R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_URL=
R2_MUSIC_PREFIX=music

# Twitter API (Payout Announcements)
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=

# Site
PUBLIC_SITE_URL=
```

`/api/music` reads tracks from Cloudflare R2 using `R2_PUBLIC_URL` + `R2_MUSIC_PREFIX` (default `music`).  
If R2 is unavailable or empty, it automatically falls back to `public/background_music`.

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run community-pot:payout` | Execute weekly payout |
| `npm run community-pot:emergency` | Emergency fund transfer |

## License

All rights reserved.
