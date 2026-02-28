/**
 * Debug script: Video Gallery playback investigation
 *
 * Run with:
 *   npx playwright test tests/debug-video-gallery.spec.ts --headed
 *
 * Prerequisites: dev server must be running on localhost:3000
 *   npm run dev
 *
 * The script will output a full diagnostic report to the console.
 */

import { test } from "@playwright/test";

// ─── helpers ────────────────────────────────────────────────────────────────

function section(title: string) {
  const bar = "─".repeat(60);
  console.log(`\n${bar}`);
  console.log(`  ${title}`);
  console.log(bar);
}

function ts() {
  return new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
}

// ─── test ────────────────────────────────────────────────────────────────────

test("diagnose Video Gallery playback", async ({ page }) => {
  test.setTimeout(90_000);

  // ── 1. Collect all console output ───────────────────────────────────────
  const consoleLogs: string[] = [];
  page.on("console", (msg) => {
    const entry = `[${ts()}][${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(entry);
  });
  page.on("pageerror", (err) => {
    consoleLogs.push(`[${ts()}][PAGEERROR] ${err.message}`);
  });

  // ── 2. Intercept key API calls ───────────────────────────────────────────
  interface ApiRecord {
    url: string;
    status: number;
    body: string;
    timing: string;
  }
  const apiRecords: ApiRecord[] = [];

  page.on("response", async (res) => {
    const url = res.url();
    if (
      url.includes("/api/music") ||
      url.includes("/api/videos") ||
      url.includes("/api/community-pot")
    ) {
      try {
        const body = await res.text();
        apiRecords.push({
          url: url.replace(/^https?:\/\/[^/]+/, ""),
          status: res.status(),
          body: body.substring(0, 2000), // cap at 2 KB
          timing: ts(),
        });
      } catch {
        apiRecords.push({
          url: url.replace(/^https?:\/\/[^/]+/, ""),
          status: res.status(),
          body: "<could not read body>",
          timing: ts(),
        });
      }
    }
  });

  // Track video element network requests (mp4 fetches)
  const videoRequests: Array<{ url: string; status: number; timing: string }> =
    [];
  page.on("response", async (res) => {
    const url = res.url();
    if (url.endsWith(".mp4") || url.endsWith(".webm")) {
      videoRequests.push({
        url: url.substring(url.lastIndexOf("/") + 1), // filename only
        status: res.status(),
        timing: ts(),
      });
    }
  });

  // ── 3. Navigate ──────────────────────────────────────────────────────────
  section("NAVIGATION");
  console.log(`[${ts()}] Navigating to /?video-gallery=teardrops`);
  await page.goto("/?video-gallery=teardrops", { waitUntil: "domcontentloaded" });
  console.log(`[${ts()}] DOM loaded`);

  // ── 4. Wait for music API + React hydration ──────────────────────────────
  console.log(`[${ts()}] Waiting 5 s for hydration + music API…`);
  await page.waitForTimeout(5_000);

  // ── 5. Snapshot React context via window.__btc_debug ────────────────────
  // We inject a tiny debug helper that reads the context values from DOM
  const contextSnapshot = await page.evaluate(() => {
    // Read any data attributes or window globals the app might expose
    const result: Record<string, unknown> = {};

    // Check if video elements exist in the DOM
    const videos = Array.from(document.querySelectorAll("video"));
    result.videoElementCount = videos.length;
    result.videoStates = videos.map((v, i) => ({
      index: i,
      src: v.src ? v.src.substring(v.src.lastIndexOf("/") + 1) : "(none)",
      paused: v.paused,
      readyState: v.readyState, // 0=HAVE_NOTHING 4=HAVE_ENOUGH_DATA
      networkState: v.networkState, // 0=EMPTY 1=IDLE 2=LOADING 3=NO_SOURCE
      currentTime: v.currentTime,
      duration: v.duration,
      muted: v.muted,
      volume: v.volume,
      error: v.error ? { code: v.error.code, message: v.error.message } : null,
    }));

    // Check TeardropsVideoBackground wrapper in DOM
    result.teardropsWrapperExists = !!document.querySelector(
      '[class*="TeardropsVideoBackground"], [data-video-bg]'
    );

    // Music player track name shown in the player bar
    const musicNameEl = document.querySelector(".text-xs.text-gray-400.truncate");
    result.visibleTrackName = musicNameEl?.textContent ?? "(not found)";

    // Check if immersive / Only Visuals button is present and what state it shows
    const immersiveBtn = Array.from(document.querySelectorAll("button")).find(
      (b) =>
        b.textContent?.includes("Only visuals") ||
        b.textContent?.includes("Show everything")
    );
    result.immersiveBtnText = immersiveBtn?.textContent?.trim() ?? "(not found)";

    // Check if "Resume Video Gallery" prompt is visible
    const resumeBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Resume Video Gallery")
    );
    result.resumeBtnVisible = !!resumeBtn;

    return result;
  });

  // ── 6. Try clicking "Resume Video Gallery" if present ───────────────────
  section("AUTOPLAY UNLOCK");
  if (contextSnapshot.resumeBtnVisible) {
    console.log(`[${ts()}] "Resume Video Gallery" prompt IS visible — clicking it`);
    try {
      await page.click('button:has-text("Resume Video Gallery")', {
        timeout: 3_000,
      });
      console.log(`[${ts()}] Click sent. Waiting 5 s to observe playback…`);
      await page.waitForTimeout(5_000);
    } catch {
      console.log(`[${ts()}] Could not click the button (might have disappeared or moved)`);
    }
  } else {
    console.log(`[${ts()}] "Resume Video Gallery" prompt is NOT visible`);
  }

  // ── 7. Second DOM snapshot after unlock attempt ──────────────────────────
  const contextSnapshotAfter = await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll("video"));
    return {
      videoElementCount: videos.length,
      videoStates: videos.map((v, i) => ({
        index: i,
        src: v.src ? v.src.substring(v.src.lastIndexOf("/") + 1) : "(none)",
        paused: v.paused,
        readyState: v.readyState,
        networkState: v.networkState,
        currentTime: v.currentTime,
        muted: v.muted,
        volume: v.volume,
        error: v.error ? { code: v.error.code, message: v.error.message } : null,
      })),
      resumeBtnStillVisible: !!Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("Resume Video Gallery")
      ),
    };
  });

  // ── 8. If still no video, try manually selecting a Video Gallery track ───
  section("MANUAL TRACK SELECTION");
  if (contextSnapshotAfter.videoStates.every((v) => v.paused || v.src === "(none)")) {
    console.log(
      `[${ts()}] Videos still not playing. Trying to expand player and select a Video Gallery track manually…`
    );

    // Move mouse to bottom-right to make the player visible
    await page.mouse.move(1200, 700);
    await page.waitForTimeout(500);

    // Expand the music player (ChevronUp button inside the player)
    try {
      const expandBtn = page.locator("div.fixed.bottom-6.right-6 button").first();
      await expandBtn.click({ timeout: 3_000 });
      console.log(`[${ts()}] Clicked expand button`);
      await page.waitForTimeout(1_000);
    } catch {
      console.log(`[${ts()}] Could not click expand button`);
    }

    // Click the Video Gallery tab
    try {
      await page.click('button:has-text("Video Gallery")', { timeout: 3_000 });
      console.log(`[${ts()}] Clicked Video Gallery tab`);
      await page.waitForTimeout(500);
    } catch {
      console.log(`[${ts()}] Could not find Video Gallery tab`);
    }

    // Click the first track in the list
    try {
      const firstTrack = page
        .locator("div.max-h-\\[240px\\] button")
        .first();
      const trackName = await firstTrack.textContent();
      console.log(`[${ts()}] Clicking first Video Gallery track: "${trackName?.trim()}"`);
      await firstTrack.click({ timeout: 3_000 });
      await page.waitForTimeout(6_000);
    } catch {
      console.log(`[${ts()}] Could not click a Video Gallery track`);
    }

    // Try Resume again if it appeared
    try {
      await page.click('button:has-text("Resume Video Gallery")', { timeout: 3_000 });
      console.log(`[${ts()}] Clicked Resume after manual selection`);
      await page.waitForTimeout(5_000);
    } catch {
      // not present, ok
    }
  } else {
    console.log(`[${ts()}] Videos already playing after initial unlock — skipping manual selection`);
  }

  // ── 9. Final DOM snapshot ────────────────────────────────────────────────
  const finalSnapshot = await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll("video"));
    return {
      videoElementCount: videos.length,
      videoStates: videos.map((v, i) => ({
        index: i,
        src: v.src ? v.src.substring(v.src.lastIndexOf("/") + 1) : "(none)",
        paused: v.paused,
        readyState: v.readyState,
        networkState: v.networkState,
        currentTime: v.currentTime.toFixed(2),
        muted: v.muted,
        volume: v.volume,
        error: v.error ? { code: v.error.code, message: v.error.message } : null,
      })),
    };
  });

  // ── 10. Print report ─────────────────────────────────────────────────────
  section("REPORT: API RESPONSES");
  if (apiRecords.length === 0) {
    console.log("  No API calls captured.");
  }
  for (const r of apiRecords) {
    console.log(`\n  [${r.timing}] ${r.status} ${r.url}`);
    // Pretty-print JSON if possible
    try {
      const parsed = JSON.parse(r.body);
      if (parsed.tracks) {
        const videoTracks = parsed.tracks.filter((t: {hasVideo?: boolean}) => t.hasVideo);
        const skyTracks = parsed.tracks.filter((t: {hasVideo?: boolean}) => !t.hasVideo);
        console.log(`    tracks total=${parsed.tracks.length}  videoGallery=${videoTracks.length}  skyScene=${skyTracks.length}`);
        videoTracks.forEach((t: {name: string; slug?: string | null; hasVideo: boolean}) =>
          console.log(`      VIDEO  name="${t.name}"  slug=${t.slug ?? "(null)"}`)
        );
        skyTracks.forEach((t: {name: string}) =>
          console.log(`      SKY    name="${t.name}"`)
        );
      } else if (parsed.videos) {
        console.log(`    videos count=${parsed.videos.length}  fullLength=${parsed.fullLength}`);
        parsed.videos.slice(0, 5).forEach((v: {url: string; transition: string; speed: number}) =>
          console.log(`      ${v.url.substring(v.url.lastIndexOf("/") + 1)}  transition=${v.transition}  speed=${v.speed}`)
        );
        if (parsed.videos.length > 5)
          console.log(`      … and ${parsed.videos.length - 5} more`);
      } else {
        console.log(`    ${r.body.substring(0, 300)}`);
      }
    } catch {
      console.log(`    ${r.body.substring(0, 300)}`);
    }
  }

  section("REPORT: VIDEO ELEMENT STATE (before unlock)");
  console.log(`  Video elements in DOM: ${contextSnapshot.videoElementCount}`);
  console.log(`  Visible track name in player: "${contextSnapshot.visibleTrackName}"`);
  console.log(`  Immersive button text: "${contextSnapshot.immersiveBtnText}"`);
  console.log(`  Resume prompt visible: ${contextSnapshot.resumeBtnVisible}`);
  if (Array.isArray(contextSnapshot.videoStates)) {
    contextSnapshot.videoStates.forEach((v) => console.log(`  video[${v.index}]`, v));
  }

  section("REPORT: VIDEO ELEMENT STATE (after unlock)");
  console.log(`  Video elements in DOM: ${contextSnapshotAfter.videoElementCount}`);
  console.log(`  Resume prompt still visible: ${contextSnapshotAfter.resumeBtnStillVisible}`);
  contextSnapshotAfter.videoStates.forEach((v) =>
    console.log(`  video[${v.index}]`, v)
  );

  section("REPORT: VIDEO ELEMENT STATE (final)");
  console.log(`  Video elements in DOM: ${finalSnapshot.videoElementCount}`);
  finalSnapshot.videoStates.forEach((v) =>
    console.log(`  video[${v.index}]`, v)
  );

  section("REPORT: VIDEO FILE REQUESTS (mp4/webm)");
  if (videoRequests.length === 0) {
    console.log("  No video file requests captured — videos were never fetched from R2.");
  } else {
    videoRequests.forEach((r) =>
      console.log(`  [${r.timing}] ${r.status}  ${r.url}`)
    );
  }

  section("REPORT: FILTERED CONSOLE LOGS (VideoBackgroundManager + TeardropsVideoBackground)");
  const relevantLogs = consoleLogs.filter(
    (l) =>
      l.includes("VideoBackgroundManager") ||
      l.includes("TeardropsVideoBackground") ||
      l.includes("MusicPlayer") ||
      l.includes("Music API") ||
      l.includes("autoplay") ||
      l.includes("ERROR") ||
      l.includes("PAGEERROR") ||
      l.includes("video") ||
      l.includes("track")
  );
  if (relevantLogs.length === 0) {
    console.log("  (no matching logs)");
  }
  relevantLogs.forEach((l) => console.log(" ", l));

  section("REPORT: ALL CONSOLE LOGS");
  if (consoleLogs.length === 0) {
    console.log("  (none)");
  }
  consoleLogs.forEach((l) => console.log(" ", l));

  section("END OF DIAGNOSTIC REPORT");
});
