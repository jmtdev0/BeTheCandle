import { NextResponse } from "next/server";
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

export async function GET() {
  const tracksMap = musicData.tracks as Record<string, TrackMetadata>;

  try {
    const r2Tracks = await getTracksFromR2(tracksMap);
    r2Tracks.sort((a, b) => a.displayName.localeCompare(b.displayName));
    console.log(`[Music API] source=r2 tracks=${r2Tracks.length}`);
    return NextResponse.json({ tracks: r2Tracks });
  } catch (error) {
    console.error("[Music API] source=r2-error", error);
    return NextResponse.json({ tracks: [] });
  }
}
