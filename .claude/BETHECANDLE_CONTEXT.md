# BeTheCandle - Application Context Summary

## Project Overview
BeTheCandle is a Next.js 15 application with a "Community Pot" feature - a decentralized weekly lottery/pot system where participants join by depositing cryptocurrency and one random participant wins the entire pot each week.

## Tech Stack
- **Framework**: Next.js 15.5.9 (App Router)
- **Language**: TypeScript
- **3D Graphics**: Three.js + React Three Fiber (@react-three/fiber, @react-three/drei)
- **Animation**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Blockchain**: Polygon network (USDC transactions)

## Architecture

### Database Layer
- **Supabase Admin Client** (`src/lib/supabaseAdmin.ts`): Server-side operations with service role key
- **Supabase Browser Client** (`src/lib/supabaseBrowserClient.ts`): Client-side operations with anon key
- **Direct PostgreSQL Pool** (`src/lib/db.ts`): Direct connection for specific queries

**Key Tables**:
- `donations`: User donations with BTC addresses
- `users` & `user_profiles`: User management
- `community_pot_video_settings`: Video playback configuration (is_enabled, is_4k)
- Community pot transaction tables (managed via stored procedures)

### Music System
**Files**:
- `/public/background_music/*.mp3|.m4a|.wav|.ogg`
- `/public/background_music/Links.txt` - Metadata with YouTube/Bandcamp links
- `/public/background_music/video-mappings.json` - Song-to-video folder mapping

**Flow**:
1. `GET /api/music` scans filesystem and parses Links.txt
2. `MusicPlayer.tsx` fetches tracks and plays with native `<audio>` element
3. `MusicTrackContext` broadcasts current track state globally
4. Cookies persist volume/mute preferences

**Current Tracks** (7 total):
- spiritual brother - i must rest here a moment
- Michael Nyman - God's Hands
- 暗い自然 - まみれブラッド
- Yoko Shimomura - Sky of Wonder
- Monks Of The Abbey Of Notre Dame - Alleluia
- Enya - Marble Halls
- Telepath - Teardrops (edited)
- **Another Day in Paradise** ← Triggers video background

### Video Background System
**Files**:
- `src/components/community-pot/TeardropsVideoBackground.tsx` - Entry point
- `src/components/community-pot/VideoBackgroundManager.tsx` - Ping-pong playback engine
- `GET /api/videos?quality=4k|compressed` - Returns video list

**Video Assets**:
- `/public/I LOVE FREE 4K STOCK VIDEOS/` - 56 videos, ~2.6GB (UHD 4096×2160 @ 25fps)
- `/public/I LOVE FREE 4K STOCK VIDEOS/compressed/` - 53 videos, ~299 MB

**Playback Logic**:
- Dual video element ping-pong (videoA ↔ videoB) with cross-fade
- Fisher-Yates shuffle with auto-reshuffle at playlist end
- Dynamic transition: 3.5s fade for normal videos, 0ms hard cut for videos <5s
- Only plays when "Another Day in Paradise" is active AND not on mobile AND `is_enabled=true`
- Quality controlled by `is_4k` setting from database

### 3D Scene System (`InteractiveOrbs3D.tsx`)
**Structure**: Canvas → OrbsScene → Elements

**Core Elements** (always visible):
- **CentralCoin**: USDC sphere (radius 4) with broken rings and "S" logo, blue glow
- **Participant Orbs**: 9 geometric shapes based on address hash (sphere, box, torus, cone, etc.)
  - Special heart shape for address `0xe7fa55...2b81`

**Day/Night Cycle Elements** (decorative, hidden during video):

| Element | Visibility | Control Prop |
|---------|-----------|--------------|
| **DistantPlanes** | Day only | `visible={!isNight && !isVideoActive}` |
| **FadingCircles** | Day only | `visible={!isNight && !isVideoActive}` |
| **BirdFlock** | Day only | `isDay={isDay && !isVideoActive}` |
| **SoftClouds** | Day only | `isDay={isDay && !isVideoActive}` |
| **Stars** (drei) | Night only | `{isNight && !isVideoActive && <Stars/>}` |
| **ShootingStars** | Night only | `{!isVideoActive && <ShootingStars/>}` |
| **StarDust** | Night only | `isNight={isNight && !isVideoActive}` |
| **GoldenDust** | Sunset only | `starOpacity={isVideoActive ? 0 : starOpacity}` |

**Day/Night Timeline** (`useDayNightCycle.ts`):
- 05:00-07:15 → Dawn (transition)
- 07:15-18:00 → Day (`isDay=true`)
- 18:00-20:00 → Sunset (golden dust active)
- 20:00-05:00 → Night (`isNight=true`)

**Smooth Fade Transitions**:
- `DistantPlanes` & `FadingCircles`: Opacity lerp at 0.03/frame (~1s fade)
- `SoftClouds`, `BirdFlock`, `StarDust`, `GoldenDust`: Built-in opacity lerp (0.02-0.03/frame)
- `Stars`, `ShootingStars`: Hard cut (acceptable - rare events)

**Camera Controls**:
- OrbitControls with zoom limited to 20-50 units
- 30s idle timeout → auto-rotation at 0.02 rad/s
- WASD/Arrow keys: Move camera relative to view direction

### Community Pot Page Flow
**File**: `src/app/community-pot/page.tsx`

1. **Data Loading**:
   - Fetch video settings from `community_pot_video_settings` (on mount)
   - `useCommunityPot()` hook fetches participants, pot status, countdown
   - Wait for both data + 3D scene ready before showing content

2. **Video Activation Logic**:
   ```ts
   const isVideoSong = isTeardropsSong || isParadiseSong;
   const isVideoActive = isVideoSong && videoSettings.isEnabled;
   const effectiveBackground = isVideoActive ? "transparent" : gradient;
   ```

3. **Rendering Layers** (z-index):
   - -1: VideoBackgroundManager (fixed, behind everything)
   - 0: InteractiveOrbs3D Canvas
   - 10-100: UI overlays (InfoPanel, Rankings, Join Modal, etc.)

## API Routes Pattern
All routes in `src/app/api/[resource]/route.ts`:
- Use Zod for input validation
- Return `NextResponse.json()`
- Server-side routes use admin Supabase client
- Error handling with consistent HTTP codes

## Important Patterns

### Music-Triggered Visual Effects
```ts
// In page.tsx
const { currentTrackName } = useMusicTrack();
const isParadiseSong = currentTrackName?.includes("Another Day in Paradise");
const isVideoActive = isParadiseSong && videoSettings.isEnabled;

// Pass to components
<TeardropsVideoBackground is4k={videoSettings.is4k} isEnabled={videoSettings.isEnabled} />
<InteractiveOrbs3D isVideoActive={isVideoActive} ... />
```

### 3D Element Fade Pattern
```ts
// In useFrame
const targetOpacity = visible ? maxOpacity : 0;
material.opacity += (targetOpacity - material.opacity) * 0.03; // Exponential decay
mesh.visible = material.opacity > 0.001; // Hide when fully faded
```

### Supabase RLS Requirements
Tables accessed from browser client (anon key) need public SELECT policies:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON table_name FOR SELECT USING (true);
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL (optional, fallback)
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL (PostgreSQL direct)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY
```

## Known Issues / Quirks
- ESLint warnings about `groupRef.current` in cleanup functions (pre-existing, safe to ignore)
- Video background only works on desktop (mobile detection via touch + screen width <768px)
- Three.js `<Stars>` component from drei doesn't support external opacity control (hard cut is intentional)
- Bandwidth tracker logs video usage every 4s to console (debug feature)

## Common Tasks

### Add a new song-to-video mapping:
1. Edit `/public/background_music/video-mappings.json`
2. Update `isVideoActive` logic in `page.tsx` to detect new song

### Adjust day/night timing:
Edit `src/hooks/useDayNightCycle.ts` - modify `DAWN_START`, `DAY_START`, `SUNSET_START`, `NIGHT_START` constants

### Add a new decorative 3D element:
1. Create component in `InteractiveOrbs3D.tsx`
2. Add to `OrbsScene` render with `isVideoActive` gating
3. Implement opacity lerp in `useFrame` if smooth transitions needed

### Modify video transition timing:
- Framer Motion fade: Edit `duration: 3.5` in `TeardropsVideoBackground.tsx`
- Opacity lerp speed: Edit `0.03` rate in `DistantPlanes`, `FadingCircles`, etc.
- Video cross-fade: Edit `transitionDuration` state in `VideoBackgroundManager.tsx`

## File Structure (Key Paths)
```
src/
├── app/
│   ├── community-pot/
│   │   ├── page.tsx (main page)
│   │   ├── guide/ history/ (subpages)
│   ├── api/
│   │   ├── music/route.ts
│   │   ├── videos/route.ts
│   │   └── community-pot/* (pot operations)
├── components/
│   ├── common/
│   │   ├── MusicPlayer.tsx
│   │   └── GlobalMusicPlayer.tsx
│   └── community-pot/
│       ├── InteractiveOrbs3D.tsx (3D scene)
│       ├── TeardropsVideoBackground.tsx
│       ├── VideoBackgroundManager.tsx
│       └── PayoutStats.tsx
├── contexts/
│   ├── MusicTrackContext.tsx
│   └── PageTransitionContext.tsx
├── hooks/
│   ├── useDayNightCycle.ts
│   └── useCommunityPot.ts
├── lib/
│   ├── supabaseAdmin.ts
│   ├── supabaseBrowserClient.ts
│   └── db.ts
public/
├── background_music/
│   ├── *.mp3, *.m4a
│   ├── Links.txt
│   └── video-mappings.json
└── I LOVE FREE 4K STOCK VIDEOS/
    ├── *.mp4 (4K videos)
    └── compressed/*.mp4
```

## Performance Considerations
- 3D scene particle counts reduced on mobile (1500 vs 5000 stars)
- Video background disabled on mobile/touch devices
- Compressed video option reduces bandwidth by ~90%
- Exponential decay opacity (0.03 rate) = ~1 second fade = smooth + performant
- OrbitControls idle timeout prevents unnecessary rendering work
