# Goofy Mode

Primary experience for the BeTheCandle Bitcoin donation platform. Focuses on the interactive 3D "Goofy Mode" orbit, where supporters float around a giant BTC planet.

## Highlights

- 🪐 Immersive Three.js scene with animated Bitcoin sphere
- �️ Selectable satellite supporters with rich profile cards
- � Persistent color customization for satellites
- � Ambient soundtrack and playful animations powered by Framer Motion

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **3D & Animations**: React Three Fiber, drei, Framer Motion
- **Styling**: TailwindCSS

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Launch the development server

   ```bash
   npm run dev
   ```

3. Visit [http://localhost:3000/goofy-mode](http://localhost:3000/goofy-mode) in your browser

### Environment variables

Set the following values (Netlify build settings already include them):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (Postgres connection for donation APIs)

## Key Files

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Redirects / to /goofy-mode
│   ├── globals.css             # Global styles
│   ├── goofy-mode/page.tsx     # Goofy Mode entry point
│   └── even-goofier-mode/      # Experimental playground
└── components/
   ├── DonationBubble.tsx      # Lobby orbit with animated donation bubbles
   ├── InteractiveSphere3D.tsx # Higher-level scene composition
   └── SatelliteInfoCard.tsx   # Overlay with supporter details
```

## Scripts

- `npm run dev` – start development server
- `npm run build` – build for production
- `npm start` – run production build
- `npm run lint` – lint project
- `npm run community-pot:payout` – execute the Polygon USDC payout (accepts optional `--dry-run`)

## Community Pot weekly cycle

The Community Pot allows up to 10 authenticated supporters to register a Polygon address and receive an equal share of a weekly USDC amount. The frontend shows a live countdown, available slots, and the participant list, while the backend exposes secured APIs plus a payout script/endpoint.

### Database migration

Run the Supabase migration located at `supabase/scripts/20241113_create_community_pot.sql` (e.g. via `supabase db push`) to create the `community_pot_*` tables, triggers, and RLS policies.

### API endpoints

- `GET /api/community-pot/status` – public status payload (active week, countdown, participants)
- `POST /api/community-pot/join` – authenticated users can claim/update their Polygon address for the week
- `POST /api/community-pot/payout` – secured endpoint that triggers the Polygon USDC distribution (expects `x-community-pot-secret` header)

### Scheduled/manual payouts

Configure these environment variables wherever payouts run (Next.js route, cron job, or the CLI script):

- `COMMUNITY_POT_PAYOUT_SECRET` – shared secret for the payout endpoint
- `COMMUNITY_POT_RPC_URL` – Polygon RPC endpoint
- `COMMUNITY_POT_PAYOUT_PRIVATE_KEY` – hex private key for the funding wallet
- `COMMUNITY_POT_USDC_CONTRACT` – optional override (defaults to Polygon USDC `0x2791...4174`)

You can execute payouts either by calling the secure API or via the CLI helper:

```bash
npm run community-pot:payout -- --dry-run   # simulate transfers and verify config
npm run community-pot:payout               # send transactions and log hashes
```

### Frontend integration

The `/community-pot` page now shows the live countdown, status pill, slot availability, and participant list. Authenticated users can paste their Polygon address and reserve a slot; updates remain available even when the week is full.

## License

MIT
