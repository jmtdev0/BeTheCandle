import { NextResponse } from 'next/server';
import musicData from '@/data/music-data.json';

interface TrackMetadata {
  musicLink?: string;
  videoLink?: string;
  videos?: string[];
}

export async function GET() {
  try {
    const r2BaseUrl = process.env.R2_PUBLIC_URL;

    if (!r2BaseUrl) {
      console.error('[Videos API] R2_PUBLIC_URL environment variable is not set');
      return NextResponse.json({ videos: [] });
    }

    // Recopilar todos los videos de todos los tracks que tengan videos
    const allVideoFilenames: string[] = [];
    for (const trackInfo of Object.values(musicData.tracks as Record<string, TrackMetadata>)) {
      if (trackInfo.videos && trackInfo.videos.length > 0) {
        allVideoFilenames.push(...trackInfo.videos);
      }
    }

    const videos = allVideoFilenames
      .map(filename => `${r2BaseUrl}/compressed/${encodeURIComponent(filename)}`)
      .sort();

    console.log(`[Videos API] Returning ${videos.length} video URLs from R2`);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('[Videos API] Error:', error);
    return NextResponse.json({ videos: [] });
  }
}
