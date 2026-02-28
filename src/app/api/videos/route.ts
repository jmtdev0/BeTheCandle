import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const r2BaseUrl = process.env.R2_PUBLIC_URL;

    if (!r2BaseUrl) {
      console.error('[Videos API] R2_PUBLIC_URL environment variable is not set');
      return NextResponse.json({ videos: [], fullLength: false });
    }

    const trackName = request.nextUrl.searchParams.get('track');
    const supabase = getSupabaseAdminClient();

    if (trackName) {
      const { data: track, error } = await supabase
        .from('gallery_tracks')
        .select(`
          video_base_path,
          full_length,
          gallery_videos (
            filename,
            display_name,
            link,
            transition,
            speed,
            sort_order
          )
        `)
        .eq('name', trackName)
        .single();

      if (error || !track?.video_base_path) {
        return NextResponse.json({ videos: [], fullLength: false });
      }

      const basePath = track.video_base_path;
      const videoRows = (track.gallery_videos ?? []) as Array<{
        filename: string;
        display_name: string | null;
        link: string | null;
        transition: string;
        speed: number;
        sort_order: number;
      }>;

      if (videoRows.length === 0) {
        console.warn(`[Videos API] No videos in DB for track: ${trackName}`);
        return NextResponse.json({ videos: [], fullLength: false });
      }

      const videos = videoRows
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(v => ({
          url: `${r2BaseUrl}/${basePath}/${encodeURIComponent(v.filename)}`,
          transition: v.transition ?? 'fade',
          speed: v.speed ?? 1,
          ...(v.display_name ? { name: v.display_name } : {}),
          ...(v.link ? { link: v.link } : {}),
        }));

      console.log(`[Videos API] Returning ${videos.length} videos for track: ${trackName}`);
      return NextResponse.json({
        videos,
        fullLength: track.full_length ?? true,
      });
    }

    // Legacy mode: pool all videos as flat URL strings
    const { data: allTracks, error } = await supabase
      .from('gallery_tracks')
      .select('video_base_path, gallery_videos(filename)')
      .not('video_base_path', 'is', null);

    if (error) throw error;

    const allVideoUrls: string[] = [];
    for (const track of allTracks ?? []) {
      const basePath = track.video_base_path!;
      const videoRows = (track.gallery_videos ?? []) as Array<{ filename: string }>;
      for (const v of videoRows) {
        allVideoUrls.push(`${r2BaseUrl}/${basePath}/${encodeURIComponent(v.filename)}`);
      }
    }

    const videos = allVideoUrls.sort();
    console.log(`[Videos API] Returning ${videos.length} video URLs`);
    return NextResponse.json({ videos, fullLength: false });
  } catch (error) {
    console.error('[Videos API] Error:', error);
    return NextResponse.json({ videos: [], fullLength: false });
  }
}
