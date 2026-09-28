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
    await page.waitForSelector(".route-direction span");
    const verifyArrows = async (region) => {
      const result = await page.evaluate(async (region) => {
        const data = await (await fetch("data/" + region + ".json")).json();
        return [...document.querySelectorAll(".route-direction span")].every(
          (arrow) => {
            const from =
              data.features[Number(arrow.dataset.from.split("-")[1])];
            const to = data.features[Number(arrow.dataset.to.split("-")[1])];
            if (!from || !to || !arrow.dataset.from.startsWith(region))
              return false;
            const a = TravelMap.map.latLngToContainerPoint([
              from.geometry.coordinates[1],
              from.geometry.coordinates[0],
            ]);
            const b = TravelMap.map.latLngToContainerPoint([
              to.geometry.coordinates[1],
              to.geometry.coordinates[0],
            ]);
            const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            const renderedAngle = Number(
              arrow.style.transform.match(/rotate\(([-\d.]+)deg\)/)[1],
            );
            return (
              Date.parse(from.properties.timestamp) <=
                Date.parse(to.properties.timestamp) &&
              Math.abs(angle - renderedAngle) < 0.01
            );
          },
        );
      }, region);
      assert(result, "Arrows must point from older timestamps to newer ones");
    };
    await verifyArrows("sea");
    await page.locator("#zoom-in").click();
    await page.waitForTimeout(350);
    await verifyArrows("sea");
    await page.waitForSelector(".trip-cover[data-moment]");
    let photo = await page.locator(".trip-cover").getAttribute("data-moment");
    await page.waitForFunction(
      (id) => document.querySelector(".trip-cover").dataset.moment !== id,
      photo,
      { timeout: 12000 },
    );
    await page.locator("#cover-pause").click();
    await page.locator("#cover-pause").blur();
    await page.mouse.move(700, 50);
    photo = await page.locator(".trip-cover").getAttribute("data-moment");
    await page.waitForTimeout(5500);
    assert.equal(
      await page.locator(".trip-cover").getAttribute("data-moment"),
      photo,
    );
    await page.locator("#cover-next").click();
    await page.waitForFunction(
      (id) => document.querySelector(".trip-cover").dataset.moment !== id,
      photo,
    );
    const nextPhoto = await page
      .locator(".trip-cover")
      .getAttribute("data-moment");
    await page.locator("#cover-prev").click();
    await page.waitForFunction(
      (id) => document.querySelector(".trip-cover").dataset.moment === id,
      photo,
    );
    await page.locator("#cover-open").click();
    assert.equal(new URL(page.url()).searchParams.get("m"), photo);
    await page.locator('[data-view="map"]').click();
    assert(!(await page.locator(".journal").isVisible()));
    assert((await page.locator("#map").boundingBox()).width > 1350);
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/tmp/astra-map-focus.png" });
    await page.locator('button[data-view="journal"]').click();
    assert(!(await page.locator(".map-stage").isVisible()));
    assert(await page.locator("#journal-detail #moment-card").isVisible());
    await page.locator(".timeline-item").nth(15).click();
    assert.equal(
      await page.locator("body").getAttribute("data-view"),
      "journal",
    );
    assert(await page.locator("#moment-card").isVisible());
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/tmp/astra-moments-focus.png" });
    await page.locator("#moment-next").click();
    assert.equal(
      await page.locator("body").getAttribute("data-view"),
      "journal",
    );
    await page.locator('button[data-view="split"]').click();
    assert(await page.locator(".journal").isVisible());
    assert(await page.locator(".map-stage #moment-card").isVisible());
    await page.locator('[data-region="mexico"]').click();
    await page.waitForFunction(() =>
      document
        .querySelector(".trip-cover")
        .dataset.moment.startsWith("mexico-"),
    );
    await verifyArrows("mexico");
    await page.locator('button[data-view="journal"]').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.body.dataset.view === "split");
    await page.locator("#view-journal").click();
    assert(await page.locator(".cover-controls").isVisible());
    await page.locator("#cover-next").click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/tmp/astra-interactive-mobile.png" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        document.getElementById("cover-pause").getAttribute("aria-pressed") ===
        "true",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: chronological arrow bearings, zoom, auto rotation, pause, previous/next cover, cover selection, all focus views, journal-only selection, trip changes, responsive reset, and reduced motion.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
