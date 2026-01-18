import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();

    // Get all completed payouts with their conditions (JOIN to get scheduled_at, amount_usdc, etc.)
    const { data: payouts, error: payoutsError } = await supabase
      .from('community_pot_payouts')
      .select(`
        id,
        status,
        executed_at,
        created_at,
        community_pot_payout_conditions!inner (
          scheduled_at,
          amount_usdc,
          is_testnet,
          max_participants
        )
      `)
      .eq('community_pot_payout_conditions.is_testnet', false) // Only Mainnet
      .eq('status', 'Completed')
      .order('executed_at', { ascending: false });

    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError);
      return NextResponse.json({ error: 'Failed to fetch payouts', details: payoutsError.message }, { status: 500 });
    }

    // For each payout, fetch its transactions and calculate stats
    const payoutsWithTransactions = await Promise.all(
      (payouts || []).map(async (payout) => {
        const { data: transactions, error: txError } = await supabase
          .from('community_pot_transactions')
          .select('id, tx_hash, amount_units, gas_paid_wei, status, confirmed_at, explorer_url, polygon_address')
          .eq('payout_id', payout.id)
          .order('confirmed_at', { ascending: true });

        if (txError) {
          console.error(`Error fetching transactions for payout ${payout.id}:`, txError);
        }

        // Calculate total distributed and participant count from transactions
        const confirmedTransactions = transactions?.filter(tx => tx.status === 'confirmed') || [];
        const totalDistributed = confirmedTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_units || '0'), 0);
        
        // Count unique participants by address
        const uniqueParticipants = new Set(
          confirmedTransactions
            .map(tx => tx.polygon_address?.toLowerCase())
            .filter(addr => !!addr)
        );
        const participantCount = uniqueParticipants.size;

        // Access the nested conditions object
        const conditions = Array.isArray(payout.community_pot_payout_conditions) 
          ? payout.community_pot_payout_conditions[0] 
          : payout.community_pot_payout_conditions;

        return {
          id: payout.id,
          scheduled_at: conditions?.scheduled_at,
          executed_at: payout.executed_at,
          total_amount_usdc: totalDistributed.toFixed(2),
          participant_count: participantCount,
          status: payout.status,
          is_testnet: conditions?.is_testnet || false,
          chain_id: 137, // Mainnet
          transactions: transactions || [],
        };
      })
    );

    return NextResponse.json({ payouts: payoutsWithTransactions });
  } catch (error) {
    console.error('Error in payouts history API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
