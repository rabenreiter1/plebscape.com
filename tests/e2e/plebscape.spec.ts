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
      const percentStyles = window.getComputedStyle(percentElement);
      const innerTop = buttonBox.top + parseFloat(styles.borderTopWidth);
      const expectedPercentCenterY = innerTop + (nounBox.top - innerTop) / 2;
      const percentCenterY = percentBox.top + percentBox.height / 2;
      const topBandHeight = nounBox.top - innerTop;
      const expectedFillHeight = topBandHeight - 8;
      const isWidthCapped = percentBox.height < expectedFillHeight - 2;

      return {
        buttonLeft: buttonBox.left,
        buttonRight: buttonBox.right,
        expectedPercentCenterY,
        expectedFillHeight,
        innerTop,
        isWidthCapped,
        nounTop: nounBox.top,
        percentBottom: percentBox.bottom,
        percentCenterY,
        percentHeight: percentBox.height,
        percentLeft: percentBox.left,
        percentRight: percentBox.right,
        percentTop: percentBox.top,
        topBandHeight,
        cssPercentFontSize: parseFloat(percentStyles.fontSize)
      };
    },
    percent
  );

  expect(metrics.percentBottom).toBeLessThanOrEqual(metrics.nounTop);
  expect(metrics.percentTop).toBeGreaterThanOrEqual(metrics.innerTop - 1);
  expect(Math.abs(metrics.percentCenterY - metrics.expectedPercentCenterY)).toBeLessThanOrEqual(2);
  expect(metrics.percentLeft).toBeGreaterThanOrEqual(metrics.buttonLeft - 1);
  expect(metrics.percentRight).toBeLessThanOrEqual(metrics.buttonRight + 1);
  expect(metrics.cssPercentFontSize).toBeGreaterThanOrEqual(16);

  if (!metrics.isWidthCapped) {
    expect(Math.abs(metrics.percentHeight - metrics.expectedFillHeight)).toBeLessThanOrEqual(2);
  }
}

type CanvasTextCall = {
  font: string;
  text: string;
  textAlign: CanvasTextAlign;
  width: number;
  x: number;
  y: number;
};

function getCanvasFontSize(font: string) {
  const size = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1]);

  if (!Number.isFinite(size)) {
    throw new Error(`Could not parse canvas font size from "${font}".`);
  }

  return size;
}

function expectShareButtonTextGeometry({
  nounCall,
  percentCall,
  x,
  y
}: {
  nounCall: CanvasTextCall;
  percentCall: CanvasTextCall;
  x: number;
  y: number;
}) {
  const width = 440;
  const height = 160;
  const borderWidth = 6;
  const nounLineHeight = 0.92;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const innerTop = y + borderWidth;
  const nounFontSize = getCanvasFontSize(nounCall.font);
  const percentFontSize = getCanvasFontSize(percentCall.font);
  const nounTopY = centerY - (nounFontSize * nounLineHeight) / 2;
  const topBandHeight = nounTopY - innerTop;
  const expectedPercentCenterY = innerTop + topBandHeight / 2;
  const expectedPercentFontSize = topBandHeight - 8;

  expect(nounCall.textAlign).toBe("center");
  expect(percentCall.textAlign).toBe("center");
  expect(nounCall.x).toBe(centerX);
  expect(nounCall.y).toBe(centerY);
  expect(percentCall.x).toBe(centerX);
  expect(percentCall.y).toBeLessThan(nounCall.y);
  expect(Math.abs(percentCall.y - expectedPercentCenterY)).toBeLessThanOrEqual(1);
  expect(percentFontSize).toBeGreaterThanOrEqual(16);
  expect(percentCall.width).toBeLessThanOrEqual(width - 36);

  if (percentFontSize >= expectedPercentFontSize - 2) {
    expect(Math.abs(percentFontSize - expectedPercentFontSize)).toBeLessThanOrEqual(1);
  }
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

async function expectLockedOutcomeHero(
  page: Page,
  expectedTexts: [string, string] = ["YOU", "FAILED!"],
  expectedImageName = "ape-game.png"
) {
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
      imageHref: image.getAttribute("href"),
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
  expect(metrics.imageHref).toContain(expectedImageName);
  expect(metrics.textCount).toBe(2);
  expect(metrics.textValues).toEqual(expectedTexts);
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

async function expectLockedFailureHero(page: Page) {
  await expectLockedOutcomeHero(page, ["YOU", "FAILED!"], "ape-game.png");
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

async function supportsPrimaryHover(page: Page) {
  return page.evaluate(() => window.matchMedia("(hover: hover) and (pointer: fine)").matches);
}

async function getChoiceButtonVisualStates(page: Page) {
  return page.locator(".choice-grid .noun-button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const styles = window.getComputedStyle(button);

      return {
        ariaPressed: button.getAttribute("aria-pressed"),
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        text: button.textContent?.trim()
      };
    })
  );
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
  await expect(page.getByText("You are shown two buttons with one word each.")).toBeVisible();
  await expect(page.getByText("Each button contains one random noun. Example: tree / noise.")).toHaveCount(0);
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

test("opens the pleb definition modal from the reserved prompt slot", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.getByText("Choose what the")).toBeVisible();
  const plebButton = page.getByRole("button", { name: "Open pleb definition" });
  await expect(plebButton).toBeVisible();
  await plebButton.click();
  const dialog = page.getByRole("dialog", { name: "pleb" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("/plɛb/")).toBeVisible();
  await expect(dialog.getByText("— PLEB", { exact: true })).toBeVisible();
  await expect(dialog.getByText("noun", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveCount(2);
  await expect(dialog.getByRole("listitem").first()).toHaveText(
    "An ordinary person who follows the crowd by default."
  );
  await expect(dialog.getByRole("listitem").nth(1)).toHaveText(
    "A person ruled by mass taste, mass behavior, or low-agency thinking."
  );
  await expect(dialog.getByText("Etymology:")).toBeVisible();
  await expect(dialog.getByText("plebeian")).toBeVisible();
  await expect(dialog.getByText("plēbs")).toBeVisible();
  const typography = await dialog.evaluate((element) => {
    const pronunciation = element.querySelector(".definition-pronunciation em");
    const part = element.querySelector(".definition-part");
    const list = element.querySelector(".definition-list");
    const etymologyLabel = element.querySelector(".definition-etymology strong");

    if (!pronunciation || !part || !list || !etymologyLabel) {
      throw new Error("Definition typography is incomplete.");
    }

    const pronunciationStyles = window.getComputedStyle(pronunciation);
    const partStyles = window.getComputedStyle(part);
    const listStyles = window.getComputedStyle(list);
    const etymologyLabelStyles = window.getComputedStyle(etymologyLabel);

    return {
      etymologyLabelWeight: Number(etymologyLabelStyles.fontWeight),
      listStyleType: listStyles.listStyleType,
      partStyle: partStyles.fontStyle,
      partTextTransform: partStyles.textTransform,
      pronunciationStyle: pronunciationStyles.fontStyle
    };
  });
  expect(typography.pronunciationStyle).toBe("italic");
  expect(typography.partStyle).toBe("italic");
  expect(typography.partTextTransform).toBe("none");
  expect(typography.listStyleType).toBe("decimal");
  expect(typography.etymologyLabelWeight).toBeGreaterThanOrEqual(700);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close pleb definition" })).toBeFocused();
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
  await expect(dialog).toBeHidden();
  await expect(plebButton).toBeFocused();
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

test("does not carry a pressed-looking button into the next level on touch", async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      originalSetTimeout(handler, Math.min(timeout ?? 0, 1), ...args)) as typeof window.setTimeout;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "tin" }).click();
  await expect(page.getByText("60%")).toBeHidden({ timeout: 4000 });
  await expect(page.getByRole("button", { name: "tin" })).toBeVisible();
  await expect(page.locator('.choice-grid .noun-button[aria-pressed="true"]')).toHaveCount(0);

  if (!(await supportsPrimaryHover(page))) {
    const visualStates = await getChoiceButtonVisualStates(page);
    expect(visualStates).toHaveLength(2);
    expect(visualStates.every((button) => button.ariaPressed === "false")).toBe(true);
    expect(visualStates.every((button) => button.backgroundColor !== "rgb(11, 11, 11)")).toBe(true);
  }
});

test("keeps desktop hover feedback for precise pointers", async ({ page }) => {
  await page.goto("/");

  if (!(await supportsPrimaryHover(page))) {
    return;
  }

  const button = page.getByRole("button", { name: "handkerchief" });
  await button.hover();
  await expect(button).toHaveCSS("background-color", "rgb(11, 11, 11)");
  await expect(button).toHaveCSS("color", "rgb(244, 241, 232)");
});

test("shows failure actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.getByText(/SCORE \d+/)).toBeHidden();
  await expect(page.getByText(/AVERAGE CHOICE:/)).toBeHidden();
  await expectNounCentered(page, "handkerchief");
  const beforeBox = await getButtonBox(page, "handkerchief");
  await page.getByRole("button", { name: "handkerchief" }).click();
  await expect(page.getByRole("heading", { name: "YOU FAILED!" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open pleb definition" })).toHaveCount(0);
  await expect(page.getByText(/SCORE \d+/)).toBeHidden();
  await expect(page.getByText(/AVERAGE CHOICE:/)).toBeHidden();
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

test("escapes after answering level 100 with the escaped hero and share image", async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      originalSetTimeout(handler, Math.min(timeout ?? 0, 1), ...args)) as typeof window.setTimeout;

    window.__plebscapeFillTextCalls = [];
    window.__plebscapeLoadedImages = [];
    window.__plebscapeDownloadClicked = false;

    const imageSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      get() {
        return imageSrcDescriptor?.get?.call(this) ?? "";
      },
      set(value: string) {
        window.__plebscapeLoadedImages.push(String(value));
        imageSrcDescriptor?.set?.call(this, value);
      }
    });

    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text: string,
      x: number,
      y: number,
      maxWidth?: number
    ) {
      window.__plebscapeFillTextCalls.push({
        font: this.font,
        text: String(text),
        textAlign: this.textAlign,
        width: this.measureText(String(text)).width,
        x,
        y
      });
      return originalFillText.call(this, text, x, y, maxWidth as number);
    };

    HTMLCanvasElement.prototype.toBlob = function (callback, type) {
      callback(new Blob(["png"], { type: type ?? "image/png" }));
    };

    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false
    });

    HTMLAnchorElement.prototype.click = function () {
      window.__plebscapeDownloadClicked = true;
    };
  });

  await page.unroute("**/api/levels/next");
  await page.unroute("**/api/votes");

  let nextLevel = 1;
  await page.route("**/api/levels/next", async (route) => {
    const levelNumber = nextLevel;
    nextLevel += 1;

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        generated: false,
        level: {
          id: `level-${levelNumber}`,
          nounA: "alpha",
          nounB: "beta"
        }
      })
    });
  });

  await page.route("**/api/votes", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as { chosenSide: "a" | "b"; levelId: string };
    const isFinalVote = body.levelId === "level-100";

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          levelId: body.levelId,
          nounA: "alpha",
          nounB: "beta",
          votesA: isFinalVote ? 45 : 80,
          votesB: isFinalVote ? 55 : 20,
          percentA: isFinalVote ? 45 : 80,
          percentB: isFinalVote ? 55 : 20,
          chosenSide: body.chosenSide,
          chosenNoun: body.chosenSide === "a" ? "alpha" : "beta",
          passed: !isFinalVote
        }
      })
    });
  });

  await page.goto("/");

  for (let levelNumber = 1; levelNumber < 100; levelNumber += 1) {
    await expect(page.getByText(`Level ${levelNumber}`)).toBeVisible();
    await page.getByRole("button", { name: "beta" }).click();
    await expect(page.getByText(`Level ${levelNumber + 1}`)).toBeVisible({ timeout: 4000 });
  }

  await page.getByRole("button", { name: "beta" }).click();
  await expect(page.getByRole("heading", { name: "YOU ESCAPED!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "YOU FAILED!" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open pleb definition" })).toHaveCount(0);
  await expect(page.getByText("Level 100")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /beta 55%/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "SHARE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "START AGAIN" })).toBeVisible();
  await expectLockedOutcomeHero(page, ["YOU", "ESCAPED!"], "ape-escaped.png");

  await page.getByRole("button", { name: "SHARE" }).click();
  await expect
    .poll(async () => page.evaluate(() => window.__plebscapeFillTextCalls.map((call) => call.text)))
    .toContain("LEVEL 100");
  await expect
    .poll(async () => page.evaluate(() => window.__plebscapeLoadedImages))
    .toContainEqual(expect.stringContaining("ape-escaped.png"));
  const fillTextLabels = await page.evaluate(() => window.__plebscapeFillTextCalls.map((call) => call.text));
  expect(fillTextLabels).toContain("SCORE 9980");
  expect(fillTextLabels).toContain("AVERAGE CHOICE: 20%");
  expect(fillTextLabels).toContain("55%");
  expect(fillTextLabels).toContain("beta");
  await expect.poll(async () => page.evaluate(() => window.__plebscapeDownloadClicked)).toBe(true);
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

test("draws share-only score from exact post-vote run percentages", async ({ page }) => {
  await page.addInitScript(() => {
    window.__plebscapeFillTextCalls = [];
    window.__plebscapeDownloadClicked = false;

    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text: string,
      x: number,
      y: number,
      maxWidth?: number
    ) {
      window.__plebscapeFillTextCalls.push({
        font: this.font,
        text: String(text),
        textAlign: this.textAlign,
        width: this.measureText(String(text)).width,
        x,
        y
      });
      return originalFillText.call(this, text, x, y, maxWidth as number);
    };

    HTMLCanvasElement.prototype.toBlob = function (callback, type) {
      callback(new Blob(["png"], { type: type ?? "image/png" }));
    };

    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false
    });

    HTMLAnchorElement.prototype.click = function () {
      window.__plebscapeDownloadClicked = true;
    };
  });

  await page.unroute("**/api/levels/next");
  await page.unroute("**/api/votes");

  const levels = [
    {
      id: "33333333-3333-4333-8333-333333333331",
      nounA: "stone",
      nounB: "pebble"
    },
    {
      id: "33333333-3333-4333-8333-333333333332",
      nounA: "branch",
      nounB: "twig"
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      nounA: "bagel",
      nounB: "jigsaw"
    }
  ];
  let levelIndex = 0;

  await page.route("**/api/levels/next", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        generated: false,
        level: levels[Math.min(levelIndex, levels.length - 1)]
      })
    });
    levelIndex += 1;
  });

  await page.route("**/api/votes", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as { chosenSide: "a" | "b"; levelId: string };
    const results = {
      [levels[0].id]: {
        chosenNoun: "pebble",
        nounA: "stone",
        nounB: "pebble",
        passed: true,
        percentA: 79,
        percentB: 21,
        votesA: 79,
        votesB: 21
      },
      [levels[1].id]: {
        chosenNoun: "twig",
        nounA: "branch",
        nounB: "twig",
        passed: true,
        percentA: 68,
        percentB: 32,
        votesA: 68,
        votesB: 32
      },
      [levels[2].id]: {
        chosenNoun: "bagel",
        nounA: "bagel",
        nounB: "jigsaw",
        passed: false,
        percentA: 65,
        percentB: 35,
        votesA: 65,
        votesB: 35
      }
    }[body.levelId];

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          ...results,
          chosenSide: body.chosenSide,
          levelId: body.levelId
        }
      })
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "pebble" }).click();
  await expect(page.getByRole("button", { name: "twig" })).toBeVisible({ timeout: 4000 });
  await page.getByRole("button", { name: "twig" }).click();
  await expect(page.getByRole("button", { name: "bagel" })).toBeVisible({ timeout: 4000 });
  await page.getByRole("button", { name: "bagel" }).click();

  await expect(page.getByRole("heading", { name: "YOU FAILED!" })).toBeVisible();
  await expect(page.getByText(/SCORE \d+/)).toBeHidden();
  await expect(page.getByText(/AVERAGE CHOICE:/)).toBeHidden();
  await page.getByRole("button", { name: "SHARE" }).click();

  await expect
    .poll(async () => page.evaluate(() => window.__plebscapeFillTextCalls.map((call) => call.text)))
    .toContain("SCORE 261");
  const fillTextCalls = await page.evaluate(() => window.__plebscapeFillTextCalls);
  const fillTextLabels = fillTextCalls.map((call) => call.text);
  expect(fillTextLabels).toContain("LEVEL 3");
  expect(fillTextLabels).toContain("AVERAGE CHOICE: 39%");
  expect(fillTextLabels).toContain("65%");
  expect(fillTextLabels).toContain("35%");
  expect(fillTextLabels).toContain("bagel");
  expect(fillTextLabels).toContain("jigsaw");

  const levelCall = fillTextCalls.find((call) => call.text === "LEVEL 3");
  const scoreCall = fillTextCalls.find((call) => call.text === "SCORE 261");
  const averageCall = fillTextCalls.find((call) => call.text === "AVERAGE CHOICE: 39%");
  const domainCall = fillTextCalls.find((call) => call.text === "PLEBSCAPE.COM");
  const sloganCall = fillTextCalls.find((call) => call.text === "There is only one way to escape the pleb.");

  expect(levelCall).toBeDefined();
  expect(scoreCall).toBeDefined();
  expect(averageCall).toBeDefined();
  expect(domainCall).toBeDefined();
  expect(sloganCall).toBeDefined();

  const textBlockWidth = Math.max(levelCall!.width, scoreCall!.width);
  const levelFontSize = Number(levelCall!.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "78");
  const headerScale = levelFontSize / 78;
  const headerGroupX = levelCall!.x - 340 * headerScale;
  const headerGroupWidth = Math.max(300 * headerScale, 340 * headerScale + textBlockWidth);
  const headerGroupCenter = headerGroupX + headerGroupWidth / 2;
  const leftPercentCall = fillTextCalls.find((call) => call.text === "65%");
  const rightPercentCall = fillTextCalls.find((call) => call.text === "35%");
  const leftNounCall = fillTextCalls.find((call) => call.text === "bagel");
  const rightNounCall = fillTextCalls.find((call) => call.text === "jigsaw");

  expect(leftPercentCall).toBeDefined();
  expect(rightPercentCall).toBeDefined();
  expect(leftNounCall).toBeDefined();
  expect(rightNounCall).toBeDefined();

  expect(levelCall!.textAlign).toBe("left");
  expect(scoreCall!.textAlign).toBe("left");
  expect(levelCall!.x).toBe(scoreCall!.x);
  expect(Math.abs(headerGroupCenter - 540)).toBeLessThanOrEqual(1);
  expect(averageCall!.x).toBe(540);
  expect(averageCall!.y).toBe(500);
  expect(Math.abs((leftPercentCall!.x + rightPercentCall!.x) / 2 - 540)).toBeLessThanOrEqual(1);
  expectShareButtonTextGeometry({
    nounCall: leftNounCall!,
    percentCall: leftPercentCall!,
    x: 85,
    y: 575
  });
  expectShareButtonTextGeometry({
    nounCall: rightNounCall!,
    percentCall: rightPercentCall!,
    x: 555,
    y: 575
  });
  expect(getCanvasFontSize(leftNounCall!.font)).toBeCloseTo(getCanvasFontSize(rightNounCall!.font), 3);
  expect(leftPercentCall!.y - averageCall!.y).toBeGreaterThan(80);
  expect(leftPercentCall!.y - averageCall!.y).toBeLessThan(120);
  expect(averageCall!.y - scoreCall!.y).toBeGreaterThan(120);
  expect(averageCall!.y - scoreCall!.y).toBeLessThan(220);
  expect(domainCall!.x).toBe(540);
  expect(domainCall!.y).toBe(910);
  expect(sloganCall!.x).toBe(540);
  expect(sloganCall!.y).toBe(965);
  await expect.poll(async () => page.evaluate(() => window.__plebscapeDownloadClicked)).toBe(true);
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
