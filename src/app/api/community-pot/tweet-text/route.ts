import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();

    // Use the same RPC function as the UI
    const { data, error } = await supabase.rpc("community_pot_get_last_completed_payout", {
      p_is_testnet: false, // Only mainnet payouts
    });

    if (error) {
      console.error("Error fetching payout:", error);
      return new NextResponse("Error obteniendo datos del reparto", {
        status: 500,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    if (!data?.found || !data?.payout) {
      return new NextResponse("No se encontraron repartos en mainnet", {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    const payout = data.payout;

    // Get first transaction hash for the tweet
    const { data: transactions } = await supabase
      .from("community_pot_transactions")
      .select("tx_hash")
      .eq("payout_id", payout.id)
      .eq("status", "confirmed")
      .limit(1);

    const txHash = transactions && transactions.length > 0 ? transactions[0].tx_hash : null;

    // Format the date and time
    const executedDate = new Date(payout.completedAt);
    const dateStr = executedDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = executedDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });

    // Generate tweet text
    const tweetText = `🎉 Community Pot distribution completed!

💰 ${payout.totalDistributed} USDC distributed
👥 ${payout.participantCount} unique participants (each gets ${(payout.totalDistributed / payout.participantCount).toFixed(2)} USDC)
📅 ${dateStr} at ${timeStr} CET

Thank you all for supporting BeTheCandle ✨.

🔗 View full history: bethecandle.netlify.app/community-pot/history

#Web3 #Polygon #USDC`;

    return new NextResponse(tweetText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error("Error generating tweet text:", error);
    return new NextResponse("Error generando el texto del tweet", {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
