import { NextResponse } from 'next/server';
import videoData from '@/data/videos.json';

export async function GET() {
  try {
    const r2BaseUrl = process.env.R2_PUBLIC_URL;

    if (!r2BaseUrl) {
      console.error('[Videos API] R2_PUBLIC_URL environment variable is not set');
      return NextResponse.json({ videos: [] });
    }

    const videos = videoData.videos
      .map(filename => `${r2BaseUrl}/compressed/${encodeURIComponent(filename)}`)
      .sort();

    console.log(`[Videos API] Returning ${videos.length} video URLs from R2`);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('[Videos API] Error:', error);
    return NextResponse.json({ videos: [] });
  }
}
