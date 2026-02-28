import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const DEFAULT_R2_MUSIC_PREFIX = "music";

function buildAudioUrl(r2BaseUrl: string, prefix: string, audioFilename: string): string {
  const safeBase = r2BaseUrl.replace(/\/+$/, "");
  return `${safeBase}/${prefix}/${encodeURIComponent(audioFilename)}`;
}

export async function GET() {
  try {
    const r2BaseUrl = process.env.R2_PUBLIC_URL;
    if (!r2BaseUrl) {
      throw new Error("R2_PUBLIC_URL is not set");
    }

    const r2MusicPrefix = (process.env.R2_MUSIC_PREFIX || DEFAULT_R2_MUSIC_PREFIX)
      .trim().replace(/^\/+|\/+$/g, "") || DEFAULT_R2_MUSIC_PREFIX;

    const supabase = getSupabaseAdminClient();
    const { data: dbTracks, error } = await supabase
      .from("gallery_tracks")
      .select("name, music_link, video_link, video_base_path, audio_filename, only_video_audio, video_has_audio, sort_order")
      .order("sort_order")
      .order("name");

    if (error) throw error;

    const tracks = (dbTracks ?? []).map((row) => {
      // only_video_audio: audio comes exclusively from the video (no separate MP3).
      // video_has_audio: the video files contain an audio track (may coexist with a separate MP3).
      const useVideoOnlyAudio = row.only_video_audio === true;
      const hasVideoAudio = useVideoOnlyAudio || row.video_has_audio === true;
      return {
        name: row.name,
        path: useVideoOnlyAudio
          ? null
          : row.audio_filename
          ? buildAudioUrl(r2BaseUrl, r2MusicPrefix, row.audio_filename)
          : null,
        displayName: row.name,
        folder: row.video_base_path ? "Video Gallery" : "Space Scene",
        link: row.music_link || null,
        videoLink: row.video_link || null,
        hasVideo: Boolean(row.video_base_path),
        videoHasAudio: hasVideoAudio,
      };
    });

    // Diagnostic: log tracks with video audio for debugging
    const audioTracks = tracks.filter(t => t.videoHasAudio);
    if (audioTracks.length > 0) {
      console.log(`[Music API] Tracks with videoHasAudio=true:`, audioTracks.map(t => t.name));
    }
    console.log(`[Music API] source=supabase tracks=${tracks.length}`);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("[Music API] error", error);
    return NextResponse.json({ tracks: [] });
  }
}
