-- Drop existing tables that need to be recreated with correct schema
DROP TABLE IF EXISTS user_payouts CASCADE;
DROP TABLE IF EXISTS payout_rounds CASCADE;
DROP TABLE IF EXISTS community_contributions CASCADE;
DROP TABLE IF EXISTS donation_totals CASCADE;
DROP TRIGGER IF EXISTS trigger_update_donation_totals ON donations;
DROP FUNCTION IF EXISTS update_donation_totals();

-- Now recreate them with the correct schema (using display_name instead of user_id)
