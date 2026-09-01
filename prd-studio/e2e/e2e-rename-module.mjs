// Verifies a module's name/slug can actually be edited after creation, and that the rename
// cascades into the sidebar tab label and the exported filename.
import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto("http://localhost:5173/");
await page.waitForSelector(".app-shell");

await page.click("button:has-text('Add module')");
await page.waitForSelector("app-feature-panel");

const nameInput = page.locator('f-card[header="Module"] input').nth(0);
const slugInput = page.locator('f-card[header="Module"] input').nth(1);

await nameInput.fill("Invoicing");
await nameInput.blur();
await page.waitForTimeout(300);

await slugInput.fill("invoicing");
await slugInput.blur();
await page.waitForTimeout(300);

const sidebarLabel = await page.locator(".module-row .tab-btn").last().textContent();
console.log(`Sidebar tab label: "${sidebarLabel?.trim()}"`);
if (sidebarLabel?.trim() !== "Invoicing") throw new Error(`Expected sidebar tab "Invoicing", got "${sidebarLabel}"`);

const filenameHint = await page.locator("text=docs/prd-feature-").last().textContent();
console.log(`Filename hint: "${filenameHint}"`);
if (!filenameHint?.endsWith("-invoicing.md")) {
  throw new Error(`Expected filename hint to show the renamed slug, got "${filenameHint}"`);
}

await browser.close();
if (errors.length > 0) {
  console.error("Console/page errors:", errors);
  process.exit(1);
}
console.log("\nModule rename check passed.");
