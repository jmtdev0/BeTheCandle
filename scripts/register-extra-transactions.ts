import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const transactions = [
  {
    payout_id: '100fa388-e4bf-4f12-a060-aed46a584a4f',
    tx_hash: '0x298bcca6bdf3c8c25948080aa9b8a6cabe4af5df34d49ef9c31bc892702e64ba',
    amount_units: 5,
    gas_paid_wei: 0.019271879220648278,
    chain_id: 137,
    status: 'confirmed',
    block_number: 81815119,
    explorer_url: 'https://polygonscan.com/tx/0x298bcca6bdf3c8c25948080aa9b8a6cabe4af5df34d49ef9c31bc892702e64ba',
    submitted_at: '2026-01-18T15:30:10.000Z', // Using block timestamp
    confirmed_at: '2026-01-18T15:30:10.000Z',
    polygon_address: '0x43F4f76a35dA23FDC72eBf0E3b4CDF06E960c992'
  },
  {
    payout_id: '100fa388-e4bf-4f12-a060-aed46a584a4f',
    tx_hash: '0x2bb366580732d6fcded7e9e64b687b5d30161d228be064eac6168ee459caa41a',
    amount_units: 5,
    gas_paid_wei: 0.026846293439508214,
    chain_id: 137,
    status: 'confirmed',
    block_number: 81815388,
    explorer_url: 'https://polygonscan.com/tx/0x2bb366580732d6fcded7e9e64b687b5d30161d228be064eac6168ee459caa41a',
    submitted_at: '2026-01-18T15:39:08.000Z',
    confirmed_at: '2026-01-18T15:39:08.000Z',
    polygon_address: '0x43F4f76a35dA23FDC72eBf0E3b4CDF06E960c992'
  },
  {
    payout_id: '100fa388-e4bf-4f12-a060-aed46a584a4f',
    tx_hash: '0xef5818224ef09aa00710e9fb2b9e4c1286932d6ad8d0ae31e1951bd6d05b0d1b',
    amount_units: 5,
    gas_paid_wei: 0.037677847409930878,
    chain_id: 137,
    status: 'confirmed',
    block_number: 81815393,
    explorer_url: 'https://polygonscan.com/tx/0xef5818224ef09aa00710e9fb2b9e4c1286932d6ad8d0ae31e1951bd6d05b0d1b',
    submitted_at: '2026-01-18T15:39:18.000Z',
    confirmed_at: '2026-01-18T15:39:18.000Z',
    polygon_address: '0x168c0259DEbEFCC795B48e1b2B22da5D2727E9f3'
  },
  {
    payout_id: '100fa388-e4bf-4f12-a060-aed46a584a4f',
    tx_hash: '0x05e82d4f136ed1393d098ad936dcab327d764a0ea62739e1ce33a7a25dc028b6',
    amount_units: 5,
    gas_paid_wei: 0.045824712901391272,
    chain_id: 137,
    status: 'confirmed',
    block_number: 81815481,
    explorer_url: 'https://polygonscan.com/tx/0x05e82d4f136ed1393d098ad936dcab327d764a0ea62739e1ce33a7a25dc028b6',
    submitted_at: '2026-01-18T15:42:14.000Z',
    confirmed_at: '2026-01-18T15:42:14.000Z',
    polygon_address: '0x43F4f76a35dA23FDC72eBf0E3b4CDF06E960c992'
  }
];

async function main() {
  console.log('Registering extra transactions...');
  const { error } = await supabase
    .from('community_pot_transactions')
    .insert(transactions);
    
  if (error) {
    console.error('Error inserting transactions:', error);
  } else {
    console.log('Successfully inserted 4 transactions.');
  }
}

main().catch(console.error);
