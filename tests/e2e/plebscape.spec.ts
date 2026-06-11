import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    bodyScrollHeight: document.body.scrollHeight,
    bodyScrollWidth: document.body.scrollWidth,
    docScrollHeight: document.documentElement.scrollHeight,
    docScrollWidth: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth
  }));

  expect(overflow.docScrollHeight).toBeLessThanOrEqual(overflow.innerHeight + 1);
  expect(overflow.bodyScrollHeight).toBeLessThanOrEqual(overflow.innerHeight + 1);
  expect(overflow.docScrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
}

async function expectNounCentered(page: Page, noun: string) {
  const metrics = await page.getByText(noun, { exact: true }).evaluate((element) => {
    const button = element.closest("button");

    if (!button) {
      throw new Error("Noun is not inside a button.");
    }

    const buttonBox = button.getBoundingClientRect();
    const textBox = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);

    return {
      buttonCenterX: buttonBox.left + buttonBox.width / 2,
      buttonCenterY: buttonBox.top + buttonBox.height / 2,
      buttonHeight: buttonBox.height,
      buttonWidth: buttonBox.width,
      textCenterX: textBox.left + textBox.width / 2,
      textCenterY: textBox.top + textBox.height / 2,
      textHeight: textBox.height,
      textWidth: textBox.width,
      whiteSpace: styles.whiteSpace
    };
  });

  expect(Math.abs(metrics.buttonCenterX - metrics.textCenterX)).toBeLessThanOrEqual(2);
  expect(Math.abs(metrics.buttonCenterY - metrics.textCenterY)).toBeLessThanOrEqual(2);
  expect(metrics.textWidth).toBeLessThanOrEqual(metrics.buttonWidth - 12);
  expect(metrics.textHeight).toBeLessThanOrEqual(metrics.buttonHeight / 2);
  expect(metrics.whiteSpace).toBe("nowrap");
}

async function expectPercentAboveNounCenteredInTopBand(page: Page, noun: string, percent: string) {
  const metrics = await page.getByRole("button", { name: new RegExp(`${noun} ${percent}`) }).evaluate(
    (button, expectedPercent) => {
      const nounElement = button.querySelector(".noun-word");
      const percentElement = Array.from(button.querySelectorAll("span")).find(
        (element) => element.textContent === expectedPercent
      );

      if (!nounElement || !percentElement) {
        throw new Error("Button content is missing.");
      }

      const buttonBox = button.getBoundingClientRect();
      const nounBox = nounElement.getBoundingClientRect();
      const percentBox = percentElement.getBoundingClientRect();
      const styles = window.getComputedStyle(button);
      const innerTop = buttonBox.top + parseFloat(styles.borderTopWidth);
      const expectedPercentCenterY = innerTop + (nounBox.top - innerTop) / 2;
      const percentCenterY = percentBox.top + percentBox.height / 2;

      return {
        expectedPercentCenterY,
        innerTop,
        nounTop: nounBox.top,
        percentBottom: percentBox.bottom,
        percentCenterY,
        percentTop: percentBox.top
      };
    },
    percent
  );

  expect(metrics.percentBottom).toBeLessThanOrEqual(metrics.nounTop);
  expect(metrics.percentTop).toBeGreaterThanOrEqual(metrics.innerTop - 1);
  expect(Math.abs(metrics.percentCenterY - metrics.expectedPercentCenterY)).toBeLessThanOrEqual(2);
}

async function expectEqualNounFontSizes(page: Page) {
  await expect
    .poll(async () =>
      page.locator(".choice-grid .noun-word").evaluateAll((elements) =>
        elements.map((element) => window.getComputedStyle(element).fontSize)
      )
    )
    .toEqual([expect.any(String), expect.any(String)]);

  const sizes = await page
    .locator(".choice-grid .noun-word")
    .evaluateAll((elements) =>
      elements.map((element) => parseFloat(window.getComputedStyle(element).fontSize))
    );

  expect(sizes).toHaveLength(2);
  expect(sizes[0]).toBeCloseTo(sizes[1], 4);
}

async function expectLockedFailureHero(page: Page) {
  const metrics = await page.locator(".failure-slot").evaluate((slot) => {
    const svg = slot.querySelector("svg.failure-hero-mark");
    const image = slot.querySelector("svg.failure-hero-mark image");
    const texts = Array.from(slot.querySelectorAll("svg.failure-hero-mark text"));
    const content = slot.querySelector("svg.failure-hero-mark g");

    if (!svg || !image || texts.length !== 2 || !content) {
      throw new Error("Failure hero SVG composition is incomplete.");
    }

    const slotBox = slot.getBoundingClientRect();
    const svgBox = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const contentBoxes = [image, ...texts].map((node) => node.getBoundingClientRect());
    const contentLeftPx = Math.min(...contentBoxes.map((box) => box.left));
    const contentRightPx = Math.max(...contentBoxes.map((box) => box.right));
    const contentTopPx = Math.min(...contentBoxes.map((box) => box.top));
    const contentBottomPx = Math.max(...contentBoxes.map((box) => box.bottom));
    const contentCenterPx = contentLeftPx + (contentRightPx - contentLeftPx) / 2;
    const svgUnitsPerPixel = viewBox.width / svgBox.width;
    const svgUnitsPerPixelY = viewBox.height / svgBox.height;

    return {
      aspectRatio: svgBox.width / svgBox.height,
      contentBottom: viewBox.y + (contentBottomPx - svgBox.top) * svgUnitsPerPixelY,
      contentCenterX: viewBox.x + (contentCenterPx - svgBox.left) * svgUnitsPerPixel,
      contentLeft: viewBox.x + (contentLeftPx - svgBox.left) * svgUnitsPerPixel,
      contentRight: viewBox.x + (contentRightPx - svgBox.left) * svgUnitsPerPixel,
      contentTop: viewBox.y + (contentTopPx - svgBox.top) * svgUnitsPerPixelY,
      imageCount: image ? 1 : 0,
      slotBottom: slotBox.bottom,
      slotCenterX: slotBox.left + slotBox.width / 2,
      slotTop: slotBox.top,
      svgCenterX: svgBox.left + svgBox.width / 2,
      svgBottom: svgBox.bottom,
      svgTop: svgBox.top,
      textCount: texts.length,
      textValues: texts.map((text) => text.textContent),
      viewBoxBottom: viewBox.y + viewBox.height,
      viewBoxCenterX: viewBox.x + viewBox.width / 2,
      viewBoxLeft: viewBox.x,
      viewBoxRight: viewBox.x + viewBox.width,
      viewBoxTop: viewBox.y
    };
  });

  expect(metrics.imageCount).toBe(1);
  expect(metrics.textCount).toBe(2);
  expect(metrics.textValues).toEqual(["YOU", "FAILED!"]);
  expect(metrics.aspectRatio).toBeCloseTo(720 / 220, 3);
  expect(metrics.contentTop).toBeGreaterThanOrEqual(metrics.viewBoxTop);
  expect(metrics.contentBottom).toBeLessThanOrEqual(metrics.viewBoxBottom);
  expect(metrics.contentLeft).toBeGreaterThanOrEqual(metrics.viewBoxLeft);
  expect(metrics.contentRight).toBeLessThanOrEqual(metrics.viewBoxRight);
  expect(Math.abs(metrics.contentCenterX - metrics.viewBoxCenterX)).toBeLessThanOrEqual(2);
  expect(Math.abs(metrics.slotCenterX - metrics.svgCenterX)).toBeLessThanOrEqual(2);
  expect(metrics.svgTop).toBeGreaterThanOrEqual(metrics.slotTop - 1);
  expect(metrics.svgBottom).toBeLessThanOrEqual(metrics.slotBottom + 1);
}

async function getButtonBox(page: Page, name: string | RegExp) {
  return page.getByRole("button", { name }).evaluate((button) => {
    const box = button.getBoundingClientRect();
    return {
      height: box.height,
      width: box.width
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/levels/next", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        level: {
          id: "11111111-1111-4111-8111-111111111111",
          nounA: "handkerchief",
          nounB: "tin"
        },
        generated: false
      })
    });
  });

  await page.route("**/api/votes", async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() ?? "{}") as { chosenSide: "a" | "b" };

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          levelId: "11111111-1111-4111-8111-111111111111",
          nounA: "handkerchief",
          nounB: "tin",
          votesA: body.chosenSide === "a" ? 4 : 3,
          votesB: body.chosenSide === "b" ? 2 : 1,
          percentA: body.chosenSide === "a" ? 80 : 60,
          percentB: body.chosenSide === "b" ? 40 : 20,
          chosenSide: body.chosenSide,
          chosenNoun: body.chosenSide === "a" ? "handkerchief" : "tin",
          passed: body.chosenSide === "b"
        }
      })
    });
  });
});

test("opens and closes the how it works modal by keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.getByText("There is only one way to escape the pleb.")).toBeVisible();
  await page.getByRole("button", { name: "Open game rules" }).click();
  const dialog = page.getByRole("dialog", { name: "How it works" });
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Each button contains one random noun. Example: tree / noise.")).toBeVisible();
  const modalOverflow = await dialog.evaluate((element) => ({
    clientHeight: element.clientHeight,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth
  }));
  expect(modalOverflow.scrollHeight).toBeLessThanOrEqual(modalOverflow.clientHeight + 1);
  expect(modalOverflow.scrollWidth).toBeLessThanOrEqual(modalOverflow.clientWidth + 1);
  await expectNoPageOverflow(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "How it works" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open game rules" })).toBeFocused();
});

test("keeps the old favicon asset", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/ape.png");
});

test("plays, reveals a pass, and hides percentages before choosing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("60%")).toBeHidden();
  await expectEqualNounFontSizes(page);
  await page.getByRole("button", { name: "tin" }).click();
  await expect(page.getByRole("heading", { name: "ESCAPED" })).toBeHidden();
  await expect(page.getByText("60%")).toBeVisible();
  await expect(page.getByText("40%")).toBeVisible();
  await expect(page.getByRole("button", { name: /tin 40%/ })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expectEqualNounFontSizes(page);
});

test("shows failure actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expectNounCentered(page, "handkerchief");
  const beforeBox = await getButtonBox(page, "handkerchief");
  await page.getByRole("button", { name: "handkerchief" }).click();
  await expect(page.getByRole("heading", { name: "YOU FAILED!" })).toBeVisible();
  await expect(page.locator(".failure-hero-mark")).toBeVisible();
  await expectLockedFailureHero(page);
  await expect(page.getByText("Level 1")).toHaveCount(1);
  await expect(page.getByText("PLEBSCAPE.COM")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /handkerchief 80%/ })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByRole("button", { name: /tin 20%/ })).toBeVisible();
  const afterBox = await getButtonBox(page, /handkerchief 80%/);
  expect(afterBox.width).toBeCloseTo(beforeBox.width, 0);
  expect(afterBox.height).toBeCloseTo(beforeBox.height, 0);
  await expectNounCentered(page, "handkerchief");
  await expectNounCentered(page, "tin");
  await expectEqualNounFontSizes(page);
  await expectPercentAboveNounCenteredInTopBand(page, "handkerchief", "80%");
  await expect(page.getByRole("button", { name: "SHARE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "START AGAIN" })).toBeVisible();
  await expectNoPageOverflow(page);
});

test("fits long noun text from each button box on wide screens", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await expectNounCentered(page, "handkerchief");
  await expectNounCentered(page, "tin");
  await expectEqualNounFontSizes(page);
  await page.getByRole("button", { name: "handkerchief" }).click();
  await expectNounCentered(page, "handkerchief");
  await expectNounCentered(page, "tin");
  await expectEqualNounFontSizes(page);
  await expectLockedFailureHero(page);
  await expectPercentAboveNounCenteredInTopBand(page, "handkerchief", "80%");
  await expectPercentAboveNounCenteredInTopBand(page, "tin", "20%");
});

test("positions revealed percentages above nouns in the top band", async ({ page }) => {
  await page.unroute("**/api/levels/next");
  await page.unroute("**/api/votes");
  await page.route("**/api/levels/next", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        level: {
          id: "22222222-2222-4222-8222-222222222222",
          nounA: "bagel",
          nounB: "jigsaw"
        },
        generated: false
      })
    });
  });
  await page.route("**/api/votes", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          levelId: "22222222-2222-4222-8222-222222222222",
          nounA: "bagel",
          nounB: "jigsaw",
          votesA: 59,
          votesB: 41,
          percentA: 59,
          percentB: 41,
          chosenSide: "a",
          chosenNoun: "bagel",
          passed: false
        }
      })
    });
  });

  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 }
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByRole("button", { name: "bagel" }).click();
    await expect(page.getByRole("heading", { name: "YOU FAILED!" })).toBeVisible();
    await expectNounCentered(page, "bagel");
    await expectNounCentered(page, "jigsaw");
    await expectEqualNounFontSizes(page);
    await expectPercentAboveNounCenteredInTopBand(page, "bagel", "59%");
    await expectPercentAboveNounCenteredInTopBand(page, "jigsaw", "41%");
    await expectNoPageOverflow(page);
  }
});

test("keeps the failure hero as one scalable svg mark", async ({ page }) => {
  const ratios = [];

  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 }
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByRole("button", { name: "handkerchief" }).click();
    await expect(page.getByRole("heading", { name: "YOU FAILED!" })).toBeVisible();
    await expectLockedFailureHero(page);

    ratios.push(
      await page.locator(".failure-hero-mark").evaluate((svg) => {
        const box = svg.getBoundingClientRect();
        return box.width / box.height;
      })
    );
  }

  expect(ratios[0]).toBeCloseTo(ratios[1], 3);
  expect(ratios[1]).toBeCloseTo(ratios[2], 3);
});

test("shows the exhausted world state", async ({ page }) => {
  await page.unroute("**/api/levels/next");
  await page.route("**/api/levels/next", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ exhausted: true })
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "THE WORLD IS EMPTY" })).toBeVisible();
  await expect(page.getByText("Every noun has already been used.")).toBeVisible();
  await expect(page.getByRole("button", { name: "START AGAIN" })).toBeVisible();
});

test("has no critical accessibility violations at desktop and mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const mobileResults = await new AxeBuilder({ page }).analyze();
  expect(mobileResults.violations).toEqual([]);

  await page.setViewportSize({ width: 1024, height: 768 });
  const desktopResults = await new AxeBuilder({ page }).analyze();
  expect(desktopResults.violations).toEqual([]);
});

test("does not scroll at supported viewport sizes", async ({ page }) => {
  const sizes = [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 }
  ];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expectNoPageOverflow(page);
    await page.getByRole("button", { name: "handkerchief" }).click();
    await expect(page.getByRole("heading", { name: "YOU FAILED!" })).toBeVisible();
    await expectNoPageOverflow(page);
  }
});
