import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import musicData from "@/data/music-data.json";
import { listAudioInFolder } from "@/lib/r2";

interface TrackMetadata {
  musicLink?: string;
  videoLink?: string;
  videoBasePath?: string;
  videoOverrides?: Record<string, unknown>;
}

type MusicTrackResponse = {
  name: string;
  path: string;
  displayName: string;
  folder: string;
  link: string | null;
  videoLink: string | null;
  hasVideo: boolean;
};

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a"];
const DEFAULT_R2_MUSIC_PREFIX = "music";

function normalizeR2Prefix(prefixValue: string): string {
  const trimmed = prefixValue.trim();
  if (!trimmed) return DEFAULT_R2_MUSIC_PREFIX;
  return trimmed.replace(/^\/+|\/+$/g, "");
}

function getTrackNameFromRelativePath(relativePath: string): string {
  const ext = path.extname(relativePath);
  return path.basename(relativePath, ext);
}

function buildR2PublicUrl(baseUrl: string, prefix: string, relativePath: string): string {
  const safeBase = baseUrl.replace(/\/+$/, "");
  const segments = [prefix, ...relativePath.split("/").filter(Boolean)];
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `${safeBase}/${encodedPath}`;
}

function createTrackResponse(
  name: string,
  pathValue: string,
  tracksMap: Record<string, TrackMetadata>,
): MusicTrackResponse {
  const trackData = tracksMap[name] || {};
  const hasVideo = Boolean(trackData.videoBasePath);
  return {
    name,
    path: pathValue,
    displayName: name,
    folder: hasVideo ? "Video Gallery" : "Space Scene",
    link: trackData.musicLink || null,
    videoLink: trackData.videoLink || null,
    hasVideo,
  };
}

async function getTracksFromR2(tracksMap: Record<string, TrackMetadata>): Promise<MusicTrackResponse[]> {
  const r2BaseUrl = process.env.R2_PUBLIC_URL;
  if (!r2BaseUrl) {
    throw new Error("R2_PUBLIC_URL is not set");
  }

  const r2MusicPrefix = normalizeR2Prefix(process.env.R2_MUSIC_PREFIX || DEFAULT_R2_MUSIC_PREFIX);
  const relativePaths = await listAudioInFolder(r2MusicPrefix);

  return relativePaths.map((relativePath) => {
    const name = getTrackNameFromRelativePath(relativePath);
    const publicUrl = buildR2PublicUrl(r2BaseUrl, r2MusicPrefix, relativePath);
    return createTrackResponse(name, publicUrl, tracksMap);
  });
}

function getTracksFromLocalFallback(tracksMap: Record<string, TrackMetadata>): MusicTrackResponse[] {
  const tracks: MusicTrackResponse[] = [];
  const musicDir = path.join(process.cwd(), "public", "background_music");

  if (!fs.existsSync(musicDir)) {
    return tracks;
  }

  const entries = fs.readdirSync(musicDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const folderName = entry.name;
    const folderPath = path.join(musicDir, folderName);
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!AUDIO_EXTENSIONS.includes(ext) || file.startsWith(".")) continue;

      const name = path.basename(file, ext);
      const localPath = `/background_music/${folderName}/${file}`;
      tracks.push(createTrackResponse(name, localPath, tracksMap));
    }
  }

  return tracks;
}

export async function GET() {
  const tracksMap = musicData.tracks as Record<string, TrackMetadata>;

  try {
    const r2Tracks = await getTracksFromR2(tracksMap);
    if (r2Tracks.length > 0) {
      r2Tracks.sort((a, b) => a.displayName.localeCompare(b.displayName));
      console.log(`[Music API] source=r2 tracks=${r2Tracks.length}`);
      return NextResponse.json({ tracks: r2Tracks });
    }

    const fallbackTracks = getTracksFromLocalFallback(tracksMap);
    fallbackTracks.sort((a, b) => a.displayName.localeCompare(b.displayName));
    console.warn(`[Music API] source=local-fallback reason=empty-r2 tracks=${fallbackTracks.length}`);
    return NextResponse.json({ tracks: fallbackTracks });
  } catch (error) {
    console.error("[Music API] source=local-fallback reason=r2-error", error);
    const fallbackTracks = getTracksFromLocalFallback(tracksMap);
    fallbackTracks.sort((a, b) => a.displayName.localeCompare(b.displayName));
    console.warn(`[Music API] source=local-fallback reason=r2-error tracks=${fallbackTracks.length}`);
    return NextResponse.json({ tracks: fallbackTracks });
  }
}
