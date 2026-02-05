import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import musicData from '@/data/music-data.json';

interface TrackMetadata {
  musicLink?: string;
  videoLink?: string;
  videos?: string[];
}

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'background_music');

    // Verificar si la carpeta existe
    if (!fs.existsSync(musicDir)) {
      return NextResponse.json({ tracks: [] });
    }

    const tracksMap = musicData.tracks as Record<string, TrackMetadata>;

    // Leer archivos de la carpeta
    const files = fs.readdirSync(musicDir);

    // Filtrar solo archivos de audio y crear la lista de tracks
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
    const tracks = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return audioExtensions.includes(ext) && !file.startsWith('.');
      })
      .map(file => {
        const nameWithoutExt = path.basename(file, path.extname(file));
        const displayName = nameWithoutExt;

        // Buscar metadata en music-data.json
        const trackData = tracksMap[nameWithoutExt] || {};

        return {
          name: nameWithoutExt,
          path: `/background_music/${file}`,
          displayName: displayName,
          link: trackData.musicLink || null,
          videoLink: trackData.videoLink || null,
          hasVideo: Boolean(trackData.videoLink || (trackData.videos && trackData.videos.length > 0)),
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Error reading music files:', error);
    return NextResponse.json({ tracks: [] });
  }
}
