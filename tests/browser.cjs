// Run against a local static server: NODE_PATH=<playwright modules> node tests/browser.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = process.env.TEST_URL || "http://localhost:8765";
    await page.goto(base);
    await page.waitForFunction(
      () => document.querySelectorAll(".timeline-item").length === 169,
    );
    await page.locator("#search").fill("Angkor");
    assert((await page.locator(".timeline-item").count()) > 0);
    assert((await page.locator(".timeline-item").count()) < 169);
    await page.locator(".timeline-item").first().click();
    assert(await page.locator("#moment-card").isVisible());
    const first = await page.locator("#moment-position").textContent();
    await page.locator("#moment-next").click();
    assert.notEqual(
      await page.locator("#moment-position").textContent(),
      first,
    );
    await page.waitForFunction(
      () =>
        document.getElementById("moment-image").complete &&
        document.getElementById("moment-image").naturalWidth > 0,
    );
    await page.locator("#moment-photo").click();
    assert(await page.locator("#photo-viewer").isVisible());
    await page.keyboard.press("Escape");
    assert(!(await page.locator("#photo-viewer").isVisible()));
    const shared = page.url();
    await page.goto(shared);
    await page.waitForSelector("#moment-card:not([hidden])");
    assert.equal(
      new URL(page.url()).searchParams.get("m"),
      new URL(shared).searchParams.get("m"),
    );
    await page.locator('[data-region="mexico"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll(".timeline-item").length === 144,
    );
    await page.locator("#search").fill("zzzzzz");
    assert.equal(await page.locator(".timeline-item").count(), 0);
    assert.match(
      await page.locator(".empty-state").textContent(),
      /No memories/,
    );
    await page.locator("#search").fill("");
    for (const key of ["darkCanvas", "aerial", "terrain", "streets"]) {
      await page.locator('button[data-basemap="' + key + '"]').click();
      assert.equal(
        await page
          .locator('button[data-basemap="' + key + '"]')
          .getAttribute("aria-pressed"),
        "true",
      );
    }
    await page.locator('[data-region="sea"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll(".timeline-item").length === 169,
    );
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "/tmp/astra-desktop.png" });
    for (const size of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(size);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (size.width < 761) {
        await page.locator("#view-journal").click();
        assert(await page.locator(".journal").isVisible());
        assert(
          await page
            .locator("#timeline-list")
            .evaluate((el) => el.clientHeight > 60),
        );
        await page.waitForTimeout(700);
        if (size.width === 390)
          await page.screenshot({ path: "/tmp/astra-mobile-journal.png" });
        await page.locator(".timeline-item").first().click();
        assert(await page.locator("#moment-card").isVisible());
        assert(!(await page.locator(".journal").isVisible()));
        await page.waitForTimeout(700);
        if (size.width === 390)
          await page.screenshot({ path: "/tmp/astra-mobile-map.png" });
      }
    }
    // A slower initial response must not overwrite a subsequently selected trip.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.route("**/data/sea.json", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto(base);
    await page.locator('[data-region="mexico"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll(".timeline-item").length === 144,
    );
    await page.waitForTimeout(1300);
    assert.equal(await page.locator("#trip-title").textContent(), "Mexico");
    assert.equal(await page.locator(".timeline-item").count(), 144);
    await page.unroute("**/data/sea.json");
    await page.route("**/data/sea.json", (route) =>
      route.fulfill({ status: 503, body: "Unavailable" }),
    );
    await page.goto(base + "?b=invalid&lat=nope&lng=nope&z=nope");
    await page.waitForSelector("#retry");
    await page.unroute("**/data/sea.json");
    await page.locator("#retry").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".timeline-item").length === 169,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: trips, search, selection, navigation, photos, share links, four map styles, responsive layouts, request race, and retry. No browser errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
