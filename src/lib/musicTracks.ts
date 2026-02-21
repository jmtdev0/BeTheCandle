/**
 * ⚠️ ESTE ARCHIVO YA NO ES NECESARIO ⚠️
 * 
 * La música ahora se detecta automáticamente desde Cloudflare R2
 * mediante la API route en /api/music (con fallback local).
 * 
 * Simplemente coloca archivos MP3, WAV, OGG o M4A en la carpeta
 * configurada en R2 (R2_MUSIC_PREFIX, por defecto "music").
 * Si R2 falla o está vacío, se usa /public/background_music/.
 * 
 * Este archivo se mantiene solo como referencia del formato anterior.
 */

/**
 * Utility to get available background music tracks
 * This file should be updated manually when new tracks are added
 * 
 * DEPRECADO: Ya no es necesario actualizar este archivo.
 * La música se carga automáticamente desde la carpeta.
 */

export interface MusicTrack {
  name: string;
  path: string;
  displayName: string;
}

/**
 * Lista de canciones disponibles
 * 
 * DEPRECADO: Este array ya no se usa.
 * Las canciones se cargan automáticamente desde /api/music
 * con fuente principal en R2 y fallback en /public/background_music/
 */
export const MUSIC_TRACKS: MusicTrack[] = [];

/**
 * Gets all available music tracks
 * 
 * DEPRECADO: Ya no es necesario llamar esta función.
 * El componente MusicPlayer carga la música automáticamente.
 */
export function getMusicTracks(): MusicTrack[] {
  console.warn('getMusicTracks() está deprecado. La música se carga automáticamente desde /api/music');
  return MUSIC_TRACKS;
}
