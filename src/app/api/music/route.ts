import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'background_music');
    
    // Verificar si la carpeta existe
    if (!fs.existsSync(musicDir)) {
      return NextResponse.json({ tracks: [] });
    }

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
        // Convertir nombre de archivo a display name (reemplazar guiones/underscores con espacios y capitalizar)
        const displayName = nameWithoutExt
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        return {
          name: nameWithoutExt,
          path: `/background_music/${file}`,
          displayName: displayName
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Error reading music files:', error);
    return NextResponse.json({ tracks: [] });
  }
}
