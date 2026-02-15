import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import musicData from '@/data/music-data.json';

interface TrackMetadata {
  musicLink?: string;
  videoLink?: string;
  videoBasePath?: string;
  videoOverrides?: Record<string, unknown>;
}

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'background_music');

    if (!fs.existsSync(musicDir)) {
      return NextResponse.json({ tracks: [] });
    }

    const tracksMap = musicData.tracks as Record<string, TrackMetadata>;
    const tracks: Array<{
      name: string;
      path: string;
      displayName: string;
      folder: string;
      link: string | null;
      videoLink: string | null;
      hasVideo: boolean;
    }> = [];

    // Read subdirectories (Space Scene, Video Gallery, etc.)
    const entries = fs.readdirSync(musicDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const folderName = entry.name;
      const folderPath = path.join(musicDir, folderName);
      const files = fs.readdirSync(folderPath);

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!AUDIO_EXTENSIONS.includes(ext) || file.startsWith('.')) continue;

        const nameWithoutExt = path.basename(file, ext);
        const trackData = tracksMap[nameWithoutExt] || {};

        tracks.push({
          name: nameWithoutExt,
          path: `/background_music/${folderName}/${file}`,
          displayName: nameWithoutExt,
          folder: folderName,
          link: trackData.musicLink || null,
          videoLink: trackData.videoLink || null,
          hasVideo: Boolean(trackData.videoBasePath),
        });
      }
    }

    tracks.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Error reading music files:', error);
    return NextResponse.json({ tracks: [] });
  }
}
