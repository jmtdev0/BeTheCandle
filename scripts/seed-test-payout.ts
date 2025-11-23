import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function seedTestPayout() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log("Creating test payout record...");
    
    // Insert a payout record
    const payoutResult = await pool.query<{ id: string }>(
      `INSERT INTO public.community_pot_payouts (created_at, updated_at)
       VALUES (timezone('utc', now()), timezone('utc', now()))
       RETURNING id`
    );
    
    const payoutId = payoutResult.rows[0].id;
    console.log(`Created payout with ID: ${payoutId}`);

    // Calculate next Sunday at 16:30 CET (simplified - just add 7 days from now)
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 7);
    scheduledAt.setHours(14, 30, 0, 0); // 16:30 CET = ~14:30 UTC (rough approximation)

    // Insert payout condition
    await pool.query(
      `INSERT INTO public.community_pot_payout_conditions (
         payout_id,
         amount_usdc,
         scheduled_at,
         is_testnet,
         max_participants
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (payout_id) DO UPDATE
         SET amount_usdc = EXCLUDED.amount_usdc,
             scheduled_at = EXCLUDED.scheduled_at,
             max_participants = EXCLUDED.max_participants`,
      [payoutId, 100.00, scheduledAt, true, 10]
    );

    console.log(`Seeded payout condition:`);
    console.log(`  - Amount: $100.00 USDC`);
    console.log(`  - Scheduled: ${scheduledAt.toISOString()}`);
    console.log(`  - Max participants: 10`);
    console.log(`  - Is testnet: true`);
    console.log("\n✅ Test payout seeded successfully!");

  } catch (error) {
    console.error("Error seeding test payout:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedTestPayout();
