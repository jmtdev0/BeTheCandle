# Changelog

### 28/02/2026
* Renamed "Hide everything" button to "Only visuals"; the USDC sphere now remains visible in this mode
* Added `?video-gallery=<slug>` deep-link support: visiting `/?video-gallery=teardrops` auto-selects the matching Video Gallery track and enables Only Visuals mode — added `slug` column to `gallery_tracks` (migration `20260228_gallery_add_slug.sql`), exposed via `/api/music`, wired through `MusicTrackContext` (`requestedTrackSlug`) and consumed in `MusicPlayer`
* Fixed video audio not playing for Telepath/Spyro tracks: `VideoBackgroundManager` now calls `applyRuntimeAudioPolicy` immediately after `play()` resolves instead of waiting 1200ms, so audio unmuting happens as close to the user-gesture context as possible
* Raised default video volume from 2% to 5% so audio is audible at first play without having to find the slider
* Added `video_has_audio` column + comment to `supabase/public_schema.sql` to keep the schema file consistent with the production database
* Migrated R2 public URL from `pub-*.r2.dev` (rate-limited) to custom domain `assets.bethecandle.live` via Cloudflare — eliminates TCP timeouts on video/music assets
* Fixed video volume slider causing spurious video transitions: broke the `useCallback` dependency cascade (`videoVolume` → `applyRuntimeAudioPolicy` → `attemptPlay` → `transitionToNext` → timer effect re-runs) by reading volume via ref instead of closure
* Fixed video volume slider muting audio: volume policy `useEffect` was overriding direct DOM changes; slider now applies volume synchronously in the user-gesture call stack and the effect only runs on track changes
* Added smooth audio crossfade between Video Gallery clips — volume ramps down on outgoing video and up on incoming video in sync with the CSS opacity transition (2.5s)

### 24/02/2026
* Added WoW-style rotating loading tips to the page loader (starts on a random tip, cycles every 10s with a fade transition)
* Fixed SSR hydration mismatch caused by `Math.random()` in `useState` initializer — randomization now happens in `useEffect` (client-only)
* Fixed black flash between loading screen and 3D scene: page content now uses `opacity:0` instead of `display:none` during loading, so the Three.js canvas renders frames in the background while the loader is visible
* Wrapped `PageLoader` in `AnimatePresence` so its exit fade animation actually fires on dismissal

### 22/02/2026
* Added `video_has_audio` DB column to `gallery_tracks` — separates "videos have audio" from "only video audio" so tracks like Telepath can play both their MP3 and the video's embedded audio simultaneously
* Migrated Video Gallery data from static `music-data.json` to Supabase (`gallery_tracks` + `gallery_videos` tables) — videos can now be added/removed dynamically from the Supabase Dashboard without redeploying
* API routes `/api/music` and `/api/videos` now query Supabase instead of importing a JSON file
* Removed `src/data/music-data.json` (replaced by DB)
* Database is now the sole source of truth for tracks — `/api/music` no longer lists R2 audio files; tracks, audio filenames, and metadata all come from `gallery_tracks`
* Added `video_has_audio` flag to support tracks where the video carries its own audio (no separate mp3 needed), replacing the hardcoded Telepath check
* Fixed short videos getting stuck on last frame in fullLength mode (e.g. "Sin City"): the early crossfade flag was set before confirming the transition actually proceeded, blocking the fallback handler
* Added stall detector as safety net for video transitions
* Music modal now stays visible for 2 seconds after any click (prevents premature hide when selecting Video Gallery tracks)
* USDC sphere zoom level is now preserved across Hide/Show everything toggling
* Reduced max zoom out in Sky Scene from 90 to 70 (Video Gallery unchanged); smooth transition when switching modes

### 21/02/2026
* Fixed short videos (~3s) in Video Gallery getting stuck: now forces a hard cut transition instead of attempting a fade longer than the video itself
* Added horizontal pan/drag navigation for videos on mobile portrait mode (swipe to see cropped sides of 16:9 videos)
* Added descriptive Pexels titles for all 51 cottonbro video clips (fetched via Pexels API)
* Video names now link to their original Pexels page
* Reduced video panning sensitivity for smoother, gentler movement on mobile
* Added long-press + drag to reposition the USDC sphere on mobile (with scale pulse feedback)
* Added pinch-to-zoom for the USDC sphere on mobile

### 20/02/2026
* Created CHANGELOG.md
* Added global instructions to read context files (AGENTS.md, copilot-instructions.md, README.md) at conversation start
* Fixed autoplay-blocked modal being invisible in all browsers (was inside a z-index:-1 parent container)
* Added Brave-compatible autoplay detection via canplay event fallback (Brave silently blocks autoplay without rejecting the play() promise)
* Refined USDC `CentralCoin` sunflower tracking in Video Gallery with raycast-driven 3D orientation
* Stabilized sunflower motion with NDC + local-direction smoothing, face-switch hysteresis, and bounded quaternion rotation
* Fixed sunflower behavior across zoom levels by projecting cursor ray onto a camera-facing plane at sphere depth
* Biased sunflower target plane toward the viewer so one USDC symbol stays more front-facing (not perpendicular)
* Removed drag-start rotation jump by baking transient sunflower offset into base rotation on left-click drag begin
* Added Video Gallery idle behavior: after 3s without mouse movement, USDC sphere resumes gentle auto-rotation and returns to sunflower on mouse move
* Softened idle auto-rotation startup with eased blend-in to avoid abrupt spin onset

---- CHANGELOG CREATED HERE ----

### 19/02/2026
* Added verify-wallet Supabase function
* Updated RPC URL handling to use Alchemy in verify-address route

### 18/02/2026
* Implemented smooth zoom and sphere rotation in Video Gallery mode
* Added autoplay handling for video playback

### 17/02/2026
* Added redirect components for Guide, History, and Community Pot pages
* Removed /community-pot from URL structure

### 15/02/2026
* Added two new video sets: Telepath and Unearth Me

### 05/02/2026
* Enabled mobile video playback
* Added music tabs and merged video metadata

### 03/02/2026
* Updated video handling and settings; added new video list
* Fixed infinite recursion bug in devLog
* Added auto-merge workflow for claude branches

### 20/01/2026
* Added NEON lights and new NIGHT scene
* Lobby content cleaned up

### 18/01/2026
* New History page added
* Implemented USDC sphere lightning effect
* Integrated Twitter API for automated distribution tweets (API no longer free)
* Added payout history page and transaction retry logic

### 11/01/2026
* Enhanced DistantPlanes and FadingCircles for 360° distribution and circular motion

### 09/01/2026
* Enhanced scene readiness tracking and notifications across components

### 07/01/2026
* Enhanced Orb rotation logic for special heart participant

### 05/01/2026
* Integrated special heart address across components
* Improved page loading handling

### 28/12/2025
* Enhanced day-night cycle with manual time override and default night phase

### 20/12/2025
* Day-night cycle: added color interpolation and transition effects

### 14/12/2025
* Added total distributed stats to PayoutStats component

### 03/12/2025
* Updated Community Pot layout and loading state
* Refined metadata titles

### 30/11/2025
* Enhanced Community Pot distribution logic
* Improved user profile loading with maybeSingle() for better error handling
