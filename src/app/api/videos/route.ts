import { NextRequest, NextResponse } from 'next/server';
import musicData from '@/data/music-data.json';
import { listVideosInFolder } from '@/lib/r2';

interface VideoOverride {
  transition?: 'fade' | 'cut';
  speed?: number;
}

interface TrackMetadata {
  musicLink?: string;
  videoLink?: string;
  videoBasePath?: string;
  fullLength?: boolean;
  videoOverrides?: Record<string, VideoOverride>;
  videoNames?: Record<string, string>;
}

export async function GET(request: NextRequest) {
  try {
    const r2BaseUrl = process.env.R2_PUBLIC_URL;

    if (!r2BaseUrl) {
      console.error('[Videos API] R2_PUBLIC_URL environment variable is not set');
      return NextResponse.json({ videos: [], fullLength: false });
    }

    const trackName = request.nextUrl.searchParams.get('track');
    const tracksMap = musicData.tracks as Record<string, TrackMetadata>;

    if (trackName) {
      const trackInfo = tracksMap[trackName];
      if (!trackInfo?.videoBasePath) {
        return NextResponse.json({ videos: [], fullLength: false });
      }

      const basePath = trackInfo.videoBasePath;
      const filenames = await listVideosInFolder(basePath);

      if (filenames.length === 0) {
        console.warn(`[Videos API] No videos found in R2 folder: ${basePath}`);
        return NextResponse.json({ videos: [], fullLength: false });
      }

      const overrides = trackInfo.videoOverrides ?? {};
      const names = trackInfo.videoNames ?? {};
      const videos = filenames.map(filename => {
        const override = overrides[filename] ?? {};
        const videoName = names[filename];
        // Build Pexels link from video ID and name slug
        let link: string | undefined;
        if (videoName) {
          const videoId = filename.split('-')[0];
          const slug = videoName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
          link = `https://www.pexels.com/video/${slug}-${videoId}/`;
        }
        return {
          url: `${r2BaseUrl}/${basePath}/${encodeURIComponent(filename)}`,
          transition: override.transition ?? 'fade',
          speed: override.speed ?? 1,
          ...(videoName ? { name: videoName } : {}),
          ...(link ? { link } : {}),
        };
      });

      console.log(`[Videos API] Returning ${videos.length} videos for track: ${trackName}`);
      return NextResponse.json({
        videos,
        fullLength: trackInfo.fullLength ?? true,
      });
    }

    // Legacy mode: pool all videos as flat URL strings
    const allVideoUrls: string[] = [];
    for (const trackInfo of Object.values(tracksMap)) {
      if (trackInfo.videoBasePath) {
        const basePath = trackInfo.videoBasePath;
        const filenames = await listVideosInFolder(basePath);
        for (const filename of filenames) {
          allVideoUrls.push(`${r2BaseUrl}/${basePath}/${encodeURIComponent(filename)}`);
        }
      }
    }

    const videos = allVideoUrls.sort();
    console.log(`[Videos API] Returning ${videos.length} video URLs from R2`);
    return NextResponse.json({ videos, fullLength: false });
  } catch (error) {
    console.error('[Videos API] Error:', error);
    return NextResponse.json({ videos: [], fullLength: false });
  }
}
