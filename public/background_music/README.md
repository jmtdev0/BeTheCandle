# Background Music (Local Fallback)

This folder is now a fallback source.

Primary music source is Cloudflare R2 (`R2_PUBLIC_URL` + `R2_MUSIC_PREFIX`, default `music/`).

## When this folder is used

- R2 is unavailable (credentials/network issues)
- R2 is reachable but contains no supported audio files

## Supported local fallback formats

- `.mp3`
- `.wav`
- `.ogg`
- `.m4a`

## Local structure expected by fallback scanner

Use subfolders (for example `Space Scene` and `Video Gallery`) and place files inside them:

`public/background_music/<folder>/<file>`
