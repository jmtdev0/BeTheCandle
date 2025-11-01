# Sharing Future

A non-custodial Bitcoin donation platform with beautiful animated bubbles.

## Features

- 🎨 Animated donation bubble that grows with contributions
- ✨ Smooth animations using Framer Motion
- 💰 Real-time BTC total display
- 🎯 Mini-bubbles that merge into the main pot
- 🌊 Particle effects for visual engagement

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Package Manager**: npm

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page with demo
│   └── globals.css      # Global styles
└── components/
    └── DonationBubble.tsx   # Main animated bubble component
```

## Component Usage

```tsx
import DonationBubble from "@/components/DonationBubble";

<DonationBubble
  totalBTC={0.134}
  maxBTC={1.0}
  onAddDonation={() => console.log("Donation added!")}
/>
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT
