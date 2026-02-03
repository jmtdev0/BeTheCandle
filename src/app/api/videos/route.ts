import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quality = searchParams.get('quality') || '4k';

    const baseDir = path.join(process.cwd(), 'public', 'I LOVE FREE 4K STOCK VIDEOS');
    const videosDir = quality === 'compressed'
      ? path.join(baseDir, 'compressed')
      : baseDir;
    const pathPrefix = quality === 'compressed'
      ? '/I LOVE FREE 4K STOCK VIDEOS/compressed'
      : '/I LOVE FREE 4K STOCK VIDEOS';

    // Check if directory exists
    if (!fs.existsSync(videosDir)) {
      console.warn('[Videos API] Directory not found:', videosDir);
      return NextResponse.json({ videos: [] });
    }

    // Read files from directory
    const files = fs.readdirSync(videosDir);

    // Filter video files (.mp4 and .mov)
    const videoExtensions = ['.mp4', '.mov'];
    const videos = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return videoExtensions.includes(ext) && !file.startsWith('.');
      })
      .map(file => `${pathPrefix}/${file}`)
      .sort();

    console.log(`[Videos API] Found ${videos.length} videos (quality: ${quality})`);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('[Videos API] Error reading video files:', error);
    return NextResponse.json({ videos: [] });
  }
}
