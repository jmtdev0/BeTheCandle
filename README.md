# BeTheCandle - Community Pot

BeTheCandle is a Web3 platform featuring a unique "Community Pot" system—a gamified, weekly distribution mechanism running on the Polygon network. While originally conceived as a Bitcoin donation platform, the project evolved to focus on USDC distributions on Polygon. This shift was driven by the high cost of on-chain Bitcoin transactions and the user-facing complexity of alternatives like the Lightning Network. By leveraging Polygon, the platform ensures low transaction fees and a seamless experience for users, providing a more stable and efficient community reward system. This README focuses on the architecture and implementation of the Community Pot.

## ⚗️ The Community Pot

The Community Pot is a weekly cycle where authenticated users can register to receive a share of a USDC pool. It combines interactive 3D visualizations with real-time blockchain transactions.

### How it Works
1.  **Weekly Cycle**: A new "week" starts automatically every Sunday.
2.  **Join Phase**: Users authenticate and submit their Polygon wallet address to reserve a slot.
3.  **Visualization**: Participants are represented as floating 3D orbs in the Community Pot lobby.
4.  **Distribution**: At the end of the cycle (Sunday 16:30 Berlin Time), a secure process triggers the payout.
5.  **Payout**: The total USDC amount in the pot is divided equally among all valid participants and sent directly to their wallets on the Polygon network.

## 🛠 Tech Stack

### Core Framework
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **TailwindCSS** & **Framer Motion** for styling and animations.

### Web3 & Blockchain
- **Network**: Polygon PoS (Mainnet) / Amoy (Testnet).
- **Token**: USDC (USD Coin).
- **Library**: **[viem](https://viem.sh/)** - Used for all blockchain interactions, including wallet management, contract calls, and transaction signing.
- **Smart Contracts**: Standard ERC-20 interactions (USDC contract).

### Backend & Infrastructure
- **Supabase**:
    - **PostgreSQL**: Stores weekly cycles, participants, and payout logs.
    - **Edge Functions**: Secure server-less environment for executing the payout logic.
    - **Realtime**: Pushes live updates (new participants, countdowns) to the frontend.
    - **Auth**: Handles user authentication before joining the pot.

## 🌐 Web3 Architecture

The payout system is designed to be secure and automated, moving sensitive logic away from the client.

### Payout Logic (`supabase/functions/community-pot-payout`)
The distribution is handled by a Supabase Edge Function (`scheduled-distribution.ts`) powered by Deno and `viem`.

1.  **Trigger**: The function is invoked via a scheduled Cron job or a secure API call.
2.  **Verification**: It checks the current week's status and validates the participant list.
3.  **Blockchain Interaction**:
    - Loads the funding wallet using a private key (stored in secure environment variables).
    - Connects to the Polygon RPC using `viem`.
    - Calculates the split (Total Pot / Participants).
    - Batches and executes ERC-20 `transfer` transactions for each participant.
4.  **Settlement**: Updates the database with transaction hashes and marks the week as "completed".

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project with the necessary database schema.
- A Polygon wallet with MATIC (for gas) and USDC (for the pot).

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd bethecandle
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file with the following keys:

    ```env
    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    
    # Community Pot (Server-side / Edge Function vars)
    COMMUNITY_POT_PAYOUT_SECRET=your_secure_secret
    COMMUNITY_POT_RPC_URL=https://polygon-rpc.com
    COMMUNITY_POT_PAYOUT_PRIVATE_KEY=your_wallet_private_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 📂 Key Directories

- `src/app/community-pot/`: Frontend pages for the pot interface.
- `src/components/community-pot/`: 3D Orbs and UI components.
- `supabase/functions/community-pot-payout/`: The Deno Edge Function containing the `viem` payout logic.
- `src/lib/communityPot.ts`: Shared logic and types.

## 📄 License

MIT
