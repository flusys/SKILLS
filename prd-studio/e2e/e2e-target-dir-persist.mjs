// Verifies the target directory survives a page reload instead of silently clearing.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5173/");
await page.waitForSelector(".app-shell");

await page.fill(".top-bar input[type=text]", "/some/remembered/path");
await page.waitForTimeout(200);

await page.reload();
await page.waitForSelector(".app-shell");
const value = await page.locator(".top-bar input[type=text]").inputValue();
console.log(`Target dir after reload: "${value}"`);
if (value !== "/some/remembered/path") throw new Error(`Expected the path to survive reload, got "${value}"`);

await browser.close();
console.log("Target directory persistence check passed.");
