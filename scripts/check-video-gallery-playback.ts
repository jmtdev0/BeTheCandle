#!/usr/bin/env tsx
import fs from "node:fs";
import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";

interface VideoProbe {
  index: number;
  src: string;
  paused: boolean;
  currentTime: number;
  readyState: number;
  opacity: number;
  width: number;
  height: number;
}

interface ProbeResult {
  all: VideoProbe[];
  active: VideoProbe | null;
}

function resolveBraveExecutablePath(): string | null {
  const envPath = process.env.BRAVE_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const candidates = [
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function probeVideos(page: Page): Promise<ProbeResult> {
  return page.evaluate(() => {
    const probes = Array.from(document.querySelectorAll("video")).map((video, index) => {
      const style = window.getComputedStyle(video);
      const rect = video.getBoundingClientRect();
      return {
        index,
        src: video.currentSrc || video.src || "",
        paused: video.paused,
        currentTime: video.currentTime,
        readyState: video.readyState,
        opacity: Number.parseFloat(style.opacity || "0"),
        width: rect.width,
        height: rect.height,
      };
    });

    const active = [...probes]
      .sort((a, b) => {
        if (b.opacity !== a.opacity) return b.opacity - a.opacity;
        return (b.width * b.height) - (a.width * a.height);
      })[0] ?? null;

    return { all: probes, active };
  });
}

function fmtProbe(probe: VideoProbe | null): string {
  if (!probe) return "none";
  const src = probe.src ? probe.src.split("/").pop() : "(no-src)";
  return `src=${src} paused=${probe.paused} currentTime=${probe.currentTime.toFixed(3)} readyState=${probe.readyState} opacity=${probe.opacity.toFixed(2)}`;
}

async function revealMusicPlayerByHover(page: Page): Promise<void> {
  const viewport = page.viewportSize() ?? { width: 1536, height: 864 };
  const hoverX = Math.max(1, viewport.width - 8);
  const hoverY = Math.max(1, viewport.height - 8);

  // Real mouse movement to trigger GlobalMusicPlayer corner hover logic.
  await page.mouse.move(hoverX, hoverY);
  await page.waitForTimeout(250);

  // Fallback synthetic mousemove at window level (for stricter headless scenarios).
  await page.evaluate(({ x, y }) => {
    const event = new MouseEvent("mousemove", {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    });
    window.dispatchEvent(event);
  }, { x: hoverX, y: hoverY });
  await page.waitForTimeout(300);
}

async function main() {
  const targetUrl = process.argv[2] || process.env.BTC_VIDEO_CHECK_URL || "https://d--bethecandle.netlify.app/";
  const headless = process.env.HEADLESS !== "false";
  const strictAutoplay = process.env.STRICT_AUTOPLAY !== "false";
  const screenshotPath = process.env.VIDEO_CHECK_SCREENSHOT || "test-results/video-gallery-playback-check.png";
  const braveExecutablePath = resolveBraveExecutablePath();

  const launchArgs = strictAutoplay ? ["--autoplay-policy=user-gesture-required"] : [];

  console.log(`[check] URL: ${targetUrl}`);
  console.log(`[check] Browser: ${braveExecutablePath ? `Brave (${braveExecutablePath})` : "Playwright Chromium"}`);
  console.log(`[check] Headless: ${headless}`);
  console.log(`[check] Strict autoplay: ${strictAutoplay}`);

  const browser = await chromium.launch({
    headless,
    executablePath: braveExecutablePath ?? undefined,
    args: launchArgs,
  });

  let page: Page | null = null;

  try {
    const context = await browser.newContext({
      viewport: { width: 1536, height: 864 },
      userAgent: braveExecutablePath
        ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Brave/141.0.0.0"
        : undefined,
    });

    page = await context.newPage();
    page.setDefaultTimeout(25_000);

    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        console.log(`[browser:${type}] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      console.log(`[pageerror] ${err.message}`);
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3000);

    const cookieAccept = page.getByRole("button", { name: /Accept all/i });
    if (await cookieAccept.count() > 0) {
      await cookieAccept.first().click({ force: true });
      await page.waitForTimeout(500);
    }

    const pageLoader = page.locator('div[class*="fixed"][class*="inset-0"][class*="z-[9999]"]');
    await pageLoader.first().waitFor({ state: "hidden", timeout: 40_000 }).catch(() => {
      console.log("[check] Warning: Page loader is still visible after 40s.");
    });

    await revealMusicPlayerByHover(page);

    const expandButton = page.locator('button[title="Mostrar lista"], button[title="Show list"]');
    const listVisible = page.locator(".music-list-scrollbar");

    // Wait for music UI to hydrate/fetch tracks.
    await Promise.race([
      listVisible.first().waitFor({ state: "visible", timeout: 20_000 }),
      expandButton.first().waitFor({ state: "visible", timeout: 20_000 }),
    ]).catch(() => {});

    if (await listVisible.count() === 0) {
      if (await expandButton.count() > 0) {
        await expandButton.first().click({ force: true });
      } else {
        // One more hover attempt in case the player auto-hid again.
        await revealMusicPlayerByHover(page);
        const debug = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"))
            .map((btn) => ({
              title: btn.getAttribute("title"),
              text: (btn.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
            }))
            .filter((entry) => entry.title || entry.text);
          return {
            buttons: buttons.slice(0, 20),
            hasMusicList: Boolean(document.querySelector(".music-list-scrollbar")),
            hasPlayerPanel: Boolean(document.querySelector(".fixed.bottom-6.right-6")),
          };
        });
        console.log(`[check] Debug UI: ${JSON.stringify(debug)}`);
        throw new Error("No se encontró el botón para desplegar la lista de canciones.");
      }
    }

    const videoTab = page.getByRole("button", { name: /Video Gallery/i });
    if (await videoTab.count() === 0) {
      throw new Error("No aparece la pestaña 'Video Gallery' (puede estar desactivada en DB).");
    }
    await videoTab.first().click({ force: true });

    const trackButtons = page.locator(".music-list-scrollbar button.flex.items-center.gap-2.flex-1.min-w-0");
    const trackCount = await trackButtons.count();
    if (trackCount === 0) {
      throw new Error("No hay canciones en la pestaña Video Gallery.");
    }

    // Click on first track in Video Gallery. This should count as user gesture for autoplay unlock.
    await trackButtons.first().click({ force: true });
    await page.waitForTimeout(1200);

    const before = await probeVideos(page);
    await page.waitForTimeout(2500);
    const after = await probeVideos(page);

    const beforeTime = before.active?.currentTime ?? 0;
    const afterTime = after.active?.currentTime ?? 0;
    const delta = afterTime - beforeTime;
    const appearsPlaying = delta > 0.35 && !(after.active?.paused ?? true);

    console.log(`[check] Videos found: ${after.all.length}`);
    console.log(`[check] Active before: ${fmtProbe(before.active)}`);
    console.log(`[check] Active after : ${fmtProbe(after.active)}`);
    console.log(`[check] Delta currentTime: ${delta.toFixed(3)}s`);

    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[check] Screenshot: ${screenshotPath}`);

    if (!appearsPlaying) {
      throw new Error("FAIL: el video activo no avanza de forma consistente (reproducción no confirmada).");
    }

    console.log("PASS: el video activo está avanzando.");
  } catch (error) {
    if (page) {
      try {
        await page.screenshot({ path: "test-results/video-gallery-playback-check-error.png", fullPage: true });
        console.log("[check] Error screenshot: test-results/video-gallery-playback-check-error.png");
      } catch {
        // ignore screenshot failures
      }
    }
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[check] ${message}`);
  process.exit(1);
});
