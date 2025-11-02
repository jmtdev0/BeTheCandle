import { NextResponse } from "next/server";
import { z } from "zod";
import { withDb } from "@/lib/db";

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
    const result = await withDb(async (db) => {
      const { rows } = await db.query(
        `select id,
                display_name as "displayName",
                btc_address as "btcAddress",
                amount_btc as "amountBtc",
                coalesce(message, '') as message,
                coalesce(orbit_style, '') as "orbitStyle",
                created_at as "createdAt"
           from public.donations
          order by created_at asc`
      );

      const totalResult = await db.query<{ total: string }>(
        "select coalesce(sum(amount_btc), 0)::text as total from public.donations"
      );

      const totalBtc = parseFloat(totalResult.rows[0]?.total ?? "0");

      return { donations: rows, totalBtc };
    });

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

    const inserted = await withDb(async (db) => {
      const { rows } = await db.query(
        `insert into public.donations (display_name, btc_address, amount_btc, message, orbit_style)
         values ($1, $2, $3, nullif($4, ''), nullif($5, ''))
         returning id,
                   display_name as "displayName",
                   btc_address as "btcAddress",
                   amount_btc as "amountBtc",
                   coalesce(message, '') as message,
                   coalesce(orbit_style, '') as "orbitStyle",
                   created_at as "createdAt"`,
        [
          parsed.data.displayName.trim(),
          parsed.data.btcAddress.trim(),
          parsed.data.amountBtc,
          parsed.data.message ?? "",
          parsed.data.orbitStyle ?? "",
        ]
      );

      return rows[0];
    });

    return NextResponse.json(
      {
        donation: {
          ...inserted,
          createdAt: inserted.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/donations error", error);
    return NextResponse.json({ error: "Unable to save donation" }, { status: 500 });
  }
}
