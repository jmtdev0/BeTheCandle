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
    ├── GoofySphere.tsx         # Core 3D planet + orbit logic
    ├── InteractiveSphere3D.tsx # Higher-level scene composition
    └── SatelliteInfoCard.tsx   # Overlay with supporter details
```

## Scripts

- `npm run dev` – start development server
- `npm run build` – build for production
- `npm start` – run production build
- `npm run lint` – lint project

## License

MIT
