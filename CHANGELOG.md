# Changelog

###  22/02/2026

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
