#!/usr/bin/env tsx
import { executeCommunityPotPayout } from "@/lib/communityPotPayout";

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");

  const result = await executeCommunityPotPayout({ dryRun });
  console.log(`[community-pot] ${result.message}`);
  if (result.transactionHashes?.length) {
    console.log("Tx hashes:");
    for (const hash of result.transactionHashes) {
      console.log(`  - ${hash}`);
    }
  }
}

main().catch((error) => {
  console.error("Community pot payout script failed", error);
  process.exit(1);
});
