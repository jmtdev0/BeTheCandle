# Background Music (Deprecated Local Folder)

This folder is no longer used by the app runtime.

Music is loaded only from Cloudflare R2 (`R2_PUBLIC_URL` + `R2_MUSIC_PREFIX`, default `music/`).

## Current policy

- Do not store audio files in this folder.
- Keep repository audio-free to avoid oversized Netlify functions.
- Upload tracks to R2 instead.

R2 upload location:
`<R2_MUSIC_PREFIX>/<file>`
