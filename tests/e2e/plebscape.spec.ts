import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/levels/next", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        level: {
          id: "11111111-1111-4111-8111-111111111111",
          nounA: "tree",
          nounB: "noise"
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
          nounA: "tree",
          nounB: "noise",
          votesA: body.chosenSide === "a" ? 4 : 3,
          votesB: body.chosenSide === "b" ? 2 : 1,
          percentA: body.chosenSide === "a" ? 80 : 60,
          percentB: body.chosenSide === "b" ? 40 : 20,
          chosenSide: body.chosenSide,
          chosenNoun: body.chosenSide === "a" ? "tree" : "noise",
          passed: body.chosenSide === "b"
        }
      })
    });
  });
});

test("opens and closes the how it works modal by keyboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("There is only one way to escape the pleb.")).toBeVisible();
  await page.getByRole("button", { name: "Open game rules" }).click();
  await expect(page.getByRole("dialog", { name: "How it works" })).toBeVisible();
  await expect(page.getByText("Each button contains one random noun. Example: tree / noise.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "How it works" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open game rules" })).toBeFocused();
});

test("plays, reveals a pass, and hides percentages before choosing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("60%")).toBeHidden();
  await page.getByRole("button", { name: "noise" }).click();
  await expect(page.getByRole("heading", { name: "ESCAPED" })).toBeVisible();
  await expect(page.getByText("60%")).toBeVisible();
  await expect(page.getByText("40%")).toBeVisible();
});

test("shows failure actions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "tree" }).click();
  await expect(page.getByRole("heading", { name: "YOU FAILED!" })).toBeVisible();
  await expect(page.getByRole("button", { name: "SHARE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "START AGAIN" })).toBeVisible();
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
