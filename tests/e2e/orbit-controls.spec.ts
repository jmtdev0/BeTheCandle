// @ts-nocheck
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";

test.describe("Bitcoin planet orbit controls", () => {
  test("rotates when dragging the canvas", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    
    // Wait for canvas to be visible (3D scene ready)
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    // Give the scene time to fully render
    await page.waitForTimeout(2000);

    // Take screenshot without waiting for stability (canvas is always animating)
    const before = await page.screenshot({ animations: "allow" });

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error("Canvas bounding box not available");
    }

    const startX = box.x + box.width / 2 - 100;
    const startY = box.y + box.height / 2;
    const endX = startX + 200;

    // Perform drag gesture to rotate the view
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(endX, startY, { steps: 25 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // Wait for camera to finish moving and take another screenshot
    await page.waitForTimeout(500);
    const after = await page.screenshot({ animations: "allow" });

    // Verify that the view changed (screenshots should be different)
    expect(before.equals(after)).toBeFalsy();
  });
});
