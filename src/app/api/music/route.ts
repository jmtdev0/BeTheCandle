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

    // Leer enlaces desde Links.txt
    const linksPath = path.join(musicDir, 'Links.txt');
    const linksMap = new Map<string, string>();
    
    if (fs.existsSync(linksPath)) {
      const linksContent = fs.readFileSync(linksPath, 'utf-8');
      const lines = linksContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Formato esperado: "nombre de archivo - url"
        const lastHyphenIndex = trimmedLine.lastIndexOf(' - ');
        if (lastHyphenIndex !== -1) {
          const trackName = trimmedLine.substring(0, lastHyphenIndex).trim();
          const url = trimmedLine.substring(lastHyphenIndex + 3).trim();
          linksMap.set(trackName, url);
        }
      }
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
        // Mantener el nombre original con los guiones
        const displayName = nameWithoutExt;
        
        // Buscar el enlace correspondiente
        const link = linksMap.get(nameWithoutExt) || null;
        
        return {
          name: nameWithoutExt,
          path: `/background_music/${file}`,
          displayName: displayName,
          link: link
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Error reading music files:', error);
    return NextResponse.json({ tracks: [] });
  }
}
