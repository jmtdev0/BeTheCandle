# Music System Guide (R2 + Local Fallback)

## Overview

The music API now uses Cloudflare R2 as the primary source:

- Primary source: `R2_PUBLIC_URL` + `R2_MUSIC_PREFIX` (default `music`)
- Automatic fallback: `public/background_music` when R2 fails or is empty
- API contract: unchanged (`GET /api/music`)

## How to add music (production)

1. Open your Cloudflare dashboard and go to the configured R2 bucket.
2. Create/use the `music/` prefix (or your custom `R2_MUSIC_PREFIX`).
3. Upload audio files (`.mp3`, `.wav`, `.ogg`, `.m4a`) into that prefix.
4. Deploy with:

```env
R2_PUBLIC_URL=https://<your-public-bucket-url>
R2_MUSIC_PREFIX=music
```

Tracks will be detected automatically by `/api/music`.

## Local fallback behavior

If R2 is unavailable (bad credentials, network issue) or has no audio files, `/api/music` falls back to:

`public/background_music/<folder>/<file>`

This keeps playback alive during outages or migration.

## Metadata mapping

Metadata is still read from:

`src/data/music-data.json`

Matching is done by track filename (without extension).  
When a metadata entry contains `videoBasePath`, the track is treated as **Video Gallery**; otherwise as **Space Scene**.

## API response shape

`GET /api/music` still returns:

```json
{
  "tracks": [
    {
      "name": "Track Name",
      "path": "https://.../music/Track%20Name.mp3",
      "displayName": "Track Name",
      "folder": "Space Scene",
      "link": "https://source.example",
      "videoLink": null,
      "hasVideo": false
    }
  ]
}
```

## Troubleshooting

### No tracks returned

1. Confirm `R2_PUBLIC_URL` is set.
2. Confirm `R2_MUSIC_PREFIX` matches the uploaded prefix.
3. Confirm the bucket has supported audio extensions.
4. Check server logs for:
   - `[Music API] source=r2 ...`
   - `[Music API] source=local-fallback ...`

### Track plays in fallback but not from R2

1. Verify public bucket access/CORS for your R2 public URL.
2. Open one returned `path` URL directly in the browser.
3. Ensure special characters are preserved in filenames (API URL-encodes path segments).

## Quick rollout checklist

- [ ] Upload tracks to `music/` in R2
- [ ] Set `R2_PUBLIC_URL`
- [ ] Set `R2_MUSIC_PREFIX=music` (or custom prefix)
- [ ] Deploy
- [ ] Verify `/api/music` returns R2 URLs
- [ ] Verify playback in UI
