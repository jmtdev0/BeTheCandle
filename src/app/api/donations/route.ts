import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const donationInputSchema = z.object({
  displayName: z.string().min(1).max(64),
  btcAddress: z.string().min(26).max(100),
  amountBtc: z.number().positive().finite(),
  message: z.string().max(280).optional(),
  orbitStyle: z.string().max(24).optional(),
});

const BTC_ADDRESS_REGEX = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/;

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('id, display_name, btc_address, amount_btc, message, orbit_style, created_at')
      .order('created_at', { ascending: true });

    if (donationsError) {
      throw donationsError;
    }

    const { data: totalData, error: totalError } = await supabase
      .from('donations')
      .select('amount_btc');

    if (totalError) {
      throw totalError;
    }

    const totalBtc = totalData?.reduce((sum, d) => sum + (d.amount_btc || 0), 0) || 0;

    const result = {
      donations: donations?.map(d => ({
        id: d.id,
        displayName: d.display_name,
        btcAddress: d.btc_address,
        amountBtc: d.amount_btc,
        message: d.message || '',
        orbitStyle: d.orbit_style || '',
        createdAt: d.created_at
      })) || [],
      totalBtc
    };

    return NextResponse.json({
      donations: result.donations.map((donation) => ({
        ...donation,
        createdAt: donation.createdAt.toISOString(),
      })),
      totalBtc: result.totalBtc,
    });
  } catch (error) {
    console.error("GET /api/donations error", error);
    return NextResponse.json({ error: "Unable to load donations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = donationInputSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid donation data" }, { status: 400 });
    }

    if (!BTC_ADDRESS_REGEX.test(parsed.data.btcAddress)) {
      return NextResponse.json({ error: "Invalid Bitcoin address" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    
    const { data: inserted, error } = await supabase
      .from('donations')
      .insert({
        display_name: parsed.data.displayName.trim(),
        btc_address: parsed.data.btcAddress.trim(),
        amount_btc: parsed.data.amountBtc,
        message: parsed.data.message || null,
        orbit_style: parsed.data.orbitStyle || null,
      })
      .select('id, display_name, btc_address, amount_btc, message, orbit_style, created_at')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        donation: {
          id: inserted.id,
          displayName: inserted.display_name,
          btcAddress: inserted.btc_address,
          amountBtc: inserted.amount_btc,
          message: inserted.message || '',
          orbitStyle: inserted.orbit_style || '',
          createdAt: new Date(inserted.created_at).toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/donations error", error);
    return NextResponse.json({ error: "Unable to save donation" }, { status: 500 });
  }
}
