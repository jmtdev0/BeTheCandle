# Music System Guide (R2 Only)

## Overview

The music API uses Cloudflare R2 as the only source:

- Source: `R2_PUBLIC_URL` + `R2_MUSIC_PREFIX` (default `music`)
- API contract: unchanged (`GET /api/music`)
- No local fallback in `public/background_music`

## How to add music

1. Open your Cloudflare dashboard and go to the configured R2 bucket.
2. Create/use the `music/` prefix (or your custom `R2_MUSIC_PREFIX`).
3. Upload audio files (`.mp3`, `.wav`, `.ogg`, `.m4a`) into that prefix.
4. Deploy with:

```env
R2_PUBLIC_URL=https://<your-public-bucket-url>
R2_MUSIC_PREFIX=music
```

Tracks are detected automatically by `/api/music`.

## Metadata mapping

Metadata is still read from:

`src/data/music-data.json`

Matching is done by track filename (without extension).  
When a metadata entry contains `videoBasePath`, the track is treated as **Video Gallery**; otherwise as **Space Scene**.

## API response shape

`GET /api/music` returns:

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
   - `[Music API] source=r2-error ...`

## Quick rollout checklist

- [ ] Upload tracks to `music/` in R2
- [ ] Set `R2_PUBLIC_URL`
- [ ] Set `R2_MUSIC_PREFIX=music` (or custom prefix)
- [ ] Deploy
- [ ] Verify `/api/music` returns R2 URLs
- [ ] Verify playback in UI
